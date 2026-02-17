import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { pgTable, timestamp, varchar, text, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: varchar("firebase_uid").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).notNull().default('student'),
  bio: text("bio"),
  university: varchar("university"),
  major: varchar("major"),
  graduationYear: integer("graduation_year"),
  institution: varchar("institution"),
  company: varchar("company"),
  position: varchar("position"),
  interests: text("interests").array().default(sql`ARRAY[]::text[]`),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  engagementScore: integer("engagement_score").notNull().default(0),
  problemSolverScore: integer("problem_solver_score").notNull().default(0),
  endorsementScore: integer("endorsement_score").notNull().default(0),
  challengePoints: integer("challenge_points").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  rankTier: varchar("rank_tier", { length: 20 }).notNull().default('bronze'),
  streak: integer("streak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  programme: varchar("programme"),
  modules: text("modules").array().default(sql`ARRAY[]::text[]`),
  yearOfStudy: integer("year_of_study"),
  academicGoals: text("academic_goals"),
  careerGoals: text("career_goals"),
  teachingSubjects: text("teaching_subjects").array().default(sql`ARRAY[]::text[]`),
  specializations: text("specializations").array().default(sql`ARRAY[]::text[]`),
  professionalBio: text("professional_bio"),
  department: varchar("department"),
  officeHours: varchar("office_hours"),
  universityMission: text("university_mission"),
  focusAreas: text("focus_areas").array().default(sql`ARRAY[]::text[]`),
  opportunitiesOffered: text("opportunities_offered"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  website: varchar("website"),
  companyMission: text("company_mission"),
  industryFocus: text("industry_focus").array().default(sql`ARRAY[]::text[]`),
  partnershipOpportunities: text("partnership_opportunities"),
  hiringOpportunities: text("hiring_opportunities"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export const educationRecords = pgTable("education_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  institution: varchar("institution", { length: 200 }).notNull(),
  degree: varchar("degree", { length: 100 }),
  fieldOfStudy: varchar("field_of_study", { length: 100 }),
  startDate: varchar("start_date"),
  endDate: varchar("end_date"),
  grade: varchar("grade"),
  description: text("description"),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const educationRecordsRelations = relations(educationRecords, ({ one }) => ({
  user: one(users, {
    fields: [educationRecords.userId],
    references: [users.id],
  }),
}));

export const insertEducationRecordSchema = createInsertSchema(educationRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EducationRecord = typeof educationRecords.$inferSelect;
export type InsertEducationRecord = z.infer<typeof insertEducationRecordSchema>;

export const jobExperience = pgTable("job_experience", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: varchar("position", { length: 200 }).notNull(),
  organization: varchar("organization", { length: 200 }).notNull(),
  startDate: varchar("start_date").notNull(),
  endDate: varchar("end_date"),
  description: text("description"),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobExperienceRelations = relations(jobExperience, ({ one }) => ({
  user: one(users, {
    fields: [jobExperience.userId],
    references: [users.id],
  }),
}));

export const insertJobExperienceSchema = createInsertSchema(jobExperience).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JobExperience = typeof jobExperience.$inferSelect;
export type InsertJobExperience = z.infer<typeof insertJobExperienceSchema>;

export const userConnections = pgTable("user_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const userConnectionsRelations = relations(userConnections, ({ one }) => ({
  requester: one(users, {
    fields: [userConnections.requesterId],
    references: [users.id],
    relationName: "connection_requests_sent",
  }),
  receiver: one(users, {
    fields: [userConnections.receiverId],
    references: [users.id],
    relationName: "connection_requests_received",
  }),
}));

export const insertUserConnectionSchema = createInsertSchema(userConnections).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export type UserConnection = typeof userConnections.$inferSelect;
export type InsertUserConnection = z.infer<typeof insertUserConnectionSchema>;

export const followers = pgTable("followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
    relationName: "user_followers",
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
    relationName: "user_following",
  }),
}));

export const insertFollowerSchema = createInsertSchema(followers).omit({
  id: true,
  createdAt: true,
});

export type Follower = typeof followers.$inferSelect;
export type InsertFollower = z.infer<typeof insertFollowerSchema>;
