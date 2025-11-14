import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { createHash } from "crypto";
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
  discussionUpvotes,
  courseMilestones,
  challenges,
  challengeParticipants,
  notifications,
  announcements,
  certifications,
  recruiterFeedback,
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
  // CERTIFICATIONS ENDPOINTS (NFT-Style Digital Certificates)
  // ========================================================================

  // Get user certifications
  app.get("/api/certifications/user/:userId", async (req: Request, res: Response) => {
    try {
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    // Only teachers, university admins, and master admins can issue certificates
    const authorizedRoles = ['teacher', 'university_admin', 'master_admin'];
    if (!authorizedRoles.includes(req.user!.role)) {
      return res.status(403).json({ 
        error: "Forbidden: Only teachers and administrators can issue certificates" 
      });
    }

    try {
      const validatedData = insertCertificationSchema.parse(req.body);

      // Set issuer name from authenticated user (cannot be spoofed)
      const issuerName = `${req.user!.firstName} ${req.user!.lastName}`;

      // Generate verification hash using crypto
      const crypto = await import('crypto');
      const hashData = JSON.stringify({
        ...validatedData,
        timestamp: Date.now(),
        issuerId: req.user!.id,
        issuerName,
      });
      const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

      const [newCertification] = await db
        .insert(certifications)
        .values({
          ...validatedData,
          issuerId: req.user!.id,
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    // Only industry professionals can submit recruiter feedback
    if (req.user!.role !== 'industry_professional') {
      return res.status(403).json({ 
        error: "Forbidden: Only industry professionals can submit recruiter feedback" 
      });
    }

    try {
      const validatedData = insertRecruiterFeedbackSchema.parse({
        ...req.body,
        recruiterId: req.user!.id,
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
          message: `${req.user!.company || 'A recruiter'} has left feedback on your ${newFeedback.category} skills`,
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    if (req.user!.role !== 'industry_professional') {
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
        .where(eq(recruiterFeedback.recruiterId, req.user!.id))
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

      // Check and award course badges
      await checkAndAwardCourseBadges(req.user!.id, validatedData.courseId);

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

      // Check and award course badges
      if (discussion) {
        await checkAndAwardCourseBadges(req.user!.id, discussion.courseId);
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

  // Get challenge milestones for a user
  app.get("/api/users/:userId/challenge-milestones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
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

      // Get user's skills for skill gap analysis
      const userSkillsData = await db
        .select({
          skill: skills,
          level: userSkills.level,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(eq(userSkills.userId, req.user!.id));

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
          eq(recruiterFeedback.studentId, req.user!.id),
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
- Name: ${req.user!.firstName} ${req.user!.lastName}
- Major: ${req.user!.major || "Not specified"}
- University: ${req.user!.university || "Not specified"}
- Interests: ${userInterests}
- Current Skills: ${skillsList}
- Engagement Score: ${req.user!.engagementScore} (indicates platform activity level)
- Problem Solver Score: ${req.user!.problemSolverScore} (indicates problem-solving abilities)
- Endorsement Score: ${req.user!.endorsementScore} (indicates peer recognition)${recruiterInsights}

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
  // AI CAREER PROGRESSION SUMMARY ENDPOINT
  // ========================================================================

  app.get("/api/ai/career-summary/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    // Only teachers, university admins, and master admins can view career summaries
    const authorizedRoles = ['teacher', 'university_admin', 'master_admin'];
    if (!authorizedRoles.includes(req.user!.role)) {
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
    if (!req.isAuthenticated()) {
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
            eq(challengeParticipants.userId, req.user!.id)
          )
        )
        .limit(1);

      if (existingParticipant) {
        return res.status(400).json({ error: "Already joined this challenge" });
      }

      const [participant] = await db.insert(challengeParticipants).values({
        challengeId,
        userId: req.user!.id,
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
        .where(eq(users.id, req.user!.id));

      await db.insert(notifications).values({
        userId: req.user!.id,
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
    if (!req.isAuthenticated()) {
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
            eq(challengeParticipants.userId, req.user!.id)
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
      await applyPointDelta(req.user!.id, {
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
          .update(`${req.user!.id}-${challengeId}-${Date.now()}`)
          .digest('hex');
        
        await db.insert(certifications).values({
          userId: req.user!.id,
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
          userId: req.user!.id,
          type: 'achievement',
          title: 'Certificate Earned!',
          message: `You've earned a participation certificate for ${challenge.title}!`,
          link: '/certificates',
        });
      }

      await db.insert(notifications).values({
        userId: req.user!.id,
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
    if (!req.isAuthenticated()) {
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const { userId } = req.params;
      
      // Only allow admins or the user themselves
      if (req.user!.role !== 'master_admin' && req.user!.id !== userId) {
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
    if (!req.isAuthenticated()) {
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
        .where(eq(challengeParticipants.userId, req.user!.id))
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

  // ========================================================================
  // UNIVERSITY RETENTION STRATEGY
  // ========================================================================

  // Get Challenge Participation & Badge Metrics for Retention Overview
  app.get("/api/university/retention/overview", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['university_admin', 'master_admin'].includes(req.user!.role)) {
      return res.status(403).send("Forbidden");
    }

    try {
      // Get all students
      const allStudents = await db
        .select()
        .from(users)
        .where(eq(users.role, 'student'));

      const totalStudents = allStudents.length;

      // Get active challenges (upcoming or active status)
      const activeChallenges = await db
        .select()
        .from(challenges)
        .where(or(
          eq(challenges.status, 'active'),
          eq(challenges.status, 'upcoming')
        ));

      // Get all challenge participants
      const allParticipants = await db
        .select({
          userId: challengeParticipants.userId,
          challengeId: challengeParticipants.challengeId,
          joinedAt: challengeParticipants.joinedAt,
          category: challenges.category,
        })
        .from(challengeParticipants)
        .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id));

      // Calculate unique participants
      const uniqueParticipantIds = new Set(allParticipants.map(p => p.userId));
      const participatingStudents = uniqueParticipantIds.size;
      const participationRate = totalStudents > 0 ? Math.round((participatingStudents / totalStudents) * 100) : 0;

      // Get badge statistics
      const allUserBadges = await db
        .select({
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          tier: badges.tier,
          category: badges.category,
        })
        .from(userBadges)
        .leftJoin(badges, eq(userBadges.badgeId, badges.id))
        .leftJoin(users, eq(userBadges.userId, users.id))
        .where(eq(users.role, 'student'));

      // Badge progress bands (how many students have 0, 1-2, 3-5, 6+ badges)
      const badgeCountsByUser = allUserBadges.reduce((acc, ub) => {
        acc[ub.userId] = (acc[ub.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const badgeBands = {
        none: 0,
        low: 0,      // 1-2 badges
        medium: 0,   // 3-5 badges
        high: 0,     // 6+ badges
      };

      allStudents.forEach(student => {
        const count = badgeCountsByUser[student.id] || 0;
        if (count === 0) badgeBands.none++;
        else if (count <= 2) badgeBands.low++;
        else if (count <= 5) badgeBands.medium++;
        else badgeBands.high++;
      });

      // Challenge participation by category
      const participationByCategory = allParticipants.reduce((acc, p) => {
        const cat = p.category || 'other';
        acc[cat] = (acc[cat] || 0) + 1;
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
          activeChallenges: activeChallenges.length,
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
    if (!req.isAuthenticated() || !['university_admin', 'master_admin'].includes(req.user!.role)) {
      return res.status(403).send("Forbidden");
    }

    try {
      // Get all students with their scores
      const allStudents = await db
        .select()
        .from(users)
        .where(eq(users.role, 'student'));

      // Calculate AI readiness score (average of engagement, problem solving, and endorsement scores)
      const readinessScores = allStudents.map(s => {
        const engagement = s.engagementScore || 0;
        const problemSolver = s.problemSolverScore || 0;
        const endorsement = s.endorsementScore || 0;
        return Math.round((engagement + problemSolver + endorsement) / 3);
      });

      const avgReadiness = readinessScores.length > 0 
        ? Math.round(readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length)
        : 0;

      // Readiness cohorts
      const readinessCohorts = {
        low: readinessScores.filter(s => s < 30).length,
        medium: readinessScores.filter(s => s >= 30 && s < 70).length,
        high: readinessScores.filter(s => s >= 70).length,
      };

      // Get skill distribution
      const allUserSkills = await db
        .select({
          userId: userSkills.userId,
          skillId: userSkills.skillId,
          level: userSkills.level,
          category: skills.category,
        })
        .from(userSkills)
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .leftJoin(users, eq(userSkills.userId, users.id))
        .where(eq(users.role, 'student'));

      // Skills by level
      const skillsByLevel = allUserSkills.reduce((acc, us) => {
        const level = us.level || 'beginner';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Skills by category
      const skillsByCategory = allUserSkills.reduce((acc, us) => {
        const cat = us.category || 'other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get certification statistics
      const allCertifications = await db
        .select({
          id: certifications.id,
          userId: certifications.userId,
          type: certifications.type,
          issuedAt: certifications.issuedAt,
          expiresAt: certifications.expiresAt,
        })
        .from(certifications)
        .leftJoin(users, eq(certifications.userId, users.id))
        .where(eq(users.role, 'student'));

      const certificationStats = {
        total: allCertifications.length,
        byType: allCertifications.reduce((acc, cert) => {
          const type = cert.type || 'other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        active: allCertifications.filter(cert => 
          !cert.expiresAt || new Date(cert.expiresAt) > new Date()
        ).length,
      };

      // Students with certifications
      const studentsWithCerts = new Set(allCertifications.map(c => c.userId)).size;
      const certificationRate = allStudents.length > 0 
        ? Math.round((studentsWithCerts / allStudents.length) * 100)
        : 0;

      res.json({
        readiness: {
          averageScore: avgReadiness,
          cohorts: readinessCohorts,
        },
        skills: {
          byLevel: skillsByLevel,
          byCategory: skillsByCategory,
          totalSkills: allUserSkills.length,
        },
        certifications: {
          ...certificationStats,
          certificationRate,
          studentsWithCertifications: studentsWithCerts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
