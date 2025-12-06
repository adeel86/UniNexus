import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { eq, desc, sql, and, or, like, inArray } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "./db";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth, verifyToken, isAuthenticated, type AuthRequest } from "./firebaseAuth";
import { initializeCloudStorage, uploadToCloud, uploadMultipleToCloud, isCloudStorageAvailable, type UploadOptions } from "./cloudStorage";
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
  teacherContentChunks,
  aiChatSessions,
  userProfiles,
  educationRecords,
  jobExperience,
  studentCourses,
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
  insertJobExperienceSchema,
  insertStudentCourseSchema,
  insertCourseSchema,
} from "@shared/schema";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import { applyPointDelta, recalculateUserRank } from "./pointsHelper";
import { calculateChallengePoints } from "./rankTiers";

import {
  authRouter,
  feedRouter,
  usersRouter,
  skillsRouter,
  certificationsRouter,
  notificationsRouter,
  coursesRouter,
  challengesRouter,
  groupsRouter,
  connectionsRouter,
  messagingRouter,
  adminRouter,
  recruiterRouter,
  teacherContentRouter,
  aiRouter,
} from "./routes/index";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;
const DEMO_PASSWORD = "demo123"; // Universal password for all dev/test accounts

// Middleware to block master admin from accessing social features
// Note: university_admin now has access to Network, Discover, Messages, and Groups
function blockRestrictedRoles(req: Request, res: Response, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const restrictedRoles = ['master_admin'];
  if (restrictedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: "Access Denied",
      message: "Master admin does not have access to social features." 
    });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ========================================================================
  // MOUNT DOMAIN ROUTERS
  // ========================================================================
  app.use("/api/auth", authRouter);
  app.use("/api", feedRouter);
  app.use("/api", usersRouter);
  app.use("/api", skillsRouter);
  app.use("/api", certificationsRouter);
  app.use("/api", notificationsRouter);
  app.use("/api", coursesRouter);
  app.use("/api", challengesRouter);
  app.use("/api", groupsRouter);
  app.use("/api", connectionsRouter);
  app.use("/api", messagingRouter);
  app.use("/api", adminRouter);
  app.use("/api", recruiterRouter);
  app.use("/api/teacher-content", teacherContentRouter);
  app.use(aiRouter);

  // ========================================================================
  // AUTH ENDPOINTS (DEPRECATED - Now handled by authRouter)
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
          userId: user.id,
          firebaseUid: user.firebaseUid || undefined,
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
      const conditions = [sql`${posts.createdAt} > ${sevenDaysAgo.toISOString()}`];
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
      const conditions = [sql`${posts.createdAt} > ${fortyEightHoursAgo.toISOString()}`];
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

  // Update post (only author can update)
  app.patch("/api/posts/:postId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;
      const { content, category, tags } = req.body;

      // Check if user is the author
      const [existingPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (existingPost.authorId !== req.user.id) {
        return res.status(403).json({ error: "You can only edit your own posts" });
      }

      const [updatedPost] = await db
        .update(posts)
        .set({
          content: content ?? existingPost.content,
          category: category ?? existingPost.category,
          tags: tags ?? existingPost.tags,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId))
        .returning();

      res.json(updatedPost);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete post (only author or admin can delete)
  app.delete("/api/posts/:postId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId } = req.params;

      // Check if user is the author or an admin
      const [existingPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      const isAdmin = req.user.role === 'master_admin' || req.user.role === 'university_admin';
      if (existingPost.authorId !== req.user.id && !isAdmin) {
        return res.status(403).json({ error: "You can only delete your own posts" });
      }

      // Delete associated reactions and comments first
      await db.delete(reactions).where(eq(reactions.postId, postId));
      await db.delete(comments).where(eq(comments.postId, postId));
      
      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Delete comment (only author or post author can delete)
  app.delete("/api/comments/:commentId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { commentId } = req.params;

      // Get the comment
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Get the post to check if user is post author
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, comment.postId))
        .limit(1);

      const isAdmin = req.user.role === 'master_admin' || req.user.role === 'university_admin';
      const isCommentAuthor = comment.authorId === req.user.id;
      const isPostAuthor = post && post.authorId === req.user.id;

      if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
        return res.status(403).json({ error: "You can only delete your own comments or comments on your posts" });
      }

      await db.delete(comments).where(eq(comments.id, commentId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Delete reaction (toggle off)
  app.delete("/api/reactions/:postId/:type", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { postId, type } = req.params;

      // Find and delete the reaction
      const [deleted] = await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.postId, postId),
            eq(reactions.userId, req.user.id),
            eq(reactions.type, type)
          )
        )
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      
      // Check if the target user is a student
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students have badges - teachers don't
      if (targetUser.role !== 'student') {
        return res.json([]); // Return empty array for non-students
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

    // Only teachers, university admins, industry professionals, and master admins can issue certificates
    const authorizedRoles = ['teacher', 'university_admin', 'industry_professional', 'master_admin'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Forbidden: Only teachers, administrators, and industry professionals can issue certificates" 
      });
    }

    try {
      const validatedData = insertCertificationSchema.parse(req.body);

      // Fetch recipient to check role-based rules
      const [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, validatedData.userId))
        .limit(1);

      if (!recipient) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      // Role-based certificate issuance rules:
      // - Teachers can only receive certificates from Universities and Industries
      // - Students can receive certificates from Teachers, Universities, and Industries
      if (recipient.role === 'teacher') {
        if (!['university_admin', 'industry_professional', 'master_admin'].includes(req.user.role)) {
          return res.status(403).json({
            error: "Teachers can only receive certificates from Universities and Industry Professionals"
          });
        }
      } else if (recipient.role === 'student') {
        if (!['teacher', 'university_admin', 'industry_professional', 'master_admin'].includes(req.user.role)) {
          return res.status(403).json({
            error: "Students can receive certificates from Teachers, Universities, and Industry Professionals"
          });
        }
      }

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

      // Fetch issuer information for complete certification
      const [issuer] = await db
        .select()
        .from(users)
        .where(eq(users.id, newCertification.issuerId!))
        .limit(1);

      // Construct complete certification with user and issuer data (reuse recipient from earlier)
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
      
      // Check if the target user is a student
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only students have endorsements displayed - teachers don't display their received endorsements
      if (targetUser.role !== 'student') {
        return res.json([]); // Return empty array for non-students
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

  // Get teachers by university (for students to view their institution's teachers)
  app.get("/api/teachers/university/:university", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { university } = req.params;

      const teachers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "teacher"),
            eq(users.university, university)
          )
        )
        .orderBy(users.lastName, users.firstName);

      res.json(teachers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get students validated/enrolled by a teacher
  app.get("/api/teachers/:teacherId/students", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { teacherId } = req.params;

      // Get students who are validated by this teacher (through studentCourses)
      const validatedStudents = await db
        .select({
          studentCourse: studentCourses,
          student: users,
        })
        .from(studentCourses)
        .leftJoin(users, eq(studentCourses.userId, users.id))
        .where(
          and(
            eq(studentCourses.validatedBy, teacherId),
            eq(studentCourses.isValidated, true)
          )
        )
        .orderBy(desc(studentCourses.validatedAt));

      // Deduplicate students (a student can be validated for multiple courses)
      const uniqueStudentsMap = new Map();
      for (const item of validatedStudents) {
        if (item.student && !uniqueStudentsMap.has(item.student.id)) {
          uniqueStudentsMap.set(item.student.id, {
            ...item.student,
            validatedCourses: [item.studentCourse],
          });
        } else if (item.student) {
          uniqueStudentsMap.get(item.student.id).validatedCourses.push(item.studentCourse);
        }
      }

      res.json(Array.from(uniqueStudentsMap.values()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all teachers for a university (for university dashboard)
  app.get("/api/university/teachers", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Check if user is a university admin (support both role names)
    const isUniversityAdmin = ['university', 'university_admin', 'master_admin'].includes(req.user.role);
    if (!isUniversityAdmin) {
      return res.status(403).json({ error: "Only university admins can access this" });
    }

    try {
      const universityName = req.user.university;
      if (!universityName) {
        return res.status(400).json({ error: "University not set for this admin" });
      }

      const teachers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "teacher"),
            eq(users.university, universityName)
          )
        )
        .orderBy(users.lastName, users.firstName);

      // Get course counts for each teacher
      const teachersWithCourses = await Promise.all(
        teachers.map(async (teacher) => {
          const teacherCourses = await db
            .select()
            .from(courses)
            .where(eq(courses.instructorId, teacher.id));

          const validatedCount = teacherCourses.filter(c => c.isUniversityValidated).length;
          const pendingCount = teacherCourses.filter(c => c.universityValidationStatus === 'pending' && !c.isUniversityValidated).length;

          return {
            ...teacher,
            courseCount: teacherCourses.length,
            validatedCourseCount: validatedCount,
            pendingCourseCount: pendingCount,
          };
        })
      );

      res.json(teachersWithCourses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search for users (for network discovery) - MUST BE BEFORE /:userId route
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

  // Get user's groups - MUST BE BEFORE /:userId route
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
  // JOB EXPERIENCE ENDPOINTS
  // ========================================================================

  // Get job experience for a user
  app.get("/api/users/:userId/job-experience", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const experiences = await db
        .select()
        .from(jobExperience)
        .where(eq(jobExperience.userId, userId))
        .orderBy(desc(jobExperience.isCurrent), desc(jobExperience.startDate));

      res.json(experiences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add job experience
  app.post("/api/job-experience", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validated = insertJobExperienceSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const [experience] = await db
        .insert(jobExperience)
        .values(validated)
        .returning();

      res.json(experience);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update job experience
  app.patch("/api/job-experience/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(jobExperience)
        .where(eq(jobExperience.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Job experience not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this experience" });
      }

      const [updated] = await db
        .update(jobExperience)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(jobExperience.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete job experience
  app.delete("/api/job-experience/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(jobExperience)
        .where(eq(jobExperience.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Job experience not found" });
      }

      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to delete this experience" });
      }

      await db
        .delete(jobExperience)
        .where(eq(jobExperience.id, id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================================================
  // CV EXPORT ENDPOINT
  // ========================================================================

  // Get CV data for a user (authenticated, owner-only export)
  app.get("/api/cv-export/:userId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { userId } = req.params;

    // Only allow users to export their own CV
    if (req.user.id !== userId) {
      return res.status(403).json({ error: "You can only export your own CV" });
    }

    try {
      // Get user data (only public fields)
      const [user] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          university: users.university,
          bio: users.bio,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get education records
      const education = await db
        .select()
        .from(educationRecords)
        .where(eq(educationRecords.userId, userId))
        .orderBy(desc(educationRecords.startDate));

      // Get work experience
      const workExperience = await db
        .select()
        .from(jobExperience)
        .where(eq(jobExperience.userId, userId))
        .orderBy(desc(jobExperience.startDate));

      // Get student courses (with sanitized validation info)
      const coursesRaw = await db
        .select({
          id: studentCourses.id,
          courseName: studentCourses.courseName,
          courseCode: studentCourses.courseCode,
          institution: studentCourses.institution,
          instructor: studentCourses.instructor,
          semester: studentCourses.semester,
          year: studentCourses.year,
          grade: studentCourses.grade,
          description: studentCourses.description,
          isValidated: studentCourses.isValidated,
          validatedAt: studentCourses.validatedAt,
        })
        .from(studentCourses)
        .where(eq(studentCourses.userId, userId))
        .orderBy(desc(studentCourses.year));

      // Get user skills with skill names
      const skillsRaw = await db
        .select({
          id: userSkills.id,
          skillId: userSkills.skillId,
          level: userSkills.level,
          skillName: skills.name,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(eq(userSkills.userId, userId));

      // Get user certifications
      const userCertifications = await db
        .select()
        .from(certifications)
        .where(eq(certifications.userId, userId))
        .orderBy(desc(certifications.issuedAt));

      // Get challenge participations with rankings
      const challengeParticipationsData = await db
        .select({
          id: challengeParticipants.id,
          challengeId: challengeParticipants.challengeId,
          submissionUrl: challengeParticipants.submissionUrl,
          submittedAt: challengeParticipants.submittedAt,
          rank: challengeParticipants.rank,
          joinedAt: challengeParticipants.joinedAt,
          challenge: challenges,
        })
        .from(challengeParticipants)
        .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
        .where(
          and(
            eq(challengeParticipants.userId, userId),
            sql`${challengeParticipants.submittedAt} IS NOT NULL`
          )
        )
        .orderBy(desc(challengeParticipants.submittedAt));

      // Get user badges
      const userBadgesData = await db
        .select({
          id: userBadges.id,
          earnedAt: userBadges.earnedAt,
          badge: badges,
        })
        .from(userBadges)
        .leftJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));

      const cvData = {
        user,
        education,
        workExperience,
        courses: coursesRaw,
        skills: skillsRaw.map(s => ({
          id: s.id,
          name: s.skillName || s.skillId,
          level: s.level,
        })),
        certifications: userCertifications.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          issuerName: c.issuerName,
          type: c.type,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
        })),
        challengeParticipations: challengeParticipationsData.map(p => ({
          id: p.id,
          challengeTitle: p.challenge?.title || 'Challenge',
          challengeCategory: p.challenge?.category,
          submittedAt: p.submittedAt,
          rank: p.rank,
        })),
        badges: userBadgesData.map(b => ({
          id: b.id,
          name: b.badge?.name || 'Badge',
          description: b.badge?.description,
          tier: b.badge?.tier,
          earnedAt: b.earnedAt,
        })),
      };

      res.json(cvData);
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

      // Get endorsement counts for each skill
      const endorsementCounts = await db
        .select({
          skillId: endorsements.skillId,
          count: sql<number>`COUNT(*)::integer`,
        })
        .from(endorsements)
        .where(
          and(
            eq(endorsements.endorsedUserId, userId),
            sql`${endorsements.skillId} IS NOT NULL`
          )
        )
        .groupBy(endorsements.skillId);

      const countMap = new Map(endorsementCounts.map(e => [e.skillId, e.count]));

      // Add endorsementCount to each skill
      const userSkillsWithCounts = userSkillsData.map(us => ({
        ...us,
        endorsementCount: countMap.get(us.skillId) || 0,
      }));

      res.json(userSkillsWithCounts);
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

  // Mark notification as read
  app.patch("/api/notifications/:notificationId/read", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { notificationId } = req.params;

      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, req.user.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:notificationId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { notificationId } = req.params;

      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await db.delete(notifications).where(eq(notifications.id, notificationId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all notifications
  app.delete("/api/notifications/clear-all", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      await db.delete(notifications).where(eq(notifications.userId, req.user.id));

      res.json({ success: true });
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

      // Get all existing connections (accepted)
      const existingConnections = await db
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
      
      const connectedUserIds = existingConnections.map(c => 
        c.requesterId === userId ? c.receiverId : c.requesterId
      );

      // Get pending connection requests (sent or received)
      const pendingConnections = await db
        .select()
        .from(userConnections)
        .where(
          and(
            or(
              eq(userConnections.requesterId, userId),
              eq(userConnections.receiverId, userId)
            ),
            eq(userConnections.status, 'pending')
          )
        );
      
      const pendingUserIds = pendingConnections.map(c => 
        c.requesterId === userId ? c.receiverId : c.requesterId
      );

      // Combine all users to exclude
      const excludeUserIds = new Set([...followingIds, ...connectedUserIds, ...pendingUserIds]);

      // Find similar users based on interests, university, and engagement
      // Using simpler approach to avoid SQL type casting issues
      const allUsers = await db
        .select()
        .from(users)
        .where(sql`${users.id} != ${userId}`)
        .limit(100);

      // Filter and score in JavaScript to avoid PostgreSQL array casting issues
      const currentInterests = currentUser.interests || [];
      const recommendations = allUsers
        .filter(user => !excludeUserIds.has(user.id))
        .map(user => {
          const userInterests = user.interests || [];
          const sharedSkills = currentInterests.filter(interest => 
            userInterests.some(ui => ui.toLowerCase() === interest.toLowerCase())
          );
          
          // Calculate recommendation score
          let score = 0;
          score += sharedSkills.length * 10; // 10 points per shared interest
          if (user.university === currentUser.university) score += 20;
          if (user.role === currentUser.role) score += 10;
          score += (user.engagementScore || 0) * 0.1;

          return {
            ...user,
            mutualConnections: 0, // Would need another query to calculate
            sharedSkills,
            recommendationScore: Math.round(score),
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, Number(limit));

      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cross-university discovery - returns university statistics
  app.get("/api/discovery/universities", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      // Get all students with universities (other than current user's)
      const allStudents = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'student'),
            sql`${users.university} IS NOT NULL`,
            sql`${users.university} != ''`,
            req.user.university 
              ? sql`${users.university} != ${req.user.university}`
              : sql`TRUE`
          )
        );

      // Group by university and calculate stats in JavaScript
      const universityMap = new Map<string, { 
        students: typeof allStudents, 
        majors: Set<string>,
        totalEngagement: number 
      }>();

      for (const student of allStudents) {
        const uni = student.university!;
        if (!universityMap.has(uni)) {
          universityMap.set(uni, { students: [], majors: new Set(), totalEngagement: 0 });
        }
        const uniData = universityMap.get(uni)!;
        uniData.students.push(student);
        if (student.major) uniData.majors.add(student.major);
        uniData.totalEngagement += student.engagementScore || 0;
      }

      // Convert to array format expected by frontend
      const universities = Array.from(universityMap.entries())
        .map(([university, data]) => ({
          university,
          studentCount: data.students.length,
          topMajors: Array.from(data.majors).slice(0, 5),
          avgEngagementScore: Math.round(data.totalEngagement / data.students.length),
        }))
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 20);

      res.json(universities);
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
  // FILE UPLOAD API (Images & Videos) - Cloud Storage with Local Fallback
  // ========================================================================

  // Initialize cloud storage on startup
  initializeCloudStorage().then(available => {
    if (available) {
      console.log('✓ Cloud storage ready for file uploads');
    } else {
      console.log('! Cloud storage unavailable, using local storage fallback');
    }
  });

  // Create local uploads directory as fallback
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

  // Configure multer to use memory storage for cloud uploads
  const memoryStorage = multer.memoryStorage();

  // Configure multer for image uploads (memory storage for cloud)
  const imageUpload = multer({
    storage: memoryStorage,
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

  // Configure multer for video uploads (memory storage for cloud)
  const videoUpload = multer({
    storage: memoryStorage,
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

  // Serve locally uploaded files as fallback
  app.use('/uploads', express.static(uploadsDir));

  // Helper function to save file locally (fallback)
  async function saveFileLocally(buffer: Buffer, folder: string, filename: string): Promise<string> {
    const targetDir = path.join(uploadsDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(filename);
    const uniqueFilename = `${folder.slice(0, -1)}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${uniqueFilename}`;
  }

  // Upload image endpoint - Cloud storage with local fallback
  app.post("/api/upload/image", imageUpload.single('image'), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      let imageUrl: string;

      // Try cloud storage first
      if (isCloudStorageAvailable()) {
        const result = await uploadToCloud(req.file.buffer, {
          folder: 'images',
          contentType: req.file.mimetype,
          originalFilename: req.file.originalname,
        });
        
        if (result) {
          imageUrl = result.url;
        } else {
          // Fall back to local storage
          imageUrl = await saveFileLocally(req.file.buffer, 'images', req.file.originalname);
        }
      } else {
        // Use local storage
        imageUrl = await saveFileLocally(req.file.buffer, 'images', req.file.originalname);
      }

      res.json({ url: imageUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload video endpoint - Cloud storage with local fallback
  app.post("/api/upload/video", videoUpload.single('video'), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      let videoUrl: string;

      // Try cloud storage first
      if (isCloudStorageAvailable()) {
        const result = await uploadToCloud(req.file.buffer, {
          folder: 'videos',
          contentType: req.file.mimetype,
          originalFilename: req.file.originalname,
        });
        
        if (result) {
          videoUrl = result.url;
        } else {
          // Fall back to local storage
          videoUrl = await saveFileLocally(req.file.buffer, 'videos', req.file.originalname);
        }
      } else {
        // Use local storage
        videoUrl = await saveFileLocally(req.file.buffer, 'videos', req.file.originalname);
      }

      res.json({ url: videoUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload multiple images endpoint - Cloud storage with local fallback
  app.post("/api/upload/images", imageUpload.array('images', 10), async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }

      const urls: string[] = [];

      // Try cloud storage first
      if (isCloudStorageAvailable()) {
        const results = await uploadMultipleToCloud(
          req.files.map(file => ({
            buffer: file.buffer,
            options: {
              folder: 'images' as const,
              contentType: file.mimetype,
              originalFilename: file.originalname,
            }
          }))
        );
        
        if (results.length === req.files.length) {
          urls.push(...results.map(r => r.url));
        } else {
          // Some uploads failed, fall back to local for all
          for (const file of req.files) {
            const url = await saveFileLocally(file.buffer, 'images', file.originalname);
            urls.push(url);
          }
        }
      } else {
        // Use local storage
        for (const file of req.files) {
          const url = await saveFileLocally(file.buffer, 'images', file.originalname);
          urls.push(url);
        }
      }

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

  // Serve uploaded documents (local fallback)
  const documentsDir = path.join(uploadsDir, 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
  app.use('/uploads/documents', express.static(documentsDir));

  // ========================================================================
  // PROBLEM-SOLVING Q&A SYSTEM
  // ========================================================================

  // Get all Q&A questions (general problem-solving, not course-specific)
  app.get("/api/qa/questions", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { resolved, limit = 20, offset = 0 } = req.query;

      // Use a "general-qa" placeholder course ID for non-course questions
      const questions = await db
        .select({
          id: courseDiscussions.id,
          title: courseDiscussions.title,
          content: courseDiscussions.content,
          isQuestion: courseDiscussions.isQuestion,
          isResolved: courseDiscussions.isResolved,
          replyCount: courseDiscussions.replyCount,
          upvoteCount: courseDiscussions.upvoteCount,
          createdAt: courseDiscussions.createdAt,
          authorId: courseDiscussions.authorId,
          courseId: courseDiscussions.courseId,
          author: users,
        })
        .from(courseDiscussions)
        .leftJoin(users, eq(courseDiscussions.authorId, users.id))
        .where(
          and(
            eq(courseDiscussions.isQuestion, true),
            resolved !== undefined
              ? eq(courseDiscussions.isResolved, resolved === 'true')
              : sql`TRUE`
          )
        )
        .orderBy(desc(courseDiscussions.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single question with answers
  app.get("/api/qa/questions/:questionId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { questionId } = req.params;

      const [question] = await db
        .select({
          id: courseDiscussions.id,
          title: courseDiscussions.title,
          content: courseDiscussions.content,
          isQuestion: courseDiscussions.isQuestion,
          isResolved: courseDiscussions.isResolved,
          replyCount: courseDiscussions.replyCount,
          upvoteCount: courseDiscussions.upvoteCount,
          createdAt: courseDiscussions.createdAt,
          authorId: courseDiscussions.authorId,
          courseId: courseDiscussions.courseId,
          author: users,
        })
        .from(courseDiscussions)
        .leftJoin(users, eq(courseDiscussions.authorId, users.id))
        .where(eq(courseDiscussions.id, questionId));

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      // Get answers
      const answers = await db
        .select({
          id: discussionReplies.id,
          content: discussionReplies.content,
          upvoteCount: discussionReplies.upvoteCount,
          createdAt: discussionReplies.createdAt,
          authorId: discussionReplies.authorId,
          author: users,
        })
        .from(discussionReplies)
        .leftJoin(users, eq(discussionReplies.authorId, users.id))
        .where(eq(discussionReplies.discussionId, questionId))
        .orderBy(desc(discussionReplies.upvoteCount), desc(discussionReplies.createdAt));

      // Check if current user has upvoted the question
      const [userQuestionUpvote] = await db
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.discussionId, questionId),
            eq(discussionUpvotes.userId, req.user.id)
          )
        );

      res.json({
        ...question,
        answers,
        userHasUpvoted: !!userQuestionUpvote,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new Q&A question
  app.post("/api/qa/questions", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { title, content, courseId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // Find or create a general Q&A course for non-course-specific questions
      let qaCourseId = courseId;
      if (!qaCourseId) {
        const [generalCourse] = await db
          .select()
          .from(courses)
          .where(eq(courses.code, 'GENERAL-QA'))
          .limit(1);

        if (generalCourse) {
          qaCourseId = generalCourse.id;
        } else {
          // Create general Q&A course if it doesn't exist
          const [newCourse] = await db
            .insert(courses)
            .values({
              name: 'General Q&A',
              code: 'GENERAL-QA',
              description: 'General problem-solving and Q&A discussions',
              instructorId: req.user.id,
            })
            .returning();
          qaCourseId = newCourse.id;
        }
      }

      const [newQuestion] = await db
        .insert(courseDiscussions)
        .values({
          courseId: qaCourseId,
          authorId: req.user.id,
          title,
          content,
          isQuestion: true,
        })
        .returning();

      // Award +10 problem-solver points for asking a question
      await db
        .update(users)
        .set({ 
          problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 10`,
          totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 10`
        })
        .where(eq(users.id, req.user.id));

      res.json(newQuestion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Answer a Q&A question
  app.post("/api/qa/questions/:questionId/answers", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { questionId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Verify question exists
      const [question] = await db
        .select()
        .from(courseDiscussions)
        .where(eq(courseDiscussions.id, questionId));

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const [newAnswer] = await db
        .insert(discussionReplies)
        .values({
          discussionId: questionId,
          authorId: req.user.id,
          content,
        })
        .returning();

      // Update reply count
      await db
        .update(courseDiscussions)
        .set({ replyCount: sql`${courseDiscussions.replyCount} + 1` })
        .where(eq(courseDiscussions.id, questionId));

      // Award +15 problem-solver points for answering
      await db
        .update(users)
        .set({ 
          problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 15`,
          totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 15`
        })
        .where(eq(users.id, req.user.id));

      // Notify question author
      if (question.authorId !== req.user.id) {
        await db.insert(notifications).values({
          userId: question.authorId,
          type: 'answer',
          title: 'New Answer',
          message: `${req.user.firstName} ${req.user.lastName} answered your question: "${question.title}"`,
          link: `/problem-solving/${questionId}`,
        });
      }

      res.json(newAnswer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upvote a question or answer
  app.post("/api/qa/upvote", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { questionId, answerId } = req.body;

      if (!questionId && !answerId) {
        return res.status(400).json({ error: "Either questionId or answerId is required" });
      }

      // Check if already upvoted
      const existingUpvote = await db
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.userId, req.user.id),
            questionId 
              ? eq(discussionUpvotes.discussionId, questionId)
              : eq(discussionUpvotes.replyId, answerId)
          )
        );

      if (existingUpvote.length > 0) {
        // Remove upvote
        await db
          .delete(discussionUpvotes)
          .where(eq(discussionUpvotes.id, existingUpvote[0].id));

        // Decrease upvote count
        if (questionId) {
          await db
            .update(courseDiscussions)
            .set({ upvoteCount: sql`${courseDiscussions.upvoteCount} - 1` })
            .where(eq(courseDiscussions.id, questionId));
        } else {
          await db
            .update(discussionReplies)
            .set({ upvoteCount: sql`${discussionReplies.upvoteCount} - 1` })
            .where(eq(discussionReplies.id, answerId));
        }

        res.json({ upvoted: false });
      } else {
        // Add upvote
        await db
          .insert(discussionUpvotes)
          .values({
            userId: req.user.id,
            discussionId: questionId || null,
            replyId: answerId || null,
          });

        // Increase upvote count
        if (questionId) {
          await db
            .update(courseDiscussions)
            .set({ upvoteCount: sql`${courseDiscussions.upvoteCount} + 1` })
            .where(eq(courseDiscussions.id, questionId));

          // Award +2 points to question author
          const [question] = await db.select().from(courseDiscussions).where(eq(courseDiscussions.id, questionId));
          if (question && question.authorId !== req.user.id) {
            await db
              .update(users)
              .set({ 
                problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 2`,
                totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 2`
              })
              .where(eq(users.id, question.authorId));
          }
        } else {
          await db
            .update(discussionReplies)
            .set({ upvoteCount: sql`${discussionReplies.upvoteCount} + 1` })
            .where(eq(discussionReplies.id, answerId));

          // Award +5 points to answer author
          const [answer] = await db.select().from(discussionReplies).where(eq(discussionReplies.id, answerId));
          if (answer && answer.authorId !== req.user.id) {
            await db
              .update(users)
              .set({ 
                problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 5`,
                totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 5`
              })
              .where(eq(users.id, answer.authorId));
          }
        }

        res.json({ upvoted: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark question as resolved
  app.post("/api/qa/questions/:questionId/resolve", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { questionId } = req.params;
      const { answerId } = req.body;

      const [question] = await db
        .select()
        .from(courseDiscussions)
        .where(eq(courseDiscussions.id, questionId));

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      if (question.authorId !== req.user.id && req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
        return res.status(403).json({ error: "Only the question author can mark it as resolved" });
      }

      await db
        .update(courseDiscussions)
        .set({ isResolved: true })
        .where(eq(courseDiscussions.id, questionId));

      // Award +20 bonus points to the accepted answer author
      if (answerId) {
        const [acceptedAnswer] = await db
          .select()
          .from(discussionReplies)
          .where(eq(discussionReplies.id, answerId));

        if (acceptedAnswer) {
          await db
            .update(users)
            .set({ 
              problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 20`,
              totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 20`
            })
            .where(eq(users.id, acceptedAnswer.authorId));

          // Notify the answer author
          if (acceptedAnswer.authorId !== req.user.id) {
            await db.insert(notifications).values({
              userId: acceptedAnswer.authorId,
              type: 'badge',
              title: 'Answer Accepted!',
              message: `Your answer was marked as the solution and you earned +20 Problem-Solver Points!`,
              link: `/problem-solving/${questionId}`,
            });
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
