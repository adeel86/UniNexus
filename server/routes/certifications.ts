import { Router, Request, Response } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "../db";
import {
  users,
  certifications,
  recruiterFeedback,
  notifications,
  insertCertificationSchema,
  insertRecruiterFeedbackSchema,
} from "@shared/schema";

const router = Router();

router.get("/certifications/user/:userId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;
    
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
      return res.json([]);
    }

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

router.post("/certifications", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const authorizedRoles = ['teacher', 'university_admin', 'industry_professional', 'master_admin'];
  if (!authorizedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: "Forbidden: Only teachers, administrators, and industry professionals can issue certificates" 
    });
  }

  try {
    const validatedData = insertCertificationSchema.parse(req.body);

    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

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

    const issuerName = `${req.user.firstName} ${req.user.lastName}`;

    const hashData = JSON.stringify({
      ...validatedData,
      timestamp: Date.now(),
      issuerId: req.user.id,
      issuerName,
    });
    const verificationHash = createHash('sha256').update(hashData).digest('hex');

    const [newCertification] = await db
      .insert(certifications)
      .values({
        ...validatedData,
        issuerId: req.user.id,
        issuerName,
        verificationHash,
      })
      .returning();

    await db.insert(notifications).values({
      userId: validatedData.userId,
      type: "achievement",
      title: "New Certificate Earned!",
      message: `You've earned a certificate: ${validatedData.title}`,
      link: "/profile",
    });

    const [issuer] = await db
      .select()
      .from(users)
      .where(eq(users.id, newCertification.issuerId!))
      .limit(1);

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

router.get("/certifications/verify/:hash", async (req: Request, res: Response) => {
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

    const cert = certification[0];
    if (cert.expiresAt && new Date(cert.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Certificate has expired", certification: cert });
    }

    res.json({ valid: true, certification: cert });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/certifications/:id", async (req: Request, res: Response) => {
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

router.get("/recruiter-feedback/student/:studentId", async (req: Request, res: Response) => {
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
        createdAt: recruiterFeedback.createdAt,
        recruiter: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          company: users.company,
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

router.post("/recruiter-feedback", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'industry_professional') {
    return res.status(403).json({ error: "Forbidden: Only industry professionals can give feedback" });
  }

  try {
    const validatedData = insertRecruiterFeedbackSchema.parse({
      ...req.body,
      recruiterId: req.user.id,
    });

    const [newFeedback] = await db.insert(recruiterFeedback).values(validatedData).returning();

    await db.insert(notifications).values({
      userId: validatedData.studentId,
      type: "feedback",
      title: "New Industry Feedback",
      message: `An industry professional provided feedback on your profile`,
      link: "/profile",
    });

    res.json(newFeedback);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/recruiter-feedback/insights/:studentId", async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const allFeedback = await db
      .select()
      .from(recruiterFeedback)
      .where(eq(recruiterFeedback.studentId, studentId));

    if (allFeedback.length === 0) {
      return res.json({
        totalFeedback: 0,
        avgRating: 0,
        categoryInsights: [],
        allFeedbackText: [],
        strengths: [],
        improvementAreas: [],
      });
    }

    const totalFeedback = allFeedback.length;
    const avgRating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

    const categoryBreakdown = allFeedback.reduce((acc, f) => {
      if (!acc[f.category]) {
        acc[f.category] = { count: 0, totalRating: 0, feedback: [] };
      }
      acc[f.category].count++;
      acc[f.category].totalRating += f.rating;
      acc[f.category].feedback.push({
        rating: f.rating,
        feedback: f.feedback,
        context: f.context,
        createdAt: f.createdAt,
      });
      return acc;
    }, {} as Record<string, { count: number; totalRating: number; feedback: any[] }>);

    const categoryInsights = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      count: data.count,
      avgRating: data.totalRating / data.count,
      recentFeedback: data.feedback.slice(0, 3),
    }));

    const allFeedbackText = allFeedback.map(f => f.feedback);

    res.json({
      totalFeedback,
      avgRating: Math.round(avgRating * 10) / 10,
      categoryInsights,
      allFeedbackText,
      strengths: categoryInsights.filter(c => c.avgRating >= 4).map(c => c.category),
      improvementAreas: categoryInsights.filter(c => c.avgRating < 3).map(c => c.category),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/recruiter-feedback/my-feedback", async (req: Request, res: Response) => {
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
