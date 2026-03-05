import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, universities, majors } from "@shared/schema";
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
