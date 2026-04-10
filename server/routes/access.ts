import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const attemptMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attemptMap.get(ip);

  if (!entry || now > entry.resetAt) {
    attemptMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

router.post("/access/verify", (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    res.status(429).json({
      error: "Too many attempts. Please try again later.",
    });
    return;
  }

  const { password } = req.body;
  const correctPassword = process.env.FRONTEND_ACCESS_PASSWORD;

  if (!correctPassword) {
    res.status(503).json({ error: "Access control not configured." });
    return;
  }

  if (!password || password !== correctPassword) {
    res.status(401).json({
      error: "Incorrect password",
      remaining,
    });
    return;
  }

  const token = jwt.sign({ granted: true }, correctPassword, {
    expiresIn: "30d",
  });

  const entry = attemptMap.get(ip);
  if (entry) {
    entry.count = 0;
  }

  res.json({ token });
});

export function validateAccessToken(req: Request): boolean {
  const correctPassword = process.env.FRONTEND_ACCESS_PASSWORD;
  if (!correctPassword) return true;

  const token = req.headers["x-access-token"] as string | undefined;
  if (!token) return false;

  try {
    const payload = jwt.verify(token, correctPassword) as { granted?: boolean };
    return payload.granted === true;
  } catch {
    return false;
  }
}

export default router;
