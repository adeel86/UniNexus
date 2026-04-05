import { db } from "./db";
import { users, userStats, userBadges, endorsements, challengeParticipants, certifications, recruiterFeedback } from "@shared/schema";
import { eq, count, sum, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Fast SQL-level sync: ensure totalPoints is at least the sum of the four
 * individual score columns. Only updates rows where totalPoints is NULL or
 * lower than the column sum — never reduces totalPoints, since applyPointDelta
 * may have already added badge/endorsement/cert/industry points on top.
 * Called once at startup to repair any stale or missing data.
 */
export async function syncAllUsersTotalPoints(): Promise<void> {
  await db.execute(sql`
    UPDATE user_stats
    SET
      total_points = COALESCE(engagement_score, 0)
                  + COALESCE(problem_solver_score, 0)
                  + COALESCE(endorsement_score, 0)
                  + COALESCE(challenge_points, 0),
      rank_tier = CASE
        WHEN (COALESCE(engagement_score, 0) + COALESCE(problem_solver_score, 0)
              + COALESCE(endorsement_score, 0) + COALESCE(challenge_points, 0)) >= 7000
          THEN 'platinum'
        WHEN (COALESCE(engagement_score, 0) + COALESCE(problem_solver_score, 0)
              + COALESCE(endorsement_score, 0) + COALESCE(challenge_points, 0)) >= 3000
          THEN 'gold'
        WHEN (COALESCE(engagement_score, 0) + COALESCE(problem_solver_score, 0)
              + COALESCE(endorsement_score, 0) + COALESCE(challenge_points, 0)) >= 1000
          THEN 'silver'
        ELSE 'bronze'
      END,
      updated_at = NOW()
    WHERE total_points IS NULL
       OR total_points < (
         COALESCE(engagement_score, 0)
         + COALESCE(problem_solver_score, 0)
         + COALESCE(endorsement_score, 0)
         + COALESCE(challenge_points, 0)
       )
  `);
}

export interface PointDelta {
  engagementDelta?: number;
  problemSolverDelta?: number;
  endorsementDelta?: number;
  challengeDelta?: number;
}

/**
 * Points contributed by industry feedback and teacher-issued certifications.
 * These are always computed live from related tables.
 *
 * - Industry feedback: each rating (1-5) × 20 pts  (range 20–100 per submission)
 * - Teacher-issued certificates: 150 pts each
 */
async function computeExternalPoints(userId: string): Promise<{ industryFeedbackPoints: number; certificationPoints: number }> {
  const feedbackResult = await db
    .select({ totalRating: sql<number>`COALESCE(SUM(rating), 0)::int` })
    .from(recruiterFeedback)
    .where(eq(recruiterFeedback.studentId, userId));
  const industryFeedbackPoints = (Number(feedbackResult[0]?.totalRating) || 0) * 20;

  const certResult = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM certifications c
    INNER JOIN users u ON c.issuer_id = u.id
    WHERE c.user_id = ${userId}
      AND u.role = 'teacher'
  `);
  const certificationPoints = (Number(certResult.rows[0]?.count) || 0) * 150;

  return { industryFeedbackPoints, certificationPoints };
}

/**
 * Apply point deltas and recalculate total points.
 * Includes badge count, endorsement count, industry feedback, and teacher certs.
 */
export async function applyPointDelta(userId: string, delta: PointDelta): Promise<void> {
  await db.insert(userStats).values({ userId }).onConflictDoNothing();

  const [currentStats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (!currentStats) {
    throw new Error("User stats not found");
  }

  const newEngagement = Math.max(0, (currentStats.engagementScore || 0) + (delta.engagementDelta || 0));
  const newProblemSolver = Math.max(0, (currentStats.problemSolverScore || 0) + (delta.problemSolverDelta || 0));
  const newEndorsement = Math.max(0, (currentStats.endorsementScore || 0) + (delta.endorsementDelta || 0));
  const newChallenge = Math.max(0, (currentStats.challengePoints || 0) + (delta.challengeDelta || 0));

  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  const { industryFeedbackPoints, certificationPoints } = await computeExternalPoints(userId);

  const badgePoints = (badgeCount?.count || 0) * 50;
  const endorsementPoints = (endorsementCount?.count || 0) * 25;
  const newTotalPoints =
    newEngagement +
    newProblemSolver +
    newEndorsement +
    newChallenge +
    badgePoints +
    endorsementPoints +
    industryFeedbackPoints +
    certificationPoints;

  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (newTotalPoints >= 7000) newRankTier = 'platinum';
  else if (newTotalPoints >= 3000) newRankTier = 'gold';
  else if (newTotalPoints >= 1000) newRankTier = 'silver';

  const [updatedStats] = await db
    .update(userStats)
    .set({
      engagementScore: newEngagement,
      problemSolverScore: newProblemSolver,
      endorsementScore: newEndorsement,
      challengePoints: newChallenge,
      totalPoints: newTotalPoints,
      rankTier: newRankTier,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning({
      totalPoints: userStats.totalPoints,
      rankTier: userStats.rankTier,
    });

  if (!updatedStats) {
    throw new Error("Failed to update user rank");
  }
}

/**
 * Recalculate user rank based on all achievement metrics.
 */
export async function recalculateUserRank(userId: string): Promise<void> {
  await db.insert(userStats).values({ userId }).onConflictDoNothing();

  const [currentStats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (!currentStats) {
    throw new Error("User stats not found");
  }

  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  const { industryFeedbackPoints, certificationPoints } = await computeExternalPoints(userId);

  const badgePoints = (badgeCount?.count || 0) * 50;
  const endorsementPoints = (endorsementCount?.count || 0) * 25;
  const totalPoints =
    (currentStats.engagementScore || 0) +
    (currentStats.problemSolverScore || 0) +
    (currentStats.endorsementScore || 0) +
    (currentStats.challengePoints || 0) +
    badgePoints +
    endorsementPoints +
    industryFeedbackPoints +
    certificationPoints;

  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) newRankTier = 'platinum';
  else if (totalPoints >= 3000) newRankTier = 'gold';
  else if (totalPoints >= 1000) newRankTier = 'silver';

  const [updatedStats] = await db
    .update(userStats)
    .set({
      totalPoints,
      rankTier: newRankTier,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning({
      totalPoints: userStats.totalPoints,
      rankTier: userStats.rankTier,
    });

  if (!updatedStats) {
    throw new Error("Failed to recalculate user rank");
  }
}

/**
 * Update totalPoints after individual score fields are directly updated via SQL.
 */
export async function updateTotalPointsAfterScoreChange(userId: string): Promise<void> {
  await db.insert(userStats).values({ userId }).onConflictDoNothing();

  const [currentStats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (!currentStats) {
    throw new Error("User stats not found");
  }

  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  const { industryFeedbackPoints, certificationPoints } = await computeExternalPoints(userId);

  const badgePoints = (badgeCount?.count || 0) * 50;
  const endorsementPoints = (endorsementCount?.count || 0) * 25;
  const totalPoints =
    (currentStats.engagementScore || 0) +
    (currentStats.problemSolverScore || 0) +
    (currentStats.endorsementScore || 0) +
    (currentStats.challengePoints || 0) +
    badgePoints +
    endorsementPoints +
    industryFeedbackPoints +
    certificationPoints;

  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) newRankTier = 'platinum';
  else if (totalPoints >= 3000) newRankTier = 'gold';
  else if (totalPoints >= 1000) newRankTier = 'silver';

  await db
    .update(userStats)
    .set({
      totalPoints,
      rankTier: newRankTier,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId));
}
