import { db } from "./db";
import { users, userStats } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ActivityType, getActivityConfig, isRoleEligible } from "./streakConfig";

function getUTCDayStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d;
}

/**
 * Update user streak for a specific activity.
 * Only increments once per day (UTC). Returns true if streak was updated.
 */
export async function updateUserStreakForActivity(
  userId: string,
  activityType: ActivityType
): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    if (!isRoleEligible(activityType, user.role)) return false;

    await db.insert(userStats).values({ userId }).onConflictDoNothing();

    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (!stats) return false;

    const activity = getActivityConfig(activityType);
    const now = new Date();
    const todayUTC = getUTCDayStart(now);

    const lastIncrement = stats.lastStreakIncrementDate
      ? new Date(stats.lastStreakIncrementDate)
      : null;

    if (lastIncrement) {
      const lastIncrementDateUTC = getUTCDayStart(lastIncrement);
      if (lastIncrementDateUTC.getTime() === todayUTC.getTime()) {
        return false;
      }
      if (activity.spamPrevention === 'one_per_hour') {
        const hoursSinceLastIncrement = (now.getTime() - lastIncrement.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastIncrement < 1) {
          return false;
        }
      }
    }

    const currentStreak = stats.streak || 0;
    const newStreak = Math.min(currentStreak + 1, 999);

    try {
      const updateResult = await db
        .update(userStats)
        .set({
          streak: newStreak,
          lastStreakIncrementDate: now,
          updatedAt: now,
        })
        .where(eq(userStats.userId, userId))
        .returning();

      return updateResult && updateResult.length > 0;
    } catch (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error(`Error updating streak for activity ${activityType}:`, error);
    return false;
  }
}

/**
 * Backward compatibility wrapper.
 * @deprecated Use updateUserStreakForActivity instead
 */
export async function updateUserStreak(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    return updateUserStreakForActivity(userId, 'POST_CREATION');
  } catch (error) {
    console.error("Error updating streak:", error);
    return false;
  }
}

/**
 * Reset user streak if inactive for consecutive days (called via cron).
 */
export async function resetInactiveStreaks(): Promise<number> {
  try {
    const allStats = await db.select().from(userStats);
    let resetCount = 0;

    for (const stats of allStats) {
      if (!stats.streak || stats.streak === 0) continue;

      const lastUpdate = stats.updatedAt;
      if (!lastUpdate) continue;

      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate >= 2) {
        await db
          .update(userStats)
          .set({
            streak: 0,
            updatedAt: new Date(),
          })
          .where(eq(userStats.userId, stats.userId));

        resetCount++;
      }
    }

    return resetCount;
  } catch (error) {
    console.error("Error resetting streaks:", error);
    return 0;
  }
}

/**
 * Get user's streak information.
 */
export async function getUserStreak(userId: string): Promise<number> {
  try {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    return stats?.streak || 0;
  } catch (error) {
    console.error("Error getting user streak:", error);
    return 0;
  }
}
