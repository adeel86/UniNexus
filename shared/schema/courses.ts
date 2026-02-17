import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { pgTable, timestamp, varchar, text, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const universities = pgTable("universities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull().unique(),
  location: varchar("location", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUniversitySchema = createInsertSchema(universities).omit({
  id: true,
  createdAt: true,
});

export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  university: varchar("university"), // Keep for compatibility but should be linked to universities table name
  instructorId: varchar("instructor_id").references(() => users.id, { onDelete: 'set null' }),
  semester: varchar("semester"),
  universityValidationStatus: varchar("university_validation_status", { length: 20 }).notNull().default('pending'),
  isUniversityValidated: boolean("is_university_validated").notNull().default(false),
  validatedByUniversityAdminId: varchar("validated_by_university_admin_id").references(() => users.id, { onDelete: 'set null' }),
  universityValidatedAt: timestamp("university_validated_at"),
  universityValidationNote: text("university_validation_note"),
  validationRequestedAt: timestamp("validation_requested_at"),
  enrollmentCount: integer("enrollment_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Course = typeof courses.$inferSelect;

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  universityValidationStatus: true,
  isUniversityValidated: true,
  validatedByUniversityAdminId: true,
  universityValidatedAt: true,
  universityValidationNote: true,
  validationRequestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;

export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [courseEnrollments.studentId],
    references: [users.id],
  }),
}));

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

export const courseDiscussions = pgTable("course_discussions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isQuestion: boolean("is_question").notNull().default(true),
  isResolved: boolean("is_resolved").notNull().default(false),
  replyCount: integer("reply_count").notNull().default(0),
  upvoteCount: integer("upvote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseDiscussionSchema = createInsertSchema(courseDiscussions).omit({
  id: true,
  replyCount: true,
  upvoteCount: true,
  createdAt: true,
  updatedAt: true,
});

export type CourseDiscussion = typeof courseDiscussions.$inferSelect;
export type InsertCourseDiscussion = z.infer<typeof insertCourseDiscussionSchema>;

export const discussionReplies = pgTable("discussion_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: varchar("discussion_id").notNull().references(() => courseDiscussions.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  upvoteCount: integer("upvote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscussionReplySchema = createInsertSchema(discussionReplies).omit({
  id: true,
  upvoteCount: true,
  createdAt: true,
});

export type DiscussionReply = typeof discussionReplies.$inferSelect;
export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;

export const discussionUpvotes = pgTable("discussion_upvotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: varchar("discussion_id").references(() => courseDiscussions.id, { onDelete: 'cascade' }),
  replyId: varchar("reply_id").references(() => discussionReplies.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_upvote_user_discussion").on(table.userId, table.discussionId).where(sql`${table.discussionId} IS NOT NULL`),
  uniqueIndex("unique_upvote_user_reply").on(table.userId, table.replyId).where(sql`${table.replyId} IS NOT NULL`),
]);

export const insertDiscussionUpvoteSchema = createInsertSchema(discussionUpvotes).omit({
  id: true,
  createdAt: true,
});

export type DiscussionUpvote = typeof discussionUpvotes.$inferSelect;
export type InsertDiscussionUpvote = z.infer<typeof insertDiscussionUpvoteSchema>;

export const courseMilestones = pgTable("course_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  milestoneType: varchar("milestone_type", { length: 100 }).notNull(),
  achievedAt: timestamp("achieved_at").defaultNow(),
  metadata: text("metadata"),
}, (table) => [
  uniqueIndex("unique_student_course_milestone").on(table.studentId, table.courseId, table.milestoneType),
]);

export const insertCourseMilestoneSchema = createInsertSchema(courseMilestones).omit({
  id: true,
  achievedAt: true,
});

export type CourseMilestone = typeof courseMilestones.$inferSelect;
export type InsertCourseMilestone = z.infer<typeof insertCourseMilestoneSchema>;

export const studentCourses = pgTable("student_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: 'set null' }),
  courseName: varchar("course_name", { length: 200 }).notNull(),
  courseCode: varchar("course_code", { length: 50 }),
  description: text("description"),
  institution: varchar("institution", { length: 200 }),
  instructor: varchar("instructor", { length: 200 }),
  semester: varchar("semester", { length: 50 }),
  year: varchar("year", { length: 20 }),
  grade: varchar("grade", { length: 20 }),
  credits: varchar("credits", { length: 20 }),
  validationStatus: varchar("validation_status", { length: 20 }).notNull().default('pending'),
  isEnrolled: boolean("is_enrolled").notNull().default(false),
  enrolledAt: timestamp("enrolled_at"),
  isValidated: boolean("is_validated").notNull().default(false),
  validatedBy: varchar("validated_by").references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp("validated_at"),
  validationNote: text("validation_note"),
  assignedTeacherId: varchar("assigned_teacher_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentCourseSchema = createInsertSchema(studentCourses).omit({
  id: true,
  validationStatus: true,
  isEnrolled: true,
  enrolledAt: true,
  isValidated: true,
  validatedBy: true,
  validatedAt: true,
  validationNote: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  assignedTeacherId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
});

export type StudentCourse = typeof studentCourses.$inferSelect;
export type InsertStudentCourse = z.infer<typeof insertStudentCourseSchema>;
