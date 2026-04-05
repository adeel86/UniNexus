import {
  eq,
  or,
  and,
  sql,
  desc,
} from "drizzle-orm";
import {
  users,
  type User,
  type UpsertUser,
  universities,
  type University,
  type InsertUniversity,
  majors,
  type Major,
  type InsertMajor,
  courses,
  type Course,
  courseDiscussions,
  type CourseDiscussion,
  type InsertCourseDiscussion,
  discussionReplies,
  type DiscussionReply,
  type InsertDiscussionReply,
  discussionUpvotes,
  type DiscussionUpvote,
  type InsertDiscussionUpvote,
  studentPersonalTutorMaterials,
  type StudentPersonalTutorMaterial,
  type InsertStudentPersonalTutorMaterial,
  studentPersonalTutorSessions,
  type StudentPersonalTutorSession,
  type InsertStudentPersonalTutorSession,
  studentPersonalTutorMessages,
  type StudentPersonalTutorMessage,
  type InsertStudentPersonalTutorMessage,
  courseEnrollments,
  userProfiles,
  educationRecords,
  jobExperience,
  userConnections,
  followers,
  posts,
  comments,
  reactions,
  postShares,
  postBoosts,
  userStats,
  userBadges,
  userSkills,
  endorsements,
  challengeParticipants,
  groupMembers,
  groupPosts,
  messages,
  notifications,
  certifications,
  recruiterFeedback,
  teacherContent,
  aiChatSessions,
  aiChatMessages,
  aiChatSessionUploads,
  type AiChatSessionUpload,
} from "@shared/schema";
import { db } from "./db";
import { studentCourses } from "@shared/schema/courses";

const userWithNamesSelect = {
  id: users.id,
  firebaseUid: users.firebaseUid,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  displayName: users.displayName,
  profileImageUrl: users.profileImageUrl,
  role: users.role,
  bio: users.bio,
  universityId: users.universityId,
  majorId: users.majorId,
  graduationYear: users.graduationYear,
  interests: users.interests,
  emailVerified: users.emailVerified,
  verificationSentAt: users.verificationSentAt,
  isVerified: users.isVerified,
  verifiedAt: users.verifiedAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  university: universities.name,
  major: majors.name,
};

// Interface for storage operations
export interface IStorage {
  // User operations (Firebase Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserFromFirebase(firebaseUid: string, userData: Partial<UpsertUser>): Promise<User>;
  updateEmailVerified(userId: string, emailVerified: boolean): Promise<void>;
  updateVerificationSentAt(userId: string, sentAt: Date): Promise<void>;
  getUnverifiedExpiredUsers(gracePeriodDays: number): Promise<User[]>;
  getUnverifiedWarningUsers(gracePeriodDays: number, warningDaysBefore: number): Promise<User[]>;

  // Course Forum operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getDiscussions(courseId: string): Promise<CourseDiscussion[]>;
  getDiscussion(id: string): Promise<CourseDiscussion | undefined>;
  createDiscussion(discussion: InsertCourseDiscussion): Promise<CourseDiscussion>;
  updateDiscussion(id: string, updates: Partial<InsertCourseDiscussion>): Promise<CourseDiscussion | null>;
  deleteDiscussion(id: string): Promise<boolean>;
  getReplies(discussionId: string): Promise<DiscussionReply[]>;
  createReply(reply: InsertDiscussionReply): Promise<DiscussionReply>;
  updateReply(id: string, content: string): Promise<DiscussionReply | null>;
  deleteReply(id: string): Promise<boolean>;
  toggleDiscussionUpvote(userId: string, discussionId: string): Promise<boolean>;
  toggleReplyUpvote(userId: string, replyId: string): Promise<boolean>;

