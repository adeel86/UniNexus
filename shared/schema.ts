import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTH TABLES (Required for Replit Auth)
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ============================================================================
// USER TABLES
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: varchar("firebase_uid").unique().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).notNull().default('student'), // student, teacher, university_admin, industry_professional, master_admin
  bio: text("bio"),
  university: varchar("university"),
  major: varchar("major"),
  graduationYear: integer("graduation_year"),
  company: varchar("company"), // for industry professionals
  position: varchar("position"), // for industry professionals
  interests: text("interests").array().default(sql`ARRAY[]::text[]`),
  engagementScore: integer("engagement_score").notNull().default(0),
  problemSolverScore: integer("problem_solver_score").notNull().default(0),
  endorsementScore: integer("endorsement_score").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
  userBadges: many(userBadges),
  userSkills: many(userSkills),
  endorsementsGiven: many(endorsements, { relationName: "endorser" }),
  endorsementsReceived: many(endorsements, { relationName: "endorsed" }),
  enrollments: many(courseEnrollments),
  challengeParticipations: many(challengeParticipants),
  notifications: many(notifications),
}));

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// ============================================================================
// SOCIAL FEED TABLES
// ============================================================================

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  category: varchar("category"), // academic, social, project, achievement
  tags: text("tags").array(),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

// ============================================================================
// COMMENTS
// ============================================================================

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// ============================================================================
// REACTIONS
// ============================================================================

export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).notNull(), // like, celebrate, insightful, support
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

// ============================================================================
// GAMIFICATION: BADGES
// ============================================================================

export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(), // lucide icon name
  category: varchar("category", { length: 50 }).notNull(), // engagement, problem_solving, learning, social, achievement
  tier: varchar("tier", { length: 20 }).notNull(), // bronze, silver, gold, platinum
  criteria: text("criteria").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export type Badge = typeof badges.$inferSelect;

// ============================================================================
// USER BADGES
// ============================================================================

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export type UserBadge = typeof userBadges.$inferSelect;

// ============================================================================
// SKILLS
// ============================================================================

export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category"), // technical, soft_skills, academic, creative
  createdAt: timestamp("created_at").defaultNow(),
});

export const skillsRelations = relations(skills, ({ many }) => ({
  userSkills: many(userSkills),
}));

export type Skill = typeof skills.$inferSelect;

// ============================================================================
// USER SKILLS
// ============================================================================

export const userSkills = pgTable("user_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: varchar("skill_id").notNull().references(() => skills.id, { onDelete: 'cascade' }),
  level: varchar("level", { length: 20 }).notNull().default('beginner'), // beginner, intermediate, advanced, expert
  addedAt: timestamp("added_at").defaultNow(),
});

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [userSkills.skillId],
    references: [skills.id],
  }),
}));

export type UserSkill = typeof userSkills.$inferSelect;

// ============================================================================
// ENDORSEMENTS
// ============================================================================

export const endorsements = pgTable("endorsements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endorserId: varchar("endorser_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endorsedUserId: varchar("endorsed_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: varchar("skill_id").references(() => skills.id, { onDelete: 'set null' }),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const endorsementsRelations = relations(endorsements, ({ one }) => ({
  endorser: one(users, {
    fields: [endorsements.endorserId],
    references: [users.id],
    relationName: "endorser",
  }),
  endorsedUser: one(users, {
    fields: [endorsements.endorsedUserId],
    references: [users.id],
    relationName: "endorsed",
  }),
  skill: one(skills, {
    fields: [endorsements.skillId],
    references: [skills.id],
  }),
}));

export const insertEndorsementSchema = createInsertSchema(endorsements).omit({
  id: true,
  createdAt: true,
});

export type Endorsement = typeof endorsements.$inferSelect;
export type InsertEndorsement = z.infer<typeof insertEndorsementSchema>;

// ============================================================================
// COURSES
// ============================================================================

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  university: varchar("university"),
  instructorId: varchar("instructor_id").references(() => users.id, { onDelete: 'set null' }),
  semester: varchar("semester"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  enrollments: many(courseEnrollments),
  discussions: many(courseDiscussions),
}));

export type Course = typeof courses.$inferSelect;

// ============================================================================
// COURSE ENROLLMENTS
// ============================================================================

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

// ============================================================================
// COURSE DISCUSSIONS
// ============================================================================

export const courseDiscussions = pgTable("course_discussions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isQuestion: boolean("is_question").notNull().default(true),
  isResolved: boolean("is_resolved").notNull().default(false),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseDiscussionsRelations = relations(courseDiscussions, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseDiscussions.courseId],
    references: [courses.id],
  }),
  author: one(users, {
    fields: [courseDiscussions.authorId],
    references: [users.id],
  }),
  replies: many(discussionReplies),
}));

export const insertCourseDiscussionSchema = createInsertSchema(courseDiscussions).omit({
  id: true,
  replyCount: true,
  createdAt: true,
  updatedAt: true,
});

export type CourseDiscussion = typeof courseDiscussions.$inferSelect;
export type InsertCourseDiscussion = z.infer<typeof insertCourseDiscussionSchema>;

// ============================================================================
// DISCUSSION REPLIES
// ============================================================================

export const discussionReplies = pgTable("discussion_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: varchar("discussion_id").notNull().references(() => courseDiscussions.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discussionRepliesRelations = relations(discussionReplies, ({ one }) => ({
  discussion: one(courseDiscussions, {
    fields: [discussionReplies.discussionId],
    references: [courseDiscussions.id],
  }),
  author: one(users, {
    fields: [discussionReplies.authorId],
    references: [users.id],
  }),
}));

export type DiscussionReply = typeof discussionReplies.$inferSelect;

// ============================================================================
// CHALLENGES
// ============================================================================

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  organizerId: varchar("organizer_id").references(() => users.id, { onDelete: 'set null' }), // industry partner or university
  category: varchar("category"), // hackathon, coding, design, innovation
  difficulty: varchar("difficulty", { length: 20 }).notNull().default('intermediate'), // beginner, intermediate, advanced
  prizes: text("prizes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  participantCount: integer("participant_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('upcoming'), // upcoming, active, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  organizer: one(users, {
    fields: [challenges.organizerId],
    references: [users.id],
  }),
  participants: many(challengeParticipants),
}));

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  participantCount: true,
  createdAt: true,
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

// ============================================================================
// CHALLENGE PARTICIPANTS
// ============================================================================

export const challengeParticipants = pgTable("challenge_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  submissionUrl: varchar("submission_url"),
  submittedAt: timestamp("submitted_at"),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
}));

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // reaction, comment, endorsement, badge, challenge
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;

// ============================================================================
// ANNOUNCEMENTS (for university admins)
// ============================================================================

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  university: varchar("university"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
