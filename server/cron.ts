import cron from "node-cron";
import { resetInactiveStreaks } from "./streakHelper";

/**
 * Initialize scheduled jobs for the application
 * This file sets up cron tasks that run periodically
 */
export function initializeScheduledJobs() {
  // Reset inactive streaks daily at midnight (0:00 AM)
  // Format: second minute hour day month day-of-week
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[CRON] Running daily streak reset job...");
      const resetCount = await resetInactiveStreaks();
      console.log(`[CRON] Reset streaks for ${resetCount} inactive users`);
    } catch (error) {
      console.error("[CRON] Error resetting inactive streaks:", error);
    }
  });

  console.log("[CRON] Scheduled jobs initialized");
}
