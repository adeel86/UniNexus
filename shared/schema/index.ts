/**
 * Schema Barrel Export
 * 
 * This file re-exports all schema modules for backward compatibility.
 * Import from here for convenience, or import specific domains for clarity.
 */

// Auth
export { sessions } from "./auth";

// Users
export {
  users,
  userProfiles,
  userProfilesRelations,
  educationRecords,
  educationRecordsRelations,
  jobExperience,
  jobExperienceRelations,
  userConnections,
  userConnectionsRelations,
  followers,
  followersRelations,
  insertUserProfileSchema,
  insertEducationRecordSchema,
  insertJobExperienceSchema,
  insertUserConnectionSchema,
  insertFollowerSchema,
} from "./users";
export type {
  User,
  UpsertUser,
  UserProfile,
  InsertUserProfile,
  EducationRecord,
  InsertEducationRecord,
  JobExperience,
  InsertJobExperience,
  UserConnection,
  InsertUserConnection,
  Follower,
  InsertFollower,
} from "./users";

// Feed
export {
  posts,
  postsRelations,
  comments,
  commentsRelations,
  reactions,
  reactionsRelations,
  postShares,
  postSharesRelations,
  postBoosts,
  postBoostsRelations,
  insertPostSchema,
  insertCommentSchema,
  insertReactionSchema,
  insertPostShareSchema,
  insertPostBoostSchema,
} from "./feed";
export type {
  Post,
  InsertPost,
  Comment,
  InsertComment,
  Reaction,
  InsertReaction,
  PostShare,
  InsertPostShare,
  PostBoost,
  InsertPostBoost,
} from "./feed";

// Gamification
export {
  badges,
  badgesRelations,
  userBadges,
  userBadgesRelations,
  skills,
  skillsRelations,
  userSkills,
  userSkillsRelations,
  endorsements,
  endorsementsRelations,
  challenges,
  challengesRelations,
  challengeParticipants,
  challengeParticipantsRelations,
  insertEndorsementSchema,
  insertChallengeSchema,
} from "./gamification";
export type {
  Badge,
  UserBadge,
  Skill,
  UserSkill,
  Endorsement,
  InsertEndorsement,
  Challenge,
  InsertChallenge,
  ChallengeParticipant,
} from "./gamification";

// Courses
export {
  universities,
  courses,
  courseEnrollments,
  courseEnrollmentsRelations,
  courseDiscussions,
  discussionReplies,
  discussionUpvotes,
  courseMilestones,
  studentCourses,
  insertUniversitySchema,
  insertCourseSchema,
  insertCourseDiscussionSchema,
  insertDiscussionReplySchema,
  insertDiscussionUpvoteSchema,
  insertCourseMilestoneSchema,
  insertStudentCourseSchema,
} from "./courses";
export type {
  University,
  InsertUniversity,
  Course,
  InsertCourse,
  CourseEnrollment,
  CourseDiscussion,
  InsertCourseDiscussion,
  DiscussionReply,
  InsertDiscussionReply,
  DiscussionUpvote,
  InsertDiscussionUpvote,
  CourseMilestone,
  InsertCourseMilestone,
  StudentCourse,
  InsertStudentCourse,
} from "./courses";

// Groups
export {
  groups,
  groupsRelations,
  groupMembers,
  groupMembersRelations,
  groupPosts,
  groupPostsRelations,
  insertGroupSchema,
  insertGroupMemberSchema,
  insertGroupPostSchema,
} from "./groups";
export type {
  Group,
  InsertGroup,
  GroupMember,
  InsertGroupMember,
  GroupPost,
  InsertGroupPost,
} from "./groups";

// Messaging
export {
  conversations,
  messages,
  messagesRelations,
  insertMessageSchema,
} from "./messaging";
export type {
  Conversation,
  InsertConversation,
  Message,
  InsertMessage,
} from "./messaging";

// Notifications
export {
  notifications,
  notificationsRelations,
  announcements,
  announcementsRelations,
  insertAnnouncementSchema,
} from "./notifications";
export type {
  Notification,
  Announcement,
  InsertAnnouncement,
} from "./notifications";

// Certifications
export {
  certifications,
  certificationsRelations,
  recruiterFeedback,
  recruiterFeedbackRelations,
  insertCertificationSchema,
  insertRecruiterFeedbackSchema,
} from "./certifications";
export type {
  Certification,
  InsertCertification,
  RecruiterFeedback,
  InsertRecruiterFeedback,
} from "./certifications";

// AI
export {
  teacherContent,
  teacherContentRelations,
  teacherContentChunks,
  teacherContentChunksRelations,
  aiChatSessions,
  aiChatSessionsRelations,
  aiChatMessages,
  aiChatMessagesRelations,
  aiInteractionEvents,
  moderationActions,
  insertTeacherContentSchema,
  insertAiChatSessionSchema,
  insertAiChatMessageSchema,
  insertAIInteractionEventSchema,
  insertModerationActionSchema,
  studentPersonalTutorMaterials,
  studentPersonalTutorSessions,
  studentPersonalTutorMessages,
  studentPersonalTutorMaterialsRelations,
  studentPersonalTutorSessionsRelations,
  studentPersonalTutorMessagesRelations,
  insertStudentPersonalTutorMaterialSchema,
  insertStudentPersonalTutorSessionSchema,
  insertStudentPersonalTutorMessageSchema,
} from "./ai";
export type {
  TeacherContent,
  InsertTeacherContent,
  TeacherContentChunk,
  AiChatSession,
  InsertAiChatSession,
  AiChatMessage,
  InsertAiChatMessage,
  AIInteractionEvent,
  InsertAIInteractionEvent,
  ModerationAction,
  StudentPersonalTutorMaterial,
  InsertStudentPersonalTutorMaterial,
  StudentPersonalTutorSession,
  InsertStudentPersonalTutorSession,
  StudentPersonalTutorMessage,
  InsertStudentPersonalTutorMessage,
} from "./ai";

// Re-export relations for users (needs to be defined here to avoid circular deps)
import { relations } from 'drizzle-orm';
import { users } from "./users";
import { posts, comments, reactions, postShares, postBoosts } from "./feed";
import { userBadges, userSkills, endorsements, challengeParticipants } from "./gamification";
import { courseEnrollments, studentCourses } from "./courses";
import { notifications } from "./notifications";
import { certifications } from "./certifications";
import { followers } from "./users";
import { groupMembers } from "./groups";
import { educationRecords, jobExperience } from "./users";
import { messages } from "./messaging";

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

// Course relations
import { courses, courseDiscussions, discussionReplies, discussionUpvotes, courseMilestones } from "./courses";
import { teacherContent } from "./ai";

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  universityValidator: one(users, {
    fields: [courses.validatedByUniversityAdminId],
    references: [users.id],
    relationName: "universityValidator",
  }),
  enrollments: many(courseEnrollments),
  discussions: many(courseDiscussions),
  materials: many(teacherContent),
  studentCourseRequests: many(studentCourses),
}));

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

export const studentCoursesRelations = relations(studentCourses, ({ one }) => ({
  user: one(users, {
    fields: [studentCourses.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [studentCourses.courseId],
    references: [courses.id],
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
