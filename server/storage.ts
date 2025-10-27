import { db } from "./db";
import { 
  users, posts, comments, likes, channels, channelMembers, 
  questions, answers, events, eventAttendees, follows,
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Question, type InsertQuestion,
  type Answer, type InsertAnswer, type Event, type InsertEvent,
  type Channel, type InsertChannel
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Post methods
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByUserId(userId: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  
  // Comment methods
  getCommentsByPostId(postId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Channel methods
  getChannels(): Promise<Channel[]>;
  getChannelById(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  joinChannel(channelId: number, userId: number): Promise<void>;
  leaveChannel(channelId: number, userId: number): Promise<void>;
  
  // Question methods
  getQuestions(filter?: string): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Answer methods
  getAnswersByQuestionId(questionId: number): Promise<Answer[]>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  
  // Event methods
  getEvents(filter?: string): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  joinEvent(eventId: number, userId: number): Promise<void>;
  leaveEvent(eventId: number, userId: number): Promise<void>;
  
  // Leaderboard
  getLeaderboard(filter?: string, limit?: number): Promise<User[]>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Post methods
  async getPosts(limit = 20, offset = 0): Promise<Post[]> {
    return await db.select().from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPostsByUserId(userId: number): Promise<Post[]> {
    return await db.select().from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async likePost(postId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.insert(likes).values({ postId, userId });
      await tx.update(posts)
        .set({ likes: sql`${posts.likes} + 1` })
        .where(eq(posts.id, postId));
    });
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.delete(likes).where(
        sql`${likes.postId} = ${postId} AND ${likes.userId} = ${userId}`
      );
      await tx.update(posts)
        .set({ likes: sql`${posts.likes} - 1` })
        .where(eq(posts.id, postId));
    });
  }

  // Comment methods
  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return await db.select().from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.transaction(async (tx: any) => {
      const [newComment] = await tx.insert(comments).values(insertComment).returning();
      await tx.update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, insertComment.postId));
      return [newComment];
    });
    return comment;
  }

  // Channel methods
  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(desc(channels.trending), desc(channels.membersCount));
  }

  async getChannelById(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db.insert(channels).values(insertChannel).returning();
    return channel;
  }

  async joinChannel(channelId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.insert(channelMembers).values({ channelId, userId });
      await tx.update(channels)
        .set({ membersCount: sql`${channels.membersCount} + 1` })
        .where(eq(channels.id, channelId));
    });
  }

  async leaveChannel(channelId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.delete(channelMembers).where(
        sql`${channelMembers.channelId} = ${channelId} AND ${channelMembers.userId} = ${userId}`
      );
      await tx.update(channels)
        .set({ membersCount: sql`${channels.membersCount} - 1` })
        .where(eq(channels.id, channelId));
    });
  }

  // Question methods
  async getQuestions(filter?: string): Promise<Question[]> {
    let query = db.select().from(questions);
    
    if (filter === 'trending') {
      query = query.orderBy(desc(questions.upvotes));
    } else if (filter === 'unanswered') {
      query = query.where(eq(questions.answersCount, 0));
    } else if (filter === 'solved') {
      query = query.where(eq(questions.solved, true));
    } else {
      query = query.orderBy(desc(questions.createdAt));
    }
    
    return await query;
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }

  // Answer methods
  async getAnswersByQuestionId(questionId: number): Promise<Answer[]> {
    return await db.select().from(answers)
      .where(eq(answers.questionId, questionId))
      .orderBy(desc(answers.upvotes), desc(answers.createdAt));
  }

  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const [answer] = await db.transaction(async (tx: any) => {
      const [newAnswer] = await tx.insert(answers).values(insertAnswer).returning();
      await tx.update(questions)
        .set({ answersCount: sql`${questions.answersCount} + 1` })
        .where(eq(questions.id, insertAnswer.questionId));
      return [newAnswer];
    });
    return answer;
  }

  // Event methods
  async getEvents(filter?: string): Promise<Event[]> {
    let query = db.select().from(events);
    
    if (filter === 'past') {
      query = query.orderBy(desc(events.createdAt));
    } else {
      query = query.orderBy(events.date, events.time);
    }
    
    return await query;
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async joinEvent(eventId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.insert(eventAttendees).values({ eventId, userId });
      await tx.update(events)
        .set({ attendeesCount: sql`${events.attendeesCount} + 1` })
        .where(eq(events.id, eventId));
    });
  }

  async leaveEvent(eventId: number, userId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.delete(eventAttendees).where(
        sql`${eventAttendees.eventId} = ${eventId} AND ${eventAttendees.userId} = ${userId}`
      );
      await tx.update(events)
        .set({ attendeesCount: sql`${events.attendeesCount} - 1` })
        .where(eq(events.id, eventId));
    });
  }

  // Leaderboard
  async getLeaderboard(filter?: string, limit = 50): Promise<User[]> {
    return await db.select().from(users)
      .orderBy(desc(users.uniNexusScore))
      .limit(limit);
  }
}

export const storage = new DbStorage();
