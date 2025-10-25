// uninexus-shared-libs/src/validation/post.ts

import { z } from 'zod';

export const PostTypeEnum = z.enum(['TEXT', 'IMAGE', 'VIDEO', 'PROJECT_UPDATE']);

export const PostSchema = z.object({
  id: z.string().uuid().describe("Unique identifier for the post."),
  userId: z.string().describe("ID of the user who created the post."),
  content: z.string().min(1, "Post content cannot be empty.").max(500, "Post content is too long."),
  mediaUrl: z.string().url("Must be a valid URL for media.").optional(),
  type: PostTypeEnum,
  communityId: z.string().optional().nullable(),
  createdAt: z.date(),
  // Analytics data handled by the AI Service
  engagementRank: z.number().default(0),
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = PostSchema.pick({
  content: true,
  mediaUrl: true,
  type: true,
  communityId: true,
});
