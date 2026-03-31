import { db } from "./db";
import { users, userBadges, endorsements, challengeParticipants, certifications, recruiterFeedback } from "@shared/schema";
import { eq, count, sum, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

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
  // Sum all industry-professional ratings for this student
  const feedbackResult = await db
    .select({ totalRating: sql<number>`COALESCE(SUM(rating), 0)::int` })
    .from(recruiterFeedback)
    .where(eq(recruiterFeedback.studentId, userId));
  const industryFeedbackPoints = (Number(feedbackResult[0]?.totalRating) || 0) * 20;

  // Count teacher-issued certifications for this student
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
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
  }

  const newEngagement = Math.max(0, (currentUser.engagementScore || 0) + (delta.engagementDelta || 0));
  const newProblemSolver = Math.max(0, (currentUser.problemSolverScore || 0) + (delta.problemSolverDelta || 0));
  const newEndorsement = Math.max(0, (currentUser.endorsementScore || 0) + (delta.endorsementDelta || 0));
  const newChallenge = Math.max(0, (currentUser.challengePoints || 0) + (delta.challengeDelta || 0));

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

  const [updatedUser] = await db
    .update(users)
    .set({
      engagementScore: newEngagement,
      problemSolverScore: newProblemSolver,
      endorsementScore: newEndorsement,
      challengePoints: newChallenge,
      totalPoints: newTotalPoints,
      rankTier: newRankTier,
    })
    .where(eq(users.id, userId))
    .returning({
      totalPoints: users.totalPoints,
      rankTier: users.rankTier,
    });

  if (!updatedUser) {
    throw new Error("Failed to update user rank");
  }
}

/**
 * Recalculate user rank based on all achievement metrics.
 *
 * Formula:
 *   totalPoints = engagementScore + problemSolverScore + endorsementScore
 *               + challengePoints + (badgeCount × 50) + (endorsementCount × 25)
 *               + (industryFeedbackRatingSum × 20) + (teacherCertCount × 150)
 */
export async function recalculateUserRank(userId: string): Promise<void> {
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
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
    (currentUser.engagementScore || 0) +
    (currentUser.problemSolverScore || 0) +
    (currentUser.endorsementScore || 0) +
    (currentUser.challengePoints || 0) +
    badgePoints +
    endorsementPoints +
    industryFeedbackPoints +
    certificationPoints;

  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) newRankTier = 'platinum';
  else if (totalPoints >= 3000) newRankTier = 'gold';
  else if (totalPoints >= 1000) newRankTier = 'silver';

  const [updatedUser] = await db
    .update(users)
    .set({
      totalPoints,
      rankTier: newRankTier,
    })
    .where(eq(users.id, userId))
    .returning({
      totalPoints: users.totalPoints,
      rankTier: users.rankTier,
    });

  if (!updatedUser) {
    throw new Error("Failed to recalculate user rank");
  }
}

/**
 * Update totalPoints after individual score fields are directly updated via SQL.
 */
export async function updateTotalPointsAfterScoreChange(userId: string): Promise<void> {
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
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
    (currentUser.engagementScore || 0) +
    (currentUser.problemSolverScore || 0) +
    (currentUser.endorsementScore || 0) +
    (currentUser.challengePoints || 0) +
    badgePoints +
    endorsementPoints +
    industryFeedbackPoints +
    certificationPoints;

  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) newRankTier = 'platinum';
  else if (totalPoints >= 3000) newRankTier = 'gold';
  else if (totalPoints >= 1000) newRankTier = 'silver';

  await db
    .update(users)
    .set({
      totalPoints,
      rankTier: newRankTier,
    })
    .where(eq(users.id, userId));
}
