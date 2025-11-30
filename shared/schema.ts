import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
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
  firebaseUid: varchar("firebase_uid").unique(),
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
  isVerified: boolean("is_verified").notNull().default(false), // Verified student profile
  verifiedAt: timestamp("verified_at"),
  engagementScore: integer("engagement_score").notNull().default(0),
  problemSolverScore: integer("problem_solver_score").notNull().default(0),
  endorsementScore: integer("endorsement_score").notNull().default(0),
  challengePoints: integer("challenge_points").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  rankTier: varchar("rank_tier", { length: 20 }).notNull().default('bronze'), // bronze, silver, gold, platinum
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
  certifications: many(certifications),
  followers: many(followers, { relationName: "user_followers" }),
  following: many(followers, { relationName: "user_following" }),
  postShares: many(postShares),
  postBoosts: many(postBoosts),
  messagesSent: many(messages),
  groupMemberships: many(groupMembers),
  educationRecords: many(educationRecords),
  workExperience: many(jobExperience),
  studentCourses: many(studentCourses),
  coursesValidated: many(studentCourses, { relationName: "validator" }),
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
  imageUrl: varchar("image_url"), // Legacy single image support
  videoUrl: varchar("video_url"), // Support for video/Reels
  mediaUrls: text("media_urls").array().default(sql`ARRAY[]::text[]`), // Multiple images support
  mediaType: varchar("media_type", { length: 20 }).default('text'), // text, image, video, reel
  category: varchar("category"), // academic, social, project, achievement, reel
  tags: text("tags").array(),
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
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
  shares: many(postShares),
  boosts: many(postBoosts),
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

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;

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
  upvoteCount: integer("upvote_count").notNull().default(0),
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
  upvotes: many(discussionUpvotes),
}));

export const insertCourseDiscussionSchema = createInsertSchema(courseDiscussions).omit({
  id: true,
  replyCount: true,
  upvoteCount: true,
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
  upvoteCount: integer("upvote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discussionRepliesRelations = relations(discussionReplies, ({ one, many }) => ({
  discussion: one(courseDiscussions, {
    fields: [discussionReplies.discussionId],
    references: [courseDiscussions.id],
  }),
  author: one(users, {
    fields: [discussionReplies.authorId],
    references: [users.id],
  }),
  upvotes: many(discussionUpvotes),
}));

export const insertDiscussionReplySchema = createInsertSchema(discussionReplies).omit({
  id: true,
  upvoteCount: true,
  createdAt: true,
});

export type DiscussionReply = typeof discussionReplies.$inferSelect;
export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;

// ============================================================================
// DISCUSSION UPVOTES
// ============================================================================

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

export const discussionUpvotesRelations = relations(discussionUpvotes, ({ one }) => ({
  discussion: one(courseDiscussions, {
    fields: [discussionUpvotes.discussionId],
    references: [courseDiscussions.id],
  }),
  reply: one(discussionReplies, {
    fields: [discussionUpvotes.replyId],
    references: [discussionReplies.id],
  }),
  user: one(users, {
    fields: [discussionUpvotes.userId],
    references: [users.id],
  }),
}));

export const insertDiscussionUpvoteSchema = createInsertSchema(discussionUpvotes).omit({
  id: true,
  createdAt: true,
});

export type DiscussionUpvote = typeof discussionUpvotes.$inferSelect;
export type InsertDiscussionUpvote = z.infer<typeof insertDiscussionUpvoteSchema>;

// ============================================================================
// COURSE MILESTONES
// ============================================================================

export const courseMilestones = pgTable("course_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  milestoneType: varchar("milestone_type", { length: 100 }).notNull(), // first_discussion, five_helpful_answers, resolved_three_questions, active_contributor
  achievedAt: timestamp("achieved_at").defaultNow(),
  metadata: text("metadata"), // JSON string for additional data
}, (table) => [
  uniqueIndex("unique_student_course_milestone").on(table.studentId, table.courseId, table.milestoneType),
]);

