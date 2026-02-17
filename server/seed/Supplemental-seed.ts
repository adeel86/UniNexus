/**
 * Supplemental Seed - Populates empty tables missed by comprehensive seed
 */

import { db } from "../db";
import {
  users,
  conversations,
  messages,
  courseMilestones,
  discussionUpvotes,
  educationRecords,
  groupPosts,
  jobExperience,
  postBoosts,
  postShares,
  userConnections,
  userProfiles,
  aiChatSessions,
  aiChatMessages,
  teacherContent,
  studentCourses,
  posts,
  courses,
  courseDiscussions,
  discussionReplies,
  groups,
  courseEnrollments,
} from "@shared/schema";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";

faker.seed(123);

function randomItem<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr);
}

function randomItems<T>(arr: T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, Math.min(count, arr.length));
}

function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

async function seedSupplementalData() {
  console.log("\n🔄 Starting supplemental seed...\n");

  // Fetch existing data
  const allUsers = await db.select().from(users);
  const allPosts = await db.select().from(posts);
  const allCourses = await db.select().from(courses);
  const allDiscussions = await db.select().from(courseDiscussions);
  const allReplies = await db.select().from(discussionReplies);
  const allGroups = await db.select().from(groups);
  const allEnrollments = await db.select().from(courseEnrollments);

  const students = allUsers.filter(u => u.role === "student");
  const teachers = allUsers.filter(u => u.role === "teacher");
  const industryPros = allUsers.filter(u => u.role === "industry_professional");

  // 1. User Profiles
  console.log("📝 Creating user profiles...");
  const profilesToCreate = allUsers.map(user => {
    const baseProfile: any = {
      userId: user.id,
    };

    if (user.role === "student") {
      baseProfile.programme = user.major || "Computer Science";
      baseProfile.modules = randomItems(["CS101", "CS201", "CS301", "MATH201", "PHYS101"], 3);
      baseProfile.yearOfStudy = faker.number.int({ min: 1, max: 4 });
      baseProfile.academicGoals = faker.lorem.sentence();
      baseProfile.careerGoals = faker.lorem.sentence();
    } else if (user.role === "teacher") {
      baseProfile.teachingSubjects = randomItems(["Computer Science", "Mathematics", "Data Science", "Software Engineering"], 2);
      baseProfile.specializations = randomItems(["Machine Learning", "Web Development", "Distributed Systems", "Security"], 2);
      baseProfile.professionalBio = faker.lorem.paragraph();
      baseProfile.department = randomItem(["Computer Science", "Engineering", "Data Science"]);
      baseProfile.officeHours = "Monday-Friday 2-4 PM";
    } else if (user.role === "university_admin") {
      baseProfile.department = "Administration";
      baseProfile.universityMission = faker.lorem.paragraph();
      baseProfile.focusAreas = randomItems(["Student Success", "Research Excellence", "Industry Partnerships"], 2);
      baseProfile.opportunitiesOffered = faker.lorem.sentence();
    } else if (user.role === "industry_professional") {
      baseProfile.companyMission = faker.lorem.paragraph();
      baseProfile.industryFocus = randomItems(["Technology", "Finance", "Healthcare", "Education"], 2);
      baseProfile.partnershipOpportunities = faker.lorem.sentence();
      baseProfile.hiringOpportunities = faker.lorem.sentence();
    }

    return baseProfile;
  });

  await db.insert(userProfiles).values(profilesToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${profilesToCreate.length} user profiles`);

  // 2. Education Records
  console.log("🎓 Creating education records...");
  const educationToCreate = students.flatMap(student => {
    const numRecords = faker.number.int({ min: 1, max: 2 });
    return Array.from({ length: numRecords }, () => ({
      userId: student.id,
      institution: student.university || faker.company.name() + " University",
      degree: randomItem(["Bachelor of Science", "Master of Science", "Bachelor of Arts"]),
      fieldOfStudy: student.major || "Computer Science",
      startDate: "2020-09",
      endDate: faker.datatype.boolean(0.5) ? "2024-05" : null,
      grade: randomItem(["3.8 GPA", "3.5 GPA", "4.0 GPA", "First Class Honours"]),
      description: faker.lorem.sentence(),
      isCurrent: faker.datatype.boolean(0.5),
    }));
  });

  await db.insert(educationRecords).values(educationToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${educationToCreate.length} education records`);

  // 3. Job Experience
  console.log("💼 Creating job experience...");
  const jobsToCreate = [...students.slice(0, 30), ...industryPros].flatMap(user => {
    const numJobs = faker.number.int({ min: 1, max: 3 });
    return Array.from({ length: numJobs }, () => ({
      userId: user.id,
      position: faker.person.jobTitle(),
      organization: faker.company.name(),
      startDate: faker.date.past({ years: 3 }).toISOString().slice(0, 10),
      endDate: faker.datatype.boolean(0.3) ? null : faker.date.recent().toISOString().slice(0, 10),
      description: faker.lorem.paragraph(),
      isCurrent: faker.datatype.boolean(0.3),
    }));
  });

  await db.insert(jobExperience).values(jobsToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${jobsToCreate.length} job experiences`);

  // 4. User Connections
  console.log("🔗 Creating user connections...");
  const connectionsToCreate: any[] = [];
  const connectionPairs = new Set<string>();
  
  for (let i = 0; i < 150; i++) {
    const requester = randomItem(students);
    const receiver = randomItem(allUsers.filter(u => u.id !== requester.id));
    const pairKey = `${requester.id}-${receiver.id}`;
    
    if (!connectionPairs.has(pairKey)) {
      connectionPairs.add(pairKey);
      connectionsToCreate.push({
        requesterId: requester.id,
        receiverId: receiver.id,
        status: randomItem(["pending", "accepted", "accepted", "accepted"]),
        respondedAt: faker.datatype.boolean(0.7) ? new Date() : null,
      });
    }
  }

  await db.insert(userConnections).values(connectionsToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${connectionsToCreate.length} connections`);

  // 5. Conversations and Messages
  console.log("💬 Creating conversations and messages...");
  const conversationsToCreate = [];
  
  for (let i = 0; i < 40; i++) {
    const participant1 = randomItem(students);
    const participant2 = randomItem(allUsers.filter(u => u.id !== participant1.id));
    conversationsToCreate.push({
      participantIds: [participant1.id, participant2.id],
      isGroup: false,
      lastMessageAt: randomDate(new Date(2024, 8, 1), new Date()),
    });
  }

  const insertedConvos = await db.insert(conversations).values(conversationsToCreate).returning();
  console.log(`  ✓ Created ${insertedConvos.length} conversations`);

  const messagesToCreate = insertedConvos.flatMap(convo => {
    const numMessages = faker.number.int({ min: 3, max: 15 });
    return Array.from({ length: numMessages }, (_, idx) => ({
      conversationId: convo.id,
      senderId: randomItem(convo.participantIds),
      content: faker.lorem.sentence(),
      isRead: idx < numMessages - 2,
      createdAt: randomDate(new Date(2024, 8, 1), new Date()),
    }));
  });

  await db.insert(messages).values(messagesToCreate);
  console.log(`  ✓ Created ${messagesToCreate.length} messages`);

  // 6. Discussion Upvotes
  console.log("👍 Creating discussion upvotes...");
  const upvotesToCreate: any[] = [];
  const upvotePairs = new Set<string>();

  for (const discussion of allDiscussions.slice(0, 50)) {
    const numUpvotes = faker.number.int({ min: 1, max: 8 });
    const voters = randomItems(students, numUpvotes);
    
    for (const voter of voters) {
      const pairKey = `${discussion.id}-${voter.id}`;
      if (!upvotePairs.has(pairKey)) {
        upvotePairs.add(pairKey);
        upvotesToCreate.push({
          discussionId: discussion.id,
          userId: voter.id,
          createdAt: new Date(),
        });
      }
    }
  }

  // Also upvote some replies
  for (const reply of allReplies.slice(0, 100)) {
    const numUpvotes = faker.number.int({ min: 0, max: 4 });
    const voters = randomItems(students, numUpvotes);
    
    for (const voter of voters) {
      const pairKey = `reply-${reply.id}-${voter.id}`;
      if (!upvotePairs.has(pairKey)) {
        upvotePairs.add(pairKey);
        upvotesToCreate.push({
          replyId: reply.id,
          userId: voter.id,
          createdAt: new Date(),
        });
      }
    }
  }

  await db.insert(discussionUpvotes).values(upvotesToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${upvotesToCreate.length} upvotes`);

  // 7. Course Milestones
  console.log("🏆 Creating course milestones...");
  const milestonesToCreate: any[] = [];
  
  for (const enrollment of allEnrollments.slice(0, 100)) {
    const numMilestones = faker.number.int({ min: 1, max: 4 });
    const milestoneTypes = ["assignment_completed", "quiz_passed", "module_finished", "project_submitted"];
    
    for (let i = 0; i < numMilestones; i++) {
      milestonesToCreate.push({
        courseId: enrollment.courseId,
        studentId: enrollment.studentId,
        milestoneName: `${randomItem(milestoneTypes)} - Week ${i + 1}`,
        milestoneType: randomItem(milestoneTypes),
        pointsEarned: faker.number.int({ min: 10, max: 100 }),
        completedAt: randomDate(new Date(2024, 8, 1), new Date()),
      });
    }
  }

  await db.insert(courseMilestones).values(milestonesToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${milestonesToCreate.length} milestones`);

  // 8. Group Posts
  console.log("📰 Creating group posts...");
  const groupPostsToCreate = allGroups.flatMap(group => {
    const numPosts = faker.number.int({ min: 5, max: 15 });
    return Array.from({ length: numPosts }, () => ({
      groupId: group.id,
      authorId: randomItem(students).id,
      content: faker.lorem.paragraph(),
      mediaType: randomItem(["text", "text", "image"]),
      mediaUrl: faker.datatype.boolean(0.2) ? faker.image.url() : null,
      createdAt: randomDate(new Date(2024, 6, 1), new Date()),
    }));
  });

  await db.insert(groupPosts).values(groupPostsToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${groupPostsToCreate.length} group posts`);

  // 9. Post Shares and Boosts
  console.log("🔄 Creating post shares and boosts...");
  const sharesToCreate = allPosts.slice(0, 50).map(post => ({
    postId: post.id,
    userId: randomItem(students).id,
    platform: randomItem(["linkedin", "twitter", "copy_link"]),
    createdAt: randomDate(new Date(post.createdAt!), new Date()),
  }));

  await db.insert(postShares).values(sharesToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${sharesToCreate.length} post shares`);

  const boostsToCreate = allPosts.slice(0, 20).map(post => ({
    postId: post.id,
    userId: randomItem(teachers).id,
    boostType: randomItem(["highlight", "pin", "promote"]),
    expiresAt: faker.date.future(),
    createdAt: randomDate(new Date(post.createdAt!), new Date()),
  }));

  await db.insert(postBoosts).values(boostsToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${boostsToCreate.length} post boosts`);

  // 10. AI Chat Sessions and Messages
  console.log("🤖 Creating AI chat sessions...");
  const sessionsToCreate = students.slice(0, 30).map(student => ({
    userId: student.id,
    courseId: randomItem(allCourses).id,
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    createdAt: randomDate(new Date(2024, 8, 1), new Date()),
  }));

  const insertedSessions = await db.insert(aiChatSessions).values(sessionsToCreate).returning();
  console.log(`  ✓ Created ${insertedSessions.length} AI chat sessions`);

  const aiMessagesToCreate = insertedSessions.flatMap(session => {
    const numMessages = faker.number.int({ min: 4, max: 12 });
    const messagesArr: any[] = [];
    
    for (let i = 0; i < numMessages; i++) {
      messagesArr.push({
        sessionId: session.id,
        role: i % 2 === 0 ? "user" : "assistant",
        content: faker.lorem.paragraph(),
        createdAt: randomDate(new Date(session.createdAt!), new Date()),
      });
    }
    return messagesArr;
  });

  await db.insert(aiChatMessages).values(aiMessagesToCreate);
  console.log(`  ✓ Created ${aiMessagesToCreate.length} AI chat messages`);

  // 11. Teacher Content
  console.log("📚 Creating teacher content...");
  const teacherContentToCreate = teachers.flatMap(teacher => {
    const numContent = faker.number.int({ min: 2, max: 5 });
    const teacherCourses = allCourses.filter(c => c.instructorId === teacher.id);
    
    return Array.from({ length: numContent }, () => ({
      teacherId: teacher.id,
      courseId: teacherCourses.length > 0 ? randomItem(teacherCourses).id : randomItem(allCourses).id,
      title: faker.lorem.sentence(),
      contentType: randomItem(["lecture_notes", "slides", "video", "quiz", "assignment"]),
      textContent: faker.lorem.paragraphs(3),
      description: faker.lorem.sentence(),
      fileUrl: faker.datatype.boolean(0.3) ? faker.internet.url() : null,
      isPublic: faker.datatype.boolean(0.8),
    }));
  });

  await db.insert(teacherContent).values(teacherContentToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${teacherContentToCreate.length} teacher content items`);

  // 12. Student Course Requests
  console.log("📋 Creating student course requests...");
  const studentCoursesToCreate = students.slice(0, 40).map(student => {
    const course = randomItem(allCourses);
    const teacher = teachers.find(t => t.university === student.university) || randomItem(teachers);
    const status = randomItem(["pending", "approved", "approved", "rejected"]);
    const isApproved = status === "approved";
    
    return {
      userId: student.id,
      courseId: course.id,
      courseName: course.name,
      validationStatus: status,
      isValidated: isApproved,
      validatedBy: isApproved ? teacher.id : null,
      validatedAt: isApproved ? randomDate(new Date(2024, 8, 1), new Date()) : null,
      isEnrolled: isApproved,
      enrolledAt: isApproved ? randomDate(new Date(2024, 8, 1), new Date()) : null,
      assignedTeacherId: teacher.id,
      createdAt: randomDate(new Date(2024, 8, 1), new Date()),
    };
  });

  await db.insert(studentCourses).values(studentCoursesToCreate).onConflictDoNothing();
  console.log(`  ✓ Created ${studentCoursesToCreate.length} student course requests`);

  console.log("\n✅ Supplemental seed completed successfully!\n");
}

seedSupplementalData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Supplemental seed failed:", err);
    process.exit(1);
  });