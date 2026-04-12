import { Router, Request, Response } from "express";
import { eq, desc, sql, and, inArray, ne } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import { updateUserStreakForActivity } from "../streakHelper";
import { hasRole } from "@shared/roles";
import { applyPointDelta } from "../pointsHelper";
import {
  posts,
  comments,
  reactions,
  users,
  userStats,
  followers,
  notifications,
  universities,
  majors,
  postShares,
  insertPostSchema,
  insertCommentSchema,
  insertReactionSchema,
  contentReports,
  insertContentReportSchema,
} from "@shared/schema";
import { blockRestrictedRoles } from "./shared";
import { moderatePostContent } from "../services/contentModeration";

async function enrichWithOriginalPosts(postsWithDetails: any[]) {
  const originalPostIds = postsWithDetails
    .filter((p) => p.originalPostId)
    .map((p) => p.originalPostId as string);

  if (originalPostIds.length === 0) return postsWithDetails;

  const originalPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      videoUrl: posts.videoUrl,
      mediaUrls: posts.mediaUrls,
      mediaType: posts.mediaType,
      createdAt: posts.createdAt,
      author: users,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(inArray(posts.id, originalPostIds));

  const originalPostsMap = new Map(originalPosts.map((op) => [op.id, op]));

  return postsWithDetails.map((post) => ({
    ...post,
    originalPost: post.originalPostId
      ? (originalPostsMap.get(post.originalPostId) ?? null)
      : null,
  }));
}

async function buildUserNameMap(
  userIds: string[]
): Promise<Map<string, { university: string | null; major: string | null }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: users.id,
      university: universities.name,
      major: majors.name,
    })
    .from(users)
    .leftJoin(universities, eq(users.universityId, universities.id))
    .leftJoin(majors, eq(users.majorId, majors.id))
    .where(inArray(users.id, userIds));
  return new Map(rows.map((r) => [r.id, { university: r.university, major: r.major }]));
}

const router = Router();

