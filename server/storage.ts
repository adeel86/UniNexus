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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
