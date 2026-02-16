import { Router, Request, Response } from "express";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated } from "../firebaseAuth";
import {
  users,
  courseDiscussions,
  discussionReplies,
  discussionUpvotes,
} from "@shared/schema";
import { createNotification } from "../services/notifications.service";

const router = Router();

router.get("/qa/questions", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { resolved } = req.query;
    
    let whereClause = eq(courseDiscussions.isQuestion, true);
    if (resolved === "true") {
      whereClause = and(whereClause, eq(courseDiscussions.isResolved, true))!;
    } else if (resolved === "false") {
      whereClause = and(whereClause, eq(courseDiscussions.isResolved, false))!;
    }

    const questions = await db
      .select({
        id: courseDiscussions.id,
        title: courseDiscussions.title,
        content: courseDiscussions.content,
        isQuestion: courseDiscussions.isQuestion,
        isResolved: courseDiscussions.isResolved,
        replyCount: courseDiscussions.replyCount,
        upvoteCount: courseDiscussions.upvoteCount,
        createdAt: courseDiscussions.createdAt,
        authorId: courseDiscussions.authorId,
        courseId: courseDiscussions.courseId,
      })
      .from(courseDiscussions)
      .where(whereClause)
      .orderBy(desc(courseDiscussions.createdAt))
      .limit(50);

    const questionsWithAuthors = await Promise.all(
      questions.map(async (q) => {
        const [author] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
            rankTier: users.rankTier,
          })
          .from(users)
          .where(eq(users.id, q.authorId))
          .limit(1);
        return { ...q, author: author || null };
      })
    );

    res.json(questionsWithAuthors);
  } catch (error: any) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/qa/questions/:questionId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { questionId } = req.params;

    const [question] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const [author] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        rankTier: users.rankTier,
      })
      .from(users)
      .where(eq(users.id, question.authorId))
      .limit(1);

    const answers = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.discussionId, questionId))
      .orderBy(desc(discussionReplies.upvoteCount));

    const answersWithAuthors = await Promise.all(
      answers.map(async (a) => {
        const [answerAuthor] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
            rankTier: users.rankTier,
          })
          .from(users)
          .where(eq(users.id, a.authorId))
          .limit(1);
        return { ...a, author: answerAuthor || null };
      })
    );

    const [userUpvote] = await db
      .select()
      .from(discussionUpvotes)
      .where(
        and(
          eq(discussionUpvotes.userId, req.user.id),
          eq(discussionUpvotes.discussionId, questionId)
        )
      )
      .limit(1);

    res.json({
      ...question,
      author: author || null,
      answers: answersWithAuthors,
      userHasUpvoted: !!userUpvote,
    });
  } catch (error: any) {
    console.error("Error fetching question detail:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/qa/questions", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const [question] = await db
      .insert(courseDiscussions)
      .values({
        title,
        content,
        authorId: req.user.id,
        courseId: "general",
        isQuestion: true,
        isResolved: false,
      })
      .returning();

    await db
      .update(users)
      .set({
        problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 10`,
        totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 10`,
      })
      .where(eq(users.id, req.user.id));

    await createNotification({
      userId: req.user.id,
      type: 'achievement',
      title: 'Question Posted!',
      message: `You earned +10 points for asking a question in the Q&A forum.`,
      link: `/qa/questions/${question.id}`
    });

    res.json(question);
  } catch (error: any) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/qa/questions/:questionId/answers", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { questionId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const [question] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const [answer] = await db
      .insert(discussionReplies)
      .values({
        discussionId: questionId,
        authorId: req.user.id,
        content,
      })
      .returning();

    await db
      .update(courseDiscussions)
      .set({
        replyCount: sql`${courseDiscussions.replyCount} + 1`,
      })
      .where(eq(courseDiscussions.id, questionId));

    await db
      .update(users)
      .set({
        problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 15`,
        totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 15`,
      })
      .where(eq(users.id, req.user.id));

    // Notify question author
    if (question.authorId !== req.user.id) {
      await createNotification({
        userId: question.authorId,
        type: 'comment',
        title: 'New Answer Received',
        message: `${req.user.firstName} ${req.user.lastName} answered your question: "${question.title.substring(0, 30)}..."`,
        link: `/qa/questions/${questionId}`
      });
    }

    res.json(answer);
  } catch (error: any) {
    console.error("Error creating answer:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/qa/upvote", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { questionId, answerId } = req.body;

    if (!questionId && !answerId) {
      return res.status(400).json({ error: "questionId or answerId is required" });
    }

    const existingUpvote = await db
      .select()
      .from(discussionUpvotes)
      .where(
        and(
          eq(discussionUpvotes.userId, req.user.id),
          questionId
            ? eq(discussionUpvotes.discussionId, questionId)
            : eq(discussionUpvotes.replyId, answerId)
        )
      )
      .limit(1);

    if (existingUpvote.length > 0) {
      await db
        .delete(discussionUpvotes)
        .where(eq(discussionUpvotes.id, existingUpvote[0].id));

      if (questionId) {
        await db
          .update(courseDiscussions)
          .set({ upvoteCount: sql`GREATEST(${courseDiscussions.upvoteCount} - 1, 0)` })
          .where(eq(courseDiscussions.id, questionId));
      } else {
        await db
          .update(discussionReplies)
          .set({ upvoteCount: sql`GREATEST(${discussionReplies.upvoteCount} - 1, 0)` })
          .where(eq(discussionReplies.id, answerId));
      }

      return res.json({ upvoted: false });
    }

    await db.insert(discussionUpvotes).values({
      userId: req.user.id,
      discussionId: questionId || null,
      replyId: answerId || null,
    });

    if (questionId) {
      await db
        .update(courseDiscussions)
        .set({ upvoteCount: sql`${courseDiscussions.upvoteCount} + 1` })
        .where(eq(courseDiscussions.id, questionId));
    } else {
      await db
        .update(discussionReplies)
        .set({ upvoteCount: sql`${discussionReplies.upvoteCount} + 1` })
        .where(eq(discussionReplies.id, answerId));
    }

    res.json({ upvoted: true });
  } catch (error: any) {
    console.error("Error toggling upvote:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/qa/questions/:questionId/resolve", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { questionId } = req.params;
    const { answerId } = req.body;

    const [question] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.authorId !== req.user.id) {
      return res.status(403).json({ error: "Only the question author can resolve it" });
    }

    await db
      .update(courseDiscussions)
      .set({ isResolved: true })
      .where(eq(courseDiscussions.id, questionId));

    if (answerId) {
      const [answer] = await db
        .select()
        .from(discussionReplies)
        .where(eq(discussionReplies.id, answerId))
        .limit(1);

      if (answer) {
        await db
          .update(users)
          .set({
            problemSolverScore: sql`COALESCE(${users.problemSolverScore}, 0) + 20`,
            totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 20`,
          })
          .where(eq(users.id, answer.authorId));

        await createNotification({
          userId: answer.authorId,
          type: 'achievement',
          title: 'Answer Accepted!',
          message: `Your answer was marked as the solution! You earned +20 points.`,
          link: `/qa/questions/${questionId}`
        });
      }
    }

    res.json({ resolved: true });
  } catch (error: any) {
    console.error("Error resolving question:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
