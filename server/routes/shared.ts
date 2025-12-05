import type { Request, Response, NextFunction } from "express";
export type { AuthRequest } from "../firebaseAuth";

export function blockRestrictedRoles(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const restrictedRoles = ['master_admin'];
  if (restrictedRoles.includes((req.user as any).role)) {
    return res.status(403).json({ 
      error: "Access Denied",
      message: "Master admin does not have access to social features." 
    });
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRole = (req.user as any)?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden", message: `Role ${userRole} not authorized` });
    }
    next();
  };
}
