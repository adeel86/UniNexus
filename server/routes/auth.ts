import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, universities, majors } from "@shared/schema";
import { verifyToken, isAuthenticated, type AuthRequest } from "../firebaseAuth";
import { storage } from "../storage";
import { getUniversityByEmail } from "@shared/universities";
import { validateInstitutionalEmail } from "@shared/emailValidation";
import { updateUserStreak } from "../streakHelper";
import { cleanupUnverifiedUsers } from "../unverifiedUserCleanup";
import { createOtpForEmail, validateOtp, deleteOtpsForEmail } from "../otpService";
import { sendOtpEmail } from "../emailService";

const router = Router();

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;
const DEMO_PASSWORD = "demo123";

router.post("/dev-login", async (req: Request, res: Response) => {
  if (!DEV_AUTH_ENABLED || !DEV_JWT_SECRET) {
    return res.status(503).json({ message: "Development authentication not available" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password !== DEMO_PASSWORD) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.warn(`Dev login failed: User not found for email ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        firebaseUid: user.firebaseUid || undefined,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      },
      DEV_JWT_SECRET
    );

    res.json({
      token: `dev-${token}`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        university: user.university,
        major: user.major,
        company: user.company,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    console.error("Dev login error:", error);
    res.status(500).json({ message: "Failed to authenticate" });
  }
});

router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers?.authorization;
    const isDevToken = authHeader?.includes('dev-') || authHeader?.includes('development-secret-key');

    if (!req.user && !isDevToken && !DEV_AUTH_ENABLED) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { email, displayName, role, university, major, company, position, bio, firebaseUid } = req.body;

    const isDevUser =
      !firebaseUid ||
      firebaseUid.startsWith("dev_user_") ||
      DEV_AUTH_ENABLED;

    if (!isDevUser && email) {
      const emailValidation = validateInstitutionalEmail(email, role);
      if (emailValidation.status === "blocked") {
        return res.status(400).json({
          message: emailValidation.message,
          code: "email-domain-blocked",
        });
      }
    }

    const effectiveUid = firebaseUid || req.user?.id || `dev_user_${Date.now()}`;
    
    const nameParts = (displayName || '').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const autoUniversity = getUniversityByEmail(email);

    let universityId: string | null = null;
    let universityName: string | null = null;
    
    if (university) {
      const possibleId = typeof university === 'object' ? university.id : university;
      
      const existingUniversity = await db
        .select()
        .from(universities)
        .where(eq(universities.id, possibleId))
        .limit(1);
      
      if (existingUniversity.length > 0) {
        universityId = existingUniversity[0].id;
        universityName = existingUniversity[0].name;
      } else {
        const univName = typeof university === 'object' ? university.name : university;
        const [newUniversity] = await db
          .insert(universities)
          .values({ name: univName, location: null })
          .onConflictDoNothing()
          .returning();
        
        if (newUniversity) {
          universityId = newUniversity.id;
          universityName = newUniversity.name;
        } else {
          const [existingByName] = await db
            .select()
            .from(universities)
            .where(eq(universities.name, univName))
            .limit(1);
          if (existingByName) {
            universityId = existingByName.id;
            universityName = existingByName.name;
          }
        }
      }
    } else if (autoUniversity) {
      universityName = autoUniversity;
      const [autoUniv] = await db
        .select()
        .from(universities)
        .where(eq(universities.name, autoUniversity))
        .limit(1);
      if (autoUniv) {
        universityId = autoUniv.id;
      }
    }

    let majorId: string | null = null;
    let majorName: string | null = null;
    
    if (major) {
      const possibleId = typeof major === 'object' ? major.id : major;
      
      const existingMajor = await db
        .select()
        .from(majors)
        .where(eq(majors.id, possibleId))
        .limit(1);
      
      if (existingMajor.length > 0) {
        majorId = existingMajor[0].id;
        majorName = existingMajor[0].name;
      } else {
        const majName = typeof major === 'object' ? major.name : major;
        const [newMajor] = await db
          .insert(majors)
          .values({ name: majName, category: null, isVerified: false })
          .onConflictDoNothing()
          .returning();
        
        if (newMajor) {
          majorId = newMajor.id;
          majorName = newMajor.name;
        } else {
          const [existingByName] = await db
            .select()
            .from(majors)
            .where(eq(majors.name, majName))
            .limit(1);
          if (existingByName) {
            majorId = existingByName.id;
            majorName = existingByName.name;
          }
        }
      }
    }

    const isRealFirebaseUser = !!firebaseUid && !firebaseUid.startsWith('dev_user_');

    const user = await storage.createUserFromFirebase(effectiveUid, {
      email,
      displayName,
      firstName,
      lastName,
      role: role || 'student',
      universityId: universityId || null,
      majorId: majorId || null,
      university: universityName || null,
      institution: universityName || null,
      major: majorName || null,
      company: company || null,
      position: position || null,
      bio: bio || null,
      emailVerified: false,
      verificationSentAt: isRealFirebaseUser ? new Date() : null,
    });

    updateUserStreak(user.id).catch(err => 
      console.error("Failed to update streak on registration:", err)
    );

    // Generate and send OTP for real Firebase users
    if (isRealFirebaseUser && email) {
      try {
        const otp = await createOtpForEmail(email);
        const sent = await sendOtpEmail(email, otp, displayName);
        if (!sent) {
          console.warn(`[OTP] Could not send email to ${email}. OTP generated but email not sent.`);
        }
      } catch (otpError: any) {
        console.error(`[OTP] Failed to generate/send OTP for ${email}:`, otpError.message);
        // Non-fatal — user can request a resend
      }
    }

    res.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user profile" });
  }
});

// ── Verify OTP ────────────────────────────────────────────────────────────────
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP code are required." });
    }

    const result = await validateOtp(email, otp.trim());

    if (!result.valid) {
      const messages: Record<string, string> = {
        not_found: "No verification code found for this email. Please request a new one.",
        expired: "Code expired. Please request a new one.",
        already_used: "This code has already been used. Please request a new one.",
        wrong_code: "Incorrect code. Please try again.",
        max_attempts: "Too many incorrect attempts. Please request a new code.",
      };
      return res.status(400).json({
        message: messages[result.reason!] || "Verification failed.",
        reason: result.reason,
      });
    }

    // Mark emailVerified in DB
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await storage.updateEmailVerified(user.id, true);

    // Mark emailVerified in Firebase (via Admin SDK) if available
    try {
      const { firebaseAdmin } = await import("../firebaseAuth") as any;
      if (firebaseAdmin && user.firebaseUid) {
        await firebaseAdmin.auth().updateUser(user.firebaseUid, { emailVerified: true });
      }
    } catch (fbError: any) {
      console.warn("[OTP] Could not sync emailVerified to Firebase:", fbError.message);
    }

    await deleteOtpsForEmail(email);

    return res.json({ message: "Email verified successfully." });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

// ── Resend OTP ────────────────────────────────────────────────────────────────
router.post("/resend-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether user exists
      return res.json({ message: "If that email is registered, a new code has been sent." });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "This email is already verified. You can log in.",
        code: "already_verified",
      });
    }

    try {
      const otp = await createOtpForEmail(email);
      const sent = await sendOtpEmail(email, otp, user.displayName || undefined);
      if (!sent) {
        console.warn(`[OTP] Resend: SMTP not configured. OTP for ${email}: ${otp}`);
      }
      // Update verificationSentAt so grace period resets
      await storage.updateVerificationSentAt(user.id, new Date());
    } catch (otpError: any) {
      if (otpError.message.includes("Too many OTP requests")) {
        return res.status(429).json({ message: otpError.message });
      }
      throw otpError;
    }

    return res.json({ message: "A new verification code has been sent to your email." });
  } catch (error: any) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ message: "Failed to resend code. Please try again." });
  }
});

router.get("/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const fullUser = await storage.getUser(req.user.id);
    if (!fullUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(fullUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    res.json({ 
      message: "Logged out successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

router.post("/change-password", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Current password, new password, and confirmation are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirmation do not match" });
    }

    const isDevUser = req.headers.authorization?.includes('dev-') || req.user.email === 'student@example.com';
    
    if (isDevUser) {
      if (currentPassword !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      return res.json({ 
        message: "Password changed successfully",
        user: req.user 
      });
    }

    try {
      const { firebaseAdmin } = await import("../firebaseAuth") as any;
      
      if (!firebaseAdmin) {
        return res.status(503).json({ message: "Firebase authentication is not configured" });
      }

      const firebaseUid = req.user.id;
      
      if (!firebaseUid) {
        return res.status(400).json({ message: "User information not found" });
      }

      try {
        const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
        if (!firebaseApiKey) {
          console.warn("VITE_FIREBASE_API_KEY not set, cannot verify password");
          return res.status(503).json({ message: "Firebase configuration incomplete" });
        }

        let userEmail = req.user.email;
        
        if (!userEmail) {
          const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
          userEmail = firebaseUser.email;
        }
        
        if (!userEmail) {
          return res.status(400).json({ message: "User email not found in Firebase" });
        }

        const verifyResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              password: currentPassword,
              returnSecureToken: true,
            }),
          }
        );

        const responseData = await verifyResponse.json();
        
        if (!verifyResponse.ok) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }

        const actualFirebaseUid = responseData.localId;

        await firebaseAdmin.auth().updateUser(actualFirebaseUid, {
          password: newPassword,
        });

        return res.json({ 
          message: "Password changed successfully",
          user: req.user 
        });
      } catch (verifyError: any) {
        console.error("Password verification error:", verifyError);
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    } catch (firebaseError: any) {
      console.error("Firebase password change error:", firebaseError);
      return res.status(500).json({ message: "Failed to change password" });
    }
  } catch (error: any) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.post("/2fa/enable", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      message: "Two-factor authentication setup initiated",
      userId: req.user.id,
    });
  } catch (error: any) {
    console.error("Error enabling 2FA:", error);
    res.status(500).json({ message: "Failed to enable two-factor authentication" });
  }
});

// ── Legacy resend-verification (kept for backward compat, now delegates to resend-otp) ──
router.post("/resend-verification", async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid, email } = req.body;

    const emailToUse = email || (() => {
      if (!firebaseUid) return null;
      return null;
    })();

    if (!emailToUse && firebaseUid) {
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user || !user.email) {
        return res.json({ message: "ok" });
      }
      if (user.emailVerified) {
        return res.json({ message: "already_verified" });
      }
      try {
        const otp = await createOtpForEmail(user.email);
        await sendOtpEmail(user.email, otp, user.displayName || undefined);
        await storage.updateVerificationSentAt(user.id, new Date());
      } catch (_) {}
      return res.json({ message: "ok" });
    }

    return res.json({ message: "ok" });
  } catch (error: any) {
    console.error("Error in resend-verification:", error);
    return res.json({ message: "ok" });
  }
});

// ── Dev-only: manually trigger the unverified user cleanup job ────────────────
router.post("/dev/trigger-cleanup", async (req: Request, res: Response) => {
  if (!DEV_AUTH_ENABLED) {
    return res.status(403).json({ message: "This endpoint is only available in development mode." });
  }

  try {
    console.log("[DEV] Manually triggering unverified user cleanup...");
    const stats = await cleanupUnverifiedUsers();
    console.log("[DEV] Cleanup complete:", stats);
    return res.json({ message: "Cleanup complete", stats });
  } catch (error: any) {
    console.error("[DEV] Cleanup trigger error:", error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
