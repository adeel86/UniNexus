import { db } from "../../db";
import { courses, courseEnrollments, courseDiscussions, discussionReplies, teacherContent } from "@shared/schema";
import type { User, Course } from "@shared/schema";
import { getDemoUsers } from "./users";

export async function seedCourses(insertedUsers: User[]): Promise<Course[]> {
  const demoUsers = getDemoUsers(insertedUsers);
  
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  const teacherSheldon = demoUsers.teacherSheldon || insertedUsers.find(u => u.role === 'teacher' && u.id !== teacherDrAdeel.id) || insertedUsers[0];
  const uniAdminDISC = demoUsers.uniAdminDISC || insertedUsers.find(u => u.role === 'university_admin') || insertedUsers[0];
  const uniAdminTechNerd = demoUsers.uniAdminTechNerd || insertedUsers.find(u => u.role === 'university_admin' && u.id !== uniAdminDISC.id) || insertedUsers[0];
  
  const mockCourses = [
    {
      name: "Introduction to Web Development",
      code: "WEB101",
      description: "Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites. This course covers responsive design, accessibility, and modern web standards.",
      university: "Massachusetts Institute of Technology",
      instructorId: teacherDrAdeel.id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      validatedByUniversityAdminId: uniAdminDISC.id,
      universityValidatedAt: new Date("2024-10-01"),
      validationRequestedAt: new Date("2024-09-15"),
    },
    {
      name: "Advanced Machine Learning",
      code: "ML401",
      description: "Master advanced ML concepts including deep learning, neural networks, and model optimization. Hands-on projects with TensorFlow and PyTorch.",
      university: "Massachusetts Institute of Technology",
      instructorId: teacherDrAdeel.id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      validatedByUniversityAdminId: uniAdminDISC.id,
      universityValidatedAt: new Date("2024-09-20"),
      validationRequestedAt: new Date("2024-09-01"),
    },
    {
      name: "Data Structures and Algorithms",
      code: "CS201",
      description: "Comprehensive study of data structures including arrays, linked lists, trees, graphs, and algorithms for sorting, searching, and optimization.",
      university: "California Institute of Technology",
      instructorId: teacherSheldon.id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      validatedByUniversityAdminId: uniAdminDISC.id,
      universityValidatedAt: new Date("2024-09-15"),
      validationRequestedAt: new Date("2024-08-20"),
    },
    {
      name: "Database Systems",
      code: "CS102",
      description: "Introduction to relational databases, SQL, NoSQL, and database design principles. Learn to design, implement, and optimize database systems.",
      university: "California Institute of Technology",
      instructorId: teacherSheldon.id,
      semester: "Spring 2025",
      universityValidationStatus: "pending",
      isUniversityValidated: false,
      validationRequestedAt: new Date("2024-11-01"),
    },
    {
      name: "Advanced React Patterns",
      code: "WEB301",
      description: "Master advanced React concepts including hooks, context, performance optimization, and server-side rendering with Next.js.",
      university: "TechNerd Academy",
      instructorId: teacherDrAdeel.id,
      semester: "Fall 2024",
      universityValidationStatus: "validated",
      isUniversityValidated: true,
      validatedByUniversityAdminId: uniAdminTechNerd.id,
      universityValidatedAt: new Date("2024-10-15"),
      validationRequestedAt: new Date("2024-10-01"),
    },
    {
      name: "Python for Data Science",
      code: "DS101",
      description: "Learn Python programming for data analysis, visualization, and machine learning. Covers pandas, numpy, matplotlib, and scikit-learn.",
      university: "Massachusetts Institute of Technology",
      instructorId: teacherDrAdeel.id,
      semester: "Spring 2025",
      universityValidationStatus: "pending",
      isUniversityValidated: false,
      validationRequestedAt: new Date("2024-11-10"),
    },
    {
      name: "Node.js Backend Development",
      code: "WEB201",
      description: "Build scalable server-side applications with Node.js, Express, and databases. Learn RESTful API design and authentication.",
      university: "California Institute of Technology",
      instructorId: teacherSheldon.id,
      semester: "Spring 2025",
      universityValidationStatus: "rejected",
      isUniversityValidated: false,
      universityValidationNote: "Course description needs more detail. Please include learning objectives and prerequisites.",
      validationRequestedAt: new Date("2024-10-20"),
    },
  ];

  console.log("Inserting courses...");
  const insertedCourses = await db.insert(courses).values(mockCourses).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCourses.length} courses`);
  return insertedCourses;
}

export async function seedEnrollmentsAndDiscussions(insertedCourses: Course[], insertedUsers: User[]): Promise<void> {
  if (insertedCourses.length === 0) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const additionalStudents = insertedUsers.filter(u => u?.role === 'student' && u.email !== studentAdeel.email && u.email !== studentAneeqa.email).slice(0, 4);
  
  const enrollments: { courseId: string; studentId: string }[] = [];
  
  // Enroll main demo students in courses
  if (insertedCourses[0]) {
    enrollments.push({ courseId: insertedCourses[0].id, studentId: studentAdeel.id });
    enrollments.push({ courseId: insertedCourses[0].id, studentId: studentAneeqa.id });
  }
  if (insertedCourses[1]) {
    enrollments.push({ courseId: insertedCourses[1].id, studentId: studentAdeel.id });
    enrollments.push({ courseId: insertedCourses[1].id, studentId: studentAneeqa.id });
  }
  if (insertedCourses[2]) {
    enrollments.push({ courseId: insertedCourses[2].id, studentId: studentAdeel.id });
    enrollments.push({ courseId: insertedCourses[2].id, studentId: studentAneeqa.id });
  }
  if (insertedCourses[4]) {
    enrollments.push({ courseId: insertedCourses[4].id, studentId: studentAdeel.id });
  }
  
  // Also enroll additional students if they exist
  additionalStudents.forEach((student, idx) => {
    if (student && insertedCourses[idx % insertedCourses.length]) {
      enrollments.push({ courseId: insertedCourses[idx % insertedCourses.length].id, studentId: student.id });
    }
  });

  console.log("Inserting course enrollments...");
  const insertedEnrollments = await db.insert(courseEnrollments).values(enrollments).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEnrollments.length} enrollments`);

  // Create discussions for courses
  const mockDiscussions = [
    {
      courseId: insertedCourses[0].id,
      authorId: studentAdeel.id,
      title: "Question about CSS Grid layout",
      content: "Can someone explain the difference between grid-template-columns and grid-auto-columns? I'm confused about when to use each.",
      isQuestion: true,
      isResolved: false,
      replyCount: 2,
    },
    {
      courseId: insertedCourses[1]?.id || insertedCourses[0].id,
      authorId: studentAneeqa.id,
      title: "Neural network hyperparameter tuning",
      content: "What are the best practices for tuning learning rate and batch size in deep learning models?",
      isQuestion: true,
      isResolved: true,
      replyCount: 3,
    },
    {
      courseId: insertedCourses[2]?.id || insertedCourses[0].id,
      authorId: studentAdeel.id,
      title: "Time complexity of quicksort",
      content: "I understand the average case is O(n log n), but can someone explain the worst case scenario and how to avoid it?",
      isQuestion: true,
      isResolved: false,
      replyCount: 1,
    },
  ];

  console.log("Inserting course discussions...");
  const insertedDiscussions = await db.insert(courseDiscussions).values(mockDiscussions).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedDiscussions.length} discussions`);

  if (insertedDiscussions.length > 0) {
    const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
    const teacherSheldon = demoUsers.teacherSheldon || insertedUsers.find(u => u.role === 'teacher' && u.id !== teacherDrAdeel.id) || insertedUsers[0];
    
    const mockReplies = [
      {
        discussionId: insertedDiscussions[0].id,
        authorId: teacherDrAdeel.id,
        content: "Great question! grid-template-columns defines explicit grid tracks while grid-auto-columns handles implicitly created columns. Use template when you know exactly how many columns you need.",
      },
      {
        discussionId: insertedDiscussions[0].id,
        authorId: studentAneeqa.id,
        content: "Adding to Dr. Rafiq's answer - I found this MDN article really helpful for understanding the difference. The visual examples make it much clearer!",
      },
      {
        discussionId: insertedDiscussions[1]?.id || insertedDiscussions[0].id,
        authorId: teacherDrAdeel.id,
        content: "Start with a learning rate of 0.001 and use learning rate schedulers. For batch size, larger batches train faster but may generalize worse. I recommend starting with 32 or 64.",
      },
    ];

    console.log("Inserting discussion replies...");
    const insertedReplies = await db.insert(discussionReplies).values(mockReplies).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedReplies.length} replies`);
  }
}

