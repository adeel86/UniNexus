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

  // Search within user's connections only
  app.get("/api/connections/search", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { q } = req.query;
      const searchTerm = q as string;

      if (!searchTerm || searchTerm.length < 3) {
        return res.json([]);
      }

      const userId = req.user.id;
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
  // HYPER-LOCALIZED AI COURSE CHATBOT API
  // ========================================================================

  const aiChatbot = await import("./aiChatbot");

  // Send message to AI course chatbot
  app.post("/api/ai/course-chat", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { courseId, message, sessionId } = req.body;

      if (!courseId || !message) {
        return res.status(400).json({ error: "courseId and message are required" });
      }

      // Verify student is enrolled in the course
      const isEnrolled = await aiChatbot.verifyStudentEnrollment(req.user.id, courseId);
      if (!isEnrolled) {
        return res.status(403).json({ error: "You must be enrolled in this course to use the AI tutor" });
      }

      // Get or create session
      const activeSessionId = sessionId || await aiChatbot.createOrGetSession(req.user.id, courseId);

      // Save user message
      await aiChatbot.saveMessage(activeSessionId, 'user', message);

      // Generate AI response
      const response = await aiChatbot.generateChatResponse(courseId, activeSessionId, message, req.user.id);

      // Save assistant message with citations
      await aiChatbot.saveMessage(
        activeSessionId, 
        'assistant', 
        response.answer, 
        response.citations.map(c => c.contentId)
      );

      res.json({
        sessionId: activeSessionId,
        answer: response.answer,
        citations: response.citations,
      });
    } catch (error: any) {
      console.error("AI course chat error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  // Get chat history for a course session
  app.get("/api/ai/course-chat/:courseId/history", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { courseId } = req.params;

      // Verify enrollment
      const isEnrolled = await aiChatbot.verifyStudentEnrollment(req.user.id, courseId);
      if (!isEnrolled) {
        return res.status(403).json({ error: "You must be enrolled in this course" });
      }

      const sessions = await aiChatbot.getUserSessions(req.user.id, courseId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get messages for a specific session
  app.get("/api/ai/course-chat/session/:sessionId", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { sessionId } = req.params;
      const messages = await aiChatbot.getChatHistory(sessionId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get course content availability for AI chat
  app.get("/api/ai/course-chat/:courseId/status", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { courseId } = req.params;

      // Verify enrollment
      const isEnrolled = await aiChatbot.verifyStudentEnrollment(req.user.id, courseId);
      if (!isEnrolled) {
        return res.status(403).json({ error: "You must be enrolled in this course" });
      }

      const chunkCount = await aiChatbot.getContentChunkCount(courseId);
      const courseInfo = await aiChatbot.getCourseInfo(courseId);

      res.json({
        courseId,
        courseName: courseInfo?.name || "Unknown Course",
        instructorName: courseInfo?.instructorName || "Instructor",
        indexedChunks: chunkCount,
        isReady: chunkCount > 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Index teacher content (teacher only endpoint)
  app.post("/api/teacher-content/:contentId/index", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Only teachers and admins can index content
    if (req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Only teachers can index content" });
    }

    try {
      const { contentId } = req.params;
      const chunksIndexed = await aiChatbot.indexTeacherContent(contentId);
      res.json({ success: true, chunksIndexed });
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

  // Update a group (only creator or admin can update)
  app.patch("/api/groups/:id", async (req: Request, res: Response) => {
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

      // Check if user is creator or admin
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, req.user.id)
          )
        );

      const isCreator = group.creatorId === req.user.id;
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
  app.delete("/api/groups/:id", async (req: Request, res: Response) => {
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

      // Check if user is creator or admin
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, req.user.id)
          )
        );

      const isCreator = group.creatorId === req.user.id;
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

  // ========================================================================
  // TEACHER CONTENT MANAGEMENT API
  // ========================================================================

  // Multer configuration for document uploads (using memory storage for cloud)
  const documentsDir = path.join(uploadsDir, 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const documentUpload = multer({
    storage: memoryStorage,
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

  // Serve uploaded documents (local fallback)
  app.use('/uploads/documents', express.static(documentsDir));

  // Upload teacher content document - Cloud storage with local fallback
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

      const { courseId } = req.body;

      // Validate that courseId is provided - uploads must be linked to a validated course
      if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
        return res.status(400).json({ 
          error: "Course ID is required. Materials must be uploaded to a validated course." 
        });
      }

      // Validate that the course exists and is university-validated
      const [targetCourse] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId.trim()))
        .limit(1);

      if (!targetCourse) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (targetCourse.instructorId !== req.user.id && req.user.role !== 'master_admin') {
        return res.status(403).json({ error: "You can only upload to your own courses" });
      }

      if (!targetCourse.isUniversityValidated) {
        return res.status(400).json({ 
          error: "Course must be validated by the university before uploading materials" 
        });
      }

      let fileUrl: string;

      // Try cloud storage first
      if (isCloudStorageAvailable()) {
        const result = await uploadToCloud(req.file.buffer, {
          folder: 'documents',
          contentType: req.file.mimetype,
          originalFilename: req.file.originalname,
        });
        
        if (result) {
          fileUrl = result.url;
        } else {
          // Fall back to local storage
          fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
        }
      } else {
        // Use local storage
        fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
      }
      
      // Parse additional fields from request body
      const { title, description, tags, isPublic } = req.body;

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
          title: (title && typeof title === 'string' ? title.trim() : null) || req.file.originalname,
          description: description && typeof description === 'string' ? description.trim() : null,
          courseId: courseId.trim(),
          contentType,
          fileUrl,
          metadata,
          tags: tags && typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
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

  // Update teacher content
  app.patch("/api/teacher-content/:id", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { id } = req.params;
      const { title, description, tags, isPublic } = req.body;

      // Get the content first to check ownership
      const [existingContent] = await db
        .select()
        .from(teacherContent)
        .where(eq(teacherContent.id, id));

      if (!existingContent) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Check if user is the owner or admin
      if (existingContent.teacherId !== req.user.id && req.user.role !== 'master_admin') {
        return res.status(403).json({ error: "Not authorized to update this content" });
      }

      // Update the content
      const [updatedContent] = await db
        .update(teacherContent)
        .set({
          title: title || existingContent.title,
          description: description !== undefined ? description : existingContent.description,
          tags: tags !== undefined ? tags : existingContent.tags,
          isPublic: isPublic !== undefined ? isPublic : existingContent.isPublic,
          updatedAt: new Date(),
        })
        .where(eq(teacherContent.id, id))
        .returning();

      res.json(updatedContent);
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
