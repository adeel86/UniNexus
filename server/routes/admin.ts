import express, { Request, Response } from "express";
import { eq, desc, sql, and, or } from "drizzle-orm";
import admin from "firebase-admin";
import { db } from "../db";
import { storage as dbStorage } from "../storage";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  users,
  posts,
  announcements,
  challenges,
  challengeParticipants,
  userBadges,
  userSkills,
  skills,
  certifications,
  notifications,
  insertAnnouncementSchema,
} from "@shared/schema";

const router = express.Router();

// ========================================================================
// ADMIN ENDPOINTS (master_admin only)
// ========================================================================

router.delete("/admin/users/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'master_admin') {
    return res.status(403).send("Forbidden");
  }

  try {
    const { userId } = req.params;
    const user = await dbStorage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete from Firebase
    if (user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (fbError: any) {
        console.warn("Firebase user deletion failed:", fbError.message);
      }
    }

    // Delete from DB
    await dbStorage.deleteUser(userId);

    res.json({ success: true, message: "User deleted by admin" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/university/users/:userId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'university'].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  try {
    const { userId } = req.params;
    const user = await dbStorage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify affiliation
    if (user.university !== req.user.university) {
      return res.status(403).json({ error: "You can only remove users from your own university" });
    }

    // Delete from Firebase
    if (user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (fbError: any) {
        console.warn("Firebase user deletion failed:", fbError.message);
      }
    }

    // Delete from DB
    await dbStorage.deleteUser(userId);

    res.json({ success: true, message: "User removed by university admin" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/users", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'master_admin') {
    return res.status(403).send("Forbidden");
  }

  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/posts", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'master_admin') {
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

router.get("/announcements", async (req: Request, res: Response) => {
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

router.post("/announcements", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'university_admin') {
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
        message: `${req.user!.university}: ${validatedData.title}`,
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
router.get("/university/retention/overview", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
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
router.get("/university/retention/career", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
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

export default router;
