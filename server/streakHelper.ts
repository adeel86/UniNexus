import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ActivityType, getActivityConfig, isRoleEligible } from "./streakConfig";

/**
 * Get start of day in UTC (midnight UTC)
 */
function getUTCDayStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d;
}

/**
 * Update user streak for a specific activity
 * Only increments once per day for the entire day (across all activities)
 * Respects activity-level anti-spam rules
 * Returns true if streak was updated, false otherwise
 */
export async function updateUserStreakForActivity(
  userId: string,
  activityType: ActivityType
): Promise<boolean> {
  try {
    // Get current user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    // Check role eligibility for this activity
    if (!isRoleEligible(activityType, user.role)) {
      return false; // Role not eligible for this activity
    }

    const activity = getActivityConfig(activityType);
    const now = new Date();
    const todayUTC = getUTCDayStart(now);

    // Check daily cap: only increment once per calendar day (UTC)
    const lastIncrement = user.lastStreakIncrementDate 
      ? new Date(user.lastStreakIncrementDate)
      : null;

    // If user has never incremented, allow increment
    if (lastIncrement) {
      const lastIncrementDateUTC = getUTCDayStart(lastIncrement);
      
      // Check if already incremented today (same UTC day)
      if (lastIncrementDateUTC.getTime() === todayUTC.getTime()) {
        return false; // Already incremented today
      }

      // Check activity-specific spam prevention rules (hourly limit)
      if (activity.spamPrevention === 'one_per_hour') {
        const hoursSinceLastIncrement = (now.getTime() - lastIncrement.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastIncrement < 1) {
          return false; // Too recent, skip increment
        }
      }
    }

    // Increment streak
    const currentStreak = user.streak || 0;
    const newStreak = Math.min(currentStreak + 1, 999); // Cap at 999 days

    try {
      const updateResult = await db
        .update(users)
        .set({
          streak: newStreak,
          lastStreakIncrementDate: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();

      if (updateResult && updateResult.length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error(`Error updating streak for activity ${activityType}:`, error);
    return false;
  }
}

/**
 * Backward compatibility wrapper for existing code
 * Treats all activities as simple increments
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

    // Use a generic feed activity for backward compatibility
    return updateUserStreakForActivity(userId, 'POST_CREATION');
  } catch (error) {
    console.error("Error updating streak:", error);
    return false;
  }
}

/**
 * Reset user streak if inactive for consecutive days
 * Should be called via a scheduled job (cron)
 * Checks all users and resets streaks if no activity in 2+ days
 */
export async function resetInactiveStreaks(): Promise<number> {
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    let resetCount = 0;

    for (const user of allUsers) {
      if (!user.streak || user.streak === 0) continue;

      // Simple check: if updatedAt is more than 1 day ago, reset streak
      const lastUpdate = user.updatedAt || user.createdAt;
      if (!lastUpdate) continue;

      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      // Reset if no activity for 2+ days
      if (daysSinceUpdate >= 2) {
        await db
          .update(users)
          .set({
            streak: 0,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

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
 * Get user's streak information
 */
export async function getUserStreak(userId: string): Promise<number> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.streak || 0;
  } catch (error) {
    console.error("Error getting user streak:", error);
    return 0;
  }
}
