import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const emailOtps = pgTable(
  "email_otps",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").notNull(),
    otpHash: varchar("otp_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    used: varchar("used", { length: 5 }).notNull().default("false"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_email_otps_email").on(table.email)],
);

export type EmailOtp = typeof emailOtps.$inferSelect;
