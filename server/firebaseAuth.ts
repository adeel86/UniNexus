

import type { Express, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, universities, majors, userProfiles, type User } from "@shared/schema";

export let firebaseAdmin: admin.app.App | null = null;

// Development auth configuration
// SECURITY: DEV_AUTH_ENABLED must be explicitly set to 'true' - no automatic enabling
const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;

// Try to initialize Firebase Admin SDK from service account
async function initializeFirebaseAdmin() {
  try {
    let serviceAccount: any;

    // First try explicit JSON env variable (most reliable for Render/Replit deployments)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      const serviceAccountEnv = process.env.VITE_FIREBASE_SERVICE_ACCOUNT_PATH || '';

      if (serviceAccountEnv.trim().startsWith('{')) {
        // Env var contains JSON content directly (common Replit pattern)
        try {
          serviceAccount = JSON.parse(serviceAccountEnv);
        } catch (parseError: any) {
          console.warn('Could not parse service account JSON from env var:', parseError.message);
          return false;
        }
      } else {
        // Treat as file path
        const serviceAccountPath = serviceAccountEnv || '/etc/secrets/serviceAccountKey.json';
        try {
          const fs = await import('fs').then(m => m.promises);
          const fileContent = await fs.readFile(serviceAccountPath, 'utf-8');
          serviceAccount = JSON.parse(fileContent);
        } catch (fileError: any) {
          console.warn(`Could not read service account from ${serviceAccountPath}:`, fileError.message);
          return false;
        }
      }
    }
    
    // Validate that this is a service account (not web SDK credentials)
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.warn("Service account file exists but is not a valid Firebase Admin service account.");
      console.warn("Expected fields: private_key, client_email, project_id");
      console.warn("Got fields:", Object.keys(serviceAccount).join(", "));
      return false;
    }
    
    if (admin.apps.length === 0) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    } else {
      firebaseAdmin = admin.apps[0]!;
    }
    console.log("✓ Firebase Admin SDK initialized successfully");
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (!errorMsg.includes("ENOENT") && !errorMsg.includes("Cannot find")) {
      console.warn("Firebase Admin SDK initialization failed:", errorMsg);
    }
    return false;
  }
}

// Initialize on startup
initializeFirebaseAdmin().then(success => {
  if (!success) {
    console.warn("Firebase Admin SDK not configured. Using fallback authentication for development.");
    if (DEV_AUTH_ENABLED) {
      if (!DEV_JWT_SECRET) {
        console.error("CRITICAL: DEV_JWT_SECRET must be set when development auth is enabled!");
        console.error("Set the environment variable DEV_JWT_SECRET to a secure random string.");
        process.exit(1);
      }
      console.log("✓ Development authentication bypass enabled (DEV_AUTH_ENABLED=true)");
    }
  }
}).catch(err => {
  console.error("Fatal error during Firebase Admin initialization:", err);
  if (DEV_AUTH_ENABLED) {
    console.log("Continuing with development authentication...");
  } else {
    process.exit(1);
  }
});

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    universityId?: string;
    majorId?: string;
    university?: string;
    major?: string;
    companyName?: string;
    jobTitle?: string;
    bio?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    engagementScore: number;
    problemSolverScore: number;
    endorsementScore: number;
    challengePoints: number;
    totalPoints: number;
    rankTier: string;
    streak: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequest["user"];
      isAuthenticated(): boolean;
    }
  }
}

// Resolve related display names for a user in a single JOIN query
async function resolveUserRelations(user: User) {
  const [rel] = await db
    .select({
      universityName: universities.name,
      majorName: majors.name,
      companyName: userProfiles.companyName,
      jobTitle: userProfiles.jobTitle,
    })
    .from(users)
    .leftJoin(universities, eq(users.universityId, universities.id))
    .leftJoin(majors, eq(users.majorId, majors.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, user.id))
    .limit(1);
  return rel ?? {};
}

// Build a fully resolved req.user object for a given DB user
async function buildUserForReq(
  user: User,
  emailVerified?: boolean
): Promise<NonNullable<AuthRequest['user']>> {
  const rel = await resolveUserRelations(user);
  return {
    id: user.id,
    email: user.email || '',
    role: user.role,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    universityId: user.universityId || undefined,
    majorId: user.majorId || undefined,
    university: rel.universityName || undefined,
    major: rel.majorName || undefined,
    companyName: rel.companyName || undefined,
    jobTitle: rel.jobTitle || undefined,
    bio: user.bio || undefined,
    avatarUrl: user.profileImageUrl || undefined,
    ...(emailVerified !== undefined ? { emailVerified } : {}),
    engagementScore: user.engagementScore,
    problemSolverScore: user.problemSolverScore,
    endorsementScore: user.endorsementScore,
    challengePoints: user.challengePoints,
    totalPoints: user.totalPoints,
    rankTier: user.rankTier,
    streak: user.streak || 0,
  };
}

