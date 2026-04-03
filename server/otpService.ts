import crypto from "crypto";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { emailOtps } from "@shared/schema";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_REQUESTS = 3;

function generateOtp(): string {
  const digits = crypto.randomInt(0, 1_000_000);
  return digits.toString().padStart(OTP_LENGTH, "0");
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function createOtpForEmail(email: string): Promise<string> {
  const recentCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(emailOtps)
    .where(
      and(
        eq(emailOtps.email, email),
        gt(emailOtps.createdAt, new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000))
      )
    );

  const requestCount = Number(recentCount[0]?.count ?? 0);
  if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Error(`Too many OTP requests. Please wait before requesting a new code.`);
  }

  await db.delete(emailOtps).where(eq(emailOtps.email, email));

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(emailOtps).values({
    email,
    otpHash,
    expiresAt,
    attempts: 0,
    used: "false",
  });

  return otp;
}

export interface OtpValidationResult {
  valid: boolean;
  reason?: "not_found" | "expired" | "already_used" | "wrong_code" | "max_attempts";
}

export async function validateOtp(email: string, otp: string): Promise<OtpValidationResult> {
  const now = new Date();

  const [record] = await db
    .select()
    .from(emailOtps)
    .where(eq(emailOtps.email, email))
    .limit(1);

  if (!record) {
    return { valid: false, reason: "not_found" };
  }

  if (record.used === "true") {
    return { valid: false, reason: "already_used" };
  }

  if (record.expiresAt < now) {
    return { valid: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: "max_attempts" };
  }

  const provided = hashOtp(otp.trim());

  if (provided !== record.otpHash) {
    await db
      .update(emailOtps)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailOtps.id, record.id));
    return { valid: false, reason: "wrong_code" };
  }

  await db
    .update(emailOtps)
    .set({ used: "true" })
    .where(eq(emailOtps.id, record.id));

  return { valid: true };
}

export async function deleteOtpsForEmail(email: string): Promise<void> {
  await db.delete(emailOtps).where(eq(emailOtps.email, email));
}

export async function getOtpRequestCountInWindow(email: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(emailOtps)
    .where(
      and(
        eq(emailOtps.email, email),
        gt(emailOtps.createdAt, new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000))
      )
    );
  return Number(result[0]?.count ?? 0);
}
