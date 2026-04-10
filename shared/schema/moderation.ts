import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { pgTable, timestamp, varchar, text, jsonb, boolean, numeric, integer } from "drizzle-orm/pg-core";
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

export const contentScanResults = pgTable("content_scan_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  contentId: varchar("content_id").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default('safe'),
  flagged: boolean("flagged").notNull().default(false),
  reason: text("reason"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  cachedUrlHash: varchar("cached_url_hash"),
  scanDetails: jsonb("scan_details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentScanResultsRelations = relations(contentScanResults, ({ one }) => ({
  user: one(users, {
    fields: [contentScanResults.userId],
    references: [users.id],
  }),
}));

export const insertContentScanResultSchema = createInsertSchema(contentScanResults).omit({
  id: true,
  createdAt: true,
});

export type ContentScanResult = typeof contentScanResults.$inferSelect;
export type InsertContentScanResult = z.infer<typeof insertContentScanResultSchema>;

export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  contentId: varchar("content_id").notNull(),
  reason: varchar("reason", { length: 80 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentReportsRelations = relations(contentReports, ({ one }) => ({
  reporter: one(users, {
    fields: [contentReports.reporterId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [contentReports.resolvedBy],
    references: [users.id],
  }),
}));

export const insertContentReportSchema = createInsertSchema(contentReports).omit({
  id: true,
  status: true,
  resolvedBy: true,
  resolvedAt: true,
  resolutionNote: true,
  createdAt: true,
});

export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