  // Personal Tutor
  getPersonalTutorMaterials(studentId: string): Promise<StudentPersonalTutorMaterial[]>;
  getPersonalTutorMaterialsBySession(sessionId: string): Promise<StudentPersonalTutorMaterial[]>;
  getPersonalTutorMaterial(id: string): Promise<StudentPersonalTutorMaterial | undefined>;
  createPersonalTutorMaterial(material: InsertStudentPersonalTutorMaterial): Promise<StudentPersonalTutorMaterial>;
  deletePersonalTutorMaterial(id: string): Promise<void>;
  getPersonalTutorSessions(studentId: string): Promise<StudentPersonalTutorSession[]>;
  createPersonalTutorSession(session: InsertStudentPersonalTutorSession): Promise<StudentPersonalTutorSession>;
  updatePersonalTutorSession(id: string, title: string): Promise<StudentPersonalTutorSession>;
  deletePersonalTutorSession(id: string): Promise<void>;
  // Course Chat Session Uploads
  getAiChatSessionUploads(sessionId: string): Promise<AiChatSessionUpload[]>;
  createAiChatSessionUpload(upload: Omit<AiChatSessionUpload, 'id' | 'createdAt'>): Promise<AiChatSessionUpload>;
  deleteAiChatSession(sessionId: string): Promise<void>;
  getPersonalTutorMessages(sessionId: string): Promise<StudentPersonalTutorMessage[]>;
  createPersonalTutorMessage(message: InsertStudentPersonalTutorMessage): Promise<StudentPersonalTutorMessage>;
  
  // Course Enrollments
  createEnrollment(courseId: string, studentId: string): Promise<void>;

