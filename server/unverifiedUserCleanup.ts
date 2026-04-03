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
    // Firebase Admin not configured (dev environment) — skip Firebase deletion
    return true;
  }

  try {
    await firebaseAdmin.auth().deleteUser(firebaseUid);
    return true;
  } catch (error: any) {
    // If the user is not found in Firebase, that is fine — proceed with DB deletion
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
 * Sends a reminder to a user who is approaching the deletion deadline.
 * Requires an external email service (e.g., SendGrid, Mailgun) to be wired in.
 * Currently logs the intent — replace the body with a real email call when a
 * mail service is available.
 */
async function sendDeletionWarning(email: string, daysRemaining: number): Promise<void> {
  // TODO: Replace with a real transactional email service call.
  // Example with SendGrid:
  //   await sgMail.send({
  //     to: email,
  //     from: 'noreply@uninexus.app',
  //     subject: 'Action required: verify your UniNexus email',
  //     text: `Your account will be deleted in ${daysRemaining} day(s) unless you verify your email.`,
  //   });
  console.log(
    `[CLEANUP] WARNING: Unverified account for ${email} will be deleted in ~${daysRemaining} day(s). ` +
    `(Wire up an email service to send a real reminder.)`
  );
}

/**
 * Main cleanup function.
 * 1. Notifies users who are approaching their deletion deadline.
 * 2. Deletes users who have exceeded the grace period without verifying.
 */
export async function cleanupUnverifiedUsers(): Promise<{
  warned: number;
  deleted: number;
  skipped: number;
  errors: number;
}> {
  const stats = { warned: 0, deleted: 0, skipped: 0, errors: 0 };

  // ── Step 1: Warn users in the danger window ──────────────────────────────
  try {
    const warningCandidates = await storage.getUnverifiedWarningUsers(
      GRACE_PERIOD_DAYS,
      WARNING_DAYS_BEFORE_DELETION
    );

    for (const user of warningCandidates) {
      // Skip dev/demo users (null or synthetic Firebase UIDs)
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
    // Skip dev/demo users
    if (!user.firebaseUid || user.firebaseUid.startsWith("dev_user_")) {
      stats.skipped++;
      continue;
    }

    try {
      // ── Edge case: user may have verified between the last sync and now ──
      if (user.firebaseUid) {
        const verifiedInFirebase = await checkFirebaseVerified(user.firebaseUid);

        if (verifiedInFirebase === true) {
          // Sync DB and skip deletion
          await storage.updateEmailVerified(user.id, true);
          console.log(`[CLEANUP] Synced verified status for ${user.email} — skipping deletion.`);
          stats.skipped++;
          continue;
        }
      }

      // ── Step 2a: Delete from Firebase ────────────────────────────────────
      const firebaseDeleted = user.firebaseUid
        ? await deleteFromFirebase(user.firebaseUid)
        : true; // No Firebase UID — nothing to delete in Firebase

      if (!firebaseDeleted) {
        // Firebase deletion failed — do not touch the DB to avoid inconsistency
        console.error(
          `[CLEANUP] Skipping DB deletion for ${user.email} because Firebase deletion failed.`
        );
        stats.errors++;
        continue;
      }

      // ── Step 2b: Delete from DB (cascading, inside a transaction) ─────────
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