router.get("/posts", async (req: Request, res: Response) => {
  const { category, filterByInterests, userId, authorId } = req.query;
  const targetUserId = (userId || authorId) as string;
  
  try {
    const conditions = [];

    conditions.push(ne(posts.moderationStatus, 'rejected'));

    if (targetUserId) {
      conditions.push(eq(posts.authorId, targetUserId));
    }

    if (category && category !== 'all') {
      conditions.push(eq(posts.category, category as string));
    }

    let query = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaUrls: posts.mediaUrls,
        mediaType: posts.mediaType,
        category: posts.category,
        tags: posts.tags,
        viewCount: posts.viewCount,
        shareCount: posts.shareCount,
        originalPostId: posts.originalPostId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .$dynamic();

    query = query.where(and(...conditions));

    let postsData = await query;

    if (filterByInterests === 'true' && userId) {
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId as string)).limit(1);
      if (currentUser && currentUser.interests && currentUser.interests.length > 0) {
        const userInterests = currentUser.interests;
        postsData = postsData.filter(post => {
          if (!post.tags || post.tags.length === 0) return false;
          return post.tags.some(tag => 
            userInterests.some(interest => 
              tag.toLowerCase().includes(interest.toLowerCase()) ||
              interest.toLowerCase().includes(tag.toLowerCase())
            )
          );
        });
      }
    }

    const authorIds = Array.from(new Set(postsData.map((p) => p.authorId).filter(Boolean))) as string[];
    const nameMap = await buildUserNameMap(authorIds);

    const postsWithDetails = await Promise.all(
      postsData.map(async (post) => {
        const postComments = await db
          .select({
            id: comments.id,
            postId: comments.postId,
            authorId: comments.authorId,
            content: comments.content,
            createdAt: comments.createdAt,
            author: users,
          })
          .from(comments)
          .leftJoin(users, eq(comments.authorId, users.id))
          .where(eq(comments.postId, post.id))
          .orderBy(comments.createdAt);

        const postReactions = await db
          .select()
          .from(reactions)
          .where(eq(reactions.postId, post.id));

        const names = post.authorId ? nameMap.get(post.authorId) : undefined;
        return {
          ...post,
          author: post.author ? { ...post.author, ...names } : post.author,
          comments: postComments,
          reactions: postReactions,
        };
      })
    );

    const finalPosts = await enrichWithOriginalPosts(postsWithDetails);
    res.json(finalPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/personalized", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id));
    
    if (!currentUser) {
      return res.status(404).send("User not found");
    }
    
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    
    // If no category filter is applied, fetch more posts to ensure variety
    const fetchLimit = (!category || category === 'all') ? Math.max(limit * 3, 60) : limit;
    
    const followedUsers = await db
      .select({ followingId: followers.followingId })
      .from(followers)
      .where(eq(followers.followerId, currentUser.id));
    
    const followedIds = followedUsers.map(f => f.followingId);
    
    // For You shows posts from followed users only (not user's own posts)
    const allowedIds = followedIds;
    
    if (allowedIds.length === 0) {
      return res.json([]);
    }

    let query = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaUrls: posts.mediaUrls,
        mediaType: posts.mediaType,
        category: posts.category,
        tags: posts.tags,
        viewCount: posts.viewCount,
        shareCount: posts.shareCount,
        originalPostId: posts.originalPostId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          category && category !== 'all' ? eq(posts.category, category) : sql`true`,
          inArray(posts.authorId, allowedIds)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(fetchLimit)
      .$dynamic();
    
    const allPosts = await query;
    const validPosts = allPosts.filter(post => post.createdAt != null);
    
    const validAuthorIds = Array.from(new Set(validPosts.map((p) => p.authorId).filter(Boolean))) as string[];
    const validNameMap = await buildUserNameMap(validAuthorIds);

    const postsWithDetails = await Promise.all(
      validPosts.map(async (post) => {
        const [commentsData, reactionsData] = await Promise.all([
          db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id)),
          db.select().from(reactions).where(eq(reactions.postId, post.id))
        ]);

        const names = post.authorId ? validNameMap.get(post.authorId) : undefined;
        return {
          ...post,
          author: post.author ? { ...post.author, ...names } : post.author,
          comments: commentsData,
          reactions: reactionsData,
        };
      })
    );
    
    const scoredPosts = postsWithDetails.map((post) => {
      let score = 0;
      const ageHours = (Date.now() - new Date(post.createdAt!).getTime()) / (1000 * 60 * 60);
      
      const isFollowing = followedIds.includes(post.authorId);
      if (isFollowing) score += 50;
      
      const userInterests = currentUser.interests || [];
      const postTags = post.tags || [];
      let interestScore = 0;
      
      postTags.forEach((tag: string) => {
        const tagLower = tag.toLowerCase();
        if (userInterests.some((i: string) => i.toLowerCase().includes(tagLower) || tagLower.includes(i.toLowerCase()))) {
          interestScore += 10;
        }
      });
      
      score += Math.min(interestScore, 30);
      
      if (post.author?.universityId && post.author?.universityId === currentUser.universityId) score += 5;
      if (post.author?.majorId && post.author?.majorId === currentUser.majorId) score += 5;
      
      const engagementScore = (
        (post.reactions.length * 1) +
        (post.comments.length * 2) +
        (post.shareCount * 3) +
        (post.viewCount * 0.1)
      );
      score += Math.min(engagementScore / (1 + ageHours / 12), 20);
      
      const recencyMultiplier = 1 / (1 + ageHours / 24);
      score *= recencyMultiplier;
      
      return { ...post, score };
    });
    
    scoredPosts.sort((a, b) => b.score - a.score);
    
    const selectedPosts: typeof scoredPosts = [];
    const authorCount = new Map<string, number>();
    
    // For "For You" feed with few followed users, be more generous with per-author limit
    // If user follows few people, allow more posts per author to show variety
    const maxPostsPerAuthor = followedIds.length <= 5 ? 5 : 2;
    
    for (const post of scoredPosts) {
      const count = authorCount.get(post.authorId) || 0;
      if (count < maxPostsPerAuthor) {
        selectedPosts.push(post);
        authorCount.set(post.authorId, count + 1);
      }
      if (selectedPosts.length >= limit) break;
    }
    
    const strippedPosts = selectedPosts.map(({ score, ...post }) => post);
    const finalPosts = await enrichWithOriginalPosts(strippedPosts);
    res.json(finalPosts);
  } catch (error: any) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/following", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const category = req.query.category as string;
    
    const followedUsers = await db
      .select({ followingId: followers.followingId })
      .from(followers)
      .where(eq(followers.followerId, currentUser.id));
    
    const followedIds = followedUsers.map(f => f.followingId);
    
    if (followedIds.length === 0) {
      return res.json([]);
    }
    
    let query = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaUrls: posts.mediaUrls,
        mediaType: posts.mediaType,
        category: posts.category,
        tags: posts.tags,
        viewCount: posts.viewCount,
        shareCount: posts.shareCount,
        originalPostId: posts.originalPostId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .$dynamic();
    
    const conditions = [inArray(posts.authorId, followedIds)];
    if (category && category !== 'all') {
      conditions.push(eq(posts.category, category));
    }
    
    const followingPosts = await query.where(and(...conditions));
    
    const followingAuthorIds = Array.from(new Set(followingPosts.map((p) => p.authorId).filter(Boolean))) as string[];
    const followingNameMap = await buildUserNameMap(followingAuthorIds);

    const postsWithDetails = await Promise.all(
      followingPosts.map(async (post) => {
        const [commentsData, reactionsData] = await Promise.all([
          db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id)),
          db.select().from(reactions).where(eq(reactions.postId, post.id))
        ]);

        const names = post.authorId ? followingNameMap.get(post.authorId) : undefined;
        return {
          ...post,
          author: post.author ? { ...post.author, ...names } : post.author,
          comments: commentsData,
          reactions: reactionsData,
        };
      })
    );
    
    const finalPosts = await enrichWithOriginalPosts(postsWithDetails);
    res.json(finalPosts);
  } catch (error: any) {
    console.error('Following feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/trending", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    let query = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaUrls: posts.mediaUrls,
        mediaType: posts.mediaType,
        category: posts.category,
        tags: posts.tags,
        viewCount: posts.viewCount,
        shareCount: posts.shareCount,
        originalPostId: posts.originalPostId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .$dynamic();
    
    const conditions = [sql`${posts.createdAt} > ${fortyEightHoursAgo.toISOString()}`];
    if (category && category !== 'all') {
      conditions.push(eq(posts.category, category));
    }
    
    const recentPosts = await query.where(and(...conditions));
    const validPosts = recentPosts.filter(post => post.createdAt != null);
    
    const postsWithScores = await Promise.all(
      validPosts.map(async (post) => {
        const [commentsData, reactionsData] = await Promise.all([
          db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id)),
          db.select().from(reactions).where(eq(reactions.postId, post.id))
        ]);
        
        const ageHours = (Date.now() - new Date(post.createdAt!).getTime()) / (1000 * 60 * 60);
        const engagementScore = (
          reactionsData.length * 3 +
          commentsData.length * 5 +
          (post.shareCount || 0) * 8 +
          (post.viewCount || 0) * 0.5
        );
        const trendingScore = engagementScore / (ageHours / 6 + 1);
        
        return {
          ...post,
          comments: commentsData,
          reactions: reactionsData,
          trendingScore,
        };
      })
    );
    
    const strippedTrending = postsWithScores
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map(({ trendingScore, ...post }) => post);

    const trendingPosts = await enrichWithOriginalPosts(strippedTrending);
    res.json(trendingPosts);
  } catch (error: any) {
    console.error('Trending feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/posts", blockRestrictedRoles, async (req: Request, res: Response) => {
  try {
    const validatedData = insertPostSchema.parse({
      ...req.body,
      authorId: req.user!.id,
    });

    const [newPost] = await db.insert(posts).values(validatedData).returning();

    moderatePostContent({
      text: newPost.content,
      imageUrls: [
        ...(newPost.imageUrl ? [newPost.imageUrl] : []),
        ...(newPost.mediaUrls ?? []),
      ],
      videoUrl: newPost.videoUrl ?? undefined,
    }).then(async (result) => {
      if (result.flagged) {
        await db.update(posts)
          .set({
            isFlagged: true,
            flagReason: result.reason,
            flagConfidence: String(result.confidence),
            moderationStatus: 'pending_review',
          })
          .where(eq(posts.id, newPost.id));
      }
    }).catch((err: any) =>
      console.error("[contentModeration] Post scan failed:", err)
    );

    await applyPointDelta(req.user!.id, { engagementDelta: 10 }).catch((err: any) =>
      console.error("Failed to apply point delta on post creation:", err)
    );

    await updateUserStreakForActivity(req.user!.id, 'POST_CREATION').catch((err: any) =>
      console.error("Failed to update streak on post creation:", err)
    );

    res.json(newPost);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/posts/share", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { originalPostId, comment } = req.body;

    if (!originalPostId) {
      return res.status(400).json({ error: "originalPostId is required" });
    }

    const [originalPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, originalPostId))
      .limit(1);

    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found" });
    }

    const [sharedPost] = await db
      .insert(posts)
      .values({
        authorId: req.user!.id,
        content: comment || "",
        originalPostId,
      })
      .returning();

    await db
      .update(posts)
      .set({ shareCount: sql`${posts.shareCount} + 1` })
      .where(eq(posts.id, originalPostId));

    await applyPointDelta(req.user!.id, { engagementDelta: 5 }).catch((err: any) =>
      console.error("Failed to apply point delta on share:", err)
    );

    await updateUserStreakForActivity(req.user!.id, 'POST_CREATION').catch((err: any) =>
      console.error("Failed to update streak on share:", err)
    );

    if (originalPost.authorId !== req.user!.id) {
      await db.insert(notifications).values({
        userId: originalPost.authorId,
        type: "share",
        title: "Post Shared",
        message: `${req.user!.firstName} ${req.user!.lastName} shared your post`,
        link: `/feed`,
      });
    }

    res.json(sharedPost);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/posts/:postId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, category, tags } = req.body;

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (existingPost.authorId !== req.user!.id) {
      return res.status(403).json({ error: "You can only edit your own posts" });
    }

    const [updatedPost] = await db
      .update(posts)
      .set({
        content: content ?? existingPost.content,
        category: category ?? existingPost.category,
        tags: tags ?? existingPost.tags,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    res.json(updatedPost);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/posts/:postId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isAdmin = hasRole(req.user!.role, ["admin", "university"]);
    if (existingPost.authorId !== req.user!.id && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await db.delete(reactions).where(eq(reactions.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(postShares).where(eq(postShares.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/comments", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = insertCommentSchema.parse({
      ...req.body,
      authorId: req.user!.id,
    });

    const [newComment] = await db
      .insert(comments)
      .values(validatedData)
      .returning();

    const [commentWithAuthor] = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        author: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, newComment.id));

    await applyPointDelta(req.user!.id, { engagementDelta: 5 }).catch((err: any) =>
      console.error("Failed to apply point delta on comment:", err)
    );

    // Update streak when user comments
    await updateUserStreakForActivity(req.user!.id, 'COMMENT_CREATION').catch((err: any) => 
      console.error("Failed to update streak on comment:", err)
    );

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, validatedData.postId));

    if (post && post.authorId !== req.user!.id) {
      await db.insert(notifications).values({
        userId: post.authorId,
        type: "comment",
        title: "New Comment",
        message: `${req.user!.firstName} ${req.user!.lastName} commented on your post`,
        link: `/feed`,
      });
    }

    res.json(commentWithAuthor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/comments/:commentId", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isAdmin = hasRole(req.user!.role, ["admin", "university"]);
    if (existingComment.authorId !== req.user!.id && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reactions", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = insertReactionSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    const [existingReaction] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.postId, validatedData.postId),
          eq(reactions.userId, req.user!.id)
        )
      )
      .limit(1);

    if (existingReaction) {
      if (existingReaction.type === validatedData.type) {
        await db.delete(reactions).where(eq(reactions.id, existingReaction.id));
        return res.json({ removed: true });
      } else {
        const [updated] = await db
          .update(reactions)
          .set({ type: validatedData.type })
          .where(eq(reactions.id, existingReaction.id))
          .returning();
        return res.json(updated);
      }
    }

    const [newReaction] = await db.insert(reactions).values(validatedData).returning();

    await applyPointDelta(req.user!.id, { engagementDelta: 2 }).catch((err: any) =>
      console.error("Failed to apply point delta on reaction:", err)
    );

    // Update streak when user reacts
    await updateUserStreakForActivity(req.user!.id, 'REACTION_CREATION').catch((err: any) => 
      console.error("Failed to update streak on reaction:", err)
    );

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, validatedData.postId));

    if (post && post.authorId !== req.user!.id) {
      await db.insert(notifications).values({
        userId: post.authorId,
        type: "reaction",
        title: "New Reaction",
        message: `${req.user!.firstName} ${req.user!.lastName} reacted to your post`,
        link: `/feed`,
      });
    }

    res.json(newReaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/reactions/:postId/:type", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { postId, type } = req.params;

    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, req.user!.id),
          eq(reactions.type, type)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// USER CONTENT REPORTS
// ========================================================================

router.post("/content/reports", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, contentId, reason, details } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: "contentType, contentId, and reason are required" });
    }

    const existing = await db
      .select({ id: contentReports.id })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reporterId, req.user!.id),
          eq(contentReports.contentId, contentId),
          eq(contentReports.status, 'pending')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "You have already reported this content" });
    }

    const [report] = await db.insert(contentReports).values({
      reporterId: req.user!.id,
      contentType,
      contentId,
      reason,
      details: details ?? null,
    }).returning();

    if (contentType === 'post') {
      const [post] = await db
        .select({ moderationStatus: posts.moderationStatus })
        .from(posts)
        .where(eq(posts.id, contentId))
        .limit(1);

      if (post && post.moderationStatus === 'approved') {
        await db.update(posts)
          .set({ isFlagged: true, flagReason: `User report: ${reason}`, moderationStatus: 'pending_review' })
          .where(eq(posts.id, contentId));
      }
    }

    res.json({ success: true, reportId: report.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
