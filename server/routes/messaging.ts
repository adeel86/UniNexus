import { Router, Request, Response } from "express";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  conversations,
  messages,
  users,
  notifications,
} from "@shared/schema";

const router = Router();

// ========================================================================
// MESSAGING / CONVERSATIONS API
// ========================================================================

// Create or get existing conversation
router.post("/conversations", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { participantIds, isGroup, groupName } = req.body;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: "Participant IDs are required" });
    }

    // Add current user to participants if not included
    const allParticipants = Array.from(new Set([req.user!.id, ...participantIds]));

    // For non-group chats, check if conversation already exists
    if (!isGroup && allParticipants.length === 2) {
      const existingConvos = await db
        .select()
        .from(conversations)
        .where(eq(conversations.isGroup, false));

      const existing = existingConvos.find(c => {
        const pIds = c.participantIds || [];
        return pIds.length === 2 && 
               pIds.includes(allParticipants[0]) && 
               pIds.includes(allParticipants[1]);
      });

      if (existing) {
        return res.json(existing);
      }
    }

    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        participantIds: allParticipants,
        isGroup: isGroup || false,
        groupName: groupName || null,
      })
      .returning();

    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's conversations
router.get("/conversations", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));

    // Filter conversations where user is a participant
    const userConversations = allConversations.filter(c => 
      (c.participantIds || []).includes(userId)
    );

    // Get participant details and last message for each conversation
    const enrichedConversations = await Promise.all(
      userConversations.map(async (conversation) => {
        // Get participants
        const participantIds = conversation.participantIds || [];
        const participants = participantIds.length > 0
          ? await db
              .select()
              .from(users)
              .where(inArray(users.id, participantIds))
          : [];

        // Get last message
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count for current user (exclude messages sent by the user)
        const allMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id));

        const unreadMessages = allMessages.filter(msg => {
          const readBy = msg.readBy || [];
          // Only count messages from others that we haven't read
          // Guard against undefined senderId for legacy data
          const isFromOtherUser = msg.senderId ? msg.senderId !== userId : true;
          return isFromOtherUser && !readBy.includes(userId);
        });

        return {
          ...conversation,
          participants,
          lastMessage,
          unreadCount: unreadMessages.length,
        };
      })
    );

    res.json(enrichedConversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages in a conversation
router.get("/conversations/:id/messages", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify user is participant
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!(conversation.participantIds || []).includes(userId)) {
      return res.status(403).json({ error: "Not a participant in this conversation" });
    }

    // Get messages with sender info
    const messagesList = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    res.json(messagesList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post("/conversations/:id/messages", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    const userId = req.user!.id;

    if (!content && !imageUrl) {
      return res.status(400).json({ error: "Message content or image is required" });
    }

    // Verify user is participant
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!(conversation.participantIds || []).includes(userId)) {
      return res.status(403).json({ error: "Not a participant in this conversation" });
    }

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: id,
        senderId: userId,
        content: content || '',
        imageUrl: imageUrl || null,
        readBy: [userId], // Sender has read their own message
      })
      .returning();

    // Update conversation last message time
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));

    // Create notifications for other participants
    const otherParticipants = (conversation.participantIds || []).filter(pId => pId !== userId);
    
    for (const participantId of otherParticipants) {
      await db.insert(notifications).values({
        userId: participantId,
        type: 'message',
        title: 'New Message',
        message: `${req.user!.firstName} ${req.user!.lastName} sent you a message`,
        link: `/messages?conversation=${id}`,
      });
    }

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.patch("/conversations/:id/read", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get all unread messages in conversation
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, id),
          sql`NOT (${userId} = ANY(${messages.readBy}))`
        )
      );

    // Mark each as read by adding userId to readBy array
    for (const message of unreadMessages) {
      await db
        .update(messages)
        .set({
          readBy: sql`array_append(${messages.readBy}, ${userId})`,
        })
        .where(eq(messages.id, message.id));
    }

    res.json({ success: true, markedRead: unreadMessages.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
