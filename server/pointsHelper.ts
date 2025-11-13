import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface PointDelta {
  engagementDelta?: number;
  problemSolverDelta?: number;
  endorsementDelta?: number;
  challengeDelta?: number;
}

export async function applyPointDelta(userId: string, delta: PointDelta): Promise<void> {
  // Calculate totalPoints expression once for reuse
  const newTotalPointsExpr = sql`${users.engagementScore} + ${delta.engagementDelta || 0} + ${users.problemSolverScore} + ${delta.problemSolverDelta || 0} + ${users.endorsementScore} + ${delta.endorsementDelta || 0} + ${users.challengePoints} + ${delta.challengeDelta || 0}`;

  // Update all scores, totalPoints, AND rankTier in a single atomic SQL statement
  // Rank tier thresholds: Bronze <1000, Silver 1000-2999, Gold 3000-6999, Platinum >=7000
  const [updatedUser] = await db
    .update(users)
    .set({
      engagementScore: delta.engagementDelta
        ? sql`${users.engagementScore} + ${delta.engagementDelta}`
        : users.engagementScore,
      problemSolverScore: delta.problemSolverDelta
        ? sql`${users.problemSolverScore} + ${delta.problemSolverDelta}`
        : users.problemSolverScore,
      endorsementScore: delta.endorsementDelta
        ? sql`${users.endorsementScore} + ${delta.endorsementDelta}`
        : users.endorsementScore,
      challengePoints: delta.challengeDelta
        ? sql`${users.challengePoints} + ${delta.challengeDelta}`
        : users.challengePoints,
      totalPoints: newTotalPointsExpr,
      rankTier: sql`CASE
        WHEN ${newTotalPointsExpr} >= 7000 THEN 'platinum'
        WHEN ${newTotalPointsExpr} >= 3000 THEN 'gold'
        WHEN ${newTotalPointsExpr} >= 1000 THEN 'silver'
        ELSE 'bronze'
      END`,
    })
    .where(eq(users.id, userId))
    .returning({
      totalPoints: users.totalPoints,
      rankTier: users.rankTier,
    });

  if (!updatedUser) {
    throw new Error("User not found");
  }
}

export async function recalculateUserRank(userId: string): Promise<void> {
  // Calculate totalPoints expression for reuse
  const totalPointsExpr = sql`${users.engagementScore} + ${users.problemSolverScore} + ${users.endorsementScore} + ${users.challengePoints}`;

  // Recalculate totalPoints AND rankTier atomically in a single SQL statement
  // Rank tier thresholds: Bronze <1000, Silver 1000-2999, Gold 3000-6999, Platinum >=7000
  const [updatedUser] = await db
    .update(users)
    .set({
      totalPoints: totalPointsExpr,
      rankTier: sql`CASE
        WHEN ${totalPointsExpr} >= 7000 THEN 'platinum'
        WHEN ${totalPointsExpr} >= 3000 THEN 'gold'
        WHEN ${totalPointsExpr} >= 1000 THEN 'silver'
        ELSE 'bronze'
      END`,
    })
    .where(eq(users.id, userId))
    .returning({
      totalPoints: users.totalPoints,
      rankTier: users.rankTier,
    });

  if (!updatedUser) {
    throw new Error("User not found");
  }
}
