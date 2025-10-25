// uninexus-shared-libs/src/types/user.ts

import { z } from 'zod';

// Define the core user identity and profile types
export const UserSchema = z.object({
  id: z.number().int().positive(),
  firebaseUid: z.string().nonempty(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  university: z.string().nullable(),
  course: z.string().nullable(),
  // Add other identity-critical fields here
  onboarded: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;
export type InsertUser = z.infer<typeof UserSchema.omit({ id: true })>;
export type UpdateUser = Partial<User>;

// Export the Zod schemas for validation in all services
export const insertUserSchema = UserSchema.omit({ id: true }).partial({ onboarded: true, email: true });
