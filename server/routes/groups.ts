import { Router, Request, Response } from "express";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  groups,
  groupMembers,
  groupPosts,
  users,
  insertGroupSchema,
  insertGroupPostSchema,
} from "@shared/schema";

const router = Router();

// Create a group
router.post("/groups", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = insertGroupSchema.parse({
      ...req.body,
      creatorId: req.user!.id,
    });

    const [group] = await db
      .insert(groups)
      .values(validatedData)
      .returning();

    // Automatically add creator as admin member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: req.user!.id,
      role: 'admin',
    });

    // Update member count
    await db
      .update(groups)
      .set({ memberCount: 1 })
      .where(eq(groups.id, group.id));

    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all groups (with optional filters)
router.get("/groups", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { type, category, university, search } = req.query;

    let query = db
      .select()
      .from(groups);

    const conditions = [];

    if (type) {
      conditions.push(eq(groups.groupType, type as string));
    }
    if (category) {
      conditions.push(eq(groups.category, category as string));
    }
    if (university) {
      conditions.push(eq(groups.university, university as string));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          sql`${groups.name} ILIKE ${searchPattern}`,
          sql`${groups.description} ILIKE ${searchPattern}`
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.orderBy(desc(groups.memberCount));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group by ID
router.get("/groups/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Get member count and creator info
    const memberCount = await db
      .select({ count: sql`count(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, id));

    const [creator] = await db
      .select()
      .from(users)
      .where(eq(users.id, group.creatorId));

    // Check if current user is a member
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    res.json({
      ...group,
      creator,
      memberCount: Number(memberCount[0]?.count || 0),
      isMember: !!membership,
      userRole: membership?.role || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a group (only creator or admin can update)
router.patch("/groups/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if group exists
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is creator or admin
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    const isCreator = group.creatorId === req.user!.id;
    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: "Only group creator or admins can update this group" });
    }

    // Validate update data (exclude creatorId from updates)
    const updateData = insertGroupSchema.omit({ creatorId: true }).partial().parse(req.body);

    const [updatedGroup] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, id))
      .returning();

    res.json(updatedGroup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a group (only creator or admin can delete)
router.delete("/groups/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if group exists
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is creator or admin
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    const isCreator = group.creatorId === req.user!.id;
    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: "Only group creator or admins can delete this group" });
    }

    // Delete group (cascade will handle group members and posts due to foreign key constraints)
    await db
      .delete(groups)
      .where(eq(groups.id, id));

    res.json({ success: true, message: "Group deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join a group
router.post("/groups/:id/join", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if group exists
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already a member of this group" });
    }

    // Add member
    const [membership] = await db
      .insert(groupMembers)
      .values({
        groupId: id,
        userId: req.user!.id,
        role: 'member',
      })
      .returning();

    // Update member count
    await db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} + 1` })
      .where(eq(groups.id, id));

    res.json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a group
router.delete("/groups/:id/leave", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if member
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    if (!membership) {
      return res.status(400).json({ error: "Not a member of this group" });
    }

    // Can't leave if you're the only admin
    if (membership.role === 'admin') {
      const adminCount = await db
        .select({ count: sql`count(*)` })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.role, 'admin')
          )
        );

      if (Number(adminCount[0]?.count) === 1) {
        return res.status(400).json({ error: "Cannot leave as the only admin. Assign another admin first." });
      }
    }

    // Remove membership
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    // Update member count
    await db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} - 1` })
      .where(eq(groups.id, id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group members
router.get("/groups/:id/members", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const results = await db
      .select({
        membership: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, id))
      .orderBy(desc(groupMembers.joinedAt));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post to a group
router.post("/groups/:id/posts", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, req.user!.id)
        )
      );

    if (!membership) {
      return res.status(403).json({ error: "Must be a member to post in this group" });
    }

    const validatedData = insertGroupPostSchema.parse({
      ...req.body,
      groupId: id,
      authorId: req.user!.id,
    });

    const [post] = await db
      .insert(groupPosts)
      .values(validatedData)
      .returning();

    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get posts from a group
router.get("/groups/:id/posts", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is a member or group is public
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.isPrivate) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, req.user!.id)
          )
        );

      if (!membership) {
        return res.status(403).json({ error: "Cannot view posts from private group" });
      }
    }

    const results = await db
      .select({
        post: groupPosts,
        author: users,
      })
      .from(groupPosts)
      .leftJoin(users, eq(groupPosts.authorId, users.id))
      .where(eq(groupPosts.groupId, id))
      .orderBy(desc(groupPosts.createdAt))
      .limit(50);

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