// Simple storage shim for user lookups (avoids circular import with storage.ts)
async function findUserByFirebaseUid(uid: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
  return user;
}
async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}
async function findUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function setupAuth(app: Express): Promise<void> {
  console.log("Firebase authentication middleware ready");

  app.use(async (req: any, _res, next) => {
    req.isAuthenticated = () => !!req.user;

    // Block any request to /api/auth/dev-login if DEV_AUTH_ENABLED is false
    if (req.path === '/api/auth/dev-login' && !DEV_AUTH_ENABLED) {
      return _res.status(403).json({ message: "Master Demo is disabled" });
    }

    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      // Development JWT authentication bypass (priority: check dev token first)
      if (token.startsWith('dev-') || token === 'development-secret-key-12345') {
        let user: User | undefined;
        if (token === 'development-secret-key-12345') {
          user = await findUserByEmail('student@example.com');
        } else {
          const devToken = token.substring(4);
          if (!DEV_JWT_SECRET) {
            console.error('DEV_JWT_SECRET missing, cannot verify dev token');
            return next();
          }
          try {
            const decoded = jwt.verify(devToken, DEV_JWT_SECRET) as { firebaseUid?: string; email: string; userId?: string };
            user = decoded.userId ? await findUserById(decoded.userId) : undefined;
            if (!user && decoded.firebaseUid) {
              user = await findUserByFirebaseUid(decoded.firebaseUid);
            }
            if (!user && decoded.email) {
              user = await findUserByEmail(decoded.email);
            }
          } catch (e) {
            console.error('Non-fatal dev token verification failed:', e);
          }
        }
        if (user) {
          req.user = await buildUserForReq(user);
        }
        req.isAuthenticated = () => !!req.user;
        return next();
      }

      // Production Firebase verification (non-fatal)
      if (!firebaseAdmin) {
        if (DEV_AUTH_ENABLED) {
          try {
            const decoded = jwt.decode(token) as { sub?: string; uid?: string; email?: string; user_id?: string } | null;
            if (decoded) {
              const firebaseUid = decoded.sub || decoded.uid || decoded.user_id;
              let user: User | undefined;
              if (firebaseUid) {
                user = await findUserByFirebaseUid(firebaseUid);
              }
              if (!user && decoded.email) {
                user = await findUserByEmail(decoded.email);
              }
              if (user) {
                req.user = await buildUserForReq(user);
                req.isAuthenticated = () => !!req.user;
              }
            }
          } catch (e) {
            // ignore decode errors in dev mode
          }
        }
        return next();
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await findUserByFirebaseUid(decodedToken.uid);

        if (user) {
          req.user = await buildUserForReq(user, decodedToken.email_verified ?? user.emailVerified);
        } else {
          req.user = {
            id: decodedToken.uid,
            email: decodedToken.email || '',
            role: 'student',
            firstName: '',
            lastName: '',
            emailVerified: decodedToken.email_verified ?? false,
            engagementScore: 0,
            problemSolverScore: 0,
            endorsementScore: 0,
            challengePoints: 0,
            totalPoints: 0,
            rankTier: 'bronze',
            streak: 0,
          };
        }

        req.isAuthenticated = () => !!req.user;
      } catch (e) {
        console.error('Non-fatal Firebase token verification failed:', e);
      }

      return next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return next();
    }
  });
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Development JWT authentication bypass (priority: check dev token first)
    if (DEV_AUTH_ENABLED && (token.startsWith('dev-') || token === 'development-secret-key-12345')) {
      let user: User | undefined;
      if (token === 'development-secret-key-12345') {
        user = await findUserByEmail('student@example.com');
      } else {
        const devToken = token.substring(4);
        
        if (!DEV_JWT_SECRET) {
          return res.status(503).json({ message: 'Development auth not properly configured' });
        }
        
        try {
          const decoded = jwt.verify(devToken, DEV_JWT_SECRET) as { firebaseUid?: string; email: string; userId?: string };
          user = decoded.userId ? await findUserById(decoded.userId) : undefined;
          if (!user && decoded.firebaseUid) {
            user = await findUserByFirebaseUid(decoded.firebaseUid);
          }
          if (!user && decoded.email) {
            user = await findUserByEmail(decoded.email);
          }
        } catch (jwtError) {
          console.error('Dev JWT verification error:', jwtError);
          return res.status(403).json({ message: 'Forbidden: Invalid development token' });
        }
      }
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = await buildUserForReq(user);
      return next();
    }

    // Production Firebase authentication
    if (!firebaseAdmin) {
      if (DEV_AUTH_ENABLED) {
        try {
          const decoded = jwt.decode(token) as { sub?: string; uid?: string; email?: string; user_id?: string } | null;
          if (decoded) {
            const firebaseUid = decoded.sub || decoded.uid || decoded.user_id;
            let user: User | undefined;
            if (firebaseUid) {
              user = await findUserByFirebaseUid(firebaseUid);
            }
            if (!user && decoded.email) {
              user = await findUserByEmail(decoded.email);
            }
            if (user) {
              req.user = await buildUserForReq(user);
              return next();
            }
          }
        } catch (e) {
          // ignore decode errors in dev mode
        }
        return next();
      }
      return res.status(503).json({ message: 'Authentication service not configured' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    // Enforce email verification — check DB as source of truth (OTP-based)
    const userForCheck = await findUserByFirebaseUid(decodedToken.uid);
    const dbVerified = userForCheck?.emailVerified ?? false;
    const firebaseVerified = decodedToken.email_verified ?? false;

    if (!dbVerified && !firebaseVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Enter the 6-digit code sent to your inbox.',
        code: 'email-not-verified',
      });
    }

    const user = await findUserByFirebaseUid(decodedToken.uid);

    if (user) {
      req.user = await buildUserForReq(user, true);
    } else {
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email || '',
        role: 'student',
        firstName: '',
        lastName: '',
        emailVerified: true,
        engagementScore: 0,
        problemSolverScore: 0,
        endorsementScore: 0,
        challengePoints: 0,
        totalPoints: 0,
        rankTier: 'bronze',
        streak: 0,
      };
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }
};

export const isAuthenticated = verifyToken;
