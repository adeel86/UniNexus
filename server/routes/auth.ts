import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { verifyToken, isAuthenticated, type AuthRequest } from "../firebaseAuth";
import { storage } from "../storage";
import { getUniversityByEmail } from "@shared/universities";

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

    console.log(`Dev login successful: ${user.email} (role: ${user.role})`);

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

    const user = await storage.createUserFromFirebase(effectiveUid, {
      email,
      displayName,
      firstName,
      lastName,
      role: role || 'student',
      university: autoUniversity || university || null,
      institution: autoUniversity || university || null,
      major: major || null,
      company: company || null,
      position: position || null,
      bio: bio || null,
    });

    res.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user profile" });
  }
});

router.get("/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];
    if (token) {
      console.log(`User logout: ${token.substring(0, 20)}...`);
    }
    
    res.json({ 
      message: "Logged out successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;
