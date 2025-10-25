// uninexus-social-service/src/storage.ts
import { db } from "./db";
// 💡 Only import social and related schemas
import { posts, comments, likes, channels, channelMembers, 
  type Post, type InsertPost, type Comment, type InsertComment,
  type Channel, type InsertChannel
} from "@uninexus/shared/social-schema";
import { eq, desc, sql } from "drizzle-orm";

export interface ISocialStorage {
  // Post methods (from original storage.ts)
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  // ...
  unlikePost(postId: number, userId: number): Promise<void>;
  
  // Comment methods (from original storage.ts)
  // ...
  
  // Channel methods (from original storage.ts)
  // ...
}

export class DbSocialStorage implements ISocialStorage {
  // ... (All Post, Comment, and Channel methods from original storage.ts remain here)
  async createPost(insertPost: InsertPost): Promise<Post> { /* ... */ }
  async likePost(postId: number, userId: number): Promise<void> { /* ... */ }
  // ... (All other User, Question, Answer, Event, Leaderboard methods are DELETED)
}
export const socialStorage = new DbSocialStorage();
