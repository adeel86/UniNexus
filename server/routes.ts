import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "./db";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth, verifyToken, isAuthenticated, type AuthRequest } from "./firebaseAuth";
import {
  users,
  posts,
  comments,
  reactions,
  badges,
  userBadges,
  skills,
  userSkills,
  endorsements,
  courses,
  courseEnrollments,
  courseDiscussions,
  discussionReplies,
  discussionUpvotes,
  courseMilestones,
  challenges,
  challengeParticipants,
  notifications,
  announcements,
  certifications,
  recruiterFeedback,
  userConnections,
  followers,
  postShares,
  conversations,
  messages,
  postBoosts,
  groups,
  groupMembers,
  groupPosts,
  teacherContent,
  userProfiles,
  educationRecords,
  insertPostSchema,
  insertCommentSchema,
  insertReactionSchema,
  insertEndorsementSchema,
  insertChallengeSchema,
  insertAnnouncementSchema,
  insertCourseDiscussionSchema,
  insertDiscussionReplySchema,
  insertCourseMilestoneSchema,
  insertCertificationSchema,
  insertRecruiterFeedbackSchema,
  insertUserConnectionSchema,
  insertFollowerSchema,
  insertPostShareSchema,
  insertMessageSchema,
  insertPostBoostSchema,
  insertGroupSchema,
  insertGroupMemberSchema,
  insertGroupPostSchema,
  insertTeacherContentSchema,
  insertEducationRecordSchema,
} from "@shared/schema";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import { applyPointDelta, recalculateUserRank } from "./pointsHelper";
import { calculateChallengePoints } from "./rankTiers";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;
const DEMO_PASSWORD = "demo123"; // Universal password for all dev/test accounts

