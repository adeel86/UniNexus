import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { jsonb, pgTable, timestamp, varchar, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { challenges } from "./gamification";

export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  issuerName: varchar("issuer_name", { length: 200 }).notNull(),
  issuerId: varchar("issuer_id").references(() => users.id, { onDelete: 'set null' }),
  verificationHash: varchar("verification_hash", { length: 64 }).notNull().unique(),
  metadata: jsonb("metadata"),
  imageUrl: varchar("image_url"),
  isPublic: boolean("is_public").notNull().default(true),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(users, {
    fields: [certifications.userId],
    references: [users.id],
  }),
  issuer: one(users, {
    fields: [certifications.issuerId],
    references: [users.id],
  }),
}));

export const insertCertificationSchema = createInsertSchema(certifications).omit({
  id: true,
  verificationHash: true,
  issuedAt: true,
  issuerId: true,
  issuerName: true,
});

export type Certification = typeof certifications.$inferSelect;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;

export const recruiterFeedback = pgTable("recruiter_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  feedback: text("feedback").notNull(),
  context: varchar("context"),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: 'set null' }),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recruiterFeedbackRelations = relations(recruiterFeedback, ({ one }) => ({
  recruiter: one(users, {
    fields: [recruiterFeedback.recruiterId],
    references: [users.id],
    relationName: "recruiter_feedback_given",
  }),
  student: one(users, {
    fields: [recruiterFeedback.studentId],
    references: [users.id],
    relationName: "recruiter_feedback_received",
  }),
  challenge: one(challenges, {
    fields: [recruiterFeedback.challengeId],
    references: [challenges.id],
  }),
}));

export const insertRecruiterFeedbackSchema = createInsertSchema(recruiterFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RecruiterFeedback = typeof recruiterFeedback.$inferSelect;
export type InsertRecruiterFeedback = z.infer<typeof insertRecruiterFeedbackSchema>;
