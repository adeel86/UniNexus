import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { users } from "@shared/schema";

const ADMIN_EMAIL = "team@uninexus.uk";

export async function setupAdminAccount(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existing) {
      if (existing.role !== "master_admin") {
        await db
          .update(users)
          .set({ role: "master_admin", emailVerified: true, isVerified: true, isBanned: false })
          .where(eq(users.id, existing.id));
        console.log("[adminSetup] Upgraded existing account to master_admin:", ADMIN_EMAIL);
      } else {
        console.log("[adminSetup] Admin account already exists:", ADMIN_EMAIL);
      }
      return;
    }

    const devUid = "admin_uninexus_team";

    await db.insert(users).values({
      firebaseUid: devUid,
      email: ADMIN_EMAIL,
      firstName: "UniNexus",
      lastName: "Admin",
      displayName: "UniNexus Admin",
      role: "master_admin",
      emailVerified: true,
      isVerified: true,
      verifiedAt: new Date(),
      violationCount: 0,
      isBanned: false,
    }).onConflictDoNothing();

    console.log("[adminSetup] Created admin account:", ADMIN_EMAIL);
  } catch (err) {
    console.error("[adminSetup] Failed to set up admin account:", err);
  }
}
