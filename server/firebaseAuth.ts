import type { Express, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

let firebaseAdmin: admin.app.App | null = null;

// Development auth configuration
// SECURITY: DEV_AUTH_ENABLED must be explicitly set to 'true' - no automatic enabling
const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;

// Try to initialize Firebase Admin SDK from service account
async function initializeFirebaseAdmin() {
  try {
    // Try to import service account JSON from project root (serviceAccountKey.json)
    // or from env path (VITE_FIREBASE_SERVICE_ACCOUNT_PATH - for backwards compatibility)
    let serviceAccountPath = new URL("../serviceAccountKey.json", import.meta.url);
    
    // If env var is set, try that path first
    if (process.env.VITE_FIREBASE_SERVICE_ACCOUNT_PATH) {
      const envPath = new URL(`../${process.env.VITE_FIREBASE_SERVICE_ACCOUNT_PATH}`, import.meta.url);
      serviceAccountPath = envPath;
    }
    
    const serviceAccount = await import(serviceAccountPath.pathname, { with: { type: "json" } }).then(m => m.default);
    
    // Validate that this is a service account (not web SDK credentials)
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.warn("Service account file exists but is not a valid Firebase Admin service account.");
      console.warn("Expected fields: private_key, client_email, project_id");
      console.warn("Got fields:", Object.keys(serviceAccount).join(", "));
      return false;
    }
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
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
    major?: string;
    university?: string;
    company?: string;
    bio?: string;
    avatarUrl?: string;
    engagementScore: number;
    problemSolverScore: number;
    endorsementScore: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequest["user"];
    }
  }
}

export async function setupAuth(app: Express): Promise<void> {
  console.log("Firebase authentication middleware ready");

  // Attach a non-fatal authentication middleware that attempts to
  // populate `req.user` when an Authorization header is present.
  // This middleware will NOT send responses on auth failure — it only
  // sets `req.user` when valid so route handlers can use `req.isAuthenticated()`.
  app.use(async (req: any, _res, next) => {
    // default helper
    req.isAuthenticated = () => !!req.user;

    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      // Development JWT authentication bypass (non-fatal)
      if (!firebaseAdmin && DEV_AUTH_ENABLED && token.startsWith('dev-')) {
        const devToken = token.substring(4);
        if (!DEV_JWT_SECRET) {
          console.error('DEV_JWT_SECRET missing while DEV_AUTH_ENABLED is true');
          return next();
        }
        try {
          const decoded = jwt.verify(devToken, DEV_JWT_SECRET) as { firebaseUid: string; email: string };
          const user = await storage.getUserByFirebaseUid(decoded.firebaseUid);
          if (user) {
            req.user = {
              id: user.id,
              email: user.email || '',
              role: user.role,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              major: user.major || undefined,
              university: user.university || undefined,
              company: user.company || undefined,
              bio: user.bio || undefined,
              avatarUrl: user.profileImageUrl || undefined,
              engagementScore: user.engagementScore,
              problemSolverScore: user.problemSolverScore,
              endorsementScore: user.endorsementScore,
            };
          }
        } catch (e) {
          console.error('Non-fatal dev token verification failed:', e);
        }

        req.isAuthenticated = () => !!req.user;
        return next();
      }

      // Production Firebase verification (non-fatal)
      if (!firebaseAdmin) {
        return next();
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);

        if (user) {
          req.user = {
            id: user.id,
            email: user.email || '',
            role: user.role,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            major: user.major || undefined,
            university: user.university || undefined,
            company: user.company || undefined,
            bio: user.bio || undefined,
            avatarUrl: user.profileImageUrl || undefined,
            engagementScore: user.engagementScore,
            problemSolverScore: user.problemSolverScore,
            endorsementScore: user.endorsementScore,
          };
        } else {
          // minimal info from token
          req.user = {
            id: decodedToken.uid,
            email: decodedToken.email || '',
            role: 'student',
            firstName: '',
            lastName: '',
            engagementScore: 0,
            problemSolverScore: 0,
            endorsementScore: 0,
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
    // Development JWT authentication bypass
    if (!firebaseAdmin && DEV_AUTH_ENABLED && token.startsWith('dev-')) {
      const devToken = token.substring(4); // Remove 'dev-' prefix
      
      // DEV_JWT_SECRET is validated at startup when DEV_AUTH_ENABLED is true
      if (!DEV_JWT_SECRET) {
        return res.status(503).json({ message: 'Development auth not properly configured' });
      }
      
      try {
        const decoded = jwt.verify(devToken, DEV_JWT_SECRET) as { firebaseUid: string; email: string };
        
        const user = await storage.getUserByFirebaseUid(decoded.firebaseUid);
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        console.log(`Dev auth: User ${user.email} authenticated (role: ${user.role})`);

        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.role,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          major: user.major || undefined,
          university: user.university || undefined,
          company: user.company || undefined,
          bio: user.bio || undefined,
          avatarUrl: user.profileImageUrl || undefined,
          engagementScore: user.engagementScore,
          problemSolverScore: user.problemSolverScore,
          endorsementScore: user.endorsementScore,
        };

        return next();
      } catch (jwtError) {
        console.error('Dev JWT verification error:', jwtError);
        return res.status(403).json({ message: 'Forbidden: Invalid development token' });
      }
    }

    // Production Firebase authentication
    if (!firebaseAdmin) {
      return res.status(503).json({ message: 'Authentication service not configured' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
      role: 'student',
      firstName: '',
      lastName: '',
      engagementScore: 0,
      problemSolverScore: 0,
      endorsementScore: 0,
    };

    const user = await storage.getUserByFirebaseUid(decodedToken.uid);
    
    if (user) {
      req.user = {
        id: user.id,
        email: user.email || '',
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        major: user.major || undefined,
        university: user.university || undefined,
        company: user.company || undefined,
        bio: user.bio || undefined,
        avatarUrl: user.profileImageUrl || undefined,
        engagementScore: user.engagementScore,
        problemSolverScore: user.problemSolverScore,
        endorsementScore: user.endorsementScore,
      };
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }
};

export const isAuthenticated = verifyToken;
