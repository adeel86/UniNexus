import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import {
  courseDiscussions,
  discussionReplies,
  courseMilestones,
  badges,
  userBadges,
  notifications,
} from "@shared/schema";

const COURSE_BADGE_TYPES = {
  first_discussion: "Discussion Starter",
  five_helpful_answers: "Helpful Contributor",
  resolved_three_questions: "Problem Solver",
  active_contributor: "Active Learner",
} as const;

type MilestoneType = keyof typeof COURSE_BADGE_TYPES;

async function awardBadge(userId: string, badgeName: string, message: string) {
  const [badgeData] = await db
    .select()
    .from(badges)
    .where(eq(badges.name, badgeName))
    .limit(1);

  if (badgeData) {
    await db
      .insert(userBadges)
      .values({ userId, badgeId: badgeData.id })
      .onConflictDoNothing();

    await db
      .insert(notifications)
      .values({
        userId,
        type: "badge_earned",
        title: "New Badge Earned!",
        message,
        link: `/profile?userId=${userId}`,
      })
      .onConflictDoNothing();
  }
}

async function createMilestone(
  studentId: string,
  courseId: string,
  milestoneType: MilestoneType
) {
  await db
    .insert(courseMilestones)
    .values({ studentId, courseId, milestoneType })
    .onConflictDoNothing();
}

async function checkExistingMilestone(
  userId: string,
  courseId: string,
  milestoneType: MilestoneType
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(courseMilestones)
    .where(
      and(
        eq(courseMilestones.studentId, userId),
        eq(courseMilestones.courseId, courseId),
        eq(courseMilestones.milestoneType, milestoneType)
      )
    );
  return !!existing;
}

async function checkFirstDiscussion(userId: string, courseId: string) {
  const [discussionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(courseDiscussions)
    .where(
      and(
        eq(courseDiscussions.authorId, userId),
        eq(courseDiscussions.courseId, courseId)
      )
    );

  if (Number(discussionCount.count) === 1) {
    await createMilestone(userId, courseId, "first_discussion");
    await awardBadge(
      userId,
      COURSE_BADGE_TYPES.first_discussion,
      `You earned the "${COURSE_BADGE_TYPES.first_discussion}" badge for posting your first discussion!`
    );
  }
}

async function checkHelpfulAnswers(userId: string, courseId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discussionReplies)
    .innerJoin(
      courseDiscussions,
      eq(discussionReplies.discussionId, courseDiscussions.id)
    )
    .where(
      and(
        eq(discussionReplies.authorId, userId),
        eq(courseDiscussions.courseId, courseId),
        sql`${discussionReplies.upvoteCount} >= 3`
      )
    );

  if (Number(result.count) >= 5) {
    const exists = await checkExistingMilestone(
      userId,
      courseId,
      "five_helpful_answers"
    );
    if (!exists) {
      await createMilestone(userId, courseId, "five_helpful_answers");
      await awardBadge(
        userId,
        COURSE_BADGE_TYPES.five_helpful_answers,
        `You earned the "${COURSE_BADGE_TYPES.five_helpful_answers}" badge for providing 5 helpful answers!`
      );
    }
  }
}

async function checkResolvedQuestions(userId: string, courseId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(distinct ${courseDiscussions.id})` })
    .from(discussionReplies)
    .innerJoin(
      courseDiscussions,
      eq(discussionReplies.discussionId, courseDiscussions.id)
    )
    .where(
      and(
        eq(discussionReplies.authorId, userId),
        eq(courseDiscussions.courseId, courseId),
        eq(courseDiscussions.isResolved, true)
      )
    );

  if (Number(result.count) >= 3) {
    const exists = await checkExistingMilestone(
      userId,
      courseId,
      "resolved_three_questions"
    );
    if (!exists) {
      await createMilestone(userId, courseId, "resolved_three_questions");
      await awardBadge(
        userId,
        COURSE_BADGE_TYPES.resolved_three_questions,
        `You earned the "${COURSE_BADGE_TYPES.resolved_three_questions}" badge for helping resolve 3 questions!`
      );
    }
  }
}

async function checkActiveContributor(userId: string, courseId: string) {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM (
      SELECT id FROM ${courseDiscussions} 
      WHERE ${courseDiscussions.authorId} = ${userId} 
      AND ${courseDiscussions.courseId} = ${courseId}
      UNION ALL
      SELECT ${discussionReplies.id} FROM ${discussionReplies}
      INNER JOIN ${courseDiscussions} ON ${discussionReplies.discussionId} = ${courseDiscussions.id}
      WHERE ${discussionReplies.authorId} = ${userId} 
      AND ${courseDiscussions.courseId} = ${courseId}
    ) as combined
  `);

  const totalActivity = Number((result.rows[0] as any)?.count || 0);

  if (totalActivity >= 10) {
    const exists = await checkExistingMilestone(
      userId,
      courseId,
      "active_contributor"
    );
    if (!exists) {
      await createMilestone(userId, courseId, "active_contributor");
      await awardBadge(
        userId,
        COURSE_BADGE_TYPES.active_contributor,
        `You earned the "${COURSE_BADGE_TYPES.active_contributor}" badge for being an active contributor!`
      );
    }
  }
}

export async function checkAndAwardCourseBadges(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    await Promise.all([
      checkFirstDiscussion(userId, courseId),
      checkHelpfulAnswers(userId, courseId),
      checkResolvedQuestions(userId, courseId),
      checkActiveContributor(userId, courseId),
    ]);
  } catch (error) {
    console.error("Error checking course badges:", error);
  }
}
