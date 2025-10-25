// uninexus-shared-libs/src/schema.ts
// NOTE: In reality, this would be published as multiple modules:
// @uninexus/shared/social-types, @uninexus/shared/identity-types, etc.

import { z } from "zod";
// ... (Drizzle table definitions are omitted here, but exist in the new services)

// --- IDENTITY SCHEMA ---
export const userSchema = z.object({
  id: z.number().int().positive(),
  firebaseUid: z.string().nonempty(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  // Fields for Identity Service
  university: z.string().nullable(),
  course: z.string().nullable(),
  skills: z.array(z.string()),
  onboarded: z.boolean().default(false),
  // ... other identity fields
});
export const insertUserSchema = userSchema.partial({ id: true, onboarded: true, email: true });

// --- SOCIAL SCHEMA ---
export const postSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  content: z.string().nonempty(),
  // ... other social fields
});
export const insertPostSchema = postSchema.partial({ id: true });
// ... other social schemas (Comment, Channel)