export const courseMilestonesRelations = relations(courseMilestones, ({ one }) => ({
  course: one(courses, {
    fields: [courseMilestones.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [courseMilestones.studentId],
    references: [users.id],
  }),
}));

export const insertCourseMilestoneSchema = createInsertSchema(courseMilestones).omit({
  id: true,
  achievedAt: true,
});

export type CourseMilestone = typeof courseMilestones.$inferSelect;
export type InsertCourseMilestone = z.infer<typeof insertCourseMilestoneSchema>;

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
  hostUniversity: varchar("host_university"),
  campus: varchar("campus"),
  city: varchar("city"),
  country: varchar("country"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
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
// AI INTERACTION EVENTS (for ethics oversight)
// ============================================================================

export const aiInteractionEvents = pgTable("ai_interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // careerbot, content_moderation, post_suggestion
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb("metadata"), // JSONB for efficient filtering
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_events_type_created_idx").on(table.type, table.createdAt),
  index("ai_events_user_idx").on(table.userId),
]);

export const insertAIInteractionEventSchema = createInsertSchema(aiInteractionEvents).omit({
  id: true,
  createdAt: true,
});

export type AIInteractionEvent = typeof aiInteractionEvents.$inferSelect;
export type InsertAIInteractionEvent = z.infer<typeof insertAIInteractionEventSchema>;

// ============================================================================
// MODERATION ACTIONS (for content moderation tracking)
// ============================================================================

export const moderationActions = pgTable("moderation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id"), // ID of post/comment being moderated (flexible varchar for polymorphic reference)
  contentType: varchar("content_type", { length: 20 }), // post, comment
  moderatorType: varchar("moderator_type", { length: 20 }), // ai, human
  outcome: varchar("outcome", { length: 20 }), // approved, flagged, removed
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("moderation_type_created_idx").on(table.moderatorType, table.createdAt),
]);

export const insertModerationActionSchema = createInsertSchema(moderationActions).omit({
  id: true,
  createdAt: true,
});

export type ModerationAction = typeof moderationActions.$inferSelect;
export type InsertModerationAction = z.infer<typeof insertModerationActionSchema>;

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

// ============================================================================
// CERTIFICATIONS (NFT-Style Digital Certificates)
// ============================================================================

export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // course_completion, project, skill_endorsement, achievement, custom
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  issuerName: varchar("issuer_name", { length: 200 }).notNull(), // UniNexus, University name, or teacher name
  issuerId: varchar("issuer_id").references(() => users.id, { onDelete: 'set null' }),
  verificationHash: varchar("verification_hash", { length: 64 }).notNull().unique(), // SHA-256 hash for verification
  metadata: jsonb("metadata"), // Additional data like course code, project link, skills, etc.
  imageUrl: varchar("image_url"), // Certificate design/badge image
  isPublic: boolean("is_public").notNull().default(true), // Whether it can be publicly verified
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
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
  verificationHash: true, // Generated server-side
  issuedAt: true,
  issuerId: true, // Always set server-side from authenticated user
  issuerName: true, // Always set server-side from authenticated user's name
});

export type Certification = typeof certifications.$inferSelect;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;

// ============================================================================
// RECRUITER FEEDBACK (Industry Professional Feedback on Students)
// ============================================================================

export const recruiterFeedback = pgTable("recruiter_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(), // 1-5 scale
  category: varchar("category", { length: 50 }).notNull(), // technical_skills, soft_skills, leadership, communication, teamwork
  feedback: text("feedback").notNull(),
  context: varchar("context"), // challenge, interview, project_review, general
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: 'set null' }),
  isPublic: boolean("is_public").notNull().default(false), // Whether student can see this feedback
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

// ============================================================================
// SOCIAL NETWORK: USER CONNECTIONS
// ============================================================================

export const userConnections = pgTable("user_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, accepted, rejected
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

// ============================================================================
// SOCIAL NETWORK: FOLLOWERS
// ============================================================================

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

// ============================================================================
// SOCIAL NETWORK: POST SHARES
// ============================================================================

export const postShares = pgTable("post_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  comment: text("comment"), // Optional comment when sharing
  createdAt: timestamp("created_at").defaultNow(),
});

export const postSharesRelations = relations(postShares, ({ one }) => ({
  post: one(posts, {
    fields: [postShares.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postShares.userId],
    references: [users.id],
  }),
}));

export const insertPostShareSchema = createInsertSchema(postShares).omit({
  id: true,
  createdAt: true,
});

export type PostShare = typeof postShares.$inferSelect;
export type InsertPostShare = z.infer<typeof insertPostShareSchema>;

