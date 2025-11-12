import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
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
  challenges,
  challengeParticipants,
  notifications,
  announcements,
  insertPostSchema,
  insertCommentSchema,
  insertReactionSchema,
  insertEndorsementSchema,
  insertChallengeSchema,
  insertAnnouncementSchema,
  insertCourseDiscussionSchema,
  insertDiscussionReplySchema,
} from "@shared/schema";
import OpenAI from "openai";
import jwt from "jsonwebtoken";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;
const DEMO_PASSWORD = "demo123"; // Fixed password for demo accounts

// Allowlist of demo account emails that can use dev-login
const DEMO_ACCOUNT_ALLOWLIST = [
  'demo.student@uninexus.app',
  'demo.teacher@uninexus.app',
  'demo.university@uninexus.app',
  'demo.industry@uninexus.app',
  'demo.admin@uninexus.app',
];

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

      // Security: Only allow demo accounts from the allowlist
      if (!DEMO_ACCOUNT_ALLOWLIST.includes(email)) {
        console.warn(`Dev login attempt blocked for non-demo email: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Validate password (all demo accounts use the same password)
      if (password !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Look up user by email
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
    const { category, filterByInterests, userId } = req.query;
    
    try {
      let query = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          content: posts.content,
          imageUrl: posts.imageUrl,
          category: posts.category,
          tags: posts.tags,
          viewCount: posts.viewCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt))
        .$dynamic();

      if (category && category !== 'all') {
        query = query.where(eq(posts.category, category as string));
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

  app.post("/api/posts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertPostSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });

      const [newPost] = await db.insert(posts).values(validatedData).returning();

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 10`,
        })
        .where(eq(users.id, req.user!.id));

      res.json(newPost);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // COMMENTS ENDPOINTS
  // ========================================================================

  app.post("/api/comments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });

      const [newComment] = await db.insert(comments).values(validatedData).returning();

      // Update engagement score
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 5`,
        })
        .where(eq(users.id, req.user!.id));

      res.json(newComment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // REACTIONS ENDPOINTS
  // ========================================================================

  app.post("/api/reactions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertReactionSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      // Check if reaction already exists
      const existing = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.postId, validatedData.postId),
            eq(reactions.userId, req.user!.id),
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
        .where(eq(users.id, req.user!.id));

      res.json(newReaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // BADGES ENDPOINTS
  // ========================================================================

  app.get("/api/user-badges/:userId", async (req: Request, res: Response) => {
    try {
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
        .where(eq(userBadges.userId, req.params.userId))
        .orderBy(desc(userBadges.earnedAt));

      res.json(userBadgesData);
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
    try {
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertEndorsementSchema.parse({
        ...req.body,
        endorserId: req.user!.id,
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
        message: `${req.user!.firstName} ${req.user!.lastName} endorsed you`,
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertCourseDiscussionSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });

      const newDiscussion = await storage.createDiscussion(validatedData);
      
      // Update engagement score
      await db
        .update(users)
        .set({ engagementScore: sql`${users.engagementScore} + 5` })
        .where(eq(users.id, req.user!.id));

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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertDiscussionReplySchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });

      const newReply = await storage.createReply(validatedData);
      
      // Update engagement score
      await db
        .update(users)
        .set({ engagementScore: sql`${users.engagementScore} + 3` })
        .where(eq(users.id, req.user!.id));

      // Get the discussion to notify the author
      const [discussion] = await db
        .select()
        .from(courseDiscussions)
        .where(eq(courseDiscussions.id, validatedData.discussionId));

      if (discussion && discussion.authorId !== req.user!.id) {
        await db.insert(notifications).values({
          userId: discussion.authorId,
          type: "comment",
          title: "New Reply",
          message: `${req.user!.firstName} ${req.user!.lastName} replied to your discussion`,
          link: `/forums/${discussion.courseId}/${discussion.id}`,
        });
      }

      res.json(newReply);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Toggle upvote on discussion
  app.post("/api/discussions/:discussionId/upvote", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const upvoted = await storage.toggleDiscussionUpvote(
        req.user!.id,
        req.params.discussionId
      );

      res.json({ upvoted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle upvote on reply
  app.post("/api/replies/:replyId/upvote", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const upvoted = await storage.toggleReplyUpvote(
        req.user!.id,
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const validatedData = insertChallengeSchema.parse({
        ...req.body,
        organizerId: req.user!.id,
      });

      const [newChallenge] = await db.insert(challenges).values(validatedData).returning();
      res.json(newChallenge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // NOTIFICATIONS ENDPOINT
  // ========================================================================

  app.get("/api/notifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.user!.id))
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
    if (!req.isAuthenticated()) {
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

      const systemPrompt = `You are an AI career advisor for university students. You provide personalized career guidance, skill recommendations, resume tips, interview preparation advice, and learning path suggestions. You are helpful, encouraging, and knowledgeable about various career paths and industries.

User Profile:
- Name: ${req.user!.firstName} ${req.user!.lastName}
- Major: ${req.user!.major || "Not specified"}
- University: ${req.user!.university || "Not specified"}
- Engagement Score: ${req.user!.engagementScore}
- Problem Solver Score: ${req.user!.problemSolverScore}

Keep your responses concise (2-4 paragraphs max), actionable, and encouraging. Use a friendly, professional tone suitable for Gen Z students.`;

      // Using gpt-4o (latest OpenAI model as of 2024-2025)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      // Update engagement score for using CareerBot
      await db
        .update(users)
        .set({
          engagementScore: sql`${users.engagementScore} + 3`,
        })
        .where(eq(users.id, req.user!.id));

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
    if (!req.isAuthenticated()) {
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
- Name: ${req.user!.firstName} ${req.user!.lastName}
- Major: ${req.user!.major || "Not specified"}
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
    if (!req.isAuthenticated()) {
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

      // Using gpt-4o (latest OpenAI model as of 2024-2025)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
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
  // ADMIN ENDPOINTS
  // ========================================================================

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'master_admin') {
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
    if (!req.isAuthenticated() || req.user!.role !== 'master_admin') {
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
    if (!req.isAuthenticated() || req.user!.role !== 'university_admin') {
      return res.status(403).send("Forbidden");
    }

    try {
      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });

      const [newAnnouncement] = await db.insert(announcements).values(validatedData).returning();
      res.json(newAnnouncement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
