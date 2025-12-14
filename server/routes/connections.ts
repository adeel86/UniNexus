import { Router, Request, Response } from "express";
import { eq, desc, sql, and, or, inArray } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  userConnections,
  followers,
  users,
  notifications,
} from "@shared/schema";

const router = Router();

// ========================================================================
// USER CONNECTIONS / NETWORK API
// ========================================================================

// Send connection request
router.post("/connections/request", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    if (receiverId === req.user!.id) {
      return res.status(400).json({ error: "Cannot connect with yourself" });
    }

    // Check if connection already exists
    const existing = await db
      .select()
      .from(userConnections)
      .where(
        or(
          and(
            eq(userConnections.requesterId, req.user!.id),
            eq(userConnections.receiverId, receiverId)
          ),
          and(
            eq(userConnections.requesterId, receiverId),
            eq(userConnections.receiverId, req.user!.id)
          )
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Connection request already exists" });
    }

    // Create connection request
    const [connection] = await db
      .insert(userConnections)
      .values({
        requesterId: req.user!.id,
        receiverId,
        status: 'pending',
      })
      .returning();

    // Create notification for receiver
    await db.insert(notifications).values({
      userId: receiverId,
      type: 'connection',
      title: 'New Connection Request',
      message: `${req.user!.firstName} ${req.user!.lastName} wants to connect with you`,
      link: '/network',
    });

    res.json(connection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept/reject connection request
router.patch("/connections/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify the user is the receiver of this request
    const [connection] = await db
      .select()
      .from(userConnections)
      .where(eq(userConnections.id, id));

    if (!connection) {
      return res.status(404).json({ error: "Connection request not found" });
    }

    if (connection.receiverId !== req.user!.id) {
      return res.status(403).json({ error: "You can only respond to requests sent to you" });
    }

    // Update connection status
    const [updated] = await db
      .update(userConnections)
      .set({ 
        status,
        respondedAt: new Date(),
      })
      .where(eq(userConnections.id, id))
      .returning();

    // Create notification for requester
    if (status === 'accepted') {
      await db.insert(notifications).values({
        userId: connection.requesterId,
        type: 'connection',
        title: 'Connection Accepted',
        message: `${req.user!.firstName} ${req.user!.lastName} accepted your connection request`,
        link: '/network',
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's connections
router.get("/connections", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const userId = req.user!.id;

    let query = db
      .select({
        connection: userConnections,
        user: users,
      })
      .from(userConnections)
      .leftJoin(
        users,
        or(
          eq(userConnections.requesterId, users.id),
          eq(userConnections.receiverId, users.id)
        )
      )
      .where(
        and(
          or(
            eq(userConnections.requesterId, userId),
            eq(userConnections.receiverId, userId)
          ),
          status ? eq(userConnections.status, status as string) : undefined
        )
      );

    const results = await query;

    // Filter to show only the other user in the connection
    const connections = results
      .map(r => ({
        ...r.connection,
        user: r.user!.id === userId ? null : r.user,
      }))
      .filter(c => c.user !== null);

    res.json(connections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search within user's connections only
router.get("/connections/search", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    const searchTerm = q as string;

    if (!searchTerm || searchTerm.length < 3) {
      return res.json([]);
    }

    const userId = req.user!.id;
    const searchPattern = `%${searchTerm}%`;

    // Get all accepted connections
    const connections = await db
      .select()
      .from(userConnections)
      .where(
        and(
          or(
            eq(userConnections.requesterId, userId),
            eq(userConnections.receiverId, userId)
          ),
          eq(userConnections.status, 'accepted')
        )
      );

    // Get connected user IDs
    const connectedUserIds = connections.map(c => 
      c.requesterId === userId ? c.receiverId : c.requesterId
    );

    if (connectedUserIds.length === 0) {
      return res.json([]);
    }

    // Search only among connected users
    const results = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, connectedUserIds),
          or(
            sql`${users.firstName} ILIKE ${searchPattern}`,
            sql`${users.lastName} ILIKE ${searchPattern}`,
            sql`${users.email} ILIKE ${searchPattern}`,
            sql`${users.major} ILIKE ${searchPattern}`,
            sql`${users.company} ILIKE ${searchPattern}`,
            sql`${users.university} ILIKE ${searchPattern}`
          )
        )
      )
      .limit(20);

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status with a specific user
router.get("/connections/status/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    const [connection] = await db
      .select()
      .from(userConnections)
      .where(
        or(
          and(
            eq(userConnections.requesterId, currentUserId),
            eq(userConnections.receiverId, userId)
          ),
          and(
            eq(userConnections.requesterId, userId),
            eq(userConnections.receiverId, currentUserId)
          )
        )
      );

    res.json({
      connected: connection?.status === 'accepted',
      pending: connection?.status === 'pending',
      isRequester: connection?.requesterId === currentUserId,
      connectionId: connection?.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// FOLLOWERS API
// ========================================================================

// Follow a user
router.post("/follow", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({ error: "Following user ID is required" });
    }

    if (followingId === req.user!.id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Check if already following
    const existing = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, req.user!.id),
          eq(followers.followingId, followingId)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already following this user" });
    }

    // Create follow relationship
    const [follow] = await db
      .insert(followers)
      .values({
        followerId: req.user!.id,
        followingId,
      })
      .returning();

    // Create notification
    await db.insert(notifications).values({
      userId: followingId,
      type: 'follow',
      title: 'New Follower',
      message: `${req.user!.firstName} ${req.user!.lastName} started following you`,
      link: `/profile?userId=${req.user!.id}`,
    });

    res.json(follow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow a user
router.delete("/follow/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    await db
      .delete(followers)
      .where(
        and(
          eq(followers.followerId, req.user!.id),
          eq(followers.followingId, userId)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get followers for a user
router.get("/followers/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const results = await db
      .select({
        follower: followers,
        user: users,
      })
      .from(followers)
      .leftJoin(users, eq(followers.followerId, users.id))
      .where(eq(followers.followingId, userId))
      .orderBy(desc(followers.createdAt));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get following for a user
router.get("/following/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const results = await db
      .select({
        follower: followers,
        user: users,
      })
      .from(followers)
      .leftJoin(users, eq(followers.followingId, users.id))
      .where(eq(followers.followerId, userId))
      .orderBy(desc(followers.createdAt));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check if following a user
router.get("/follow/status/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const [follow] = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, req.user!.id),
          eq(followers.followingId, userId)
        )
      );

    res.json({ isFollowing: !!follow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a follower (someone who follows you)
router.delete("/followers/remove/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Delete the follow relationship where userId follows the current user
    const result = await db
      .delete(followers)
      .where(
        and(
          eq(followers.followerId, userId),
          eq(followers.followingId, req.user!.id)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// DISCOVERY & RECOMMENDATIONS API
// ========================================================================

// Get friend recommendations based on mutual connections and shared attributes
router.get("/recommendations/friends", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const currentUser = req.user!;

    // Get current user's connections
    const myConnections = await db
      .select()
      .from(userConnections)
      .where(
        and(
          or(
            eq(userConnections.requesterId, currentUserId),
            eq(userConnections.receiverId, currentUserId)
          ),
          eq(userConnections.status, 'accepted')
        )
      );

    const myConnectionIds = new Set(
      myConnections.flatMap(c => 
        c.requesterId === currentUserId ? [c.receiverId] : [c.requesterId]
      )
    );

    // Get all users except current user and existing connections
    const allUsers = await db
      .select()
      .from(users)
      .where(sql`${users.id} != ${currentUserId}`)
      .limit(100);

    // Get all connections to find mutual connections
    const allConnections = await db
      .select()
      .from(userConnections)
      .where(eq(userConnections.status, 'accepted'));

    // Build connection map for each user
    const userConnectionsMap = new Map<string, Set<string>>();
    for (const conn of allConnections) {
      if (!userConnectionsMap.has(conn.requesterId)) {
        userConnectionsMap.set(conn.requesterId, new Set());
      }
      if (!userConnectionsMap.has(conn.receiverId)) {
        userConnectionsMap.set(conn.receiverId, new Set());
      }
      userConnectionsMap.get(conn.requesterId)!.add(conn.receiverId);
      userConnectionsMap.get(conn.receiverId)!.add(conn.requesterId);
    }

    // Filter out existing connections and calculate scores
    const recommendations = allUsers
      .filter(user => !myConnectionIds.has(user.id))
      .map(user => {
        let score = 0;
        let mutualConnections = 0;
        const sharedSkills: string[] = [];

        // Same university bonus
        if (currentUser.university && user.university === currentUser.university) {
          score += 30;
        }

        // Same role type bonus
        if (user.role === currentUser.role) {
          score += 10;
        }

        // Skill matching (if skills exist)
        const currentSkills = (currentUser as any).skills || [];
        const userSkills = (user as any).skills || [];
        for (const skill of currentSkills) {
          if (userSkills.includes(skill)) {
            score += 5;
            sharedSkills.push(skill);
          }
        }

        // Calculate mutual connections - people connected to both current user and recommended user
        const recommendedUserConnections = userConnectionsMap.get(user.id) || new Set();
        const myFriendIds = Array.from(myConnectionIds);
        for (const myFriendId of myFriendIds) {
          if (recommendedUserConnections.has(myFriendId)) {
            mutualConnections++;
            score += 15;
          }
        }

        // Active users get a boost
        if (user.engagementScore && user.engagementScore > 50) {
          score += 10;
        }

        return {
          ...user,
          mutualConnections,
          sharedSkills: sharedSkills.slice(0, 3),
          recommendationScore: score,
        };
      })
      .filter(user => user.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10);

    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get universities to explore with stats
router.get("/discovery/universities", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    // Get university stats from users
    const universityStats = await db
      .select({
        university: users.university,
        studentCount: sql<number>`count(*)::int`,
        avgEngagement: sql<number>`coalesce(avg(${users.engagementScore}), 0)::int`,
      })
      .from(users)
      .where(sql`${users.university} IS NOT NULL AND ${users.university} != ''`)
      .groupBy(users.university)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Get top majors for each university
    const results = await Promise.all(
      universityStats.map(async (stat) => {
        const majors = await db
          .select({
            major: users.major,
            count: sql<number>`count(*)::int`,
          })
          .from(users)
          .where(
            and(
              eq(users.university, stat.university!),
              sql`${users.major} IS NOT NULL AND ${users.major} != ''`
            )
          )
          .groupBy(users.major)
          .orderBy(sql`count(*) DESC`)
          .limit(3);

        return {
          university: stat.university,
          studentCount: stat.studentCount,
          topMajors: majors.map(m => m.major).filter(Boolean) as string[],
          avgEngagementScore: stat.avgEngagement,
        };
      })
    );

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
