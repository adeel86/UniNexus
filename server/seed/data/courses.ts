import { db } from "../../db";
import { courses, courseEnrollments, courseDiscussions, discussionReplies, teacherContent } from "@shared/schema";
import type { User, Course } from "@shared/schema";

export async function seedCourses(insertedUsers: User[]): Promise<Course[]> {
  const mockCourses = [
    {
      name: "Introduction to Web Development",
      code: "WEB101",
      description: "Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites.",
      university: "Demo University",
      instructorId: insertedUsers[1].id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      validatedByUniversityAdminId: insertedUsers[2].id,
      universityValidatedAt: new Date("2024-10-01"),
      validationRequestedAt: new Date("2024-09-15"),
    },
    {
      name: "Advanced React Patterns",
      code: "WEB301",
      description: "Master advanced React concepts including hooks, context, and performance optimization.",
      university: "Demo University",
      instructorId: insertedUsers[1].id,
      semester: "Fall 2024",
      universityValidationStatus: "pending",
      isUniversityValidated: false,
      validationRequestedAt: new Date("2024-11-01"),
    },
    {
      name: "Node.js Backend Development",
      code: "WEB201",
      description: "Build scalable server-side applications with Node.js, Express, and databases.",
      university: "Demo University",
      instructorId: insertedUsers[1].id,
      semester: "Spring 2025",
      universityValidationStatus: "rejected",
      isUniversityValidated: false,
      universityValidationNote: "Course description needs more detail. Please include learning objectives and prerequisites.",
      validationRequestedAt: new Date("2024-10-20"),
    },
    {
      name: "Database Systems",
      code: "CS102",
      description: "Introduction to relational databases, SQL, and database design principles.",
      university: "Demo University",
      instructorId: insertedUsers[1].id,
      semester: "Spring 2025",
      universityValidationStatus: "pending",
      isUniversityValidated: false,
    },
    {
      name: "Introduction to Machine Learning",
      code: "CS401",
      description: "Learn the fundamentals of machine learning including supervised and unsupervised learning algorithms.",
      university: "Tech University",
      instructorId: insertedUsers[8].id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      universityValidatedAt: new Date("2024-09-01"),
    },
    {
      name: "Advanced Web Development",
      code: "CS301",
      description: "Master modern web technologies including React, Node.js, and cloud deployment.",
      university: "Tech University",
      instructorId: insertedUsers[8].id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      universityValidatedAt: new Date("2024-09-01"),
    },
    {
      name: "Data Visualization",
      code: "DS201",
      description: "Create compelling visualizations to communicate data insights effectively.",
      university: "Tech University",
      instructorId: insertedUsers[9].id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      universityValidatedAt: new Date("2024-09-01"),
    },
  ];

  console.log("Inserting courses...");
  const insertedCourses = await db.insert(courses).values(mockCourses).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCourses.length} courses`);
  return insertedCourses;
}

export async function seedEnrollmentsAndDiscussions(insertedCourses: Course[], insertedUsers: User[]): Promise<void> {
  if (insertedCourses.length === 0) return;

  const mockEnrollments = [
    { courseId: insertedCourses[0].id, studentId: insertedUsers[0].id },
    { courseId: insertedCourses[0].id, studentId: insertedUsers[2].id },
    { courseId: insertedCourses[1].id, studentId: insertedUsers[0].id },
    { courseId: insertedCourses[1].id, studentId: insertedUsers[1].id },
    { courseId: insertedCourses[2].id, studentId: insertedUsers[2].id },
  ];

  console.log("Inserting course enrollments...");
  const insertedEnrollments = await db.insert(courseEnrollments).values(mockEnrollments).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEnrollments.length} enrollments`);

  const mockDiscussions = [
    {
      courseId: insertedCourses[0].id,
      authorId: insertedUsers[0].id,
      title: "Question about gradient descent",
      content: "Can someone explain how learning rate affects convergence in gradient descent?",
      isQuestion: true,
      isResolved: false,
      replyCount: 2,
    },
    {
      courseId: insertedCourses[1].id,
      authorId: insertedUsers[1].id,
      title: "Best practices for React hooks?",
      content: "What are your favorite patterns for managing complex state with hooks?",
      isQuestion: true,
      isResolved: true,
      replyCount: 3,
    },
  ];

  console.log("Inserting course discussions...");
  const insertedDiscussions = await db.insert(courseDiscussions).values(mockDiscussions).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedDiscussions.length} discussions`);

  if (insertedDiscussions.length > 0) {
    const mockReplies = [
      {
        discussionId: insertedDiscussions[0].id,
        authorId: insertedUsers[2].id,
        content: "Smaller learning rates are safer but slower. I usually start with 0.01 and adjust based on how the loss changes.",
      },
      {
        discussionId: insertedDiscussions[0].id,
        authorId: insertedUsers[3].id,
        content: "Great question! Think of learning rate as step size. Too big and you overshoot the minimum, too small and training takes forever.",
      },
    ];

    console.log("Inserting discussion replies...");
    const insertedReplies = await db.insert(discussionReplies).values(mockReplies).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedReplies.length} replies`);
  }
}

export async function seedTeacherContent(insertedCourses: Course[], insertedUsers: User[]): Promise<void> {
  if (insertedCourses.length === 0) return;

  const mockTeacherContent = [
    {
      teacherId: insertedUsers[1].id,
      courseId: insertedCourses[0].id,
      title: "Introduction to JavaScript Fundamentals",
      description: "Comprehensive guide to JavaScript basics including variables, functions, and control flow.",
      contentType: "pdf",
      fileUrl: "https://storage.uninexus.app/content/js-fundamentals.pdf",
      metadata: JSON.stringify({ pages: 45, fileSize: "2.3MB", version: "1.2" }),
      tags: ["JavaScript", "Web Development", "Fundamentals", "Programming"],
      isPublic: true,
    },
    {
      teacherId: insertedUsers[1].id,
      courseId: insertedCourses[0].id,
      title: "HTML5 & CSS3 Complete Guide",
      description: "Learn modern HTML5 semantic elements and CSS3 styling techniques.",
      contentType: "pdf",
      fileUrl: "https://storage.uninexus.app/content/html-css-guide.pdf",
      metadata: JSON.stringify({ pages: 68, fileSize: "3.1MB", version: "2.0" }),
      tags: ["HTML", "CSS", "Web Development", "Frontend"],
      isPublic: true,
    },
    {
      teacherId: insertedUsers[1].id,
      courseId: insertedCourses[0].id,
      title: "CSS Grid & Flexbox Layout Masterclass",
      description: "Complete guide to modern CSS layout techniques with practical examples.",
      contentType: "text",
      textContent: "# CSS Grid and Flexbox\n\nThis guide covers modern CSS layout techniques...",
      tags: ["CSS", "Grid", "Flexbox", "Layout", "Web Design"],
      isPublic: true,
    },
  ];

  console.log("Inserting teacher content...");
  const insertedContent = await db.insert(teacherContent).values(mockTeacherContent).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedContent.length} teacher content items`);
}
