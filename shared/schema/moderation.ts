import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { pgTable, timestamp, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { posts } from "./feed";

export const contentModerationLogs = pgTable("content_moderation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 30 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentModerationLogsRelations = relations(contentModerationLogs, ({ one }) => ({
  post: one(posts, {
    fields: [contentModerationLogs.postId],
    references: [posts.id],
  }),
  admin: one(users, {
    fields: [contentModerationLogs.adminId],
    references: [users.id],
  }),
}));

export const insertContentModerationLogSchema = createInsertSchema(contentModerationLogs).omit({
  id: true,
  createdAt: true,
});

export type ContentModerationLog = typeof contentModerationLogs.$inferSelect;
export type InsertContentModerationLog = z.infer<typeof insertContentModerationLogSchema>;

export const adminActionLogs = pgTable("admin_action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("target_type", { length: 30 }),
  targetId: varchar("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminActionLogsRelations = relations(adminActionLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminActionLogs.adminId],
    references: [users.id],
  }),
}));

export const insertAdminActionLogSchema = createInsertSchema(adminActionLogs).omit({
  id: true,
  createdAt: true,
});

export type AdminActionLog = typeof adminActionLogs.$inferSelect;
export type InsertAdminActionLog = z.infer<typeof insertAdminActionLogSchema>;
