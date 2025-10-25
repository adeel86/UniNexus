// uninexus-social-service/src/db/schema.ts

import { pgTable, uuid, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

// Note: The 'users' table is essential but will primarily be managed by the
// Identity Service. This is a minimal definition for relational integrity.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  type: varchar('type', { length: 20 }).notNull(), // e.g., 'TEXT', 'IMAGE'
  communityId: uuid('community_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Fields that will be updated by the Analytics/AI Service
  engagementRank: integer('engagement_rank').default(0),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// A simplified example of a service-specific database client initialization
// (NOTE: In production, use connection pooling)
// export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));