// ============================================================================
// SOCIAL NETWORK: CONVERSATIONS
// ============================================================================

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantIds: text("participant_ids").array().notNull(), // Array of user IDs in the conversation
  isGroup: boolean("is_group").notNull().default(false),
  groupName: varchar("group_name"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ============================================================================
// SOCIAL NETWORK: MESSAGES
// ============================================================================

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  isRead: boolean("is_read").notNull().default(false),
  readBy: text("read_by").array().default(sql`ARRAY[]::text[]`), // Array of user IDs who have read the message
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  readBy: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ============================================================================
// SOCIAL NETWORK: POST BOOSTS
// ============================================================================

export const postBoosts = pgTable("post_boosts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_boost_user_post").on(table.userId, table.postId),
]);

export const postBoostsRelations = relations(postBoosts, ({ one }) => ({
  post: one(posts, {
    fields: [postBoosts.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postBoosts.userId],
    references: [users.id],
  }),
}));

export const insertPostBoostSchema = createInsertSchema(postBoosts).omit({
  id: true,
  createdAt: true,
});

export type PostBoost = typeof postBoosts.$inferSelect;
export type InsertPostBoost = z.infer<typeof insertPostBoostSchema>;

// ============================================================================
// SOCIAL NETWORK: GROUPS/COMMUNITIES
// ============================================================================

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  groupType: varchar("group_type", { length: 50 }).notNull(), // subject, skill, university, hobby, study_group
  category: varchar("category"), // Tech, Business, Arts, Science, etc.
  university: varchar("university"), // Associated university if applicable
  coverImageUrl: varchar("cover_image_url"),
  isPrivate: boolean("is_private").notNull().default(false),
  memberCount: integer("member_count").notNull().default(0),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.creatorId],
    references: [users.id],
  }),
  members: many(groupMembers),
  posts: many(groupPosts),
}));

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  memberCount: true,
  createdAt: true,
  updatedAt: true,
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

// ============================================================================
// SOCIAL NETWORK: GROUP MEMBERS
// ============================================================================

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull().default('member'), // admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_group_user").on(table.groupId, table.userId),
]);

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

// ============================================================================
// SOCIAL NETWORK: GROUP POSTS
// ============================================================================

export const groupPosts = pgTable("group_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  mediaType: varchar("media_type", { length: 20 }).default('text'),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupPostsRelations = relations(groupPosts, ({ one }) => ({
  group: one(groups, {
    fields: [groupPosts.groupId],
    references: [groups.id],
  }),
  author: one(users, {
    fields: [groupPosts.authorId],
    references: [users.id],
  }),
}));

export const insertGroupPostSchema = createInsertSchema(groupPosts).omit({
  id: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export type GroupPost = typeof groupPosts.$inferSelect;
export type InsertGroupPost = z.infer<typeof insertGroupPostSchema>;

// ============================================================================
// TEACHER CONTENT MANAGEMENT
// ============================================================================

export const teacherContent = pgTable("teacher_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: 'set null' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  contentType: varchar("content_type", { length: 50 }).notNull(), // pdf, doc, text, link, video
  fileUrl: varchar("file_url"), // URL to uploaded file
  textContent: text("text_content"), // For text-based content
  metadata: jsonb("metadata"), // File size, page count, etc.
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  isPublic: boolean("is_public").notNull().default(true), // Visible to all students or just enrolled
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teacherContentRelations = relations(teacherContent, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherContent.teacherId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [teacherContent.courseId],
    references: [courses.id],
  }),
}));

export const insertTeacherContentSchema = createInsertSchema(teacherContent).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export type TeacherContent = typeof teacherContent.$inferSelect;
export type InsertTeacherContent = z.infer<typeof insertTeacherContentSchema>;

