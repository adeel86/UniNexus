import { Router, Request, Response } from "express";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  posts,
  comments,
  reactions,
  users,
  followers,
  notifications,
  postShares,
  postBoosts,
  insertPostSchema,
  insertCommentSchema,
  insertReactionSchema,
  insertPostShareSchema,
  insertPostBoostSchema,
} from "@shared/schema";
import { blockRestrictedRoles } from "./shared";

const router = Router();

router.get("/posts", async (req: Request, res: Response) => {
  const { category, filterByInterests, userId, authorId } = req.query;
  
  try {
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
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .$dynamic();

    if (category && category !== 'all') {
      query = query.where(eq(posts.category, category as string));
    }

    if (authorId) {
      query = query.where(eq(posts.authorId, authorId as string));
    }

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

        return {
          ...post,
          comments: postComments,
          reactions: postReactions,
        };
      })
    );

    res.json(postsWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/personalized", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));
    
    if (!currentUser) {
      return res.status(404).send("User not found");
    }
    
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    
    const followedUsers = await db
      .select({ followingId: followers.followingId })
      .from(followers)
      .where(eq(followers.followerId, currentUser.id));
    
    const followedIds = followedUsers.map(f => f.followingId);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
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
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .$dynamic();
    
    const conditions = [sql`${posts.createdAt} > ${sevenDaysAgo.toISOString()}`];
    if (category && category !== 'all') {
      conditions.push(eq(posts.category, category));
    }
    
    const allPosts = await query.where(and(...conditions));
    const validPosts = allPosts.filter(post => post.createdAt != null);
    
    const postsWithDetails = await Promise.all(
      validPosts.map(async (post) => {
        const [commentsData, reactionsData] = await Promise.all([
          db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id)),
          db.select().from(reactions).where(eq(reactions.postId, post.id))
        ]);
        
        return {
          ...post,
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
      
      if (post.author?.university === currentUser.university) score += 5;
      if (post.author?.major === currentUser.major) score += 5;
      
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
    
    for (const post of scoredPosts) {
      const count = authorCount.get(post.authorId) || 0;
      if (count < 2) {
        selectedPosts.push(post);
        authorCount.set(post.authorId, count + 1);
      }
      if (selectedPosts.length >= limit) break;
    }
    
    const finalPosts = selectedPosts.map(({ score, ...post }) => post);
    
    res.json(finalPosts);
  } catch (error: any) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/following", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const currentUser = req.user;
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
    
    const postsWithDetails = await Promise.all(
      followingPosts.map(async (post) => {
        const [commentsData, reactionsData] = await Promise.all([
          db.select({ id: comments.id, postId: comments.postId, authorId: comments.authorId, content: comments.content, createdAt: comments.createdAt, author: users })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.postId, post.id)),
          db.select().from(reactions).where(eq(reactions.postId, post.id))
        ]);
        
        return {
          ...post,
          comments: commentsData,
          reactions: reactionsData,
        };
      })
    );
    
    res.json(postsWithDetails);
  } catch (error: any) {
    console.error('Following feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/feed/trending", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

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
    
    const trendingPosts = postsWithScores
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map(({ trendingScore, ...post }) => post);
    
    res.json(trendingPosts);
  } catch (error: any) {
    console.error('Trending feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/posts", blockRestrictedRoles, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertPostSchema.parse({
      ...req.body,
      authorId: req.user.id,
    });

    const [newPost] = await db.insert(posts).values(validatedData).returning();

    await db
      .update(users)
      .set({
        engagementScore: sql`${users.engagementScore} + 10`,
      })
      .where(eq(users.id, req.user.id));

    res.json(newPost);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/posts/:postId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

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

    if (existingPost.authorId !== req.user.id) {
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

router.delete("/posts/:postId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

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

    const isAdmin = req.user.role === 'master_admin' || req.user.role === 'university_admin';
    if (existingPost.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await db.delete(reactions).where(eq(reactions.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/comments", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertCommentSchema.parse({
      ...req.body,
      authorId: req.user.id,
    });

    const [newComment] = await db.insert(comments).values(validatedData).returning();

    await db
      .update(users)
      .set({
        engagementScore: sql`${users.engagementScore} + 5`,
      })
      .where(eq(users.id, req.user.id));

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, validatedData.postId));

    if (post && post.authorId !== req.user.id) {
      await db.insert(notifications).values({
        userId: post.authorId,
        type: "comment",
        title: "New Comment",
        message: `${req.user.firstName} ${req.user.lastName} commented on your post`,
        link: `/feed`,
      });
    }

    res.json(newComment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/comments/:commentId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

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

    const isAdmin = req.user.role === 'master_admin' || req.user.role === 'university_admin';
    if (existingComment.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reactions", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertReactionSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const [existingReaction] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.postId, validatedData.postId),
          eq(reactions.userId, req.user.id),
          eq(reactions.type, validatedData.type)
        )
      )
      .limit(1);

    if (existingReaction) {
      await db.delete(reactions).where(eq(reactions.id, existingReaction.id));
      return res.json({ removed: true });
    }

    const [newReaction] = await db.insert(reactions).values(validatedData).returning();

    await db
      .update(users)
      .set({
        engagementScore: sql`${users.engagementScore} + 2`,
      })
      .where(eq(users.id, req.user.id));

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, validatedData.postId));

    if (post && post.authorId !== req.user.id) {
      await db.insert(notifications).values({
        userId: post.authorId,
        type: "reaction",
        title: "New Reaction",
        message: `${req.user.firstName} ${req.user.lastName} reacted to your post`,
        link: `/feed`,
      });
    }

    res.json(newReaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/reactions/:postId/:type", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { postId, type } = req.params;

    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, req.user.id),
          eq(reactions.type, type)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
