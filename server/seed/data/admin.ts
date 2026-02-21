import { db } from "../../db";
import { aiInteractionEvents, moderationActions, recruiterFeedback, jobExperience, studentCourses, postShares, postBoosts } from "@shared/schema";
import type { User, Post, Course } from "@shared/schema";

export async function seedAIEvents(insertedUsers: User[]): Promise<void> {
  const mockAIEvents = [
    {
      type: "careerbot_query",
      userId: insertedUsers[0].id,
      metadata: JSON.stringify({ 
        sessionId: "session-1", 
        messageCount: 3,
        query: "How can I prepare for software engineering interviews?",
        response: "Focus on data structures, algorithms, system design, and behavioral questions. Practice on LeetCode and participate in mock interviews."
      }),
    },
    {
      type: "post_suggestion",
      userId: insertedUsers[0].id,
      metadata: JSON.stringify({ 
        interests: ["Web Development", "AI", "React"],
        query: "Suggest posts based on my interests",
        response: "Generated 3 personalized post suggestions about Web Development, AI, and React"
      }),
    },
    {
      type: "careerbot_query",
      userId: insertedUsers[5].id,
      metadata: JSON.stringify({ 
        sessionId: "session-2", 
        messageCount: 5,
        query: "What skills should I learn for machine learning jobs?",
        response: "Essential skills include Python, TensorFlow/PyTorch, statistics, linear algebra, and experience with real-world datasets."
      }),
    },
  ];

  console.log("Inserting AI interaction events...");
  const insertedEvents = await db.insert(aiInteractionEvents).values(mockAIEvents).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEvents.length} AI events`);
}

export async function seedModerationActions(insertedUsers: User[]): Promise<void> {
  const mockModerationActions = [
    {
      moderatorId: insertedUsers[4].id,
      targetType: "post",
      targetId: "flagged-post-id-1",
      action: "hide",
      reason: "Inappropriate content flagged by automated moderation",
      notes: "Post contained spam links. User notified via email.",
    },
    {
      moderatorId: insertedUsers[4].id,
      targetType: "comment",
      targetId: "flagged-comment-id-1",
      action: "warn",
      reason: "Violation of community guidelines - hostile language",
      notes: "First warning issued. User account flagged for review.",
    },
  ];

  console.log("Inserting moderation actions...");
  const insertedActions = await db.insert(moderationActions).values(mockModerationActions).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedActions.length} moderation actions`);
}

export async function seedRecruiterFeedback(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 2) return;

  const recruiters = insertedUsers.filter(u => u.role === 'industry_professional' || u.role === 'industry');
  const students = insertedUsers.filter(u => u.role === 'student');
  
  if (recruiters.length === 0 || students.length === 0) return;

  const mockRecruiterFeedback = [
    {
      recruiterId: recruiters[0].id,
      studentId: students[0].id,
      rating: 5,
      category: "technical_skills",
      feedback: "Strong technical skills demonstrated. Excellent communication abilities and great cultural fit.",
      context: "interview",
      isPublic: true,
    },
    {
      recruiterId: recruiters[1]?.id || recruiters[0].id,
      studentId: students[0].id,
      rating: 4,
      category: "problem_solving",
      feedback: "Demonstrated strong analytical thinking during the technical assessment.",
      context: "challenge",
      isPublic: true,
    },
    {
      recruiterId: recruiters[1]?.id || recruiters[0].id,
      studentId: students[1]?.id || students[0].id,
      rating: 5,
      category: "technical_skills",
      feedback: "Outstanding problem-solving abilities and deep knowledge of ML algorithms.",
      context: "interview",
      isPublic: true,
    },
  ];

  console.log("Inserting recruiter feedback...");
  const insertedFeedback = await db.insert(recruiterFeedback).values(mockRecruiterFeedback).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedFeedback.length} recruiter feedback items`);
}

export async function seedJobExperience(insertedUsers: User[]): Promise<void> {
  const mockJobExperience = [
    {
      userId: insertedUsers[1].id,
      position: "Senior Instructor",
      organization: "Demo University",
      startDate: "2020-08",
      endDate: "Present",
      description: "Teaching computer science courses including Web Development, Data Structures, and Algorithms.",
      isCurrent: true,
    },
    {
      userId: insertedUsers[1].id,
      position: "Software Engineer",
      organization: "Tech Solutions Inc",
      startDate: "2017-06",
      endDate: "2020-07",
      description: "Developed full-stack web applications using React and Node.js.",
      isCurrent: false,
    },
  ];

  console.log("Inserting job experience...");
  const insertedExperience = await db.insert(jobExperience).values(mockJobExperience).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedExperience.length} job experience records`);
}

export async function seedStudentCourses(insertedUsers: User[], insertedCourses: Course[]): Promise<void> {
  if (insertedUsers.length < 6) return;

  const mockStudentCourses = [
    {
      userId: insertedUsers[0].id,
      courseName: "Introduction to Programming",
      courseCode: "CS101",
      institution: "Massachusetts Institute of Technology",
      isValidated: true,
      validationStatus: "validated" as const,
    },
    {
      userId: insertedUsers[0].id,
      courseName: "Data Structures",
      courseCode: "CS201",
      institution: "Massachusetts Institute of Technology",
      isValidated: true,
      validationStatus: "validated" as const,
    },
    {
      userId: insertedUsers[5].id,
      courseName: "Machine Learning Fundamentals",
      courseCode: "CS401",
      institution: "Massachusetts Institute of Technology",
      assignedTeacherId: insertedUsers[8]?.id,
      courseId: insertedCourses[4]?.id,
      isValidated: true,
      validationStatus: "validated" as const,
    },
  ];

  console.log("Inserting student courses...");
  const insertedStudentCourses = await db.insert(studentCourses).values(mockStudentCourses).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedStudentCourses.length} student courses`);
}

export async function seedPostSharesAndBoosts(insertedPosts: Post[], insertedUsers: User[]): Promise<void> {
  if (insertedPosts.length === 0) return;

  const mockShares = [
    { postId: insertedPosts[0].id, userId: insertedUsers[1].id },
    { postId: insertedPosts[1].id, userId: insertedUsers[0].id },
    { postId: insertedPosts[2].id, userId: insertedUsers[5].id },
  ];

  console.log("Inserting post shares...");
  const insertedShares = await db.insert(postShares).values(mockShares).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedShares.length} post shares`);

  const mockBoosts = [
    { postId: insertedPosts[0].id, userId: insertedUsers[8].id },
    { postId: insertedPosts[2].id, userId: insertedUsers[9].id },
  ];

  console.log("Inserting post boosts...");
  const insertedBoosts = await db.insert(postBoosts).values(mockBoosts).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedBoosts.length} post boosts`);
}
