import { sql } from 'drizzle-orm';
import { pgTable, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const universities = pgTable("universities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull().unique(),
  location: varchar("location", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUniversitySchema = createInsertSchema(universities).omit({
  id: true,
  createdAt: true,
});

export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;

export const majors = pgTable("majors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull().unique(),
  category: varchar("category", { length: 100 }),
  isVerified: boolean("is_verified").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMajorSchema = createInsertSchema(majors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Major = typeof majors.$inferSelect;
export type InsertMajor = z.infer<typeof insertMajorSchema>;
