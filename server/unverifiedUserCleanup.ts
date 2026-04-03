import { storage } from "./storage";
import { firebaseAdmin } from "./firebaseAuth";

const GRACE_PERIOD_DAYS = 7;
const WARNING_DAYS_BEFORE_DELETION = 2;

/**
 * Tries to delete a user from Firebase Authentication.
 * Returns true if the user was deleted or did not exist in Firebase.
 * Returns false if deletion failed for an unexpected reason.
 */
async function deleteFromFirebase(firebaseUid: string): Promise<boolean> {
  if (!firebaseAdmin) {
    return true;
  }

  try {
    await firebaseAdmin.auth().deleteUser(firebaseUid);
    return true;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return true;
    }
    console.error(`[CLEANUP] Firebase deletion failed for UID ${firebaseUid}:`, error.message);
    return false;
  }
}

/**
 * Checks whether a user has verified their email in Firebase.
 * Returns null if Firebase Admin is not configured or the user is not found.
 */
async function checkFirebaseVerified(firebaseUid: string): Promise<boolean | null> {
  if (!firebaseAdmin) {
    return null;
  }

  try {
    const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
    return firebaseUser.emailVerified;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return false;
    }
    console.error(`[CLEANUP] Could not check Firebase status for UID ${firebaseUid}:`, error.message);
    return null;
  }
}

/**
 * Sends a deletion warning to a user approaching the cleanup deadline.
 * Replace the body with a real transactional email call when SMTP is configured.
 */
async function sendDeletionWarning(email: string, daysRemaining: number): Promise<void> {
  // Wire up the sendOtpEmail / nodemailer transport to send a real warning.
  // For now, log the intent.
  console.log(
    `[CLEANUP] WARNING: Unverified account for ${email} will be deleted in ~${daysRemaining} day(s). ` +
    `(Configure SMTP_HOST/SMTP_USER/SMTP_PASS to send a real reminder.)`
  );
}

/**
 * Main cleanup function.
 * Deletes DB + Firebase accounts that are still unverified after the OTP grace period.
 * The OTP-based flow means email_verified is set by /api/auth/verify-otp in the DB.
 * A user who never verifies will be cleaned up after GRACE_PERIOD_DAYS from registration.
 */
export async function cleanupUnverifiedUsers(): Promise<{
  warned: number;
  deleted: number;
  skipped: number;
  errors: number;
}> {
  const stats = { warned: 0, deleted: 0, skipped: 0, errors: 0 };

  // ── Step 1: Warn users approaching the deletion deadline ─────────────────
  try {
    const warningCandidates = await storage.getUnverifiedWarningUsers(
      GRACE_PERIOD_DAYS,
      WARNING_DAYS_BEFORE_DELETION
    );

    for (const user of warningCandidates) {
      if (!user.firebaseUid || user.firebaseUid.startsWith("dev_user_")) {
        continue;
      }

      const ageMs = Date.now() - (user.createdAt?.getTime() ?? 0);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const daysRemaining = Math.ceil(GRACE_PERIOD_DAYS - ageDays);

      try {
        await sendDeletionWarning(user.email ?? "unknown", daysRemaining);
        stats.warned++;
      } catch (err: any) {
        console.error(`[CLEANUP] Could not warn ${user.email}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[CLEANUP] Error fetching warning candidates:", err.message);
  }

  // ── Step 2: Delete users past the grace period ───────────────────────────
  let expiredUsers;
  try {
    expiredUsers = await storage.getUnverifiedExpiredUsers(GRACE_PERIOD_DAYS);
  } catch (err: any) {
    console.error("[CLEANUP] Error fetching expired users:", err.message);
    return stats;
  }

  for (const user of expiredUsers) {
    if (!user.firebaseUid || user.firebaseUid.startsWith("dev_user_")) {
      stats.skipped++;
      continue;
    }

    try {
      // Edge case: user may have verified via OTP between last sync and now
      // DB emailVerified is the authoritative source for OTP-verified accounts
      if (user.emailVerified) {
        console.log(`[CLEANUP] User ${user.email} has DB emailVerified=true — skipping deletion.`);
        stats.skipped++;
        continue;
      }

      // Also check Firebase in case they verified there by another means
      if (user.firebaseUid) {
        const verifiedInFirebase = await checkFirebaseVerified(user.firebaseUid);

        if (verifiedInFirebase === true) {
          await storage.updateEmailVerified(user.id, true);
          console.log(`[CLEANUP] Synced Firebase-verified status for ${user.email} — skipping deletion.`);
          stats.skipped++;
          continue;
        }
      }

      const firebaseDeleted = user.firebaseUid
        ? await deleteFromFirebase(user.firebaseUid)
        : true;

      if (!firebaseDeleted) {
        console.error(
          `[CLEANUP] Skipping DB deletion for ${user.email} because Firebase deletion failed.`
        );
        stats.errors++;
        continue;
      }

      await storage.deleteUser(user.id);

      console.log(`[CLEANUP] Deleted unverified account: ${user.email} (created ${user.createdAt?.toISOString()})`);
      stats.deleted++;
    } catch (err: any) {
      console.error(`[CLEANUP] Error deleting user ${user.email}:`, err.message);
      stats.errors++;
    }
  }

  return stats;
}
