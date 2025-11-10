import type { Express, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { storage } from "./storage";

let firebaseAdmin: admin.app.App | null = null;

try {
  const serviceAccount = require("../serviceAccountKey.json");
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.warn("Firebase Admin SDK not configured. Using fallback auth for development.");
}

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
