import {
  eq,
  or,
  and,
  sql,
  desc,
  isNull,
  notExists,
} from "drizzle-orm";
import {
  users,
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { studentCourses } from "@shared/schema/courses";

// Interface for storage operations
export interface IStorage {
  // User operations (Firebase Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserFromFirebase(firebaseUid: string, userData: Partial<UpsertUser>): Promise<User>;
  
  // Course Forum operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getDiscussions(courseId: string): Promise<CourseDiscussion[]>;
  getDiscussion(id: string): Promise<CourseDiscussion | undefined>;
  createDiscussion(discussion: InsertCourseDiscussion): Promise<CourseDiscussion>;
  getReplies(discussionId: string): Promise<DiscussionReply[]>;
  createReply(reply: InsertDiscussionReply): Promise<DiscussionReply>;
  toggleDiscussionUpvote(userId: string, discussionId: string): Promise<boolean>;
  toggleReplyUpvote(userId: string, replyId: string): Promise<boolean>;

  // Personal Tutor
  getPersonalTutorMaterials(studentId: string): Promise<StudentPersonalTutorMaterial[]>;
  createPersonalTutorMaterial(material: InsertStudentPersonalTutorMaterial): Promise<StudentPersonalTutorMaterial>;
  getPersonalTutorSessions(studentId: string): Promise<StudentPersonalTutorSession[]>;
  createPersonalTutorSession(session: InsertStudentPersonalTutorSession): Promise<StudentPersonalTutorSession>;
  getPersonalTutorMessages(sessionId: string): Promise<StudentPersonalTutorMessage[]>;
  createPersonalTutorMessage(message: InsertStudentPersonalTutorMessage): Promise<StudentPersonalTutorMessage>;
  
  // Course Enrollments
  createEnrollment(courseId: string, studentId: string): Promise<void>;

  // User Deletion
  deleteUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // Handle numeric IDs if passed as strings
    const numericId = parseInt(id);
    if (!isNaN(numericId) && numericId.toString() === id) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }
    // Otherwise treat as Firebase UID
    return this.getUserByFirebaseUid(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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
          institution: userData.institution || userData.university || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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

  async createPersonalTutorMaterial(material: InsertStudentPersonalTutorMaterial): Promise<StudentPersonalTutorMaterial> {
    const [newMaterial] = await db
      .insert(studentPersonalTutorMaterials)
      .values(material)
      .returning();
    return newMaterial;
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
      await tx.delete(studentPersonalTutorMessages).where(eq(studentPersonalTutorMessages.sessionId, userId));
      await tx.delete(studentPersonalTutorSessions).where(eq(studentPersonalTutorSessions.studentId, userId));
      await tx.delete(studentPersonalTutorMaterials).where(eq(studentPersonalTutorMaterials.studentId, userId));
      await tx.delete(aiChatMessages).where(eq(aiChatMessages.sessionId, userId));
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
}

export const storage = new DatabaseStorage();
