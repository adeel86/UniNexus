import { db } from "../../db";
import { userConnections, followers, endorsements, conversations, messages } from "@shared/schema";
import type { User, Skill, Conversation } from "@shared/schema";

export async function seedConnections(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 7) return;

  const mockConnections = [
    { requesterId: insertedUsers[0].id, receiverId: insertedUsers[1].id, status: "accepted", respondedAt: new Date() },
    { requesterId: insertedUsers[0].id, receiverId: insertedUsers[2].id, status: "accepted", respondedAt: new Date() },
    { requesterId: insertedUsers[1].id, receiverId: insertedUsers[2].id, status: "accepted", respondedAt: new Date() },
    { requesterId: insertedUsers[0].id, receiverId: insertedUsers[3].id, status: "pending" },
    { requesterId: insertedUsers[5].id, receiverId: insertedUsers[0].id, status: "accepted", respondedAt: new Date() },
    { requesterId: insertedUsers[5].id, receiverId: insertedUsers[1].id, status: "accepted", respondedAt: new Date() },
    { requesterId: insertedUsers[6].id, receiverId: insertedUsers[0].id, status: "accepted", respondedAt: new Date() },
  ];

  console.log("Inserting user connections...");
  const insertedConnections = await db.insert(userConnections).values(mockConnections).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConnections.length} connections`);
}

export async function seedFollowers(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 8) return;

  const mockFollowers = [
    { followerId: insertedUsers[0].id, followingId: insertedUsers[8].id },
    { followerId: insertedUsers[0].id, followingId: insertedUsers[9].id },
    { followerId: insertedUsers[1].id, followingId: insertedUsers[8].id },
    { followerId: insertedUsers[2].id, followingId: insertedUsers[8].id },
    { followerId: insertedUsers[5].id, followingId: insertedUsers[0].id },
    { followerId: insertedUsers[6].id, followingId: insertedUsers[0].id },
    { followerId: insertedUsers[6].id, followingId: insertedUsers[1].id },
    { followerId: insertedUsers[7].id, followingId: insertedUsers[5].id },
  ];

  console.log("Inserting followers...");
  const insertedFollowers = await db.insert(followers).values(mockFollowers).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedFollowers.length} followers`);
}

export async function seedEndorsements(insertedUsers: User[], insertedSkills: Skill[]): Promise<void> {
  if (insertedUsers.length < 9 || insertedSkills.length === 0) return;

  const mockEndorsements = [
    { endorserId: insertedUsers[8].id, endorsedUserId: insertedUsers[0].id, skillId: insertedSkills[0].id, comment: "Excellent JavaScript skills demonstrated in class projects!" },
    { endorserId: insertedUsers[8].id, endorsedUserId: insertedUsers[0].id, skillId: insertedSkills[2].id, comment: "Great React work on the final project." },
    { endorserId: insertedUsers[9].id, endorsedUserId: insertedUsers[1].id, skillId: insertedSkills[3].id, comment: "Outstanding UI/UX design sense!" },
    { endorserId: insertedUsers[8].id, endorsedUserId: insertedUsers[5].id, skillId: insertedSkills[0].id, comment: "Strong coding fundamentals." },
    { endorserId: insertedUsers[9].id, endorsedUserId: insertedUsers[5].id, skillId: insertedSkills[2].id, comment: "Impressive React applications." },
  ];

  console.log("Inserting endorsements...");
  const insertedEndorsements = await db.insert(endorsements).values(mockEndorsements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEndorsements.length} endorsements`);
}

export async function seedConversations(insertedUsers: User[]): Promise<Conversation[]> {
  if (insertedUsers.length < 3) return [];

  const mockConversations = [
    { 
      participantIds: [insertedUsers[0].id, insertedUsers[1].id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    { 
      participantIds: [insertedUsers[0].id, insertedUsers[2].id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    { 
      participantIds: [insertedUsers[1].id, insertedUsers[2].id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
  ];

  console.log("Inserting conversations...");
  const insertedConversations = await db.insert(conversations).values(mockConversations).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConversations.length} conversations`);
  return insertedConversations;
}

export async function seedMessages(insertedConversations: Conversation[], insertedUsers: User[]): Promise<void> {
  if (insertedConversations.length === 0) return;

  // Messages with readBy arrays to simulate unread messages
  // If a user is NOT in readBy, the message is unread for them
  const mockMessages = [
    { 
      conversationId: insertedConversations[0].id, 
      senderId: insertedUsers[0].id, 
      content: "Hey! How's the project going?",
      readBy: [insertedUsers[0].id, insertedUsers[1].id] // Both have read
    },
    { 
      conversationId: insertedConversations[0].id, 
      senderId: insertedUsers[1].id, 
      content: "Great! Almost done with the frontend.",
      readBy: [insertedUsers[1].id] // Only sender has read - unread for user[0]
    },
    { 
      conversationId: insertedConversations[0].id, 
      senderId: insertedUsers[1].id, 
      content: "Awesome! Let me know if you need help with the API.",
      readBy: [insertedUsers[1].id] // Only sender has read - unread for user[0]
    },
    { 
      conversationId: insertedConversations[1].id, 
      senderId: insertedUsers[2].id, 
      content: "Did you see the new course announcements?",
      readBy: [insertedUsers[2].id] // Only sender has read - unread for user[0]
    },
    { 
      conversationId: insertedConversations[1].id, 
      senderId: insertedUsers[2].id, 
      content: "Yes! The ML course looks interesting.",
      readBy: [insertedUsers[2].id] // Only sender has read - unread for user[0]
    },
    { 
      conversationId: insertedConversations[2].id, 
      senderId: insertedUsers[2].id, 
      content: "Hi! Want to collaborate on the group project?",
      readBy: [insertedUsers[2].id] // Only sender has read - unread for user[1]
    },
  ];

  console.log("Inserting messages...");
  const insertedMessages = await db.insert(messages).values(mockMessages).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedMessages.length} messages`);
}
