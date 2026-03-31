import { Router, Request, Response } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "../db";
import { isAuthenticated } from "../firebaseAuth";
import {
  users,
  certifications,
  notifications,
  insertCertificationSchema,
} from "@shared/schema";
import { recalculateUserRank } from "../pointsHelper";

const router = Router();

router.get("/certifications/user/:userId", isAuthenticated, async (req: Request, res: Response) => {
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

router.post("/certifications", isAuthenticated, async (req: Request, res: Response) => {
  const authorizedRoles = ['teacher', 'university_admin', 'industry_professional', 'master_admin'];
  if (!authorizedRoles.includes(req.user!.role)) {
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
      if (!['university_admin', 'industry_professional', 'master_admin'].includes(req.user!.role)) {
        return res.status(403).json({
          error: "Teachers can only receive certificates from Universities and Industry Professionals"
        });
      }
    } else if (recipient.role === 'student') {
      if (!['teacher', 'university_admin', 'industry_professional', 'master_admin'].includes(req.user!.role)) {
        return res.status(403).json({
          error: "Students can receive certificates from Teachers, Universities, and Industry Professionals"
        });
      }
    }

    const issuerName = `${req.user!.firstName} ${req.user!.lastName}`;

    const hashData = JSON.stringify({
      ...validatedData,
      timestamp: Date.now(),
      issuerId: req.user!.id,
      issuerName,
    });
    const verificationHash = createHash('sha256').update(hashData).digest('hex');

    const [newCertification] = await db
      .insert(certifications)
      .values({
        ...validatedData,
        issuerId: req.user!.id,
        issuerName,
        verificationHash,
      })
      .returning();

    // If the issuer is a teacher, recalculate the student's rank
    // (teacher-issued certificates contribute 150 pts each to the student's ranking)
    if (req.user!.role === 'teacher' && recipient.role === 'student') {
      try {
        await recalculateUserRank(validatedData.userId);
      } catch (rankErr) {
        console.error("Failed to recalculate rank after teacher cert:", rankErr);
      }
    }

    const certNotificationMessage = req.user!.role === 'teacher'
      ? `You've earned a certificate: "${validatedData.title}" — issued by ${req.user!.firstName} ${req.user!.lastName}. This has boosted your rank!`
      : `You've earned a certificate: ${validatedData.title}`;

    await db.insert(notifications).values({
      userId: validatedData.userId,
      type: "achievement",
      title: "New Certificate Earned!",
      message: certNotificationMessage,
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

router.get("/certifications/:id", isAuthenticated, async (req: Request, res: Response) => {
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

export default router;
