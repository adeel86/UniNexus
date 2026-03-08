import { db } from "./db";
import { users, userBadges, endorsements, challengeParticipants } from "@shared/schema";
import { eq, count } from "drizzle-orm";

export interface PointDelta {
  engagementDelta?: number;
  problemSolverDelta?: number;
  endorsementDelta?: number;
  challengeDelta?: number;
}

/**
 * Apply point deltas and recalculate total points
 * Includes badge count and endorsement count in total points calculation
 */
export async function applyPointDelta(userId: string, delta: PointDelta): Promise<void> {
  // First, get the user's current scores
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Calculate new individual scores
  const newEngagement = Math.max(0, (currentUser.engagementScore || 0) + (delta.engagementDelta || 0));
  const newProblemSolver = Math.max(0, (currentUser.problemSolverScore || 0) + (delta.problemSolverDelta || 0));
  const newEndorsement = Math.max(0, (currentUser.endorsementScore || 0) + (delta.endorsementDelta || 0));
  const newChallenge = Math.max(0, (currentUser.challengePoints || 0) + (delta.challengeDelta || 0));

  // Get counts for badge and endorsement dimensions
  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  // Calculate totalPoints including all 5 dimensions:
  // Engagement + Problem Solver + Endorsement Score + Challenge Points + Badge Count + Endorsement Count
  const badgePoints = (badgeCount?.count || 0) * 50; // Each badge worth 50 points
  const endorsementPoints = (endorsementCount?.count || 0) * 25; // Each endorsement worth 25 points
  const newTotalPoints = newEngagement + newProblemSolver + newEndorsement + newChallenge + badgePoints + endorsementPoints;

  // Get rank tier based on totalPoints
  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (newTotalPoints >= 7000) {
    newRankTier = 'platinum';
  } else if (newTotalPoints >= 3000) {
    newRankTier = 'gold';
  } else if (newTotalPoints >= 1000) {
    newRankTier = 'silver';
  }

  // Update all scores and rank tier atomically
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
 * Recalculate user rank based on all achievement metrics
 * This function should be called whenever badges, endorsements, or challenges change
 * 
 * Formula: totalPoints = Engagement + Problem Solver + Endorsement Score + Challenge Points + (Badge Count × 50) + (Endorsement Count × 25)
 */
export async function recalculateUserRank(userId: string): Promise<void> {
  // Get the user's current scores
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Get counts for all achievement dimensions
  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  // Calculate totalPoints including all 5 dimensions:
  // Engagement + Problem Solver + Endorsement Score + Challenge Points + Badge Count + Endorsement Count
  const badgePoints = (badgeCount?.count || 0) * 50; // Each badge worth 50 points
  const endorsementPoints = (endorsementCount?.count || 0) * 25; // Each endorsement worth 25 points
  const totalPoints = 
    (currentUser.engagementScore || 0) +
    (currentUser.problemSolverScore || 0) +
    (currentUser.endorsementScore || 0) +
    (currentUser.challengePoints || 0) +
    badgePoints +
    endorsementPoints;

  // Get rank tier based on totalPoints
  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) {
    newRankTier = 'platinum';
  } else if (totalPoints >= 3000) {
    newRankTier = 'gold';
  } else if (totalPoints >= 1000) {
    newRankTier = 'silver';
  }

  // Update totalPoints and rankTier atomically
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
 * Update totalPoints after individual score fields are directly updated via SQL
 * This should be called whenever engagementScore, problemSolverScore, endorsementScore, or challengePoints are updated
 */
export async function updateTotalPointsAfterScoreChange(userId: string): Promise<void> {
  // Get the user's current scores
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Get counts for badge and endorsement dimensions
  const [badgeCount] = await db
    .select({ count: count() })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const [endorsementCount] = await db
    .select({ count: count() })
    .from(endorsements)
    .where(eq(endorsements.endorsedUserId, userId));

  // Calculate totalPoints including all 5 dimensions
  const badgePoints = (badgeCount?.count || 0) * 50;
  const endorsementPoints = (endorsementCount?.count || 0) * 25;
  const totalPoints = 
    (currentUser.engagementScore || 0) +
    (currentUser.problemSolverScore || 0) +
    (currentUser.endorsementScore || 0) +
    (currentUser.challengePoints || 0) +
    badgePoints +
    endorsementPoints;

  // Get rank tier based on totalPoints
  let newRankTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (totalPoints >= 7000) {
    newRankTier = 'platinum';
  } else if (totalPoints >= 3000) {
    newRankTier = 'gold';
  } else if (totalPoints >= 1000) {
    newRankTier = 'silver';
  }

  // Update totalPoints and rankTier
  await db
    .update(users)
    .set({
      totalPoints,
      rankTier: newRankTier,
    })
    .where(eq(users.id, userId));
}
