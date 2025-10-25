// uninexus-identity-service/src/db/schema.ts

import { pgTable, uuid, text, timestamp, boolean, jsonb, varchar } from 'drizzle-orm/pg-core';

// Core User Profile Data
export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey(), // References the user ID from Social Service
  publicRecruiterMode: boolean('public_recruiter_mode').default(false).notNull(),
  aiVisibilityScore: integer('ai_visibility_score').default(0),
  // Data for Feature 2: AI-Generated Profile Page
  growthTimeline: jsonb('growth_timeline').notNull().default([]), // Array of key achievements
  // Data for Feature 4: Teacher Validation
  isVerifiedStudent: boolean('is_verified_student').default(false).notNull(),
});

// Verified Academic Records
export const academicRecords = pgTable('academic_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => userProfiles.userId).notNull(),
  courseName: varchar('course_name', { length: 100 }).notNull(),
  grade: varchar('grade', { length: 10 }),
  verifiedByTeacherId: uuid('verified_by_teacher_id').nullable(), // Teacher ID for validation
  verificationDate: timestamp('verification_date'),
});