  // User Deletion
  deleteUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select(userWithNamesSelect)
      .from(users)
      .leftJoin(universities, eq(users.universityId, universities.id))
      .leftJoin(majors, eq(users.majorId, majors.id))
      .where(eq(users.id, id))
      .limit(1);
    if (user) return user as User;
    return this.getUserByFirebaseUid(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db
      .select(userWithNamesSelect)
      .from(users)
      .leftJoin(universities, eq(users.universityId, universities.id))
      .leftJoin(majors, eq(users.majorId, majors.id))
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);
    return user as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select(userWithNamesSelect)
      .from(users)
      .leftJoin(universities, eq(users.universityId, universities.id))
      .leftJoin(majors, eq(users.majorId, majors.id))
      .where(eq(users.email, email))
      .limit(1);
    return user as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    await db.insert(userStats).values({ userId: user.id }).onConflictDoNothing();
    return user;
  }

  async createUserFromFirebase(firebaseUid: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        firebaseUid,
        ...userData,
      })
      .onConflictDoUpdate({
        target: users.firebaseUid,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    await db.insert(userStats).values({ userId: user.id }).onConflictDoNothing();
    return user;
  }

  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerified,
        ...(emailVerified ? { verifiedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateVerificationSentAt(userId: string, sentAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ verificationSentAt: sentAt, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUnverifiedExpiredUsers(gracePeriodDays: number): Promise<User[]> {
    const cutoff = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);
    // Use the most recent of verificationSentAt and createdAt so that resending
    // the verification email resets the grace period clock.
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerified, false),
          sql`COALESCE(${users.verificationSentAt}, ${users.createdAt}) < ${cutoff}`
        )
      );
  }

  async getUnverifiedWarningUsers(gracePeriodDays: number, warningDaysBefore: number): Promise<User[]> {
    const deletionCutoff = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);
    const warningCutoff = new Date(Date.now() - (gracePeriodDays - warningDaysBefore) * 24 * 60 * 60 * 1000);
    // Same COALESCE approach so resending resets the warning window too.
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerified, false),
          sql`COALESCE(${users.verificationSentAt}, ${users.createdAt}) < ${warningCutoff}`,
          sql`COALESCE(${users.verificationSentAt}, ${users.createdAt}) >= ${deletionCutoff}`
        )
      );
  }

  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getDiscussions(courseId: string): Promise<CourseDiscussion[]> {
    return await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.courseId, courseId))
      .orderBy(desc(courseDiscussions.createdAt));
  }

  async getDiscussion(id: string): Promise<CourseDiscussion | undefined> {
    const [discussion] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, id));
    return discussion;
  }

  async createDiscussion(discussion: InsertCourseDiscussion): Promise<CourseDiscussion> {
    const [newDiscussion] = await db
      .insert(courseDiscussions)
      .values(discussion)
      .returning();
    return newDiscussion;
  }

  async updateDiscussion(id: string, updates: Partial<InsertCourseDiscussion>): Promise<CourseDiscussion | null> {
    const [updated] = await db
      .update(courseDiscussions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(courseDiscussions.id, id))
      .returning();
    return updated || null;
  }

  async deleteDiscussion(id: string): Promise<boolean> {
    const result = await db
      .delete(courseDiscussions)
      .where(eq(courseDiscussions.id, id));
    return (result.rowCount && result.rowCount > 0) || false;
  }

  async getReplies(discussionId: string): Promise<DiscussionReply[]> {
    return await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.discussionId, discussionId))
      .orderBy(desc(discussionReplies.upvoteCount), desc(discussionReplies.createdAt));
  }

  async createReply(reply: InsertDiscussionReply): Promise<DiscussionReply> {
    const [newReply] = await db
      .insert(discussionReplies)
      .values(reply)
      .returning();
    
    // Increment reply count
    await db
      .update(courseDiscussions)
      .set({ replyCount: sql`${courseDiscussions.replyCount} + 1` })
      .where(eq(courseDiscussions.id, reply.discussionId));
    
    return newReply;
  }

  async updateReply(id: string, content: string): Promise<DiscussionReply | null> {
    const [updated] = await db
      .update(discussionReplies)
      .set({ content })
      .where(eq(discussionReplies.id, id))
      .returning();
    return updated || null;
  }

  async deleteReply(id: string): Promise<boolean> {
    // Get the reply first to get discussionId
    const [reply] = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.id, id));
    
    if (!reply) return false;

    // Delete the reply
    const result = await db
      .delete(discussionReplies)
      .where(eq(discussionReplies.id, id));

    // Decrement reply count in discussion
    if (result.rowCount && result.rowCount > 0) {
      await db
        .update(courseDiscussions)
        .set({ replyCount: sql`GREATEST(${courseDiscussions.replyCount} - 1, 0)` })
        .where(eq(courseDiscussions.id, reply.discussionId));
    }

    return (result.rowCount && result.rowCount > 0) || false;
  }

  async toggleDiscussionUpvote(userId: string, discussionId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existingUpvote] = await tx
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.userId, userId),
            eq(discussionUpvotes.discussionId, discussionId)
          )
        );

      if (existingUpvote) {
        const deleted = await tx
          .delete(discussionUpvotes)
          .where(eq(discussionUpvotes.id, existingUpvote.id));
        
        // Only decrement if delete actually happened
        if (deleted.rowCount && deleted.rowCount > 0) {
          await tx
            .update(courseDiscussions)
            .set({ upvoteCount: sql`GREATEST(${courseDiscussions.upvoteCount} - 1, 0)` })
            .where(eq(courseDiscussions.id, discussionId));
        }
        
        return false;
      } else {
        try {
          await tx.insert(discussionUpvotes).values({
            userId,
            discussionId,
            replyId: null,
          });
          
          await tx
            .update(courseDiscussions)
            .set({ upvoteCount: sql`${courseDiscussions.upvoteCount} + 1` })
            .where(eq(courseDiscussions.id, discussionId));
          
          return true;
        } catch (error: any) {
          // Handle unique constraint violation - treat as already upvoted
          if (error.code === '23505') {
            return true;
          }
          throw error;
        }
      }
    });
  }

  async toggleReplyUpvote(userId: string, replyId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existingUpvote] = await tx
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.userId, userId),
            eq(discussionUpvotes.replyId, replyId)
          )
        );

      if (existingUpvote) {
        const deleted = await tx
          .delete(discussionUpvotes)
          .where(eq(discussionUpvotes.id, existingUpvote.id));
        
        // Only decrement if delete actually happened
        if (deleted.rowCount && deleted.rowCount > 0) {
          await tx
            .update(discussionReplies)
            .set({ upvoteCount: sql`GREATEST(${discussionReplies.upvoteCount} - 1, 0)` })
            .where(eq(discussionReplies.id, replyId));
        }
        
        return false;
      } else {
        try {
          await tx.insert(discussionUpvotes).values({
            userId,
            discussionId: null,
            replyId,
          });
          
          await tx
            .update(discussionReplies)
            .set({ upvoteCount: sql`${discussionReplies.upvoteCount} + 1` })
            .where(eq(discussionReplies.id, replyId));
          
          return true;
        } catch (error: any) {
          // Handle unique constraint violation - treat as already upvoted
          if (error.code === '23505') {
            return true;
          }
          throw error;
        }
      }
    });
  }

  async getPersonalTutorMaterials(studentId: string): Promise<StudentPersonalTutorMaterial[]> {
    return await db
      .select()
      .from(studentPersonalTutorMaterials)
      .where(eq(studentPersonalTutorMaterials.studentId, studentId))
      .orderBy(desc(studentPersonalTutorMaterials.createdAt));
  }

  async getPersonalTutorMaterialsBySession(sessionId: string): Promise<StudentPersonalTutorMaterial[]> {
    return await db
      .select()
      .from(studentPersonalTutorMaterials)
      .where(eq(studentPersonalTutorMaterials.sessionId, sessionId))
      .orderBy(studentPersonalTutorMaterials.createdAt);
  }

  async createPersonalTutorMaterial(material: InsertStudentPersonalTutorMaterial): Promise<StudentPersonalTutorMaterial> {
    const [newMaterial] = await db
      .insert(studentPersonalTutorMaterials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async getPersonalTutorMaterial(id: string): Promise<StudentPersonalTutorMaterial | undefined> {
    const [material] = await db
      .select()
      .from(studentPersonalTutorMaterials)
      .where(eq(studentPersonalTutorMaterials.id, id));
    return material;
  }

  async deletePersonalTutorMaterial(id: string): Promise<void> {
    await db
      .delete(studentPersonalTutorMaterials)
      .where(eq(studentPersonalTutorMaterials.id, id));
  }

  async getPersonalTutorSessions(studentId: string): Promise<StudentPersonalTutorSession[]> {
    return await db
      .select()
      .from(studentPersonalTutorSessions)
      .where(eq(studentPersonalTutorSessions.studentId, studentId))
      .orderBy(desc(studentPersonalTutorSessions.lastMessageAt));
  }

  async createPersonalTutorSession(session: InsertStudentPersonalTutorSession): Promise<StudentPersonalTutorSession> {
    const [newSession] = await db
      .insert(studentPersonalTutorSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updatePersonalTutorSession(id: string, title: string): Promise<StudentPersonalTutorSession> {
    const [updated] = await db
      .update(studentPersonalTutorSessions)
      .set({ title })
      .where(eq(studentPersonalTutorSessions.id, id))
      .returning();
    return updated;
  }

  async deletePersonalTutorSession(id: string): Promise<void> {
    // Messages and materials cascade-delete via FK; just delete the session
    await db
      .delete(studentPersonalTutorSessions)
      .where(eq(studentPersonalTutorSessions.id, id));
  }

  async getAiChatSessionUploads(sessionId: string): Promise<AiChatSessionUpload[]> {
    return await db
      .select()
      .from(aiChatSessionUploads)
      .where(eq(aiChatSessionUploads.sessionId, sessionId))
      .orderBy(aiChatSessionUploads.createdAt);
  }

  async createAiChatSessionUpload(upload: Omit<AiChatSessionUpload, 'id' | 'createdAt'>): Promise<AiChatSessionUpload> {
    const [newUpload] = await db
      .insert(aiChatSessionUploads)
      .values(upload)
      .returning();
    return newUpload;
  }

  async deleteAiChatSession(sessionId: string): Promise<void> {
    // Messages and uploads cascade-delete via FK; just delete the session
    await db
      .delete(aiChatSessions)
      .where(eq(aiChatSessions.id, sessionId));
  }

  async getPersonalTutorMessages(sessionId: string): Promise<StudentPersonalTutorMessage[]> {
    return await db
      .select()
      .from(studentPersonalTutorMessages)
      .where(eq(studentPersonalTutorMessages.sessionId, sessionId))
      .orderBy(studentPersonalTutorMessages.createdAt);
  }

  async createPersonalTutorMessage(message: InsertStudentPersonalTutorMessage): Promise<StudentPersonalTutorMessage> {
    const [newMessage] = await db
      .insert(studentPersonalTutorMessages)
      .values(message)
      .returning();
    
    // Update last message timestamp in session
    await db
      .update(studentPersonalTutorSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(studentPersonalTutorSessions.id, message.sessionId));
      
    return newMessage;
  }

  async createEnrollment(courseId: string, studentId: string): Promise<void> {
    await db.insert(courseEnrollments).values({
      courseId,
      studentId,
      enrolledAt: new Date(),
    }).onConflictDoNothing();

    await db.update(courses)
      .set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` })
      .where(eq(courses.id, courseId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Clean up associated engagement data
      await tx.delete(notifications).where(eq(notifications.userId, userId));
      await tx.delete(reactions).where(eq(reactions.userId, userId));
      await tx.delete(postShares).where(eq(postShares.userId, userId));
      await tx.delete(postBoosts).where(eq(postBoosts.userId, userId));
      
      // 2. Clean up connections and followers
      await tx.delete(userConnections).where(
        or(
          eq(userConnections.requesterId, userId),
          eq(userConnections.receiverId, userId)
        )!
      );
      await tx.delete(followers).where(
        or(
          eq(followers.followerId, userId),
          eq(followers.followingId, userId)
        )!
      );

      // 3. Clean up gamification
      await tx.delete(userBadges).where(eq(userBadges.userId, userId));
      await tx.delete(userSkills).where(eq(userSkills.userId, userId));
      await tx.delete(endorsements).where(
        or(
          eq(endorsements.endorserId, userId),
          eq(endorsements.endorsedUserId, userId)
        )!
      );
      await tx.delete(challengeParticipants).where(eq(challengeParticipants.userId, userId));

      // 4. Clean up course-related data
      // Decrement enrollment counts before deleting enrollments
      const userEnrollments = await tx.select().from(courseEnrollments).where(eq(courseEnrollments.studentId, userId));
      for (const enrollment of userEnrollments) {
        await tx.update(courses)
          .set({ enrollmentCount: sql`GREATEST(${courses.enrollmentCount} - 1, 0)` })
          .where(eq(courses.id, enrollment.courseId));
      }
      await tx.delete(courseEnrollments).where(eq(courseEnrollments.studentId, userId));
      await tx.delete(studentCourses).where(
        or(
          eq(studentCourses.userId, userId),
          eq(studentCourses.validatedBy, userId),
          eq(studentCourses.assignedTeacherId, userId)
        )!
      );
      
      // Handle course forum data
      await tx.delete(discussionUpvotes).where(eq(discussionUpvotes.userId, userId));
      await tx.delete(discussionReplies).where(eq(discussionReplies.authorId, userId));
      await tx.delete(courseDiscussions).where(eq(courseDiscussions.authorId, userId));

      // 5. Clean up AI and Tutor data
      // Messages are linked to sessions via a cascade FK, so deleting the sessions
      // is sufficient. Explicitly deleting sessions here first (before the user row
      // is removed) ensures the ordering is correct inside the transaction.
      await tx.delete(studentPersonalTutorMaterials).where(eq(studentPersonalTutorMaterials.studentId, userId));
      await tx.delete(studentPersonalTutorSessions).where(eq(studentPersonalTutorSessions.studentId, userId));
      // aiChatMessages cascade from aiChatSessions; aiChatSessions cascade from users.
      await tx.delete(aiChatSessions).where(eq(aiChatSessions.userId, userId));

      // 6. Clean up profile and records
      await tx.delete(educationRecords).where(eq(educationRecords.userId, userId));
      await tx.delete(jobExperience).where(eq(jobExperience.userId, userId));
      await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));
      await tx.delete(certifications).where(eq(certifications.userId, userId));
      await tx.delete(recruiterFeedback).where(
        or(
          eq(recruiterFeedback.recruiterId, userId),
          eq(recruiterFeedback.studentId, userId)
        )!
      );

      // 7. Clean up group memberships
      await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));

      // 8. Handle messages (anonymize or delete - deleting for full removal as requested)
      await tx.delete(messages).where(eq(messages.senderId, userId));

      // 9. Delete user's own content (posts) - this might have cascading effects if not handled
      await tx.delete(comments).where(eq(comments.authorId, userId));
      await tx.delete(posts).where(eq(posts.authorId, userId));
      
      // 10. Finally delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  // ========================================================================
  // UNIVERSITY AND MAJOR OPERATIONS
  // ========================================================================

  async getOrCreateUniversity(name: string): Promise<University> {
    const trimmed = name.trim();
    
    // Check if university already exists
    const existing = await db
      .select()
      .from(universities)
      .where(eq(universities.name, trimmed))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new university
    const inserted = await db
      .insert(universities)
      .values({
        name: trimmed,
        location: null,
      })
      .returning();

    return inserted[0];
  }

  async getOrCreateMajor(name: string, category?: string): Promise<Major> {
    const trimmed = name.trim();
    
    // Check if major already exists
    const existing = await db
      .select()
      .from(majors)
      .where(eq(majors.name, trimmed))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new major
    const inserted = await db
      .insert(majors)
      .values({
        name: trimmed,
        category: category || null,
        isVerified: false, // Custom entries are not verified initially
      })
      .returning();

    return inserted[0];
  }

  async getUniversities(): Promise<University[]> {
    return await db
      .select()
      .from(universities)
      .orderBy(universities.name);
  }

  async getMajors(): Promise<Major[]> {
    return await db
      .select()
      .from(majors)
      .orderBy(majors.name);
  }
}

export const storage = new DatabaseStorage();
