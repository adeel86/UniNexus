import express, { Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  users,
  recruiterFeedback,
  notifications,
  insertRecruiterFeedbackSchema,
} from "@shared/schema";

const router = express.Router();

// ========================================================================
// RECRUITER FEEDBACK (Industry Professional Feedback on Students)
// ========================================================================

// Get all feedback for a student (used by CareerBot and student profiles)
router.get("/recruiter-feedback/student/:studentId", async (req: AuthRequest, res: Response) => {
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
router.post("/recruiter-feedback", isAuthenticated, async (req: AuthRequest, res: Response) => {
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
router.get("/recruiter-feedback/insights/:studentId", async (req: AuthRequest, res: Response) => {
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
        acc[f.category] = { count: 0, totalRating: 0, feedback: [] as any[] };
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
router.get("/recruiter-feedback/my-feedback", isAuthenticated, async (req: AuthRequest, res: Response) => {
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

export default router;
