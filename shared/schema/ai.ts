import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, varchar, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { courses } from "./courses";

export const teacherContent = pgTable("teacher_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: 'set null' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  fileUrl: varchar("file_url"),
  textContent: text("text_content"),
  metadata: jsonb("metadata"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  isPublic: boolean("is_public").notNull().default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

import { boolean } from "drizzle-orm/pg-core";

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

export const teacherContentChunks = pgTable("teacher_content_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => teacherContent.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: jsonb("embedding"),
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

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  usedChunkIds: text("used_chunk_ids").array().default(sql`ARRAY[]::text[]`),
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

export const aiInteractionEvents = pgTable("ai_interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb("metadata"),
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

export const moderationActions = pgTable("moderation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id"),
  contentType: varchar("content_type", { length: 20 }),
  moderatorType: varchar("moderator_type", { length: 20 }),
  outcome: varchar("outcome", { length: 20 }),
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
