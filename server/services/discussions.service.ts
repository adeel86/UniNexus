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

  const topDiscussionsData = await db
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

  const topDiscussions = topDiscussionsData.map((result) => ({
    ...result.discussion,
    author: result.author ? {
      id: result.author.id,
      firstName: result.author.firstName,
      lastName: result.author.lastName,
      avatarUrl: result.author.profileImageUrl,
    } : null,
  }));

  return {
    ...courseData[0].course,
    instructor: courseData[0].instructor,
    enrolledCount,
    topDiscussions,
  };
}

export async function getCourseDiscussions(courseId: string) {
  const results = await db
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

  // Format the response to match expected structure
  return results.map((result) => ({
    ...result.discussion,
    author: result.author ? {
      id: result.author.id,
      firstName: result.author.firstName,
      lastName: result.author.lastName,
      avatarUrl: result.author.profileImageUrl,
    } : null,
  }));
}

export async function getDiscussionById(discussionId: string) {
  const [result] = await db
    .select({
      discussion: courseDiscussions,
      author: users,
    })
    .from(courseDiscussions)
    .leftJoin(users, eq(courseDiscussions.authorId, users.id))
    .where(eq(courseDiscussions.id, discussionId))
    .limit(1);
  
  if (!result) {
    return null;
  }

  // Format the response to match expected structure
  return {
    ...result.discussion,
    author: result.author ? {
      id: result.author.id,
      firstName: result.author.firstName,
      lastName: result.author.lastName,
      avatarUrl: result.author.profileImageUrl,
    } : null,
  };
}

export async function getDiscussionReplies(discussionId: string) {
  const results = await db
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

  // Format the response to match expected structure
  return results.map((result) => ({
    ...result.reply,
    author: result.author ? {
      id: result.author.id,
      firstName: result.author.firstName,
      lastName: result.author.lastName,
      avatarUrl: result.author.profileImageUrl,
    } : null,
  }));
}