// Middleware to block admin roles from accessing social features
function blockRestrictedRoles(req: Request, res: Response, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const restrictedRoles = ['master_admin', 'university_admin'];
  if (restrictedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: "Access Denied",
      message: "Admin roles do not have access to this feature." 
    });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ========================================================================
  // AUTH ENDPOINTS
  // ========================================================================

  // Development login endpoint (only available when Firebase is not configured)
  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    if (!DEV_AUTH_ENABLED || !DEV_JWT_SECRET) {
      return res.status(503).json({ message: "Development authentication not available" });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate password (all test accounts use the same password: demo123)
      if (password !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Look up user by email in database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        console.warn(`Dev login failed: User not found for email ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Issue dev JWT with short expiration (24 hours)
      const token = jwt.sign(
        {
          firebaseUid: user.firebaseUid,
          email: user.email,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        },
        DEV_JWT_SECRET
      );

      console.log(`Dev login successful: ${user.email} (role: ${user.role})`);

      res.json({
        token: `dev-${token}`, // Prefix to identify as dev token
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          role: user.role,
          university: user.university,
          major: user.major,
          company: user.company,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/register", verifyToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { email, displayName, role, university, major, company, position, bio } = req.body;
      
      const [firstName, ...lastNameParts] = displayName.split(' ');
      const lastName = lastNameParts.join(' ');

      const user = await storage.createUserFromFirebase(req.user.id, {
        email,
        displayName,
        firstName,
        lastName,
        role: role || 'student',
        university: university || null,
        major: major || null,
        company: company || null,
        position: position || null,
        bio: bio || null,
      });

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user profile" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint - works for all authentication modes (Firebase and dev auth)
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      // This endpoint is mainly for client-side confirmation
      // Token invalidation happens on the client by removing localStorage/session storage
      // and on the server via middleware that validates tokens on each request
      
      // Log logout event
      const authHeader = req.headers.authorization;
      const token = authHeader?.split('Bearer ')[1];
      if (token) {
        console.log(`User logout: ${token.substring(0, 20)}...`);
      }
      
      // Return success response
      res.json({ 
        message: "Logged out successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Legacy logout endpoint for backwards compatibility
  app.get("/api/logout", async (req: Request, res: Response) => {
    try {
      // Redirect to home page with a message (for backwards compatibility)
      // Modern clients should use the POST /api/auth/logout endpoint
      console.log("User accessed legacy logout endpoint");
      res.redirect('/');
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // ========================================================================
  // POSTS ENDPOINTS
  // ========================================================================

  app.get("/api/posts", async (req: Request, res: Response) => {
    const { category, filterByInterests, userId, authorId } = req.query;
    
    try {
      let query = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaUrls: posts.mediaUrls,
          mediaType: posts.mediaType,
          category: posts.category,
          tags: posts.tags,
          viewCount: posts.viewCount,
          shareCount: posts.shareCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt))
        .$dynamic();

      // Filter by category
      if (category && category !== 'all') {
        query = query.where(eq(posts.category, category as string));
      }

      // Filter by author
      if (authorId) {
        query = query.where(eq(posts.authorId, authorId as string));
      }

      let postsData = await query;

      // Interest-based filtering
      if (filterByInterests === 'true' && userId) {
        const [currentUser] = await db.select().from(users).where(eq(users.id, userId as string)).limit(1);
        if (currentUser && currentUser.interests && currentUser.interests.length > 0) {
          // Filter posts that have tags matching user interests
          const userInterests = currentUser.interests;
          postsData = postsData.filter(post => {
            if (!post.tags || post.tags.length === 0) return false;
            return post.tags.some(tag => 
              userInterests.some(interest => 
                tag.toLowerCase().includes(interest.toLowerCase()) ||
                interest.toLowerCase().includes(tag.toLowerCase())
              )
            );
          });
        }
      }

      const postsDataArray = postsData;

      // Fetch comments and reactions for each post
      const postsWithDetails = await Promise.all(
        postsDataArray.map(async (post) => {
          const postComments = await db
            .select({
              id: comments.id,
              postId: comments.postId,
              authorId: comments.authorId,
              content: comments.content,
              createdAt: comments.createdAt,
              author: users,
            })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id))
            .orderBy(comments.createdAt);

          const postReactions = await db
            .select()
            .from(reactions)
            .where(eq(reactions.postId, post.id));

          return {
            ...post,
            comments: postComments,
            reactions: postReactions,
          };
        })
      );

      res.json(postsWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Personalized AI-curated feed
  app.get("/api/feed/personalized", async (req: Request, res: Response) => {
    // Check authentication
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      // Fetch full user data including interests
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
      
      if (!currentUser) {
        return res.status(404).send("User not found");
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;
      
      // Get user's followed users
      const followedUsers = await db
        .select({ followingId: followers.followingId })
        .from(followers)
        .where(eq(followers.followerId, currentUser.id));
      
      const followedIds = followedUsers.map(f => f.followingId);
      
      // Fetch all recent posts (last 7 days for performance)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Build query with optional category filter
      let query = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaUrls: posts.mediaUrls,
          mediaType: posts.mediaType,
          category: posts.category,
          tags: posts.tags,
          viewCount: posts.viewCount,
          shareCount: posts.shareCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt))
        .$dynamic();
      
      // Apply filters
      const conditions = [sql`datetime(${posts.createdAt}) > datetime(${sevenDaysAgo.toISOString()})`];
      if (category && category !== 'all') {
        conditions.push(eq(posts.category, category));
      }
      
      const allPosts = await query.where(and(...conditions));
      
      // Filter out posts with null createdAt
      const validPosts = allPosts.filter(post => post.createdAt != null);
      
      // Fetch engagement data
      const postsWithDetails = await Promise.all(
        validPosts.map(async (post) => {
          const [commentsData, reactionsData] = await Promise.all([
            db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
              .from(comments)
              .leftJoin(users, eq(comments.authorId, users.id))
              .where(eq(comments.postId, post.id)),
            db.select().from(reactions).where(eq(reactions.postId, post.id))
          ]);
          
          return {
            ...post,
            comments: commentsData,
            reactions: reactionsData,
          };
        })
      );
      
      // Score each post for personalization
      const scoredPosts = postsWithDetails.map((post) => {
        let score = 0;
        const ageHours = (Date.now() - new Date(post.createdAt!).getTime()) / (1000 * 60 * 60);
        
        // 1. Social graph score (50% weight)
        const isFollowing = followedIds.includes(post.authorId);
        if (isFollowing) score += 50;
        
        // 2. Interest/tag overlap (30% weight)
        const userInterests = currentUser.interests || [];
        const postTags = post.tags || [];
        let interestScore = 0;
        
        postTags.forEach((tag: string) => {
          const tagLower = tag.toLowerCase();
          if (userInterests.some((i: string) => i.toLowerCase().includes(tagLower) || tagLower.includes(i.toLowerCase()))) {
            interestScore += 10;
          }
        });
        
        score += Math.min(interestScore, 30); // Cap at 30
        
        // 3. University/major match (10% bonus)
        if (post.author?.university === currentUser.university) score += 5;
        if (post.author?.major === currentUser.major) score += 5;
        
        // 4. Engagement metrics (normalized by age)
        const engagementScore = (
          (post.reactions.length * 1) +
          (post.comments.length * 2) +
          (post.shareCount * 3) +
          (post.viewCount * 0.1)
        );
        score += Math.min(engagementScore / (1 + ageHours / 12), 20);
        
        // 5. Recency decay
        const recencyMultiplier = 1 / (1 + ageHours / 24);
        score *= recencyMultiplier;
        
        return { ...post, score };
      });
      
      // Sort by score and apply diversity constraints
      scoredPosts.sort((a, b) => b.score - a.score);
      
      // Enforce diversity: max 2 posts per author in top results
      const selectedPosts: typeof scoredPosts = [];
      const authorCount = new Map<string, number>();
      
      for (const post of scoredPosts) {
        const count = authorCount.get(post.authorId) || 0;
        if (count < 2) {
          selectedPosts.push(post);
          authorCount.set(post.authorId, count + 1);
        }
        if (selectedPosts.length >= limit) break;
      }
      
      // Remove score from response
      const finalPosts = selectedPosts.map(({ score, ...post }) => post);
      
      res.json(finalPosts);
    } catch (error: any) {
      console.error('Personalized feed error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Following feed (chronological from followed users only)
  app.get("/api/feed/following", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const currentUser = req.user;
      const category = req.query.category as string;
      
      // Get user's followed users
      const followedUsers = await db
        .select({ followingId: followers.followingId })
        .from(followers)
        .where(eq(followers.followerId, currentUser.id));
      
      const followedIds = followedUsers.map(f => f.followingId);
      
      if (followedIds.length === 0) {
        return res.json([]);
      }
      
      // Build query for posts from followed users
      let query = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaUrls: posts.mediaUrls,
          mediaType: posts.mediaType,
          category: posts.category,
          tags: posts.tags,
          viewCount: posts.viewCount,
          shareCount: posts.shareCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt))
        .$dynamic();
      
      // Filter by followed users and optional category
      const conditions = [sql`${posts.authorId} IN ${followedIds}`];
      if (category && category !== 'all') {
        conditions.push(eq(posts.category, category));
      }
      
      const followingPosts = await query.where(and(...conditions));
      
      // Fetch engagement data
      const postsWithDetails = await Promise.all(
        followingPosts.map(async (post) => {
          const [commentsData, reactionsData] = await Promise.all([
            db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
              .from(comments)
              .leftJoin(users, eq(comments.authorId, users.id))
              .where(eq(comments.postId, post.id)),
            db.select().from(reactions).where(eq(reactions.postId, post.id))
          ]);
          
          return {
            ...post,
            comments: commentsData,
            reactions: reactionsData,
          };
        })
      );
      
      res.json(postsWithDetails);
    } catch (error: any) {
      console.error('Following feed error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Trending feed (engagement-weighted posts from last 48 hours)
  app.get("/api/feed/trending", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const category = req.query.category as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get posts from last 48 hours
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
      
      // Build query
      let query = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaUrls: posts.mediaUrls,
          mediaType: posts.mediaType,
          category: posts.category,
          tags: posts.tags,
          viewCount: posts.viewCount,
          shareCount: posts.shareCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt))
        .$dynamic();
      
      // Apply filters
      const conditions = [sql`datetime(${posts.createdAt}) > datetime(${fortyEightHoursAgo.toISOString()})`];
      if (category && category !== 'all') {
        conditions.push(eq(posts.category, category));
      }
      
      const recentPosts = await query.where(and(...conditions));
      
      // Filter out posts with null createdAt
      const validPosts = recentPosts.filter(post => post.createdAt != null);
      
      // Fetch engagement data and calculate trending score
      const postsWithScores = await Promise.all(
        validPosts.map(async (post) => {
          const [commentsData, reactionsData] = await Promise.all([
            db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
              .from(comments)
              .leftJoin(users, eq(comments.authorId, users.id))
              .where(eq(comments.postId, post.id)),
            db.select().from(reactions).where(eq(reactions.postId, post.id))
          ]);
          
          // Calculate trending score: (reactions*3 + comments*5 + shares*8 + views*0.5) / (hours_since_post/6 + 1)
          const ageHours = (Date.now() - new Date(post.createdAt!).getTime()) / (1000 * 60 * 60);
          const engagementScore = (
            reactionsData.length * 3 +
            commentsData.length * 5 +
            (post.shareCount || 0) * 8 +
            (post.viewCount || 0) * 0.5
          );
          const trendingScore = engagementScore / (ageHours / 6 + 1);
          
          return {
            ...post,
            comments: commentsData,
            reactions: reactionsData,
            trendingScore,
          };
        })
      );
      
      // Sort by trending score and limit results
      const trendingPosts = postsWithScores
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map(({ trendingScore, ...post }) => post); // Remove score from response
      
      res.json(trendingPosts);
    } catch (error: any) {
      console.error('Trending feed error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts", blockRestrictedRoles, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertPostSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const [newPost] = await db.insert(posts).values(validatedData).returning();

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 10`,
        })
        .where(eq(users.id, req.user.id));

      res.json(newPost);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // COMMENTS ENDPOINTS
  // ========================================================================

  app.post("/api/comments", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const [newComment] = await db.insert(comments).values(validatedData).returning();

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 5`,
        })
        .where(eq(users.id, req.user.id));

      // Get the post to notify the author
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, validatedData.postId));

      // Create notification for post author (only if not commenting on own post)
      if (post && post.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: post.authorId,
          type: "comment",
          title: "New Comment",
          message: `${req.user.firstName} ${req.user.lastName} commented on your post`,
          link: `/feed`,
        });
      }

      res.json(newComment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // REACTIONS ENDPOINTS
  // ========================================================================

  app.post("/api/reactions", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertReactionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Check if reaction already exists
      const existing = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.postId, validatedData.postId),
            eq(reactions.userId, req.user.id),
            eq(reactions.type, validatedData.type)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: "Already reacted" });
      }

      const [newReaction] = await db.insert(reactions).values(validatedData).returning();

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 2`,
        })
        .where(eq(users.id, req.user.id));

      // Get the post to notify the author
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, validatedData.postId));

      // Create notification for post author (only if not reacting to own post)
      if (post && post.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: post.authorId,
          type: "reaction",
          title: "New Reaction",
          message: `${req.user.firstName} ${req.user.lastName} reacted to your post`,
          link: `/feed`,
        });
      }

      res.json(newReaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // BADGES ENDPOINTS
  // ========================================================================

  app.get("/api/user-badges/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      
      // Check if the target user is a student or teacher
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students and teachers have badges
      if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
        return res.json([]); // Return empty array for other roles
      }

      // Authorization: Only allow student/teacher requesters (regardless of viewing own or other profiles)
      if (req.user.role !== 'student' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: "Access denied: Badges are only available for student and teacher roles" });
      }

      const userBadgesData = await db
        .select({
          id: userBadges.id,
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          badge: badges,
        })
        .from(userBadges)
        .leftJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));

      res.json(userBadgesData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // CERTIFICATIONS ENDPOINTS (NFT-Style Digital Certificates)
  // ========================================================================

  // Get user certifications
  app.get("/api/certifications/user/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      
      // Check if the target user is a student or teacher
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students and teachers have certifications
      if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
        return res.json([]); // Return empty array for other roles
      }

      // Authorization: Only allow student/teacher requesters (regardless of viewing own or other profiles)
      if (req.user.role !== 'student' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: "Access denied: Certifications are only available for student and teacher roles" });
      }

      const userCertifications = await db
        .select({
          id: certifications.id,
          userId: certifications.userId,
          type: certifications.type,
          title: certifications.title,
          description: certifications.description,
          issuerName: certifications.issuerName,
          issuerId: certifications.issuerId,
          verificationHash: certifications.verificationHash,
          metadata: certifications.metadata,
          imageUrl: certifications.imageUrl,
          isPublic: certifications.isPublic,
          issuedAt: certifications.issuedAt,
          expiresAt: certifications.expiresAt,
          issuer: users,
        })
        .from(certifications)
        .leftJoin(users, eq(certifications.issuerId, users.id))
        .where(eq(certifications.userId, req.params.userId))
        .orderBy(desc(certifications.issuedAt));

      res.json(userCertifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Issue a new certification
  app.post("/api/certifications", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Only teachers, university admins, and master admins can issue certificates
    const authorizedRoles = ['teacher', 'university_admin', 'master_admin'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Forbidden: Only teachers and administrators can issue certificates" 
      });
    }

    try {
      const validatedData = insertCertificationSchema.parse(req.body);

      // Set issuer name from authenticated user (cannot be spoofed)
      const issuerName = `${req.user.firstName} ${req.user.lastName}`;

      // Generate verification hash using crypto
      const crypto = await import('crypto');
      const hashData = JSON.stringify({
        ...validatedData,
        timestamp: Date.now(),
        issuerId: req.user.id,
        issuerName,
      });
      const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

      const [newCertification] = await db
        .insert(certifications)
        .values({
          ...validatedData,
          issuerId: req.user.id,
          issuerName,
          verificationHash,
        })
        .returning();

      // Create notification
      await db.insert(notifications).values({
        userId: validatedData.userId,
        type: "achievement",
        title: "New Certificate Earned!",
        message: `You've earned a certificate: ${validatedData.title}`,
        link: "/profile",
      });

      // Fetch complete certification with issuer and user data
      // Use a second query to get issuer information
      const [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, newCertification.userId))
        .limit(1);

      const [issuer] = await db
        .select()
        .from(users)
        .where(eq(users.id, newCertification.issuerId!))
        .limit(1);

      // Construct complete certification with user and issuer data
      const completeCertification = {
        ...newCertification,
        user: recipient,
        issuer: issuer ? {
          id: issuer.id,
          firstName: issuer.firstName,
          lastName: issuer.lastName,
        } : null,
      };

      res.json(completeCertification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Verify certification by hash (public endpoint)
  app.get("/api/certifications/verify/:hash", async (req: Request, res: Response) => {
    try {
      const certification = await db
        .select({
          id: certifications.id,
          userId: certifications.userId,
          type: certifications.type,
          title: certifications.title,
          description: certifications.description,
          issuerName: certifications.issuerName,
          issuerId: certifications.issuerId,
          verificationHash: certifications.verificationHash,
          metadata: certifications.metadata,
          imageUrl: certifications.imageUrl,
          issuedAt: certifications.issuedAt,
          expiresAt: certifications.expiresAt,
          user: users,
          issuer: {
            firstName: sql<string>`issuer.first_name`,
            lastName: sql<string>`issuer.last_name`,
            email: sql<string>`issuer.email`,
          },
        })
        .from(certifications)
        .leftJoin(users, eq(certifications.userId, users.id))
        .leftJoin(
          sql`${users} as issuer`,
          eq(certifications.issuerId, sql`issuer.id`)
        )
        .where(
          and(
            eq(certifications.verificationHash, req.params.hash),
            eq(certifications.isPublic, true)
          )
        )
        .limit(1);

      if (certification.length === 0) {
        return res.status(404).json({ error: "Certificate not found or not public" });
      }

      // Check if expired
      const cert = certification[0];
      if (cert.expiresAt && new Date(cert.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Certificate has expired", certification: cert });
      }

      res.json({ valid: true, certification: cert });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific certification (for export)
  app.get("/api/certifications/:id", async (req: Request, res: Response) => {
    try {
      const [certification] = await db
        .select({
          id: certifications.id,
          userId: certifications.userId,
          type: certifications.type,
          title: certifications.title,
          description: certifications.description,
          issuerName: certifications.issuerName,
          issuerId: certifications.issuerId,
          verificationHash: certifications.verificationHash,
          metadata: certifications.metadata,
          imageUrl: certifications.imageUrl,
          isPublic: certifications.isPublic,
          issuedAt: certifications.issuedAt,
          expiresAt: certifications.expiresAt,
          user: users,
          issuer: {
            id: sql<string>`issuer.id`,
            firstName: sql<string>`issuer.first_name`,
            lastName: sql<string>`issuer.last_name`,
          },
        })
        .from(certifications)
        .leftJoin(users, eq(certifications.userId, users.id))
        .leftJoin(
          sql`${users} as issuer`,
          eq(certifications.issuerId, sql`issuer.id`)
        )
        .where(eq(certifications.id, req.params.id))
        .limit(1);

      if (!certification) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      res.json(certification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // RECRUITER FEEDBACK (Industry Professional Feedback on Students)
  // ========================================================================

  // Get all feedback for a student (used by CareerBot and student profiles)
  app.get("/api/recruiter-feedback/student/:studentId", async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      
      const feedback = await db
        .select({
          id: recruiterFeedback.id,
          recruiterId: recruiterFeedback.recruiterId,
          studentId: recruiterFeedback.studentId,
          rating: recruiterFeedback.rating,
          category: recruiterFeedback.category,
          feedback: recruiterFeedback.feedback,
          context: recruiterFeedback.context,
          challengeId: recruiterFeedback.challengeId,
          isPublic: recruiterFeedback.isPublic,
          createdAt: recruiterFeedback.createdAt,
          recruiter: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            company: users.company,
            position: users.position,
          },
        })
        .from(recruiterFeedback)
        .leftJoin(users, eq(recruiterFeedback.recruiterId, users.id))
        .where(eq(recruiterFeedback.studentId, studentId))
        .orderBy(desc(recruiterFeedback.createdAt));

      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit recruiter feedback (industry professionals only)
  app.post("/api/recruiter-feedback", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Only industry professionals can submit recruiter feedback
    if (req.user.role !== 'industry_professional') {
      return res.status(403).json({ 
        error: "Forbidden: Only industry professionals can submit recruiter feedback" 
      });
    }

    try {
      const validatedData = insertRecruiterFeedbackSchema.parse({
        ...req.body,
        recruiterId: req.user.id,
      });

      const [newFeedback] = await db
        .insert(recruiterFeedback)
        .values(validatedData)
        .returning();

      // If feedback is public, send notification to student
      if (newFeedback.isPublic) {
        await db.insert(notifications).values({
          userId: newFeedback.studentId,
          type: 'recruiter_feedback',
          title: 'New Recruiter Feedback',
          message: `${req.user.company || 'A recruiter'} has left feedback on your ${newFeedback.category} skills`,
          link: `/profile?userId=${newFeedback.studentId}`,
        });
      }

      res.json(newFeedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get aggregated feedback insights for a student (for CareerBot integration)
  app.get("/api/recruiter-feedback/insights/:studentId", async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      
      // Get all feedback for analysis
      const allFeedback = await db
        .select()
        .from(recruiterFeedback)
        .where(eq(recruiterFeedback.studentId, studentId));

      // Calculate aggregated insights
      const totalFeedback = allFeedback.length;
      const avgRating = totalFeedback > 0 
        ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
        : 0;

      // Group by category
      const categoryBreakdown = allFeedback.reduce((acc, f) => {
        if (!acc[f.category]) {
          acc[f.category] = { count: 0, totalRating: 0, feedback: [] };
        }
        acc[f.category].count += 1;
        acc[f.category].totalRating += f.rating;
        acc[f.category].feedback.push({
          rating: f.rating,
          feedback: f.feedback,
          context: f.context,
          createdAt: f.createdAt,
        });
        return acc;
      }, {} as Record<string, { count: number; totalRating: number; feedback: any[] }>);

      // Calculate average by category
      const categoryInsights = Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        count: data.count,
        avgRating: data.totalRating / data.count,
        recentFeedback: data.feedback.slice(0, 3), // Last 3 pieces of feedback
      }));

      // Get common themes from feedback text
      const allFeedbackText = allFeedback.map(f => f.feedback);

      res.json({
        totalFeedback,
        avgRating: Math.round(avgRating * 10) / 10,
        categoryInsights,
        allFeedbackText, // For AI analysis
        strengths: categoryInsights.filter(c => c.avgRating >= 4).map(c => c.category),
        improvementAreas: categoryInsights.filter(c => c.avgRating < 3).map(c => c.category),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get talent insights for industry recruiters (view feedback they've given)
  app.get("/api/recruiter-feedback/my-feedback", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    if (req.user.role !== 'industry_professional') {
      return res.status(403).json({ error: "Forbidden: Only industry professionals can access this endpoint" });
    }

    try {
      const myFeedback = await db
        .select({
          id: recruiterFeedback.id,
          studentId: recruiterFeedback.studentId,
          rating: recruiterFeedback.rating,
          category: recruiterFeedback.category,
          feedback: recruiterFeedback.feedback,
          context: recruiterFeedback.context,
          challengeId: recruiterFeedback.challengeId,
          createdAt: recruiterFeedback.createdAt,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            major: users.major,
            university: users.university,
            engagementScore: users.engagementScore,
          },
        })
        .from(recruiterFeedback)
        .leftJoin(users, eq(recruiterFeedback.studentId, users.id))
        .where(eq(recruiterFeedback.recruiterId, req.user.id))
        .orderBy(desc(recruiterFeedback.createdAt));

      res.json(myFeedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // SKILLS & ENDORSEMENTS
  // ========================================================================

  app.get("/api/skills", async (req: Request, res: Response) => {
    try {
      const allSkills = await db.select().from(skills).orderBy(skills.name);
      res.json(allSkills);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endorsements/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      
      // Check if the target user is a student or teacher
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students and teachers have endorsements
      if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
        return res.json([]); // Return empty array for other roles
      }

      // Authorization: Only allow student/teacher requesters (regardless of viewing own or other profiles)
      if (req.user.role !== 'student' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: "Access denied: Endorsements are only available for student and teacher roles" });
      }

      const userEndorsements = await db
        .select({
          id: endorsements.id,
          endorserId: endorsements.endorserId,
          endorsedUserId: endorsements.endorsedUserId,
          skillId: endorsements.skillId,
          comment: endorsements.comment,
          createdAt: endorsements.createdAt,
          endorser: users,
          skill: skills,
        })
        .from(endorsements)
        .leftJoin(users, eq(endorsements.endorserId, users.id))
        .leftJoin(skills, eq(endorsements.skillId, skills.id))
        .where(eq(endorsements.endorsedUserId, req.params.userId))
        .orderBy(desc(endorsements.createdAt));

      res.json(userEndorsements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endorsements", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertEndorsementSchema.parse({
        ...req.body,
        endorserId: req.user.id,
      });

      const [newEndorsement] = await db.insert(endorsements).values(validatedData).returning();

      // Update endorsement score for endorsed user
      await db
        .update(users)
        .set({
          endorsementScore: sql`${users.endorsementScore} + 10`,
          engagementScore: sql`${users.engagementScore} + 15`,
        })
        .where(eq(users.id, validatedData.endorsedUserId));

      // Create notification
      await db.insert(notifications).values({
        userId: validatedData.endorsedUserId,
        type: "endorsement",
        title: "New Endorsement!",
        message: `${req.user.firstName} ${req.user.lastName} endorsed you`,
        link: "/profile",
      });

      res.json(newEndorsement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // STUDENTS ENDPOINT (for teachers, industry, admins)
  // ========================================================================

  app.get("/api/students", async (req: Request, res: Response) => {
    try {
      const students = await db
        .select()
        .from(users)
        .where(eq(users.role, "student"))
        .orderBy(desc(users.engagementScore));

      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user by ID (for viewing other users' profiles)
  app.get("/api/users/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // EDUCATION RECORDS ENDPOINTS
  // ========================================================================

  // Get education records for a user
  app.get("/api/users/:userId/education", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;

      // Check if the target user is a student or teacher
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students and teachers have education records
      if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
        return res.json([]); // Return empty array for other roles
      }

      // Authorization: Only allow student/teacher requesters (regardless of viewing own or other profiles)
      if (req.user.role !== 'student' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: "Access denied: Education records are only available for student and teacher roles" });
      }

      const records = await db
        .select()
        .from(educationRecords)
        .where(eq(educationRecords.userId, userId))
        .orderBy(desc(educationRecords.isCurrent), desc(educationRecords.startDate));

      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add education record
  app.post("/api/education", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validated = insertEducationRecordSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const [record] = await db
        .insert(educationRecords)
        .values(validated)
        .returning();

      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update education record
  app.patch("/api/education/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(educationRecords)
        .where(eq(educationRecords.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Education record not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this record" });
      }

      const [updated] = await db
        .update(educationRecords)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(educationRecords.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete education record
  app.delete("/api/education/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(educationRecords)
        .where(eq(educationRecords.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Education record not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to delete this record" });
      }

      await db
        .delete(educationRecords)
        .where(eq(educationRecords.id, id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // USER SKILLS ENDPOINTS
  // ========================================================================

  // Add skill to user profile
  app.post("/api/users/skills", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { skillId, level } = req.body;

      if (!skillId) {
        return res.status(400).json({ error: "Skill ID is required" });
      }

      // Check if skill already added
      const existing = await db
        .select()
        .from(userSkills)
        .where(and(
          eq(userSkills.userId, req.user.id),
          eq(userSkills.skillId, skillId)
        ));

      if (existing.length > 0) {
        return res.status(400).json({ error: "Skill already added" });
      }

      const [userSkill] = await db
        .insert(userSkills)
        .values({
          userId: req.user.id,
          skillId,
          level: level || 'beginner',
        })
        .returning();

      res.json(userSkill);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update skill level
  app.patch("/api/users/skills/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      const { level } = req.body;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "User skill not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const [updated] = await db
        .update(userSkills)
        .set({ level })
        .where(eq(userSkills.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Remove skill from user profile
  app.delete("/api/users/skills/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "User skill not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await db
        .delete(userSkills)
        .where(eq(userSkills.id, id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user skills for a specific user
  app.get("/api/user-skills/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;

      // Check if the target user is a student or teacher
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students and teachers have skills
      if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
        return res.json([]); // Return empty array for other roles
      }

      // Authorization: Only allow student/teacher requesters (regardless of viewing own or other profiles)
      if (req.user.role !== 'student' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: "Access denied: Skills are only available for student and teacher roles" });
      }

      const userSkillsData = await db
        .select({
          id: userSkills.id,
          userId: userSkills.userId,
          skillId: userSkills.skillId,
          level: userSkills.level,
          skill: skills,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(eq(userSkills.userId, userId))
        .orderBy(skills.name);

      res.json(userSkillsData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all available skills
  app.get("/api/skills", async (req: Request, res: Response) => {
    try {
      const allSkills = await db
        .select()
        .from(skills)
        .orderBy(skills.name);

      res.json(allSkills);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // COURSE BADGE AWARDING LOGIC
  // ========================================================================

  /**
   * Check and award course-related badges to a student based on their activity in a course
   * Milestone types:
   * - first_discussion: Posted first discussion in a course
   * - five_helpful_answers: Provided 5 answers with 3+ upvotes each
   * - resolved_three_questions: Helped resolve 3 questions
   * - active_contributor: 10+ discussions or replies in a course
   */
  async function checkAndAwardCourseBadges(userId: string, courseId: string) {
    try {
      // Define course-specific badges (these should exist in the badges table)
      const courseBadgeTypes = {
        first_discussion: "Discussion Starter",
        five_helpful_answers: "Helpful Contributor",
        resolved_three_questions: "Problem Solver",
        active_contributor: "Active Learner",
      };

      // Check milestone: first_discussion
      const [discussionCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(courseDiscussions)
        .where(and(
          eq(courseDiscussions.authorId, userId),
          eq(courseDiscussions.courseId, courseId)
        ));
      
      if (Number(discussionCount.count) === 1) {
        // Award first discussion milestone
        await db.insert(courseMilestones).values({
          studentId: userId,
          courseId,
          milestoneType: 'first_discussion',
        }).onConflictDoNothing();

        // Award badge if it doesn't exist
        const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.first_discussion)).limit(1);
        if (badgeData) {
          await db.insert(userBadges).values({
            userId,
            badgeId: badgeData.id,
          }).onConflictDoNothing();

          // Create notification
          await db.insert(notifications).values({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the "${badgeData.name}" badge for posting your first discussion!`,
            link: `/profile?userId=${userId}`,
          }).onConflictDoNothing();
        }
      }

      // Check milestone: five_helpful_answers (replies with 3+ upvotes)
      const [helpfulRepliesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(discussionReplies)
        .innerJoin(courseDiscussions, eq(discussionReplies.discussionId, courseDiscussions.id))
        .where(and(
          eq(discussionReplies.authorId, userId),
          eq(courseDiscussions.courseId, courseId),
          sql`${discussionReplies.upvoteCount} >= 3`
        ));
      
      if (Number(helpfulRepliesResult.count) >= 5) {
        const [existingMilestone] = await db
          .select()
          .from(courseMilestones)
          .where(and(
            eq(courseMilestones.studentId, userId),
            eq(courseMilestones.courseId, courseId),
            eq(courseMilestones.milestoneType, 'five_helpful_answers')
          ));
        
        if (!existingMilestone) {
          await db.insert(courseMilestones).values({
            studentId: userId,
            courseId,
            milestoneType: 'five_helpful_answers',
          }).onConflictDoNothing();

          const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.five_helpful_answers)).limit(1);
          if (badgeData) {
            await db.insert(userBadges).values({
              userId,
              badgeId: badgeData.id,
            }).onConflictDoNothing();

            await db.insert(notifications).values({
              userId,
              type: 'badge_earned',
              title: 'New Badge Earned!',
              message: `You earned the "${badgeData.name}" badge for providing 5 helpful answers!`,
              link: `/profile?userId=${userId}`,
            }).onConflictDoNothing();
          }
        }
      }

      // Check milestone: resolved_three_questions
      const [resolvedQuestionsResult] = await db
        .select({ count: sql<number>`count(distinct ${courseDiscussions.id})` })
        .from(discussionReplies)
        .innerJoin(courseDiscussions, eq(discussionReplies.discussionId, courseDiscussions.id))
        .where(and(
          eq(discussionReplies.authorId, userId),
          eq(courseDiscussions.courseId, courseId),
          eq(courseDiscussions.isResolved, true)
        ));
      
      if (Number(resolvedQuestionsResult.count) >= 3) {
        const [existingMilestone] = await db
          .select()
          .from(courseMilestones)
          .where(and(
            eq(courseMilestones.studentId, userId),
            eq(courseMilestones.courseId, courseId),
            eq(courseMilestones.milestoneType, 'resolved_three_questions')
          ));
        
        if (!existingMilestone) {
          await db.insert(courseMilestones).values({
            studentId: userId,
            courseId,
            milestoneType: 'resolved_three_questions',
          }).onConflictDoNothing();

          const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.resolved_three_questions)).limit(1);
          if (badgeData) {
            await db.insert(userBadges).values({
              userId,
              badgeId: badgeData.id,
            }).onConflictDoNothing();

            await db.insert(notifications).values({
              userId,
              type: 'badge_earned',
              title: 'New Badge Earned!',
              message: `You earned the "${badgeData.name}" badge for helping resolve 3 questions!`,
              link: `/profile?userId=${userId}`,
            }).onConflictDoNothing();
          }
        }
      }

      // Check milestone: active_contributor (10+ discussions/replies)
      const discussionsAndRepliesResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM (
          SELECT id FROM ${courseDiscussions} WHERE ${courseDiscussions.authorId} = ${userId} AND ${courseDiscussions.courseId} = ${courseId}
          UNION ALL
          SELECT ${discussionReplies.id} FROM ${discussionReplies}
          INNER JOIN ${courseDiscussions} ON ${discussionReplies.discussionId} = ${courseDiscussions.id}
          WHERE ${discussionReplies.authorId} = ${userId} AND ${courseDiscussions.courseId} = ${courseId}
        ) as combined
      `);
      
      const totalActivity = Number((discussionsAndRepliesResult.rows[0] as any)?.count || 0);
      
      if (totalActivity >= 10) {
        const [existingMilestone] = await db
          .select()
          .from(courseMilestones)
          .where(and(
            eq(courseMilestones.studentId, userId),
            eq(courseMilestones.courseId, courseId),
            eq(courseMilestones.milestoneType, 'active_contributor')
          ));
        
        if (!existingMilestone) {
          await db.insert(courseMilestones).values({
            studentId: userId,
            courseId,
            milestoneType: 'active_contributor',
          }).onConflictDoNothing();

          const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.active_contributor)).limit(1);
          if (badgeData) {
            await db.insert(userBadges).values({
              userId,
              badgeId: badgeData.id,
            }).onConflictDoNothing();

            await db.insert(notifications).values({
              userId,
              type: 'badge_earned',
              title: 'New Badge Earned!',
              message: `You earned the "${badgeData.name}" badge for being an active contributor!`,
              link: `/profile?userId=${userId}`,
            }).onConflictDoNothing();
          }
        }
      }
    } catch (error) {
      console.error('Error checking course badges:', error);
      // Don't throw error - badge awarding is not critical to the operation
    }
  }

  // ========================================================================
  // COURSE FORUMS & DISCUSSIONS ENDPOINTS
  // ========================================================================

  // Get all courses
  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const allCourses = await storage.getCourses();
      res.json(allCourses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get detailed course information including instructor, enrollments, discussions
  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      
      // Get course with instructor
      const courseData = await db
        .select({
          course: courses,
          instructor: users,
        })
        .from(courses)
        .leftJoin(users, eq(courses.instructorId, users.id))
        .where(eq(courses.id, courseId))
        .limit(1);
      
      if (courseData.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Get enrolled students count
      const enrolledStudentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.courseId, courseId));
      
      const enrolledCount = Number(enrolledStudentsResult[0]?.count || 0);

      // Get top discussions (limited to 5)
      const topDiscussions = await db
        .select({
          discussion: courseDiscussions,
          author: users,
        })
        .from(courseDiscussions)
        .leftJoin(users, eq(courseDiscussions.authorId, users.id))
        .where(eq(courseDiscussions.courseId, courseId))
        .orderBy(desc(courseDiscussions.upvoteCount), desc(courseDiscussions.createdAt))
        .limit(5);

      res.json({
        ...courseData[0].course,
        instructor: courseData[0].instructor,
        enrolledCount,
        topDiscussions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get discussions for a course with author info
  app.get("/api/courses/:courseId/discussions", async (req: Request, res: Response) => {
    try {
      const discussionsData = await db
        .select({
          discussion: courseDiscussions,
          author: users,
        })
        .from(courseDiscussions)
        .leftJoin(users, eq(courseDiscussions.authorId, users.id))
        .where(eq(courseDiscussions.courseId, req.params.courseId))
        .orderBy(desc(courseDiscussions.upvoteCount), desc(courseDiscussions.createdAt))
        .limit(50); // Pagination limit

      res.json(discussionsData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new discussion
  app.post("/api/discussions", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertCourseDiscussionSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const newDiscussion = await storage.createDiscussion(validatedData);
      
      // Update engagement score
      await db
        .update(users)
        .set({ engagementScore: sql`${users.engagementScore} + 5` })
        .where(eq(users.id, req.user.id));

      // Check and award course badges
      await checkAndAwardCourseBadges(req.user.id, validatedData.courseId);

      res.json(newDiscussion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get discussion with replies and author info
  app.get("/api/discussions/:discussionId/replies", async (req: Request, res: Response) => {
    try {
      const repliesData = await db
        .select({
          reply: discussionReplies,
          author: users,
        })
        .from(discussionReplies)
        .leftJoin(users, eq(discussionReplies.authorId, users.id))
        .where(eq(discussionReplies.discussionId, req.params.discussionId))
        .orderBy(desc(discussionReplies.upvoteCount), desc(discussionReplies.createdAt))
        .limit(100); // Pagination limit

      res.json(repliesData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a reply
  app.post("/api/replies", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertDiscussionReplySchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const newReply = await storage.createReply(validatedData);
      
      // Update engagement score
      await db
        .update(users)
        .set({ engagementScore: sql`${users.engagementScore} + 3` })
        .where(eq(users.id, req.user.id));

      // Get the discussion to notify the author
      const [discussion] = await db
        .select()
        .from(courseDiscussions)
        .where(eq(courseDiscussions.id, validatedData.discussionId));

      if (discussion && discussion.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: discussion.authorId,
          type: "comment",
          title: "New Reply",
          message: `${req.user.firstName} ${req.user.lastName} replied to your discussion`,
          link: `/forums/${discussion.courseId}/${discussion.id}`,
        });
      }

      // Check and award course badges
      if (discussion) {
        await checkAndAwardCourseBadges(req.user.id, discussion.courseId);
      }

      res.json(newReply);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Toggle upvote on discussion
  app.post("/api/discussions/:discussionId/upvote", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const upvoted = await storage.toggleDiscussionUpvote(
        req.user.id,
        req.params.discussionId
      );

      res.json({ upvoted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle upvote on reply
  app.post("/api/replies/:replyId/upvote", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const upvoted = await storage.toggleReplyUpvote(
        req.user.id,
        req.params.replyId
      );

      res.json({ upvoted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // CHALLENGES ENDPOINTS
  // ========================================================================

  app.get("/api/challenges/:status?", async (req: Request, res: Response) => {
    try {
      let query = db.select().from(challenges).orderBy(desc(challenges.createdAt)).$dynamic();

      if (req.params.status && req.params.status !== 'all') {
        query = query.where(eq(challenges.status, req.params.status));
      }

      const challengesData = await query;
      res.json(challengesData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/challenges", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertChallengeSchema.parse({
        ...req.body,
        organizerId: req.user.id,
      });

      const [newChallenge] = await db.insert(challenges).values(validatedData).returning();
      res.json(newChallenge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get challenge milestones for a user
  app.get("/api/users/:userId/challenge-milestones", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userId = req.params.userId;
      
      const participations = await db
        .select({
          id: challengeParticipants.id,
          challengeId: challengeParticipants.challengeId,
          userId: challengeParticipants.userId,
          submissionUrl: challengeParticipants.submissionUrl,
          submittedAt: challengeParticipants.submittedAt,
          rank: challengeParticipants.rank,
          joinedAt: challengeParticipants.joinedAt,
          challenge: challenges,
        })
        .from(challengeParticipants)
        .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
        .where(eq(challengeParticipants.userId, userId))
        .orderBy(desc(challengeParticipants.joinedAt));

      const milestones = participations.map((p) => {
        let status = 'joined';
        let placement = null;
        
        if (p.rank && p.rank <= 3) {
          status = 'winner';
          placement = p.rank === 1 ? '1st Place' : p.rank === 2 ? '2nd Place' : '3rd Place';
        } else if (p.submittedAt) {
          status = 'submitted';
        }

        return {
          ...p,
          participationStatus: status,
          placement,
        };
      });

      const activeCount = milestones.filter(m => m.challenge?.status === 'active').length;
      const completedCount = milestones.filter(m => m.challenge?.status === 'completed').length;
      const winsCount = milestones.filter(m => m.placement).length;
      const upcomingDeadlines = milestones
        .filter(m => m.challenge?.status === 'active' && m.challenge?.endDate)
        .slice(0, 3);

      res.json({
        milestones: milestones.slice(0, 10),
        stats: {
          activeCount,
          completedCount,
          winsCount,
        },
        upcomingDeadlines,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get challenges for global map
  app.get("/api/challenges/map", async (req: Request, res: Response) => {
    try {
      const challengesData = await db
        .select()
        .from(challenges)
        .orderBy(desc(challenges.createdAt));

      const universityCounts: Record<string, { active: number; upcoming: number; completed: number; total: number; challenges: typeof challengesData }> = {};

      challengesData.forEach((challenge) => {
        const university = challenge.hostUniversity || 'Global';
        if (!universityCounts[university]) {
          universityCounts[university] = { active: 0, upcoming: 0, completed: 0, total: 0, challenges: [] };
        }
        universityCounts[university].total++;
        universityCounts[university].challenges.push(challenge);
        
        if (challenge.status === 'active') universityCounts[university].active++;
        else if (challenge.status === 'upcoming') universityCounts[university].upcoming++;
        else if (challenge.status === 'completed') universityCounts[university].completed++;
      });

      res.json({
        challenges: challengesData,
        universityCounts,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // NOTIFICATIONS ENDPOINT
  // ========================================================================

  app.get("/api/notifications", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      res.json(userNotifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // AI CAREERBOT ENDPOINT
  // ========================================================================

  app.post("/api/careerbot/chat", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI CareerBot is not available. Please configure the OpenAI API key." });
      }

      // Get user's skills for skill gap analysis
      const userSkillsData = await db
        .select({
          skill: skills,
          level: userSkills.level,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(eq(userSkills.userId, req.user.id));

      const skillsList = userSkillsData.map(s => `${s.skill?.name} (${s.level})`).join(', ') || 'None listed';
      const userInterests = (req.user as any).interests?.join(', ') || 'Not specified';

      // Get recruiter feedback for enhanced career guidance
      const recruiterFeedbackData = await db
        .select({
          rating: recruiterFeedback.rating,
          category: recruiterFeedback.category,
          feedback: recruiterFeedback.feedback,
          context: recruiterFeedback.context,
          recruiterCompany: users.company,
          createdAt: recruiterFeedback.createdAt,
        })
        .from(recruiterFeedback)
        .leftJoin(users, eq(recruiterFeedback.recruiterId, users.id))
        .where(and(
          eq(recruiterFeedback.studentId, req.user.id),
          eq(recruiterFeedback.isPublic, true) // Only public feedback
        ))
        .orderBy(desc(recruiterFeedback.createdAt))
        .limit(10);

      // Aggregate recruiter feedback insights
      let recruiterInsights = '';
      if (recruiterFeedbackData.length > 0) {
        const avgRating = recruiterFeedbackData.reduce((sum, f) => sum + f.rating, 0) / recruiterFeedbackData.length;
        const strengths = recruiterFeedbackData.filter(f => f.rating >= 4).map(f => f.category);
        const improvementAreas = recruiterFeedbackData.filter(f => f.rating <= 2).map(f => f.category);
        
        recruiterInsights = `\n\nIndustry Professional Feedback (${recruiterFeedbackData.length} reviews, avg: ${avgRating.toFixed(1)}/5):
- Strengths noted by recruiters: ${strengths.join(', ') || 'None yet'}
- Areas for improvement: ${improvementAreas.join(', ') || 'None yet'}
- Recent feedback highlights: ${recruiterFeedbackData.slice(0, 3).map(f => `"${f.feedback.substring(0, 100)}..." (${f.category}, ${f.rating}/5 from ${f.recruiterCompany || 'industry partner'})`).join('; ')}`;
      }

      const systemPrompt = `You are an AI Career Companion for university students on UniNexus. You provide comprehensive, personalized career guidance including:

1. **Job Market Insights**: Current trends, in-demand skills, emerging industries
2. **CV/Resume Enhancement**: Specific suggestions for improving professional profiles
3. **Skill Gap Analysis**: Identify missing skills for target careers
4. **Learning Path Recommendations**: Courses, projects, and communities to join
5. **Career Planning**: Strategic advice for employability and professional growth
6. **Industry Feedback Integration**: Leverage real recruiter feedback to provide highly personalized guidance

User Profile:
- Name: ${req.user.firstName} ${req.user.lastName}
- Major: ${req.user.major || "Not specified"}
- University: ${req.user.university || "Not specified"}
- Interests: ${userInterests}
- Current Skills: ${skillsList}
- Engagement Score: ${req.user.engagementScore} (indicates platform activity level)
- Problem Solver Score: ${req.user.problemSolverScore} (indicates problem-solving abilities)
- Endorsement Score: ${req.user.endorsementScore} (indicates peer recognition)${recruiterInsights}

Guidelines:
- Provide actionable, specific advice tailored to their profile
- When discussing careers, mention current job market trends (2024-2025)
- For resume/CV questions, give concrete examples and formatting tips
- For skill gaps, suggest specific resources (courses, certifications, projects)
- Recommend relevant online communities, platforms, or networking opportunities
- Use an encouraging, professional tone suitable for Gen Z professionals
- Keep responses concise (2-4 paragraphs) but information-rich
- Include metrics or data when discussing job markets when relevant
- **IMPORTANT**: If recruiter feedback is available, incorporate it into your advice - validate their strengths and provide targeted suggestions for improvement areas
- Reference specific recruiter feedback when relevant to the user's question

Example responses:
- For "What skills should I learn?": Analyze their major, current skills, recruiter feedback, and suggest 3-5 specific in-demand skills with learning resources
- For "Help with my resume": Provide specific sections to improve, formatting tips, action words, and leverage recruiter feedback on strengths to highlight
- For "Job market for X field": Discuss current trends, salary ranges, growth projections, required skills, and how their recruiter feedback aligns with industry needs
- For "Career advice": Provide strategic roadmap based on their current position, goals, and recruiter-validated strengths/improvement areas`;

      // Using gpt-4o (latest OpenAI model as of 2024-2025)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 800, // Increased for more detailed responses
      });

      const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      // Update engagement score for using CareerBot
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 3`,
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: assistantMessage });
    } catch (error: any) {
      console.error("CareerBot error:", error);
      res.status(500).json({ error: "Failed to get response from CareerBot" });
    }
  });

  // ========================================================================
  // AI POST SUGGESTIONS ENDPOINT
  // ========================================================================

  app.get("/api/ai/suggest-posts", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!openai) {
        return res.status(503).json({ error: "AI post suggestions are not available. Please configure the OpenAI API key." });
      }

      const userInterests = (req.user as any).interests || [];
      const interestsText = userInterests.length > 0 ? userInterests.join(', ') : 'general academic topics';

      const systemPrompt = `You are a creative content generator for a Gen Z student social platform. Generate 3 engaging post ideas that would resonate with university students. The posts should be inspiring, educational, or thought-provoking.

User Profile:
- Name: ${req.user.firstName} ${req.user.lastName}
- Major: ${req.user.major || "Not specified"}
- Interests: ${interestsText}

Generate 3 diverse post ideas (one academic, one social/community, one project/achievement related) that would be interesting to this user. Each post should be:
- Engaging and relevant to Gen Z students
- 2-3 sentences long
- Include a call-to-action or question to encourage discussion
- Appropriate for a university social platform

Format your response as a JSON array of objects with fields: category (academic/social/project), content (the post text), and tags (array of 2-3 relevant hashtags).`;

      // Using gpt-4o (latest OpenAI model as of 2024-2025)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 3 personalized post ideas for me." },
        ],
        temperature: 0.8,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || '{"posts":[]}';
      let parsed;
      
      try {
        parsed = JSON.parse(responseText);
      } catch (error) {
        console.error("Failed to parse AI response:", error);
        return res.json({ posts: [] });
      }

      // Ensure the response has a posts array
      const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
      
      res.json({ posts });
    } catch (error: any) {
      console.error("AI post suggestions error:", error);
      res.status(500).json({ error: "Failed to generate post suggestions" });
    }
  });

  // ========================================================================
  // AI CONTENT MODERATION ENDPOINT
  // ========================================================================

  app.post("/api/ai/moderate-content", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Content is required" });
      }

      if (!openai) {
        // If OpenAI is not available, default to allowing the content
        return res.json({ 
          approved: true, 
          reason: "Moderation unavailable",
          confidence: 0 
        });
      }

      const moderationPrompt = `You are a content moderator for a university social platform. Analyze the following content and determine if it's appropriate. Content should be rejected if it contains:
- Hate speech or discrimination
- Harassment or bullying
- Explicit sexual content
- Violence or threats
- Spam or scams
- Misinformation that could be harmful

Content to moderate:
"${content}"

Respond with a JSON object containing:
- approved (boolean): true if content is appropriate, false otherwise
- reason (string): brief explanation (max 50 words)
- confidence (number): 0-1 confidence score

Be lenient with academic discussions, debates, and Gen Z slang. Only flag clearly inappropriate content.`;

      // Using gpt-4o-mini for cost-efficient content moderation
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: moderationPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const moderation = JSON.parse(responseText);

      res.json(moderation);
    } catch (error: any) {
      console.error("Content moderation error:", error);
      // Default to approving if moderation fails
      res.json({ 
        approved: true, 
        reason: "Moderation check failed, defaulting to approval",
        confidence: 0 
      });
    }
  });

  // ========================================================================
  // AI CAREER PROGRESSION SUMMARY ENDPOINT
  // ========================================================================

  app.get("/api/ai/career-summary/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Only teachers, university admins, and master admins can view career summaries
    const authorizedRoles = ['teacher', 'university_admin', 'master_admin'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Forbidden: Only teachers and administrators can view career summaries" 
      });
    }

    try {
      if (!openai) {
        return res.status(503).json({ 
          error: "AI career summaries are not available. Please configure the OpenAI API key.",
          summary: "Career summary feature requires OpenAI API configuration."
        });
      }

      const { userId } = req.params;

      // Fetch student data
      const [student] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Fetch student's skills
      const studentSkills = await db
        .select({
          skill: skills,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(eq(userSkills.userId, userId));

      // Fetch student's endorsements
      const studentEndorsements = await db
        .select({
          skill: skills,
          endorser: users,
          comment: endorsements.comment,
        })
        .from(endorsements)
        .leftJoin(skills, eq(endorsements.skillId, skills.id))
        .leftJoin(users, eq(endorsements.endorserId, users.id))
        .where(eq(endorsements.endorsedUserId, userId));

      // Fetch student's badges
      const studentBadges = await db
        .select({
          badge: badges,
        })
        .from(userBadges)
        .leftJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId));

      // Fetch student's certifications
      const studentCertifications = await db
        .select()
        .from(certifications)
        .where(eq(certifications.userId, userId));

      // Build context for AI
      const skillsList = studentSkills.map(s => s.skill?.name).filter(Boolean).join(', ') || 'No skills listed';
      const endorsementsList = studentEndorsements.length > 0 
        ? studentEndorsements.map(e => `${e.skill?.name || 'General'}: ${e.comment || 'Endorsed by ' + e.endorser?.firstName}`).join('; ')
        : 'No endorsements yet';
      const badgesList = studentBadges.map(b => b.badge?.name).filter(Boolean).join(', ') || 'No badges earned';
      const certificationsList = studentCertifications.map(c => c.title).join(', ') || 'No certificates earned';

      const systemPrompt = `You are a career counselor and academic advisor for university students. Generate a comprehensive career progression summary that teachers can use for employability discussions with students.

Student Profile:
- Name: ${student.firstName} ${student.lastName}
- Major: ${student.major || "Not specified"}
- University: ${student.university || "Not specified"}
- Graduation Year: ${student.graduationYear || "Not specified"}
- Bio: ${student.bio || "No bio provided"}
- Interests: ${student.interests?.join(', ') || "Not specified"}

Engagement Metrics:
- Engagement Score: ${student.engagementScore} points
- Problem Solver Score: ${student.problemSolverScore} points
- Endorsement Score: ${student.endorsementScore} points
- Challenge Points: ${student.challengePoints} points
- Rank Tier: ${student.rankTier}
- Streak: ${student.streak} days

Skills: ${skillsList}
Endorsements: ${endorsementsList}
Badges: ${badgesList}
Certificates: ${certificationsList}

Generate a career progression summary with the following sections:
1. **Strengths & Expertise** (2-3 sentences highlighting their strongest areas based on metrics, skills, and endorsements)
2. **Skill Gap Analysis** (identify 2-3 skills they should develop for their career goals, considering their major and current skills)
3. **Employability Assessment** (rate their career readiness on a scale and explain the rating)
4. **Recommended Next Steps** (3-4 actionable recommendations for courses, projects, or experiences to improve employability)

Make it personalized, constructive, and actionable. Use a professional but encouraging tone suitable for sharing with the student during career counseling sessions.`;

      // Using gpt-4o-mini for cost efficiency
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a career progression summary for ${student.firstName} ${student.lastName}.` },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const summary = completion.choices[0]?.message?.content || "Unable to generate career summary at this time.";

      res.json({ 
        summary,
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          major: student.major,
          university: student.university,
          rankTier: student.rankTier,
        }
      });
    } catch (error: any) {
      console.error("Career summary error:", error);
      res.status(500).json({ error: "Failed to generate career summary" });
    }
  });

  // ========================================================================
  // CHALLENGES ENDPOINTS
  // ========================================================================

  app.get("/api/challenges", async (req: Request, res: Response) => {
    try {
      const allChallenges = await db
        .select({
          id: challenges.id,
          title: challenges.title,
          description: challenges.description,
          organizerId: challenges.organizerId,
          category: challenges.category,
          difficulty: challenges.difficulty,
          prizes: challenges.prizes,
          startDate: challenges.startDate,
          endDate: challenges.endDate,
          participantCount: challenges.participantCount,
          status: challenges.status,
          createdAt: challenges.createdAt,
          organizer: users,
        })
        .from(challenges)
        .leftJoin(users, eq(challenges.organizerId, users.id))
        .orderBy(desc(challenges.createdAt));

      res.json(allChallenges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/challenges/:challengeId/join", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { challengeId } = req.params;

      const [existingParticipant] = await db
        .select()
        .from(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, req.user.id)
          )
        )
        .limit(1);

      if (existingParticipant) {
        return res.status(400).json({ error: "Already joined this challenge" });
      }

      const [participant] = await db.insert(challengeParticipants).values({
        challengeId,
        userId: req.user.id,
      }).returning();

      await db
        .update(challenges)
        .set({
          participantCount: sql`${challenges.participantCount} + 1`,
        })
        .where(eq(challenges.id, challengeId));

      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 10`,
        })
        .where(eq(users.id, req.user.id));

      await db.insert(notifications).values({
        userId: req.user.id,
        type: 'challenge',
        title: 'Challenge Joined!',
        message: 'You have successfully joined a new challenge. Good luck!',
        link: '/challenges',
      });

      res.json(participant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/challenges/:challengeId/submit", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { challengeId } = req.params;
      const { submissionUrl } = req.body;

      if (!submissionUrl) {
        return res.status(400).json({ error: "Submission URL is required" });
      }

      const [participant] = await db
        .select()
        .from(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, req.user.id)
          )
        )
        .limit(1);

      if (!participant) {
        return res.status(400).json({ error: "You must join the challenge before submitting" });
      }

      const [updatedParticipant] = await db
        .update(challengeParticipants)
        .set({
          submissionUrl,
          submittedAt: new Date(),
        })
        .where(eq(challengeParticipants.id, participant.id))
        .returning();

      // Award points for submission using the new helper
      await applyPointDelta(req.user.id, {
        engagementDelta: 20,
        problemSolverDelta: 15,
      });

      // Get challenge details for certificate
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1);

      if (challenge) {
        // Automatically issue participation certificate
        const verificationHash = createHash('sha256')
          .update(`${req.user.id}-${challengeId}-${Date.now()}`)
          .digest('hex');
        
        await db.insert(certifications).values({
          userId: req.user.id,
          title: `${challenge.title} - Participation`,
          description: `Successfully participated and submitted a solution for the ${challenge.title} challenge`,
          issuerName: 'UniNexus Platform',
          issuerId: challenge.organizerId || null,
          verificationHash,
          type: 'challenge',
          metadata: {
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            submissionUrl,
            certificateType: 'participation',
          },
        });

        await db.insert(notifications).values({
          userId: req.user.id,
          type: 'achievement',
          title: 'Certificate Earned!',
          message: `You've earned a participation certificate for ${challenge.title}!`,
          link: '/certificates',
        });
      }

      await db.insert(notifications).values({
        userId: req.user.id,
        type: 'challenge',
        title: 'Submission Received!',
        message: 'Your challenge submission has been recorded successfully.',
        link: '/challenges',
      });

      res.json(updatedParticipant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/challenges/:challengeId/participants", async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;

      const participants = await db
        .select({
          id: challengeParticipants.id,
          challengeId: challengeParticipants.challengeId,
          userId: challengeParticipants.userId,
          submissionUrl: challengeParticipants.submissionUrl,
          submittedAt: challengeParticipants.submittedAt,
          rank: challengeParticipants.rank,
          joinedAt: challengeParticipants.joinedAt,
          user: users,
        })
        .from(challengeParticipants)
        .leftJoin(users, eq(challengeParticipants.userId, users.id))
        .where(eq(challengeParticipants.challengeId, challengeId))
        .orderBy(desc(challengeParticipants.submittedAt));

      res.json(participants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Award challenge points when ranks are assigned
  app.post("/api/challenges/:participantId/award-rank-points", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { participantId } = req.params;
      const { rank } = req.body;

      if (!rank || typeof rank !== 'number') {
        return res.status(400).json({ error: "Valid rank is required" });
      }

      const [participant] = await db
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.id, participantId))
        .limit(1);

      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      // Get challenge to calculate participant count
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, participant.challengeId))
        .limit(1);

      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Update participant rank
      await db
        .update(challengeParticipants)
        .set({ rank })
        .where(eq(challengeParticipants.id, participantId));

      // Calculate and award challenge points
      const points = calculateChallengePoints(rank, challenge.participantCount);
      await applyPointDelta(participant.userId, {
        challengeDelta: points,
      });

      // Issue winner certificate for top 3 finishers
      if (rank <= 3) {
        const rankLabels = ['1st Place', '2nd Place', '3rd Place'];
        const verificationHash = createHash('sha256')
          .update(`${participant.userId}-${challenge.id}-winner-${Date.now()}`)
          .digest('hex');
        
        await db.insert(certifications).values({
          userId: participant.userId,
          title: `${challenge.title} - ${rankLabels[rank - 1]}`,
          description: `Achieved ${rankLabels[rank - 1]} in the ${challenge.title} challenge, demonstrating exceptional skills and problem-solving abilities`,
          issuerName: 'UniNexus Platform',
          issuerId: challenge.organizerId || null,
          verificationHash,
          type: 'challenge',
          metadata: {
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            rank,
            totalParticipants: challenge.participantCount,
            points,
            certificateType: 'winner',
          },
        });

        await db.insert(notifications).values({
          userId: participant.userId,
          type: 'achievement',
          title: 'Winner Certificate Earned!',
          message: `Congratulations! You've earned a ${rankLabels[rank - 1]} certificate for ${challenge.title}!`,
          link: '/certificates',
        });
      }

      // Send notification
      await db.insert(notifications).values({
        userId: participant.userId,
        type: 'challenge',
        title: 'Challenge Rank Awarded!',
        message: `You ranked #${rank} and earned ${points} challenge points!`,
        link: '/challenges',
      });

      res.json({ success: true, points, rank });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recalculate user rank tier (admin/cron endpoint)
  app.post("/api/users/:userId/recalculate-rank", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      
      // Only allow admins or the user themselves
      if (req.user.role !== 'master_admin' && req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await recalculateUserRank(userId);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      res.json({ 
        success: true, 
        totalPoints: user?.totalPoints,
        rankTier: user?.rankTier 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/challenges/my-participations", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const myParticipations = await db
        .select({
          id: challengeParticipants.id,
          challengeId: challengeParticipants.challengeId,
          userId: challengeParticipants.userId,
          submissionUrl: challengeParticipants.submissionUrl,
          submittedAt: challengeParticipants.submittedAt,
          rank: challengeParticipants.rank,
          joinedAt: challengeParticipants.joinedAt,
          challenge: challenges,
        })
        .from(challengeParticipants)
        .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
        .where(eq(challengeParticipants.userId, req.user.id))
        .orderBy(desc(challengeParticipants.joinedAt));

      res.json(myParticipations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // ADMIN ENDPOINTS
  // ========================================================================

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'master_admin') {
      return res.status(403).send("Forbidden");
    }

    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/posts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'master_admin') {
      return res.status(403).send("Forbidden");
    }

    try {
      const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));
      res.json(allPosts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // ANNOUNCEMENTS (for university admins)
  // ========================================================================

  app.get("/api/announcements", async (req: Request, res: Response) => {
    try {
      const allAnnouncements = await db
        .select({
          id: announcements.id,
          authorId: announcements.authorId,
          title: announcements.title,
          content: announcements.content,
          university: announcements.university,
          isPinned: announcements.isPinned,
          createdAt: announcements.createdAt,
          updatedAt: announcements.updatedAt,
          author: users,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.authorId, users.id))
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));

      res.json(allAnnouncements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/announcements", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'university_admin') {
      return res.status(403).send("Forbidden");
    }

    try {
      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const [newAnnouncement] = await db.insert(announcements).values(validatedData).returning();

      // Get all students from this university to notify them
      const studentsToNotify = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'student'),
            sql`${users.university} = ${validatedData.university}`
          )
        );

      // Create notifications for all students in the university
      if (studentsToNotify.length > 0) {
        const notificationValues = studentsToNotify.map(student => ({
          userId: student.id,
          type: 'announcement',
          title: 'New Announcement',
          message: `${req.user.university}: ${validatedData.title}`,
          link: '/announcements',
        }));

        await db.insert(notifications).values(notificationValues);
      }

      res.json(newAnnouncement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // UNIVERSITY RETENTION STRATEGY
  // ========================================================================

  // Get Challenge Participation & Badge Metrics for Retention Overview
  app.get("/api/university/retention/overview", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['university_admin', 'master_admin'].includes(req.user.role)) {
      return res.status(403).send("Forbidden");
    }

    try {
      // Get total students count using DB COUNT
      const totalStudentsResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(eq(users.role, 'student'));
      const totalStudents = Number(totalStudentsResult[0]?.count) || 0;

      // Get active challenges count using DB COUNT
      const activeChallengesResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(challenges)
        .where(or(
          eq(challenges.status, 'active'),
          eq(challenges.status, 'upcoming')
        ));
      const activeChallengesCount = Number(activeChallengesResult[0]?.count) || 0;

      // Get unique participating students count using DB COUNT DISTINCT
      const participatingStudentsResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${challengeParticipants.userId})::int` })
        .from(challengeParticipants);
      const participatingStudents = Number(participatingStudentsResult[0]?.count) || 0;

      const participationRate = totalStudents > 0 ? Math.round((participatingStudents / totalStudents) * 100) : 0;

      // Get badge progress bands using SQL aggregation
      const badgeBandsResult = await db.execute(sql`
        WITH student_badge_counts AS (
          SELECT 
            u.id as user_id,
            COUNT(ub.id)::int as badge_count
          FROM ${users} u
          LEFT JOIN ${userBadges} ub ON u.id = ub.user_id
          WHERE u.role = 'student'
          GROUP BY u.id
        )
        SELECT 
          COUNT(CASE WHEN badge_count = 0 THEN 1 END)::int as none,
          COUNT(CASE WHEN badge_count >= 1 AND badge_count <= 2 THEN 1 END)::int as low,
          COUNT(CASE WHEN badge_count >= 3 AND badge_count <= 5 THEN 1 END)::int as medium,
          COUNT(CASE WHEN badge_count >= 6 THEN 1 END)::int as high
        FROM student_badge_counts
      `);

      const badgeBands = {
        none: Number(badgeBandsResult.rows[0]?.none) || 0,
        low: Number(badgeBandsResult.rows[0]?.low) || 0,
        medium: Number(badgeBandsResult.rows[0]?.medium) || 0,
        high: Number(badgeBandsResult.rows[0]?.high) || 0,
      };

      // Get participation by category using SQL GROUP BY
      const participationByCategoryResult = await db.execute(sql`
        SELECT 
          COALESCE(c.category, 'other') as category,
          COUNT(*)::int as count
        FROM ${challengeParticipants} cp
        LEFT JOIN ${challenges} c ON cp.challenge_id = c.id
        GROUP BY c.category
      `);

      const participationByCategory = participationByCategoryResult.rows.reduce((acc, row: any) => {
        acc[row.category] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Engagement trend (last 6 months - mock data for now, can be enhanced with timestamp analysis)
      const engagementTrend = [
        { month: 'Month -5', participants: Math.round(participatingStudents * 0.6) },
        { month: 'Month -4', participants: Math.round(participatingStudents * 0.7) },
        { month: 'Month -3', participants: Math.round(participatingStudents * 0.75) },
        { month: 'Month -2', participants: Math.round(participatingStudents * 0.85) },
        { month: 'Month -1', participants: Math.round(participatingStudents * 0.92) },
        { month: 'Current', participants: participatingStudents },
      ];

      res.json({
        overview: {
          totalStudents,
          participatingStudents,
          participationRate,
          activeChallenges: activeChallengesCount,
        },
        badgeProgress: badgeBands,
        participationByCategory,
        engagementTrend,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Career Pathway & Employability Metrics
  app.get("/api/university/retention/career", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['university_admin', 'master_admin'].includes(req.user.role)) {
      return res.status(403).send("Forbidden");
    }

    try {
      // Get total students count using DB COUNT
      const totalStudentsResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(eq(users.role, 'student'));
      const totalStudents = Number(totalStudentsResult[0]?.count) || 0;

      // Calculate AI readiness score and cohorts using SQL aggregation
      const readinessResult = await db.execute(sql`
        WITH student_readiness AS (
          SELECT 
            id,
            ROUND((COALESCE(engagement_score, 0) + COALESCE(problem_solver_score, 0) + COALESCE(endorsement_score, 0)) / 3.0) as readiness_score
          FROM ${users}
          WHERE role = 'student'
        )
        SELECT 
          ROUND(AVG(readiness_score))::int as avg_readiness,
          COUNT(CASE WHEN readiness_score < 30 THEN 1 END)::int as low,
          COUNT(CASE WHEN readiness_score >= 30 AND readiness_score < 70 THEN 1 END)::int as medium,
          COUNT(CASE WHEN readiness_score >= 70 THEN 1 END)::int as high
        FROM student_readiness
      `);

      const avgReadiness = Number(readinessResult.rows[0]?.avg_readiness) || 0;
      const readinessCohorts = {
        low: Number(readinessResult.rows[0]?.low) || 0,
        medium: Number(readinessResult.rows[0]?.medium) || 0,
        high: Number(readinessResult.rows[0]?.high) || 0,
      };

      // Get skill distribution by level using SQL GROUP BY
      const skillsByLevelResult = await db.execute(sql`
        SELECT 
          COALESCE(us.level, 'beginner') as level,
          COUNT(*)::int as count
        FROM ${userSkills} us
        INNER JOIN ${users} u ON us.user_id = u.id
        WHERE u.role = 'student'
        GROUP BY us.level
      `);

      const skillsByLevel = skillsByLevelResult.rows.reduce((acc, row: any) => {
        acc[row.level] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Get skill distribution by category using SQL GROUP BY
      const skillsByCategoryResult = await db.execute(sql`
        SELECT 
          COALESCE(s.category, 'other') as category,
          COUNT(*)::int as count
        FROM ${userSkills} us
        INNER JOIN ${skills} s ON us.skill_id = s.id
        INNER JOIN ${users} u ON us.user_id = u.id
        WHERE u.role = 'student'
        GROUP BY s.category
      `);

      const skillsByCategory = skillsByCategoryResult.rows.reduce((acc, row: any) => {
        acc[row.category] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Get total skills count using DB COUNT
      const totalSkillsResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userSkills)
        .innerJoin(users, eq(userSkills.userId, users.id))
        .where(eq(users.role, 'student'));
      const totalSkills = Number(totalSkillsResult[0]?.count) || 0;

      // Get certification statistics using SQL aggregation
      const certificationStatsResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(DISTINCT c.user_id)::int as students_with_certs,
          COUNT(CASE WHEN c.expires_at IS NULL OR c.expires_at > NOW() THEN 1 END)::int as active
        FROM ${certifications} c
        INNER JOIN ${users} u ON c.user_id = u.id
        WHERE u.role = 'student'
      `);

      const certTotal = Number(certificationStatsResult.rows[0]?.total) || 0;
      const studentsWithCerts = Number(certificationStatsResult.rows[0]?.students_with_certs) || 0;
      const certActive = Number(certificationStatsResult.rows[0]?.active) || 0;

      // Get certifications by type using SQL GROUP BY
      const certByTypeResult = await db.execute(sql`
        SELECT 
          COALESCE(c.type, 'other') as type,
          COUNT(*)::int as count
        FROM ${certifications} c
        INNER JOIN ${users} u ON c.user_id = u.id
        WHERE u.role = 'student'
        GROUP BY c.type
      `);

      const byType = certByTypeResult.rows.reduce((acc, row: any) => {
        acc[row.type] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      const certificationRate = totalStudents > 0 
        ? Math.round((studentsWithCerts / totalStudents) * 100)
        : 0;

      res.json({
        readiness: {
          averageScore: avgReadiness,
          cohorts: readinessCohorts,
        },
        skills: {
          byLevel: skillsByLevel,
          byCategory: skillsByCategory,
          totalSkills,
        },
        certifications: {
          total: certTotal,
          byType,
          active: certActive,
          certificationRate,
          studentsWithCertifications: studentsWithCerts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // USER CONNECTIONS / NETWORK API
  // ========================================================================

  // Search for users (for network discovery)
  app.get("/api/users/search", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { q } = req.query;
      const searchTerm = q as string;

      if (!searchTerm || searchTerm.length < 3) {
        return res.json([]);
      }

      const searchPattern = `%${searchTerm}%`;
      
      const results = await db
        .select()
        .from(users)
        .where(
          and(
            sql`${users.id} != ${req.user.id}`, // Exclude current user
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

  // Send connection request
  app.post("/api/connections/request", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { receiverId } = req.body;
      
      if (!receiverId) {
        return res.status(400).json({ error: "Receiver ID is required" });
      }

      if (receiverId === req.user.id) {
        return res.status(400).json({ error: "Cannot connect with yourself" });
      }

      // Check if connection already exists
      const existing = await db
        .select()
        .from(userConnections)
        .where(
          or(
            and(
              eq(userConnections.requesterId, req.user.id),
              eq(userConnections.receiverId, receiverId)
            ),
            and(
              eq(userConnections.requesterId, receiverId),
              eq(userConnections.receiverId, req.user.id)
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
          requesterId: req.user.id,
          receiverId,
          status: 'pending',
        })
        .returning();

      // Create notification for receiver
      await db.insert(notifications).values({
        userId: receiverId,
        type: 'connection',
        title: 'New Connection Request',
        message: `${req.user.firstName} ${req.user.lastName} wants to connect with you`,
        link: '/network',
      });

      res.json(connection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Accept/reject connection request
  app.patch("/api/connections/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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

      if (connection.receiverId !== req.user.id) {
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
          message: `${req.user.firstName} ${req.user.lastName} accepted your connection request`,
          link: '/network',
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's connections
  app.get("/api/connections", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { status } = req.query;
      const userId = req.user.id;

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

  // Get connection status with a specific user
  app.get("/api/connections/status/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

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
  app.post("/api/follow", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { followingId } = req.body;

      if (!followingId) {
        return res.status(400).json({ error: "Following user ID is required" });
      }

      if (followingId === req.user.id) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }

      // Check if already following
      const existing = await db
        .select()
        .from(followers)
        .where(
          and(
            eq(followers.followerId, req.user.id),
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
          followerId: req.user.id,
          followingId,
        })
        .returning();

      // Create notification
      await db.insert(notifications).values({
        userId: followingId,
        type: 'follow',
        title: 'New Follower',
        message: `${req.user.firstName} ${req.user.lastName} started following you`,
        link: `/profile?userId=${req.user.id}`,
      });

      res.json(follow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unfollow a user
  app.delete("/api/follow/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;

      await db
        .delete(followers)
        .where(
          and(
            eq(followers.followerId, req.user.id),
            eq(followers.followingId, userId)
          )
        );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get followers for a user
  app.get("/api/followers/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
  app.get("/api/following/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
  app.get("/api/follow/status/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;

      const [follow] = await db
        .select()
        .from(followers)
        .where(
          and(
            eq(followers.followerId, req.user.id),
            eq(followers.followingId, userId)
          )
        );

      res.json({ isFollowing: !!follow });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // POST SHARES API
  // ========================================================================

  // Share a post
  app.post("/api/posts/:postId/share", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;
      const { comment } = req.body;

      // Verify post exists
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Create share record
      const [share] = await db
        .insert(postShares)
        .values({
          postId,
          userId: req.user.id,
          comment: comment || null,
        })
        .returning();

      // Update share count
      await db
        .update(posts)
        .set({ shareCount: sql`${posts.shareCount} + 1` })
        .where(eq(posts.id, postId));

      // Create notification for post author
      if (post.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: post.authorId,
          type: 'share',
          title: 'Post Shared',
          message: `${req.user.firstName} ${req.user.lastName} shared your post`,
          link: `/feed`,
        });
      }

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 5`,
        })
        .where(eq(users.id, req.user.id));

      res.json(share);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get shares for a post
  app.get("/api/posts/:postId/shares", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      const results = await db
        .select({
          share: postShares,
          user: users,
        })
        .from(postShares)
        .leftJoin(users, eq(postShares.userId, users.id))
        .where(eq(postShares.postId, postId))
        .orderBy(desc(postShares.createdAt));

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // MESSAGING / CONVERSATIONS API
  // ========================================================================

  // Create or get existing conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { participantIds, isGroup, groupName } = req.body;

      if (!participantIds || participantIds.length === 0) {
        return res.status(400).json({ error: "Participant IDs are required" });
      }

      // Add current user to participants if not included
      const allParticipants = Array.from(new Set([req.user.id, ...participantIds]));

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
  app.get("/api/conversations", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userId = req.user.id;

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
          const participants = await db
            .select()
            .from(users)
            .where(
              sql`${users.id} = ANY(${conversation.participantIds})`
            );

          // Get last message
          const [lastMessage] = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversation.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          // Get unread count for current user
          const unreadMessages = await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conversation.id),
                sql`NOT (${userId} = ANY(${messages.readBy}))`
              )
            );

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
  app.get("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      const userId = req.user.id;

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
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      const { content, imageUrl } = req.body;
      const userId = req.user.id;

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
          message: `${req.user.firstName} ${req.user.lastName} sent you a message`,
          link: `/messages?conversation=${id}`,
        });
      }

      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark messages as read
  app.patch("/api/conversations/:id/read", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      const userId = req.user.id;

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

  // ========================================================================
  // AI IMAGE MODERATION API
  // ========================================================================

  app.post("/api/ai/moderate-image", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!openai) {
        return res.status(503).json({ 
          error: "AI moderation is not available",
          approved: true // Fail open if OpenAI not configured
        });
      }

      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      // Use GPT-4 Vision to analyze the image
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a content moderator for a university social platform. Analyze images for inappropriate content including: violence, hate speech symbols, explicit content, illegal activities, or harmful behavior. Respond with ONLY 'APPROVED' or 'REJECTED: [brief reason]'."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image for inappropriate content:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 100,
      });

      const result = response.choices[0]?.message?.content || "APPROVED";
      const approved = result.toUpperCase().startsWith("APPROVED");
      const reason = approved ? null : result.replace(/^REJECTED:\s*/i, '');

      res.json({
        approved,
        reason,
        confidence: approved ? 1.0 : 0.9
      });
    } catch (error: any) {
      console.error("Image moderation error:", error);
      // Fail open - approve if moderation fails
      res.json({
        approved: true,
        reason: null,
        confidence: 0,
        error: "Moderation service unavailable"
      });
    }
  });

  // ========================================================================
  // POST BOOSTS API
  // ========================================================================

  // Boost a post
  app.post("/api/posts/:postId/boost", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      // Verify post exists
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if already boosted
      const existing = await db
        .select()
        .from(postBoosts)
        .where(
          and(
            eq(postBoosts.postId, postId),
            eq(postBoosts.userId, req.user.id)
          )
        );

      if (existing.length > 0) {
        return res.status(400).json({ error: "Post already boosted" });
      }

      // Create boost
      const [boost] = await db
        .insert(postBoosts)
        .values({
          postId,
          userId: req.user.id,
        })
        .returning();

      // Create notification for post author
      if (post.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: post.authorId,
          type: 'boost',
          title: 'Post Boosted',
          message: `${req.user.firstName} ${req.user.lastName} boosted your post`,
          link: `/feed`,
        });
      }

      // Update engagement score for boosting user
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 3`,
        })
        .where(eq(users.id, req.user.id));

      res.json(boost);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove boost from a post
  app.delete("/api/posts/:postId/boost", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      await db
        .delete(postBoosts)
        .where(
          and(
            eq(postBoosts.postId, postId),
            eq(postBoosts.userId, req.user.id)
          )
        );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get boosts for a post
  app.get("/api/posts/:postId/boosts", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      const results = await db
        .select({
          boost: postBoosts,
          user: users,
        })
        .from(postBoosts)
        .leftJoin(users, eq(postBoosts.userId, users.id))
        .where(eq(postBoosts.postId, postId))
        .orderBy(desc(postBoosts.createdAt));

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if user has boosted a post
  app.get("/api/posts/:postId/boost/status", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      const existing = await db
        .select()
        .from(postBoosts)
        .where(
          and(
            eq(postBoosts.postId, postId),
            eq(postBoosts.userId, req.user.id)
          )
        );

      res.json({ boosted: existing.length > 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // GROUPS/COMMUNITIES API
  // ========================================================================

  // Create a group
  app.post("/api/groups", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertGroupSchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });

      const [group] = await db
        .insert(groups)
        .values(validatedData)
        .returning();

      // Automatically add creator as admin member
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: req.user.id,
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
  app.get("/api/groups", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
  app.get("/api/groups/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
            eq(groupMembers.userId, req.user.id)
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

  // Join a group
  app.post("/api/groups/:id/join", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
            eq(groupMembers.userId, req.user.id)
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
          userId: req.user.id,
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
  app.delete("/api/groups/:id/leave", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;

      // Check if member
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, req.user.id)
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
            eq(groupMembers.userId, req.user.id)
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
  app.get("/api/groups/:id/members", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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

  // Get user's groups
  app.get("/api/users/groups", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const results = await db
        .select({
          membership: groupMembers,
          group: groups,
        })
        .from(groupMembers)
        .leftJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(eq(groupMembers.userId, req.user.id))
        .orderBy(desc(groupMembers.joinedAt));

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Post to a group
  app.post("/api/groups/:id/posts", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;

      // Check if user is a member
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, req.user.id)
          )
        );

      if (!membership) {
        return res.status(403).json({ error: "Must be a member to post in this group" });
      }

      const validatedData = insertGroupPostSchema.parse({
        ...req.body,
        groupId: id,
        authorId: req.user.id,
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
  app.get("/api/groups/:id/posts", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

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
              eq(groupMembers.userId, req.user.id)
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

  // ========================================================================
  // AI TREND ENGINE & DISCOVERY API
  // ========================================================================

  // Get trending posts based on engagement
  app.get("/api/trending/posts", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { limit = 20 } = req.query;

      // Calculate trending score based on recent engagement
      const trendingPosts = await db
        .select({
          post: posts,
          author: users,
          reactionCount: sql`COUNT(DISTINCT ${reactions.id})`.as('reaction_count'),
          commentCount: sql`COUNT(DISTINCT ${comments.id})`.as('comment_count'),
          boostCount: sql`COUNT(DISTINCT ${postBoosts.id})`.as('boost_count'),
          trendScore: sql`
            (COUNT(DISTINCT ${reactions.id}) * 1.0 + 
             COUNT(DISTINCT ${comments.id}) * 2.0 + 
             ${posts.shareCount} * 3.0 + 
             COUNT(DISTINCT ${postBoosts.id}) * 4.0 +
             ${posts.viewCount} * 0.1) / 
            (EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 + 2)
          `.as('trend_score'),
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(reactions, eq(posts.id, reactions.postId))
        .leftJoin(comments, eq(posts.id, comments.postId))
        .leftJoin(postBoosts, eq(posts.id, postBoosts.postId))
        .where(sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`)
        .groupBy(posts.id, users.id)
        .orderBy(sql`trend_score DESC`)
        .limit(Number(limit));

      res.json(trendingPosts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get trending groups
  app.get("/api/trending/groups", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { limit = 10 } = req.query;

      // Get groups with recent growth in membership
      const trendingGroups = await db
        .select({
          group: groups,
          creator: users,
          recentJoins: sql`
            COUNT(DISTINCT CASE 
              WHEN ${groupMembers.joinedAt} > NOW() - INTERVAL '7 days' 
              THEN ${groupMembers.id} 
            END)
          `.as('recent_joins'),
        })
        .from(groups)
        .leftJoin(users, eq(groups.creatorId, users.id))
        .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
        .where(eq(groups.isPrivate, false))
        .groupBy(groups.id, users.id)
        .orderBy(sql`recent_joins DESC, ${groups.memberCount} DESC`)
        .limit(Number(limit));

      res.json(trendingGroups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI-powered friend recommendations
  app.get("/api/recommendations/friends", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      // Get user's interests and university
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get users already following
      const following = await db
        .select({ followingId: followers.followingId })
        .from(followers)
        .where(eq(followers.followerId, userId));

      const followingIds = following.map(f => f.followingId);

      // Find similar users based on interests, university, and engagement
      const recommendations = await db
        .select({
          user: users,
          commonInterests: sql`
            ARRAY_LENGTH(
              ARRAY(
                SELECT UNNEST(${users.interests})
                INTERSECT
                SELECT UNNEST(${currentUser.interests}::text[])
              ),
              1
            )
          `.as('common_interests'),
          sameUniversity: sql`${users.university} = ${currentUser.university}`.as('same_university'),
          similarityScore: sql`
            (COALESCE(ARRAY_LENGTH(
              ARRAY(
                SELECT UNNEST(${users.interests})
                INTERSECT
                SELECT UNNEST(${currentUser.interests}::text[])
              ),
              1
            ), 0) * 10 +
            CASE WHEN ${users.university} = ${currentUser.university} THEN 20 ELSE 0 END +
            CASE WHEN ${users.role} = ${currentUser.role} THEN 10 ELSE 0 END +
            ${users.engagementScore} * 0.1)
          `.as('similarity_score'),
        })
        .from(users)
        .where(
          and(
            sql`${users.id} != ${userId}`,
            followingIds.length > 0
              ? sql`${users.id} NOT IN (${followingIds.join(', ')})`
              : sql`TRUE`
          )
        )
        .orderBy(sql`similarity_score DESC`)
        .limit(Number(limit));

      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cross-university discovery
  app.get("/api/discovery/universities", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      // Get trending students from other universities
      const topStudents = await db
        .select({
          user: users,
          postCount: sql`COUNT(DISTINCT ${posts.id})`.as('post_count'),
          followerCount: sql`COUNT(DISTINCT ${followers.id})`.as('follower_count'),
        })
        .from(users)
        .leftJoin(posts, eq(users.id, posts.authorId))
        .leftJoin(followers, eq(users.id, followers.followingId))
        .where(
          and(
            eq(users.role, 'student'),
            sql`${users.university} != ${req.user.university}`,
            sql`${users.isVerified} = true`
          )
        )
        .groupBy(users.id)
        .orderBy(sql`(post_count * 2 + follower_count) DESC`)
        .limit(20);

      res.json(topStudents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user verification status (admin only)
  app.patch("/api/users/:userId/verify", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Only master_admin and university_admin can verify users
    if (req.user.role !== 'master_admin' && req.user.role !== 'university_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const { userId } = req.params;
      const { verified } = req.body;

      await db
        .update(users)
        .set({
          isVerified: verified,
          verifiedAt: verified ? sql`NOW()` : null,
        })
        .where(eq(users.id, userId));

      // Create notification for the user
      if (verified) {
        await db.insert(notifications).values({
          userId,
          type: 'verification',
          title: 'Profile Verified',
          message: 'Your profile has been verified!',
          link: `/profile`,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // FILE UPLOAD API (Images & Videos)
  // ========================================================================

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const videosDir = path.join(uploadsDir, 'videos');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  // Configure multer for image uploads
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `image-${uniqueSuffix}${ext}`);
    }
  });

  const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
      }
    }
  });

  // Configure multer for video uploads
  const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, videosDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `video-${uniqueSuffix}${ext}`);
    }
  });

  const videoUpload = multer({
    storage: videoStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only MP4, WebM, QuickTime, and MKV are allowed.'));
      }
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Upload image endpoint
  app.post("/api/upload/image", imageUpload.single('image'), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload video endpoint
  app.post("/api/upload/video", videoUpload.single('video'), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const videoUrl = `/uploads/videos/${req.file.filename}`;
      res.json({ url: videoUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload multiple images endpoint (for galleries/posts with multiple images)
  app.post("/api/upload/images", imageUpload.array('images', 10), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }

      const urls = req.files.map(file => `/uploads/images/${file.filename}`);
      res.json({ urls });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // USER PROFILE MANAGEMENT API
  // ========================================================================

  // Get user profile by userId
  app.get("/api/user-profiles/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));

      // Return empty profile if doesn't exist yet
      res.json(profile || { userId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update user profile
  app.post("/api/user-profiles", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userId = req.user.id;
      const profileData = { ...req.body, userId };

      // Upsert profile
      const [profile] = await db
        .insert(userProfiles)
        .values(profileData)
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            ...profileData,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // TEACHER CONTENT MANAGEMENT API
  // ========================================================================

  // Multer configuration for document uploads
  const documentsDir = path.join(uploadsDir, 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_');
      cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
  });

  const documentUpload = multer({
    storage: documentStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, PPT, and PPTX are allowed.'));
      }
    }
  });

  // Serve uploaded documents
  app.use('/uploads/documents', express.static(documentsDir));

  // Upload teacher content document
  app.post("/api/teacher-content/upload", documentUpload.single('document'), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Check if user is a teacher
    if (req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Only teachers can upload content" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document file provided" });
      }

      const fileUrl = `/uploads/documents/${req.file.filename}`;
      
      // Parse additional fields from request body
      const { title, description, courseId, tags, isPublic } = req.body;

      // Determine content type from file mimetype
      let contentType = 'doc';
      if (req.file.mimetype === 'application/pdf') contentType = 'pdf';
      else if (req.file.mimetype === 'text/plain') contentType = 'text';

      const metadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };

      const [content] = await db
        .insert(teacherContent)
        .values({
          teacherId: req.user.id,
          title: title || req.file.originalname,
          description: description || null,
          courseId: courseId || null,
          contentType,
          fileUrl,
          metadata,
          tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
          isPublic: isPublic === 'true' || isPublic === true,
        })
        .returning();

      res.json({ url: fileUrl, content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create text-based teacher content (notes, guidelines)
  app.post("/api/teacher-content", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Check if user is a teacher
    if (req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Only teachers can create content" });
    }

    try {
      const validatedData = insertTeacherContentSchema.parse({
        ...req.body,
        teacherId: req.user.id,
      });

      const [content] = await db
        .insert(teacherContent)
        .values(validatedData)
        .returning();

      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all teacher content for a specific teacher
  app.get("/api/teacher-content/teacher/:teacherId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { teacherId } = req.params;

      const content = await db
        .select()
        .from(teacherContent)
        .where(eq(teacherContent.teacherId, teacherId))
        .orderBy(desc(teacherContent.uploadedAt));

      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get teacher content for a specific course
  app.get("/api/teacher-content/course/:courseId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { courseId } = req.params;

      const content = await db
        .select()
        .from(teacherContent)
        .where(eq(teacherContent.courseId, courseId))
        .orderBy(desc(teacherContent.uploadedAt));

      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete teacher content
  app.delete("/api/teacher-content/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;

      // Get the content first to check ownership
      const [content] = await db
        .select()
        .from(teacherContent)
        .where(eq(teacherContent.id, id));

      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Check if user is the owner or admin
      if (content.teacherId !== req.user.id && req.user.role !== 'master_admin') {
        return res.status(403).json({ error: "Not authorized to delete this content" });
      }

      // Delete the file if it exists
      if (content.fileUrl) {
        const filePath = path.join(uploadsDir, content.fileUrl.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await db.delete(teacherContent).where(eq(teacherContent.id, id));

      res.json({ message: "Content deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // HYPER-LOCALIZED AI CHAT WITH TEACHER MATERIALS
  // ========================================================================

  // Chat with AI using teacher's uploaded materials
  app.post("/api/teacher-ai/chat", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { teacherId, courseId, message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Fetch relevant teacher content
      let teacherMaterials;
      if (courseId) {
        teacherMaterials = await db
          .select()
          .from(teacherContent)
          .where(
            and(
              eq(teacherContent.courseId, courseId),
              eq(teacherContent.isPublic, true)
            )
          );
      } else if (teacherId) {
        teacherMaterials = await db
          .select()
          .from(teacherContent)
          .where(
            and(
              eq(teacherContent.teacherId, teacherId),
              eq(teacherContent.isPublic, true)
            )
          );
      } else {
        return res.status(400).json({ error: "Either teacherId or courseId is required" });
      }

      // Get teacher info
      const [teacher] = await db
        .select()
        .from(users)
        .where(eq(users.id, teacherId || teacherMaterials[0]?.teacherId));

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      // Prepare context from materials
      const materialsContext = teacherMaterials
        .map((material) => {
          let context = `Material: ${material.title}\n`;
          if (material.description) context += `Description: ${material.description}\n`;
          if (material.textContent) context += `Content: ${material.textContent}\n`;
          if (material.tags && material.tags.length > 0) context += `Tags: ${material.tags.join(', ')}\n`;
          return context;
        })
        .join('\n---\n');

      // Build system prompt
      const systemPrompt = `You are an AI teaching assistant for ${teacher.firstName} ${teacher.lastName}'s class. 
Your role is to help students understand the course materials by answering questions based ONLY on the provided materials.

CRITICAL RULES:
- Answer questions using ONLY the information from the teacher's materials provided below
- If the answer isn't in the materials, clearly say "I don't have that information in the course materials"
- Never make up or hallucinate information beyond what's provided
- Cite specific materials when answering (e.g., "According to the lecture notes on...")
- Use the teacher's terminology and teaching style
- Be helpful, clear, and encourage learning

TEACHER'S MATERIALS:
${materialsContext || 'No materials have been uploaded yet. Please ask the teacher to upload course materials.'}`;

      // Call OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

      res.json({ 
        response: aiResponse,
        materialsUsed: teacherMaterials.length,
        teacherName: `${teacher.firstName} ${teacher.lastName}`
      });
    } catch (error: any) {
      console.error("Teacher AI chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
