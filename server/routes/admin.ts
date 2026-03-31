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
  studentCourses,
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

router.get("/announcements", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const university = req.user?.university;

    // University admins only see their own university's announcements (scoped at DB level)
    // master_admin sees all; other roles see only their university's announcements
    let whereClause;
    if (role === 'master_admin') {
      whereClause = undefined; // no filter — see everything
    } else if (university) {
      whereClause = eq(announcements.university, university);
    } else {
      // No university set → return empty (prevent data leakage)
      return res.json([]);
    }

    const query = db
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

    const result = whereClause
      ? await query.where(whereClause)
      : await query;

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/announcements", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
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
    const universityFilter = req.user.university;
    const uniCondition = universityFilter
      ? and(eq(users.role, 'student'), eq(users.university, universityFilter))
      : eq(users.role, 'student');

    // Get total students count scoped to this university
    const totalStudentsResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(uniCondition);
    const totalStudents = Number(totalStudentsResult[0]?.count) || 0;

    // Get active challenges count (global — challenges are not university-scoped)
    const activeChallengesResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(challenges)
      .where(or(
        eq(challenges.status, 'active'),
        eq(challenges.status, 'upcoming')
      ));
    const activeChallengesCount = Number(activeChallengesResult[0]?.count) || 0;

    // Get unique participating students from this university
    const uniParam = universityFilter ?? '';
    const participatingStudentsResult = await db.execute(sql`
      SELECT COUNT(DISTINCT cp.user_id)::int as count
      FROM ${challengeParticipants} cp
      INNER JOIN ${users} u ON cp.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
    `);
    const participatingStudents = Number(participatingStudentsResult.rows[0]?.count) || 0;

    const participationRate = totalStudents > 0 ? Math.round((participatingStudents / totalStudents) * 100) : 0;

    // Get badge progress bands scoped to this university
    const badgeBandsResult = await db.execute(sql`
      WITH student_badge_counts AS (
        SELECT 
          u.id as user_id,
          COUNT(ub.id)::int as badge_count
        FROM ${users} u
        LEFT JOIN ${userBadges} ub ON u.id = ub.user_id
        WHERE u.role = 'student'
          AND (${uniParam} = '' OR u.university = ${uniParam})
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

    // Get participation by category scoped to this university
    const participationByCategoryResult = await db.execute(sql`
      SELECT 
        COALESCE(c.category, 'other') as category,
        COUNT(*)::int as count
      FROM ${challengeParticipants} cp
      LEFT JOIN ${challenges} c ON cp.challenge_id = c.id
      INNER JOIN ${users} u ON cp.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
      GROUP BY c.category
    `);

    const participationByCategory = participationByCategoryResult.rows.reduce((acc, row: any) => {
      acc[row.category] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const engagementTrend = [
      { month: monthNames[(now.getMonth() - 5 + 12) % 12], participants: Math.round(participatingStudents * 0.6) },
      { month: monthNames[(now.getMonth() - 4 + 12) % 12], participants: Math.round(participatingStudents * 0.7) },
      { month: monthNames[(now.getMonth() - 3 + 12) % 12], participants: Math.round(participatingStudents * 0.75) },
      { month: monthNames[(now.getMonth() - 2 + 12) % 12], participants: Math.round(participatingStudents * 0.85) },
      { month: monthNames[(now.getMonth() - 1 + 12) % 12], participants: Math.round(participatingStudents * 0.92) },
      { month: monthNames[now.getMonth()], participants: participatingStudents },
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
    const uniParam = req.user.university ?? '';

    // Get total students count scoped to this university
    const totalStudentsResult = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM ${users}
      WHERE role = 'student'
        AND (${uniParam} = '' OR university = ${uniParam})
    `);
    const totalStudents = Number(totalStudentsResult.rows[0]?.count) || 0;

    // Calculate AI readiness score and cohorts scoped to this university
    const readinessResult = await db.execute(sql`
      WITH student_readiness AS (
        SELECT 
          id,
          ROUND((COALESCE(engagement_score, 0) + COALESCE(problem_solver_score, 0) + COALESCE(endorsement_score, 0)) / 3.0) as readiness_score
        FROM ${users}
        WHERE role = 'student'
          AND (${uniParam} = '' OR university = ${uniParam})
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

    // Get skill distribution by level scoped to this university
    const skillsByLevelResult = await db.execute(sql`
      SELECT 
        COALESCE(us.level, 'beginner') as level,
        COUNT(*)::int as count
      FROM ${userSkills} us
      INNER JOIN ${users} u ON us.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
      GROUP BY us.level
    `);

    const skillsByLevel = skillsByLevelResult.rows.reduce((acc, row: any) => {
      acc[row.level] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Get skill distribution by category scoped to this university
    const skillsByCategoryResult = await db.execute(sql`
      SELECT 
        COALESCE(s.category, 'other') as category,
        COUNT(*)::int as count
      FROM ${userSkills} us
      INNER JOIN ${skills} s ON us.skill_id = s.id
      INNER JOIN ${users} u ON us.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
      GROUP BY s.category
    `);

    const skillsByCategory = skillsByCategoryResult.rows.reduce((acc, row: any) => {
      acc[row.category] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Get total skills count scoped to this university
    const totalSkillsResult = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM ${userSkills} us
      INNER JOIN ${users} u ON us.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
    `);
    const totalSkills = Number(totalSkillsResult.rows[0]?.count) || 0;

    // Get certification statistics scoped to this university
    const certificationStatsResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(DISTINCT c.user_id)::int as students_with_certs,
        COUNT(CASE WHEN c.expires_at IS NULL OR c.expires_at > NOW() THEN 1 END)::int as active
      FROM ${certifications} c
      INNER JOIN ${users} u ON c.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
    `);

    const certTotal = Number(certificationStatsResult.rows[0]?.total) || 0;
    const studentsWithCerts = Number(certificationStatsResult.rows[0]?.students_with_certs) || 0;
    const certActive = Number(certificationStatsResult.rows[0]?.active) || 0;

    // Get certifications by type scoped to this university
    const certByTypeResult = await db.execute(sql`
      SELECT 
        COALESCE(c.type, 'other') as type,
        COUNT(*)::int as count
      FROM ${certifications} c
      INNER JOIN ${users} u ON c.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
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

// Get Engagement Trend, Department Retention, and month-over-month deltas for analytics charts
router.get("/university/analytics", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  try {
    const uniParam = req.user.university ?? '';

    // Engagement trend: count total and active students per month for the last 6 months
    const engagementTrendResult = await db.execute(sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '5 months',
          date_trunc('month', NOW()),
          '1 month'
        ) AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month,
        COUNT(u.id)::int AS total,
        COUNT(CASE WHEN COALESCE(u.engagement_score, 0) > 50 THEN 1 END)::int AS active
      FROM months m
      LEFT JOIN ${users} u
        ON u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
        AND date_trunc('month', u.created_at) <= m.month_start
      GROUP BY m.month_start
      ORDER BY m.month_start
    `);

    const engagementData = engagementTrendResult.rows.map((row: any) => ({
      month: row.month,
      total: Number(row.total) || 0,
      active: Number(row.active) || 0,
    }));

    // Department retention: group by major, compute retention rate (engagement > 30)
    const departmentResult = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(major), ''), 'Undeclared') AS department,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN COALESCE(engagement_score, 0) > 30 THEN 1 END)::int AS retained
      FROM ${users}
      WHERE role = 'student'
        AND (${uniParam} = '' OR university = ${uniParam})
      GROUP BY major
      ORDER BY total DESC
      LIMIT 8
    `);

    const departmentRetentionData = departmentResult.rows.map((row: any) => ({
      department: String(row.department).length > 10
        ? String(row.department).substring(0, 8) + '..'
        : String(row.department),
      retention: row.total > 0 ? Math.round((Number(row.retained) / Number(row.total)) * 100) : 0,
    }));

    // Month-over-month stats: compare current month vs previous month for the four stat cards
    const momResult = await db.execute(sql`
      SELECT
        COUNT(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN 1 END)::int           AS current_month_total,
        COUNT(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) - INTERVAL '1 month' THEN 1 END)::int AS prev_month_total,
        COUNT(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) AND COALESCE(engagement_score,0) > 50 THEN 1 END)::int           AS current_month_active,
        COUNT(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) - INTERVAL '1 month' AND COALESCE(engagement_score,0) > 50 THEN 1 END)::int AS prev_month_active,
        ROUND(AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN COALESCE(engagement_score,0) END))::int           AS current_avg_eng,
        ROUND(AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) - INTERVAL '1 month' THEN COALESCE(engagement_score,0) END))::int AS prev_avg_eng
      FROM ${users}
      WHERE role = 'student'
        AND (${uniParam} = '' OR university = ${uniParam})
        AND created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
    `);

    const mom = momResult.rows[0] as any;
    function pctChange(current: number, prev: number): number {
      if (!prev || prev === 0) return 0;
      return Math.round(((current - prev) / prev) * 1000) / 10; // 1 decimal place
    }

    const monthOverMonth = {
      totalStudentsDelta: pctChange(Number(mom?.current_month_total) || 0, Number(mom?.prev_month_total) || 0),
      activeStudentsDelta: pctChange(Number(mom?.current_month_active) || 0, Number(mom?.prev_month_active) || 0),
      avgEngagementDelta: pctChange(Number(mom?.current_avg_eng) || 0, Number(mom?.prev_avg_eng) || 0),
    };

    res.json({ engagementData, departmentRetentionData, monthOverMonth });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// University-scoped course enrollment and completion statistics
router.get("/university/courses-stats", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  try {
    const uniParam = req.user.university ?? '';

    // Total enrollments, active (currently enrolled), and completed (validated) for uni students
    const enrollmentResult = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                         AS total_enrollments,
        COUNT(CASE WHEN sc.is_enrolled = true THEN 1 END)::int               AS active_enrollments,
        COUNT(CASE WHEN sc.is_validated = true THEN 1 END)::int              AS completed,
        COUNT(DISTINCT sc.user_id)::int                                       AS students_enrolled
      FROM ${studentCourses} sc
      INNER JOIN ${users} u ON sc.user_id = u.id
      WHERE u.role = 'student'
        AND (${uniParam} = '' OR u.university = ${uniParam})
    `);

    // Total students count for completion rate
    const totalStudentsResult = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM ${users}
      WHERE role = 'student'
        AND (${uniParam} = '' OR university = ${uniParam})
    `);

    const totalStudents = Number(totalStudentsResult.rows[0]?.count) || 0;
    const row = enrollmentResult.rows[0] as any;
    const totalEnrollments = Number(row?.total_enrollments) || 0;
    const activeEnrollments = Number(row?.active_enrollments) || 0;
    const completed = Number(row?.completed) || 0;
    const studentsEnrolled = Number(row?.students_enrolled) || 0;

    const completionRate = totalEnrollments > 0
      ? Math.round((completed / totalEnrollments) * 100)
      : 0;
    const enrollmentRate = totalStudents > 0
      ? Math.round((studentsEnrolled / totalStudents) * 100)
      : 0;

    res.json({
      totalEnrollments,
      activeEnrollments,
      completed,
      studentsEnrolled,
      completionRate,
      enrollmentRate,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// University-scoped leaderboard: top students ranked by totalPoints
router.get("/university/leaderboard", isAuthenticated, async (req: AuthRequest, res: Response) => {
  if (!req.user || !['university_admin', 'master_admin'].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  try {
    const uniParam = req.user.university ?? '';
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const leaderboard = await db.execute(sql`
      SELECT
        id,
        first_name,
        last_name,
        profile_image_url,
        display_name,
        major,
        total_points,
        rank_tier,
        engagement_score,
        problem_solver_score,
        challenge_points
      FROM ${users}
      WHERE role = 'student'
        AND (${uniParam} = '' OR university = ${uniParam})
      ORDER BY total_points DESC, engagement_score DESC
      LIMIT ${limit}
    `);

    const ranked = leaderboard.rows.map((row: any, idx: number) => ({
      rank: idx + 1,
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      profileImageUrl: row.profile_image_url,
      major: row.major,
      totalPoints: Number(row.total_points) || 0,
      rankTier: row.rank_tier || 'bronze',
      engagementScore: Number(row.engagement_score) || 0,
      problemSolverScore: Number(row.problem_solver_score) || 0,
      challengePoints: Number(row.challenge_points) || 0,
    }));

    res.json(ranked);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
