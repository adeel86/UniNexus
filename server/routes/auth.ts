import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, universities, majors } from "@shared/schema";
import { verifyToken, isAuthenticated, type AuthRequest } from "../firebaseAuth";
import { storage } from "../storage";
import { getUniversityByEmail } from "@shared/universities";
import { updateUserStreak } from "../streakHelper";

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
    
    // Use provided firebaseUid or fallback to user id if available
    const effectiveUid = firebaseUid || req.user?.id || `dev_user_${Date.now()}`;
    
    const nameParts = (displayName || '').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const autoUniversity = getUniversityByEmail(email);

    // Process university - either fetch existing or create new
    let universityId: string | null = null;
    let universityName: string | null = null;
    
    if (university) {
      // Check if it's an ID (from autocomplete selection)
      const possibleId = typeof university === 'object' ? university.id : university;
      
      // Check if university with this ID exists
      const existingUniversity = await db
        .select()
        .from(universities)
        .where(eq(universities.id, possibleId))
        .limit(1);
      
      if (existingUniversity.length > 0) {
        // Use existing university
        universityId = existingUniversity[0].id;
        universityName = existingUniversity[0].name;
      } else {
        // Create new university (treat as custom entry)
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
          // University name already exists, fetch it
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
      // Try to fetch auto-detected university
      const [autoUniv] = await db
        .select()
        .from(universities)
        .where(eq(universities.name, autoUniversity))
        .limit(1);
      if (autoUniv) {
        universityId = autoUniv.id;
      }
    }

    // Process major - either fetch existing or create new
    let majorId: string | null = null;
    let majorName: string | null = null;
    
    if (major) {
      // Check if it's an ID (from autocomplete selection)
      const possibleId = typeof major === 'object' ? major.id : major;
      
      // Check if major with this ID exists
      const existingMajor = await db
        .select()
        .from(majors)
        .where(eq(majors.id, possibleId))
        .limit(1);
      
      if (existingMajor.length > 0) {
        // Use existing major
        majorId = existingMajor[0].id;
        majorName = existingMajor[0].name;
      } else {
        // Create new major (treat as custom entry)
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
          // Major name already exists, fetch it
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

    const user = await storage.createUserFromFirebase(effectiveUid, {
      email,
      displayName,
      firstName,
      lastName,
      role: role || 'student',
      universityId: universityId || null,
      majorId: majorId || null,
      // Keep legacy fields for backward compatibility
      university: universityName || null,
      institution: universityName || null,
      major: majorName || null,
      company: company || null,
      position: position || null,
      bio: bio || null,
    });

    // Update streak on registration (first activity)
    updateUserStreak(user.id).catch(err => 
      console.error("Failed to update streak on registration:", err)
    );

    res.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user profile" });
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

    // Check if this is a development/demo user by looking for dev token or checking for demo user marker
    const isDevUser = req.headers.authorization?.includes('dev-') || req.user.email === 'student@example.com';
    
    // For development/demo auth, use a simple password check
    if (isDevUser) {
      if (currentPassword !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      // In dev mode, just return success
      return res.json({ 
        message: "Password changed successfully",
        user: req.user 
      });
    }

    // For Firebase authentication, use Firebase Admin SDK to change password
    try {
      const { firebaseAdmin } = await import("../firebaseAuth") as any;
      
      if (!firebaseAdmin) {
        return res.status(503).json({ message: "Firebase authentication is not configured" });
      }

      // Get the user's Firebase UID from the authenticated request
      const firebaseUid = req.user.id;
      
      if (!firebaseUid) {
        return res.status(400).json({ message: "User information not found" });
      }

      // The user is already authenticated (middleware verified their token)
      // We need to verify they know their current password before allowing a change
      // Use Firebase REST API with their email to verify the current password
      try {
        const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
        if (!firebaseApiKey) {
          console.warn("VITE_FIREBASE_API_KEY not set, cannot verify password");
          return res.status(503).json({ message: "Firebase configuration incomplete" });
        }

        // Try using email from authenticated request first
        let userEmail = req.user.email;
        
        // If email is not available from request, fetch from Firebase Admin SDK
        if (!userEmail) {
          const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
          userEmail = firebaseUser.email;
        }
        
        if (!userEmail) {
          return res.status(400).json({ message: "User email not found in Firebase" });
        }

        // Verify password using Firebase REST API
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

        // Get the actual Firebase UID from the REST API response
        // This ensures we're using the correct UID that exists in Firebase Auth
        const actualFirebaseUid = responseData.localId;

        // Update password using Admin SDK with the actual Firebase UID
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

    // In a full implementation, this would:
    // 1. Generate a TOTP secret using a library like 'speakeasy'
    // 2. Generate a QR code
    // 3. Store temporary unverified 2FA secret in database
    // 4. Return QR code to client for scanning
    // 5. Require verification code before finalizing setup

    // For now, return a basic success response
    res.json({
      message: "Two-factor authentication setup initiated",
      userId: req.user.id,
      // In production, include: qrCode, secret, backupCodes
    });
  } catch (error: any) {
    console.error("Error enabling 2FA:", error);
    res.status(500).json({ message: "Failed to enable two-factor authentication" });
  }
});

export default router;
