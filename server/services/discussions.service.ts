import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  courses,
  courseEnrollments,
  courseDiscussions,
  discussionReplies,
} from "@shared/schema";

export async function getCourseDetails(courseId: string) {
  const courseData = await db
    .select({
      course: courses,
      instructor: users,
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.id, courseId))
    .limit(1);

  if (courseData.length === 0) {
    return null;
  }

  const enrolledStudentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.courseId, courseId));

  const enrolledCount = Number(enrolledStudentsResult[0]?.count || 0);

  const topDiscussions = await db
    .select({
      discussion: courseDiscussions,
      author: users,
    })
    .from(courseDiscussions)
    .leftJoin(users, eq(courseDiscussions.authorId, users.id))
    .where(eq(courseDiscussions.courseId, courseId))
    .orderBy(
      desc(courseDiscussions.upvoteCount),
      desc(courseDiscussions.createdAt)
    )
    .limit(5);

  return {
    ...courseData[0].course,
    instructor: courseData[0].instructor,
    enrolledCount,
    topDiscussions,
  };
}

export async function getCourseDiscussions(courseId: string) {
  return db
    .select({
      discussion: courseDiscussions,
      author: users,
    })
    .from(courseDiscussions)
    .leftJoin(users, eq(courseDiscussions.authorId, users.id))
    .where(eq(courseDiscussions.courseId, courseId))
    .orderBy(
      desc(courseDiscussions.upvoteCount),
      desc(courseDiscussions.createdAt)
    )
    .limit(50);
}

export async function getDiscussionReplies(discussionId: string) {
  return db
    .select({
      reply: discussionReplies,
      author: users,
    })
    .from(discussionReplies)
    .leftJoin(users, eq(discussionReplies.authorId, users.id))
    .where(eq(discussionReplies.discussionId, discussionId))
    .orderBy(
      desc(discussionReplies.upvoteCount),
      desc(discussionReplies.createdAt)
    )
    .limit(100);
}