// ============================================================================
// USER PROFILE EXTENSIONS
// ============================================================================

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Student-specific fields
  programme: varchar("programme"), // Degree program
  modules: text("modules").array().default(sql`ARRAY[]::text[]`), // Enrolled modules/courses
  yearOfStudy: integer("year_of_study"),
  academicGoals: text("academic_goals"),
  careerGoals: text("career_goals"),
  
  // Teacher-specific fields
  teachingSubjects: text("teaching_subjects").array().default(sql`ARRAY[]::text[]`),
  specializations: text("specializations").array().default(sql`ARRAY[]::text[]`),
  professionalBio: text("professional_bio"),
  department: varchar("department"),
  officeHours: varchar("office_hours"),
  
  // University-specific fields
  universityMission: text("university_mission"),
  focusAreas: text("focus_areas").array().default(sql`ARRAY[]::text[]`),
  opportunitiesOffered: text("opportunities_offered"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  website: varchar("website"),
  
  // Industry-specific fields
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

// ============================================================================
// EDUCATION RECORDS
// ============================================================================

export const educationRecords = pgTable("education_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  institution: varchar("institution", { length: 200 }).notNull(), // University/School name
  degree: varchar("degree", { length: 100 }), // Bachelor's, Master's, PhD, etc.
  fieldOfStudy: varchar("field_of_study", { length: 100 }), // Major/specialization
  startDate: varchar("start_date"), // Format: "YYYY-MM" or "YYYY"
  endDate: varchar("end_date"), // Format: "YYYY-MM" or "YYYY" or "Present"
  grade: varchar("grade"), // GPA, Honours, etc.
  description: text("description"), // Additional details, achievements
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

// ============================================================================
// JOB EXPERIENCE (For Teachers and Industry Professionals)
// ============================================================================

export const jobExperience = pgTable("job_experience", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: varchar("position", { length: 200 }).notNull(),
  organization: varchar("organization", { length: 200 }).notNull(),
  startDate: varchar("start_date").notNull(), // Format: "YYYY-MM" or "YYYY"
  endDate: varchar("end_date"), // Format: "YYYY-MM" or "YYYY" or "Present"
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

// ============================================================================
// STUDENT COURSES (Courses added to student profile with teacher validation)
// ============================================================================

export const studentCourses = pgTable("student_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseName: varchar("course_name", { length: 200 }).notNull(),
  courseCode: varchar("course_code", { length: 50 }),
  institution: varchar("institution", { length: 200 }),
  instructor: varchar("instructor", { length: 200 }), // Name of the instructor
  semester: varchar("semester", { length: 50 }), // e.g., "Fall 2024"
  year: integer("year"), // Year completed
  grade: varchar("grade", { length: 20 }), // A, B, C or percentage
  credits: integer("credits"),
  description: text("description"),
  
  // Validation by teacher
  isValidated: boolean("is_validated").notNull().default(false),
  validatedBy: varchar("validated_by").references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp("validated_at"),
  validationNote: text("validation_note"),
  
  // Link to assigned teacher for validation eligibility
  assignedTeacherId: varchar("assigned_teacher_id").references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentCoursesRelations = relations(studentCourses, ({ one }) => ({
  user: one(users, {
    fields: [studentCourses.userId],
    references: [users.id],
  }),
  validator: one(users, {
    fields: [studentCourses.validatedBy],
    references: [users.id],
    relationName: "validator",
  }),
  assignedTeacher: one(users, {
    fields: [studentCourses.assignedTeacherId],
    references: [users.id],
  }),
}));

export const insertStudentCourseSchema = createInsertSchema(studentCourses).omit({
  id: true,
  isValidated: true,
  validatedBy: true,
  validatedAt: true,
  validationNote: true,
  createdAt: true,
  updatedAt: true,
});

export type StudentCourse = typeof studentCourses.$inferSelect;
export type InsertStudentCourse = z.infer<typeof insertStudentCourseSchema>;

// ============================================================================
// AI CHATBOT - HYPER-LOCALIZED LEARNING ASSISTANT
// ============================================================================

// Chunks of teacher content for RAG (Retrieval Augmented Generation)
export const teacherContentChunks = pgTable("teacher_content_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => teacherContent.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: jsonb("embedding"), // Vector embedding for similarity search
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teacherContentChunksRelations = relations(teacherContentChunks, ({ one }) => ({
  content: one(teacherContent, {
    fields: [teacherContentChunks.contentId],
    references: [teacherContent.id],
  }),
  course: one(courses, {
    fields: [teacherContentChunks.courseId],
    references: [courses.id],
  }),
  teacher: one(users, {
    fields: [teacherContentChunks.teacherId],
    references: [users.id],
  }),
}));

export type TeacherContentChunk = typeof teacherContentChunks.$inferSelect;

// AI Chat Sessions - one per student per course
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [aiChatSessions.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [aiChatSessions.courseId],
    references: [courses.id],
  }),
  messages: many(aiChatMessages),
}));

export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
});

export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAiChatSession = z.infer<typeof insertAiChatSessionSchema>;

// AI Chat Messages
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  usedChunkIds: text("used_chunk_ids").array().default(sql`ARRAY[]::text[]`), // References to chunks used in response
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, {
    fields: [aiChatMessages.sessionId],
    references: [aiChatSessions.id],
  }),
}));

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
