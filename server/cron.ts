import cron from "node-cron";
import { resetInactiveStreaks } from "./streakHelper";
import { cleanupUnverifiedUsers } from "./unverifiedUserCleanup";

/**
 * Initialize scheduled jobs for the application
 * This file sets up cron tasks that run periodically
 */
export function initializeScheduledJobs() {
  // Reset inactive streaks daily at midnight (0:00 AM UTC)
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[CRON] Running daily streak reset job...");
      const resetCount = await resetInactiveStreaks();
      console.log(`[CRON] Reset streaks for ${resetCount} inactive users`);
    } catch (error) {
      console.error("[CRON] Error resetting inactive streaks:", error);
    }
  });

  // Clean up unverified user accounts daily at 2:00 AM UTC
  // Grace period: 7 days. Users who have not verified within 7 days are removed
  // from both Firebase Authentication and the PostgreSQL database.
  // Users in the 5–7 day window receive a warning log (wire up a mail service
  // to send actual reminder emails — see server/unverifiedUserCleanup.ts).
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[CRON] Running unverified user cleanup job...");
      const stats = await cleanupUnverifiedUsers();
      console.log(
        `[CRON] Cleanup complete — warned: ${stats.warned}, deleted: ${stats.deleted}, ` +
        `skipped: ${stats.skipped}, errors: ${stats.errors}`
      );
    } catch (error) {
      console.error("[CRON] Error during unverified user cleanup:", error);
    }
  });

  console.log("[CRON] Scheduled jobs initialized");
}