export async function seedTeacherContent(insertedCourses: Course[], insertedUsers: User[]): Promise<void> {
  if (insertedCourses.length === 0) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  const teacherSheldon = demoUsers.teacherSheldon || insertedUsers.find(u => u.role === 'teacher' && u.id !== teacherDrAdeel.id) || insertedUsers[0];

  const mockTeacherContent = [
    {
      teacherId: teacherDrAdeel.id,
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
      teacherId: teacherDrAdeel.id,
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
      teacherId: teacherDrAdeel.id,
      courseId: insertedCourses[0].id,
      title: "CSS Grid & Flexbox Layout Masterclass",
      description: "Complete guide to modern CSS layout techniques with practical examples.",
      contentType: "text",
      textContent: "# CSS Grid and Flexbox\n\nThis guide covers modern CSS layout techniques including:\n\n## Flexbox Basics\n- flex-direction\n- justify-content\n- align-items\n\n## CSS Grid\n- grid-template-columns\n- grid-template-rows\n- grid-gap\n\n## When to Use Each\n- Flexbox: One-dimensional layouts\n- Grid: Two-dimensional layouts",
      tags: ["CSS", "Grid", "Flexbox", "Layout", "Web Design"],
      isPublic: true,
    },
    {
      teacherId: teacherDrAdeel.id,
      courseId: insertedCourses[1]?.id || insertedCourses[0].id,
      title: "Deep Learning with TensorFlow",
      description: "Hands-on guide to building neural networks with TensorFlow and Keras.",
      contentType: "pdf",
      fileUrl: "https://storage.uninexus.app/content/tensorflow-guide.pdf",
      metadata: JSON.stringify({ pages: 120, fileSize: "8.5MB", version: "3.0" }),
      tags: ["TensorFlow", "Deep Learning", "Neural Networks", "AI"],
      isPublic: true,
    },
    {
      teacherId: teacherSheldon.id,
      courseId: insertedCourses[2]?.id || insertedCourses[0].id,
      title: "Algorithm Analysis Techniques",
      description: "Master the art of analyzing algorithm efficiency and complexity.",
      contentType: "text",
      textContent: "# Algorithm Analysis\n\n## Big O Notation\n- O(1): Constant time\n- O(log n): Logarithmic\n- O(n): Linear\n- O(n log n): Linearithmic\n- O(n^2): Quadratic\n\n## Common Sorting Algorithms\n1. QuickSort: O(n log n) average\n2. MergeSort: O(n log n) guaranteed\n3. BubbleSort: O(n^2) - avoid!\n\n## Space Complexity\nDon't forget to analyze memory usage alongside time complexity.",
      tags: ["Algorithms", "Big O", "Complexity", "Data Structures"],
      isPublic: true,
    },
  ];

  console.log("Inserting teacher content...");
  const insertedContent = await db.insert(teacherContent).values(mockTeacherContent).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedContent.length} teacher content items`);
}
