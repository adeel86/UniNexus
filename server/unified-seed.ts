/**
 * Unified Seed File for UniNexus Platform
 * 
 * This file merges all previous seed implementations into a single, comprehensive
 * seed that populates ALL tables with realistic, connected mock data.
 * 
 * Usage: npx tsx server/unified-seed.ts
 * 
 * All demo accounts use password: demo123
 */

import { db } from "./db";
import {
  users,
  posts,
  comments,
  reactions,
  badges,
  userBadges,
  skills,
  userSkills,
  endorsements,
  courses,
  courseEnrollments,
  courseDiscussions,
  discussionReplies,
  discussionUpvotes,
  courseMilestones,
  studentCourses,
  challenges,
  challengeParticipants,
  notifications,
  announcements,
  certifications,
  recruiterFeedback,
  followers,
  userConnections,
  postShares,
  postBoosts,
  conversations,
  messages,
  groups,
  groupMembers,
  groupPosts,
  aiInteractionEvents,
  moderationActions,
  userProfiles,
  educationRecords,
  jobExperience,
  teacherContent,
  aiChatSessions,
  aiChatMessages,
} from "@shared/schema";
import { faker } from "@faker-js/faker";
import crypto from "crypto";
import { calculateTotalPoints, getRankTier } from "./rankTiers";

// Set faker seed for reproducibility
faker.seed(42);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  UNIVERSITIES: ["Demo University", "Tech University", "MIT", "Stanford", "UC Berkeley"],
  STUDENTS_PER_UNIVERSITY: 5,
  TEACHERS_PER_UNIVERSITY: 2,
  INDUSTRY_PROFESSIONALS: 5,
  COURSES_PER_TEACHER: 2,
  POSTS_PER_STUDENT: 4,
  CHALLENGES: 4,
  GROUPS: 5,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomItem<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr);
}

function randomItems<T>(arr: T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, Math.min(count, arr.length));
}

function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

function generateVerificationHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ============================================================================
// PHASE 1: CANONICAL DATA (Skills & Badges)
// ============================================================================

const mockSkills = [
  { name: "JavaScript", category: "technical" },
  { name: "Python", category: "technical" },
  { name: "Java", category: "technical" },
  { name: "React", category: "technical" },
  { name: "Node.js", category: "technical" },
  { name: "Machine Learning", category: "technical" },
  { name: "Data Analysis", category: "technical" },
  { name: "SQL", category: "technical" },
  { name: "Cloud Computing", category: "technical" },
  { name: "Docker", category: "technical" },
  { name: "Git", category: "technical" },
  { name: "TypeScript", category: "technical" },
  { name: "UI/UX Design", category: "creative" },
  { name: "Figma", category: "creative" },
  { name: "Leadership", category: "soft_skills" },
  { name: "Communication", category: "soft_skills" },
  { name: "Problem Solving", category: "soft_skills" },
  { name: "Teamwork", category: "soft_skills" },
  { name: "Project Management", category: "soft_skills" },
  { name: "Critical Thinking", category: "soft_skills" },
];

const mockBadges = [
  { name: "First Post", description: "Created your first post", icon: "MessageSquare", category: "engagement", tier: "bronze", criteria: "Create 1 post" },
  { name: "Social Butterfly", description: "Reached 100 engagement points", icon: "Users", category: "engagement", tier: "silver", criteria: "Earn 100 engagement points" },
  { name: "Content Creator", description: "Made 50 posts", icon: "Star", category: "engagement", tier: "gold", criteria: "Post 50 times" },
  { name: "Problem Solver", description: "Helped solve 10 questions", icon: "Lightbulb", category: "problem_solving", tier: "gold", criteria: "Solve 10 discussion questions" },
  { name: "Expert Helper", description: "Helped solve 25 questions", icon: "Award", category: "problem_solving", tier: "silver", criteria: "Resolve 25 discussions" },
  { name: "Course Explorer", description: "Enrolled in your first course", icon: "BookOpen", category: "learning", tier: "bronze", criteria: "Enroll in 1 course" },
  { name: "Eager Learner", description: "Enrolled in 5 courses", icon: "GraduationCap", category: "learning", tier: "silver", criteria: "Enroll in 5 courses" },
  { name: "Team Player", description: "Received first endorsement", icon: "Users", category: "social", tier: "bronze", criteria: "Get 1 endorsement" },
  { name: "Challenge Accepted", description: "Joined your first challenge", icon: "Flag", category: "achievement", tier: "bronze", criteria: "Join 1 challenge" },
  { name: "Champion", description: "Won a challenge", icon: "Trophy", category: "achievement", tier: "gold", criteria: "Win a challenge" },
  { name: "Streak Master", description: "Maintained a 30-day streak", icon: "Flame", category: "engagement", tier: "platinum", criteria: "Maintain 30-day activity streak" },
  { name: "Rising Star", description: "Earned 1000 engagement points", icon: "Star", category: "achievement", tier: "gold", criteria: "Earn 1000 engagement points" },
];

// ============================================================================
// PHASE 2: DEMO ACCOUNTS + USERS
// ============================================================================

const demoUsers = [
  {
    firebaseUid: "demo_student_uid",
    email: "demo.student@uninexus.app",
    firstName: "Demo",
    lastName: "Student",
    displayName: "Demo Student",
    profileImageUrl: "https://i.pravatar.cc/150?img=10",
    role: "student",
    bio: "Demo student account to explore the social feed, gamification, and AI CareerBot features.",
    university: "Demo University",
    major: "Computer Science",
    graduationYear: 2026,
    interests: ["Web Development", "AI", "React", "JavaScript", "Python"],
    engagementScore: 500,
    problemSolverScore: 300,
    endorsementScore: 25,
    challengePoints: 100,
    totalPoints: 925,
    rankTier: "silver" as const,
    streak: 7,
    isVerified: true,
    verifiedAt: new Date(),
  },
  {
    firebaseUid: "demo_teacher_uid",
    email: "demo.teacher@uninexus.app",
    firstName: "Demo",
    lastName: "Teacher",
    displayName: "Demo Teacher",
    profileImageUrl: "https://i.pravatar.cc/150?img=11",
    role: "teacher",
    bio: "Demo teacher account to access student analytics and endorsement tools.",
    university: "Demo University",
    position: "Instructor",
    interests: ["Teaching", "Technology", "Student Success"],
    engagementScore: 200,
    problemSolverScore: 0,
    endorsementScore: 0,
    totalPoints: 200,
    rankTier: "bronze" as const,
    streak: 5,
    isVerified: true,
    verifiedAt: new Date(),
  },
  {
    firebaseUid: "demo_university_uid",
    email: "demo.university@uninexus.app",
    firstName: "Demo",
    lastName: "Admin",
    displayName: "Demo University Admin",
    profileImageUrl: "https://i.pravatar.cc/150?img=12",
    role: "university_admin",
    bio: "Demo university admin account to view retention metrics and institutional insights.",
    university: "Demo University",
    position: "Administrator",
    interests: ["Education", "Analytics", "Student Success"],
    isVerified: true,
    verifiedAt: new Date(),
  },
  {
    firebaseUid: "demo_industry_uid",
    email: "demo.industry@uninexus.app",
    firstName: "Demo",
    lastName: "Partner",
    displayName: "Demo Industry Partner",
    profileImageUrl: "https://i.pravatar.cc/150?img=13",
    role: "industry_professional",
    bio: "Demo industry partner account to discover talent and post challenges.",
    company: "Demo Tech Inc",
    position: "Talent Acquisition Manager",
    interests: ["Innovation", "Talent", "Technology"],
    isVerified: true,
    verifiedAt: new Date(),
  },
  {
    firebaseUid: "demo_admin_uid",
    email: "demo.admin@uninexus.app",
    firstName: "Demo",
    lastName: "Master",
    displayName: "Demo Master Admin",
    profileImageUrl: "https://i.pravatar.cc/150?img=14",
    role: "master_admin",
    bio: "Demo master admin account with full platform control and moderation capabilities.",
    university: "Demo University",
    position: "Platform Administrator",
    interests: ["Platform Management", "Moderation", "Analytics"],
    isVerified: true,
    verifiedAt: new Date(),
  },
];

function generateStudent(university: string, index: number): any {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const majors = ["Computer Science", "Data Science", "Software Engineering", "Cybersecurity", "AI Research", "Information Systems"];
  
  const engagementScore = faker.number.int({ min: 100, max: 2500 });
  const problemSolverScore = faker.number.int({ min: 50, max: 1200 });
  const endorsementScore = faker.number.int({ min: 0, max: 80 });
  const challengePoints = faker.number.int({ min: 0, max: 600 });
  const totalPoints = calculateTotalPoints(engagementScore, problemSolverScore, endorsementScore, challengePoints);

  return {
    firebaseUid: `student_${university.toLowerCase().replace(/\s/g, '_')}_${index}_uid`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    profileImageUrl: `https://i.pravatar.cc/150?img=${20 + index}`,
    role: "student",
    bio: faker.lorem.sentence(),
    university,
    major: randomItem(majors),
    graduationYear: faker.number.int({ min: 2025, max: 2028 }),
    interests: randomItems(["AI", "Web Development", "Mobile Apps", "Cloud Computing", "Cybersecurity", "Data Science", "Blockchain", "IoT", "DevOps", "Game Development"], faker.number.int({ min: 3, max: 5 })),
    engagementScore,
    problemSolverScore,
    endorsementScore,
    challengePoints,
    totalPoints,
    rankTier: getRankTier(totalPoints),
    streak: faker.number.int({ min: 0, max: 30 }),
    isVerified: true,
    verifiedAt: new Date(),
  };
}

function generateTeacher(university: string, index: number): any {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const positions = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Senior Instructor"];

  return {
    firebaseUid: `teacher_${university.toLowerCase().replace(/\s/g, '_')}_${index}_uid`,
    email: faker.internet.email({ firstName, lastName, provider: "university.edu" }).toLowerCase(),
    firstName,
    lastName,
    displayName: `${randomItem(["Dr.", "Prof."])} ${firstName} ${lastName}`,
    profileImageUrl: `https://i.pravatar.cc/150?img=${50 + index}`,
    role: "teacher",
    bio: `${randomItem(positions)} specializing in ${randomItem(["Computer Science", "Data Science", "Software Engineering", "AI Research"])}.`,
    university,
    position: randomItem(positions),
    interests: randomItems(["Teaching", "Research", "AI", "Education Technology", "Mentorship", "Innovation"], 3),
    engagementScore: faker.number.int({ min: 100, max: 500 }),
    isVerified: true,
    verifiedAt: new Date(),
  };
}

function generateIndustryProfessional(index: number): any {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const companies = ["TechCorp Solutions", "InnovateTech", "DataDriven Inc", "CloudScale", "AI Ventures", "CyberSecure Ltd"];
  const positions = ["Senior Recruiter", "Talent Acquisition Manager", "Engineering Manager", "Tech Lead", "HR Director"];

  return {
    firebaseUid: `industry_${index}_uid`,
    email: faker.internet.email({ firstName, lastName, provider: "company.com" }).toLowerCase(),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    profileImageUrl: `https://i.pravatar.cc/150?img=${70 + index}`,
    role: "industry_professional",
    bio: `${randomItem(positions)} at ${randomItem(companies)}. Connecting brilliant students with amazing opportunities!`,
    company: randomItem(companies),
    position: randomItem(positions),
    interests: ["Talent Acquisition", "Innovation", "Technology", "Startups", "Hiring"],
    isVerified: true,
    verifiedAt: new Date(),
  };
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function unifiedSeed() {
  console.log("\n");
  console.log("=".repeat(70));
  console.log("  UNINEXUS UNIFIED DATABASE SEED");
  console.log("  Populating all tables with comprehensive mock data");
  console.log("=".repeat(70));
  console.log("\n");

  try {
    // ========================================================================
    // PHASE 1: Skills and Badges
    // ========================================================================
    console.log("PHASE 1: Canonical Data (Skills & Badges)");
    console.log("-".repeat(50));

    let insertedSkills = await db.insert(skills).values(mockSkills).onConflictDoNothing().returning();
    if (insertedSkills.length === 0) {
      insertedSkills = await db.select().from(skills);
    }
    console.log(`  [+] Skills: ${insertedSkills.length}`);

    let insertedBadges = await db.insert(badges).values(mockBadges).onConflictDoNothing().returning();
    if (insertedBadges.length === 0) {
      insertedBadges = await db.select().from(badges);
    }
    console.log(`  [+] Badges: ${insertedBadges.length}`);

    // ========================================================================
    // PHASE 2: Users
    // ========================================================================
    console.log("\nPHASE 2: Users");
    console.log("-".repeat(50));

    const allUsersToCreate: any[] = [...demoUsers];

    // Generate students for each university
    let studentIndex = 0;
    for (const university of CONFIG.UNIVERSITIES) {
      for (let i = 0; i < CONFIG.STUDENTS_PER_UNIVERSITY; i++) {
        allUsersToCreate.push(generateStudent(university, studentIndex++));
      }
    }

    // Generate teachers for each university
    let teacherIndex = 0;
    for (const university of CONFIG.UNIVERSITIES) {
      for (let i = 0; i < CONFIG.TEACHERS_PER_UNIVERSITY; i++) {
        allUsersToCreate.push(generateTeacher(university, teacherIndex++));
      }
    }

    // Generate industry professionals
    for (let i = 0; i < CONFIG.INDUSTRY_PROFESSIONALS; i++) {
      allUsersToCreate.push(generateIndustryProfessional(i));
    }

    let insertedUsers = await db.insert(users).values(allUsersToCreate).onConflictDoNothing().returning();
    if (insertedUsers.length === 0) {
      insertedUsers = await db.select().from(users);
    }
    console.log(`  [+] Users: ${insertedUsers.length}`);

    // Organize users by role
    const studentUsers = insertedUsers.filter((u: any) => u.role === "student");
    const teacherUsers = insertedUsers.filter((u: any) => u.role === "teacher");
    const industryUsers = insertedUsers.filter((u: any) => u.role === "industry_professional");
    const adminUsers = insertedUsers.filter((u: any) => u.role === "university_admin" || u.role === "master_admin");

    console.log(`      - Students: ${studentUsers.length}`);
    console.log(`      - Teachers: ${teacherUsers.length}`);
    console.log(`      - Industry Professionals: ${industryUsers.length}`);
    console.log(`      - Admins: ${adminUsers.length}`);

    // ========================================================================
    // PHASE 3: User Profiles & Education
    // ========================================================================
    console.log("\nPHASE 3: User Profiles & Education");
    console.log("-".repeat(50));

    // User Profiles
    const profilesToCreate = insertedUsers.map((user: any) => {
      const baseProfile: any = { userId: user.id };
      if (user.role === "student") {
        baseProfile.programme = user.major || "Computer Science";
        baseProfile.modules = randomItems(["CS101", "CS201", "CS301", "MATH201", "PHYS101", "DATA101"], 4);
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
      } else if (user.role === "industry_professional") {
        baseProfile.companyMission = faker.lorem.paragraph();
        baseProfile.industryFocus = randomItems(["Technology", "Finance", "Healthcare", "Education"], 2);
        baseProfile.hiringOpportunities = faker.lorem.sentence();
      }
      return baseProfile;
    });

    await db.insert(userProfiles).values(profilesToCreate).onConflictDoNothing();
    console.log(`  [+] User Profiles: ${profilesToCreate.length}`);

    // Education Records
    const educationToCreate = studentUsers.flatMap((student: any) => {
      return Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => ({
        userId: student.id,
        institution: student.university || "University",
        degree: randomItem(["Bachelor of Science", "Master of Science", "Bachelor of Arts"]),
        fieldOfStudy: student.major || "Computer Science",
        startDate: "2020-09",
        endDate: faker.datatype.boolean(0.5) ? "2024-05" : null,
        grade: randomItem(["3.8 GPA", "3.5 GPA", "4.0 GPA", "First Class Honours"]),
        description: faker.lorem.sentence(),
        isCurrent: faker.datatype.boolean(0.6),
      }));
    });

    await db.insert(educationRecords).values(educationToCreate).onConflictDoNothing();
    console.log(`  [+] Education Records: ${educationToCreate.length}`);

    // Job Experience
    const jobsToCreate = [...studentUsers.slice(0, 15), ...industryUsers, ...teacherUsers].flatMap((user: any) => {
      return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
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
    console.log(`  [+] Job Experience: ${jobsToCreate.length}`);

    // ========================================================================
    // PHASE 4: User Skills & Badges
    // ========================================================================
    console.log("\nPHASE 4: User Skills & Badges");
    console.log("-".repeat(50));

    // Assign skills to students
    const userSkillsToCreate: any[] = [];
    for (const student of studentUsers) {
      const numSkills = faker.number.int({ min: 3, max: 7 });
      const selectedSkills = randomItems(insertedSkills, numSkills);
      for (const skill of selectedSkills) {
        userSkillsToCreate.push({
          userId: student.id,
          skillId: skill.id,
          level: randomItem(["beginner", "intermediate", "advanced", "expert"]),
        });
      }
    }

    await db.insert(userSkills).values(userSkillsToCreate).onConflictDoNothing();
    console.log(`  [+] User Skills: ${userSkillsToCreate.length}`);

    // Assign badges to active students
    const userBadgesToCreate: any[] = [];
    for (const student of studentUsers.slice(0, 20)) {
      const numBadges = faker.number.int({ min: 1, max: 4 });
      const selectedBadges = randomItems(insertedBadges, numBadges);
      for (const badge of selectedBadges) {
        userBadgesToCreate.push({
          userId: student.id,
          badgeId: badge.id,
          earnedAt: randomDate(new Date(2024, 6, 1), new Date()),
        });
      }
    }

    await db.insert(userBadges).values(userBadgesToCreate).onConflictDoNothing();
    console.log(`  [+] User Badges: ${userBadgesToCreate.length}`);

    // ========================================================================
    // PHASE 5: Courses & Enrollments
    // ========================================================================
    console.log("\nPHASE 5: Courses & Enrollments");
    console.log("-".repeat(50));

    const courseNames = [
      "Introduction to Web Development",
      "Advanced React Patterns",
      "Machine Learning Fundamentals",
      "Data Structures and Algorithms",
      "Database Systems",
      "Cloud Computing",
      "Cybersecurity Essentials",
      "Software Engineering",
      "Python Programming",
      "Mobile App Development",
    ];

    const coursesToCreate: any[] = [];
    for (const teacher of teacherUsers) {
      const numCourses = faker.number.int({ min: 1, max: CONFIG.COURSES_PER_TEACHER });
      for (let i = 0; i < numCourses; i++) {
        const courseName = randomItem(courseNames);
        coursesToCreate.push({
          name: courseName,
          code: `CS${faker.number.int({ min: 100, max: 499 })}`,
          description: `Comprehensive ${courseName} course covering fundamental and advanced topics.`,
          university: teacher.university,
          instructorId: teacher.id,
          semester: randomItem(["Fall 2024", "Spring 2025"]),
          universityValidationStatus: randomItem(["validated", "pending", "rejected"]),
          isUniversityValidated: faker.datatype.boolean(0.7),
        });
      }
    }

    let insertedCourses = await db.insert(courses).values(coursesToCreate).onConflictDoNothing().returning();
    if (insertedCourses.length === 0) {
      insertedCourses = await db.select().from(courses);
    }
    console.log(`  [+] Courses: ${insertedCourses.length}`);

    // Enrollments
    const enrollmentsToCreate: any[] = [];
    for (const student of studentUsers) {
      const universityCourses = insertedCourses.filter((c: any) => c.university === student.university);
      const numEnrollments = Math.min(faker.number.int({ min: 2, max: 4 }), universityCourses.length);
      const enrolledCourses = randomItems(universityCourses, numEnrollments);
      for (const course of enrolledCourses) {
        enrollmentsToCreate.push({
          courseId: course.id,
          studentId: student.id,
          enrolledAt: randomDate(new Date(2024, 7, 1), new Date()),
        });
      }
    }

    let insertedEnrollments = await db.insert(courseEnrollments).values(enrollmentsToCreate).onConflictDoNothing().returning();
    if (insertedEnrollments.length === 0) {
      insertedEnrollments = await db.select().from(courseEnrollments);
    }
    console.log(`  [+] Enrollments: ${insertedEnrollments.length}`);

    // Course Discussions
    const discussionsToCreate: any[] = [];
    for (const course of insertedCourses) {
      const numDiscussions = faker.number.int({ min: 2, max: 5 });
      for (let i = 0; i < numDiscussions; i++) {
        discussionsToCreate.push({
          courseId: course.id,
          authorId: randomItem(studentUsers).id,
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraph(),
          isQuestion: faker.datatype.boolean(0.7),
          isResolved: faker.datatype.boolean(0.4),
          replyCount: 0,
          upvoteCount: faker.number.int({ min: 0, max: 15 }),
          createdAt: randomDate(new Date(2024, 8, 1), new Date()),
        });
      }
    }

    let insertedDiscussions = await db.insert(courseDiscussions).values(discussionsToCreate).onConflictDoNothing().returning();
    if (insertedDiscussions.length === 0) {
      insertedDiscussions = await db.select().from(courseDiscussions);
    }
    console.log(`  [+] Course Discussions: ${insertedDiscussions.length}`);

    // Discussion Replies
    const repliesToCreate: any[] = [];
    for (const discussion of insertedDiscussions) {
      const numReplies = faker.number.int({ min: 1, max: 4 });
      for (let i = 0; i < numReplies; i++) {
        repliesToCreate.push({
          discussionId: discussion.id,
          authorId: randomItem([...studentUsers, ...teacherUsers]).id,
          content: faker.lorem.paragraph(),
          upvoteCount: faker.number.int({ min: 0, max: 10 }),
          createdAt: randomDate(new Date(discussion.createdAt!), new Date()),
        });
      }
    }

    let insertedReplies = await db.insert(discussionReplies).values(repliesToCreate).onConflictDoNothing().returning();
    if (insertedReplies.length === 0) {
      insertedReplies = await db.select().from(discussionReplies);
    }
    console.log(`  [+] Discussion Replies: ${insertedReplies.length}`);

    // Discussion Upvotes
    const upvotesToCreate: any[] = [];
    const upvotePairs = new Set<string>();
    for (const discussion of insertedDiscussions.slice(0, 30)) {
      const numUpvotes = faker.number.int({ min: 1, max: 6 });
      const voters = randomItems(studentUsers, numUpvotes);
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

    await db.insert(discussionUpvotes).values(upvotesToCreate).onConflictDoNothing();
    console.log(`  [+] Discussion Upvotes: ${upvotesToCreate.length}`);

    // Course Milestones
    const milestonesToCreate: any[] = [];
    for (const enrollment of insertedEnrollments.slice(0, 50)) {
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
    console.log(`  [+] Course Milestones: ${milestonesToCreate.length}`);

    // Student Course Requests
    const studentCoursesToCreate = studentUsers.slice(0, 25).map((student: any) => {
      const course = randomItem(insertedCourses);
      const teacher = teacherUsers.find((t: any) => t.university === student.university) || randomItem(teacherUsers);
      return {
        userId: student.id,
        courseId: course.id,
        courseName: course.name,
        status: randomItem(["pending", "approved", "approved", "rejected"]),
        assignedTeacherId: teacher.id,
        requestedAt: randomDate(new Date(2024, 8, 1), new Date()),
      };
    });

    await db.insert(studentCourses).values(studentCoursesToCreate).onConflictDoNothing();
    console.log(`  [+] Student Course Requests: ${studentCoursesToCreate.length}`);

    // Teacher Content
    const teacherContentToCreate = teacherUsers.flatMap((teacher: any) => {
      const teachersCourses = insertedCourses.filter((c: any) => c.instructorId === teacher.id);
      if (teachersCourses.length === 0) return [];
      
      return Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => ({
        teacherId: teacher.id,
        courseId: randomItem(teachersCourses).id,
        title: faker.lorem.sentence(),
        contentType: randomItem(["lecture_notes", "slides", "video", "quiz", "assignment", "pdf"]),
        textContent: faker.lorem.paragraphs(3),
        description: faker.lorem.sentence(),
        fileUrl: faker.datatype.boolean(0.3) ? faker.internet.url() : null,
        isPublic: faker.datatype.boolean(0.8),
        tags: randomItems(["JavaScript", "Python", "React", "Web Development", "Machine Learning", "Data Science"], 3),
      }));
    });

    await db.insert(teacherContent).values(teacherContentToCreate).onConflictDoNothing();
    console.log(`  [+] Teacher Content: ${teacherContentToCreate.length}`);

    // ========================================================================
    // PHASE 6: Posts & Engagement
    // ========================================================================
    console.log("\nPHASE 6: Posts & Engagement");
    console.log("-".repeat(50));

    // Posts
    const postsToCreate: any[] = [];
    const categories = ["academic", "social", "project", "achievement"];
    for (const student of studentUsers) {
      const numPosts = faker.number.int({ min: 2, max: CONFIG.POSTS_PER_STUDENT });
      for (let i = 0; i < numPosts; i++) {
        postsToCreate.push({
          authorId: student.id,
          content: faker.lorem.paragraph({ min: 1, max: 3 }),
          category: randomItem(categories),
          mediaType: faker.helpers.arrayElement(["text", "text", "image"]),
          tags: randomItems(student.interests || ["tech", "coding"], faker.number.int({ min: 1, max: 3 })),
          viewCount: faker.number.int({ min: 0, max: 500 }),
          shareCount: faker.number.int({ min: 0, max: 30 }),
          createdAt: randomDate(new Date(2024, 0, 1), new Date()),
        });
      }
    }

    let insertedPosts = await db.insert(posts).values(postsToCreate).onConflictDoNothing().returning();
    if (insertedPosts.length === 0) {
      insertedPosts = await db.select().from(posts);
    }
    console.log(`  [+] Posts: ${insertedPosts.length}`);

    // Comments
    const commentsToCreate: any[] = [];
    for (const post of insertedPosts) {
      const numComments = faker.number.int({ min: 0, max: 5 });
      for (let i = 0; i < numComments; i++) {
        commentsToCreate.push({
          postId: post.id,
          authorId: randomItem(studentUsers).id,
          content: faker.lorem.sentence(),
          createdAt: randomDate(new Date(post.createdAt!), new Date()),
        });
      }
    }

    let insertedComments = await db.insert(comments).values(commentsToCreate).onConflictDoNothing().returning();
    if (insertedComments.length === 0) {
      insertedComments = await db.select().from(comments);
    }
    console.log(`  [+] Comments: ${insertedComments.length}`);

    // Reactions
    const reactionsToCreate: any[] = [];
    const reactionTypes = ["like", "celebrate", "insightful", "support"];
    const reactionPairs = new Set<string>();
    for (const post of insertedPosts) {
      const numReactions = faker.number.int({ min: 3, max: 15 });
      const reactors = randomItems(studentUsers, numReactions);
      for (const reactor of reactors) {
        const pairKey = `${post.id}-${reactor.id}`;
        if (!reactionPairs.has(pairKey)) {
          reactionPairs.add(pairKey);
          reactionsToCreate.push({
            postId: post.id,
            userId: reactor.id,
            type: randomItem(reactionTypes),
            createdAt: randomDate(new Date(post.createdAt!), new Date()),
          });
        }
      }
    }

    let insertedReactions = await db.insert(reactions).values(reactionsToCreate).onConflictDoNothing().returning();
    if (insertedReactions.length === 0) {
      insertedReactions = await db.select().from(reactions);
    }
    console.log(`  [+] Reactions: ${insertedReactions.length}`);

    // Post Shares
    const sharesToCreate = insertedPosts.slice(0, 40).map((post: any) => ({
      postId: post.id,
      userId: randomItem(studentUsers).id,
      platform: randomItem(["linkedin", "twitter", "copy_link"]),
      createdAt: randomDate(new Date(post.createdAt!), new Date()),
    }));

    await db.insert(postShares).values(sharesToCreate).onConflictDoNothing();
    console.log(`  [+] Post Shares: ${sharesToCreate.length}`);

    // Post Boosts
    const boostsToCreate = insertedPosts.slice(0, 15).map((post: any) => ({
      postId: post.id,
      userId: randomItem(teacherUsers).id,
      boostType: randomItem(["highlight", "pin", "promote"]),
      expiresAt: faker.date.future(),
      createdAt: randomDate(new Date(post.createdAt!), new Date()),
    }));

    await db.insert(postBoosts).values(boostsToCreate).onConflictDoNothing();
    console.log(`  [+] Post Boosts: ${boostsToCreate.length}`);

    // ========================================================================
    // PHASE 7: Social Connections
    // ========================================================================
    console.log("\nPHASE 7: Social Connections");
    console.log("-".repeat(50));

    // User Connections
    const connectionsToCreate: any[] = [];
    const connectionPairs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const requester = randomItem(studentUsers);
      const receiver = randomItem(insertedUsers.filter((u: any) => u.id !== requester.id));
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
    console.log(`  [+] User Connections: ${connectionsToCreate.length}`);

    // Followers
    const followersToCreate: any[] = [];
    const followerPairs = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const follower = randomItem(studentUsers);
      const following = randomItem(insertedUsers.filter((u: any) => u.id !== follower.id));
      const pairKey = `${follower.id}-${following.id}`;
      if (!followerPairs.has(pairKey)) {
        followerPairs.add(pairKey);
        followersToCreate.push({
          followerId: follower.id,
          followingId: following.id,
          createdAt: randomDate(new Date(2024, 0, 1), new Date()),
        });
      }
    }

    await db.insert(followers).values(followersToCreate).onConflictDoNothing();
    console.log(`  [+] Followers: ${followersToCreate.length}`);

    // Endorsements
    const endorsementsToCreate: any[] = [];
    const endorsementPairs = new Set<string>();
    for (const student of studentUsers.slice(0, 25)) {
      const numEndorsements = faker.number.int({ min: 1, max: 5 });
      const endorsers = randomItems([...teacherUsers, ...studentUsers.filter((s: any) => s.id !== student.id)], numEndorsements);
      for (const endorser of endorsers) {
        const skill = randomItem(insertedSkills);
        const pairKey = `${endorser.id}-${student.id}-${skill.id}`;
        if (!endorsementPairs.has(pairKey)) {
          endorsementPairs.add(pairKey);
          endorsementsToCreate.push({
            endorserId: endorser.id,
            endorsedUserId: student.id,
            skillId: skill.id,
            comment: `Great ${skill.name} skills!`,
          });
        }
      }
    }

    await db.insert(endorsements).values(endorsementsToCreate).onConflictDoNothing();
    console.log(`  [+] Endorsements: ${endorsementsToCreate.length}`);

    // ========================================================================
    // PHASE 8: Messaging
    // ========================================================================
    console.log("\nPHASE 8: Messaging");
    console.log("-".repeat(50));

    // Conversations
    const conversationsToCreate = [];
    for (let i = 0; i < 30; i++) {
      const participant1 = randomItem(studentUsers);
      const participant2 = randomItem(insertedUsers.filter((u: any) => u.id !== participant1.id));
      conversationsToCreate.push({
        participantIds: [participant1.id, participant2.id],
        isGroup: false,
        lastMessageAt: randomDate(new Date(2024, 8, 1), new Date()),
      });
    }

    const insertedConversations = await db.insert(conversations).values(conversationsToCreate).returning();
    console.log(`  [+] Conversations: ${insertedConversations.length}`);

    // Messages
    const messagesToCreate = insertedConversations.flatMap((convo: any) => {
      const numMessages = faker.number.int({ min: 3, max: 12 });
      return Array.from({ length: numMessages }, (_, idx) => ({
        conversationId: convo.id,
        senderId: randomItem(convo.participantIds) as string,
        content: faker.lorem.sentence(),
        isRead: idx < numMessages - 2,
        createdAt: randomDate(new Date(2024, 8, 1), new Date()),
      }));
    });

    await db.insert(messages).values(messagesToCreate);
    console.log(`  [+] Messages: ${messagesToCreate.length}`);

    // ========================================================================
    // PHASE 9: Groups
    // ========================================================================
    console.log("\nPHASE 9: Groups");
    console.log("-".repeat(50));

    const groupsData = [
      { name: "React Developers Community", description: "A community for React enthusiasts.", groupType: "skill", category: "Tech" },
      { name: "AI/ML Study Group", description: "Learn AI and ML together.", groupType: "study_group", category: "Science" },
      { name: "Career Prep Hub", description: "Prepare for interviews and share opportunities.", groupType: "hobby", category: "Career" },
      { name: "Web Development Club", description: "Everything about web development.", groupType: "skill", category: "Tech" },
      { name: "Data Science Network", description: "Connect with data enthusiasts.", groupType: "study_group", category: "Science" },
    ];

    const groupsToCreate = groupsData.map((g) => ({
      ...g,
      creatorId: randomItem(studentUsers).id,
      isPrivate: false,
      memberCount: 0,
    }));

    let insertedGroups = await db.insert(groups).values(groupsToCreate).onConflictDoNothing().returning();
    if (insertedGroups.length === 0) {
      insertedGroups = await db.select().from(groups);
    }
    console.log(`  [+] Groups: ${insertedGroups.length}`);

    // Group Members
    const groupMembersToCreate: any[] = [];
    const memberPairs = new Set<string>();
    for (const group of insertedGroups) {
      const numMembers = faker.number.int({ min: 5, max: 15 });
      const members = randomItems(studentUsers, numMembers);
      for (let i = 0; i < members.length; i++) {
        const pairKey = `${group.id}-${members[i].id}`;
        if (!memberPairs.has(pairKey)) {
          memberPairs.add(pairKey);
          groupMembersToCreate.push({
            groupId: group.id,
            userId: members[i].id,
            role: i === 0 ? "admin" : "member",
          });
        }
      }
    }

    await db.insert(groupMembers).values(groupMembersToCreate).onConflictDoNothing();
    console.log(`  [+] Group Members: ${groupMembersToCreate.length}`);

    // Group Posts
    const groupPostsToCreate = insertedGroups.flatMap((group: any) => {
      const numPosts = faker.number.int({ min: 3, max: 10 });
      return Array.from({ length: numPosts }, () => ({
        groupId: group.id,
        authorId: randomItem(studentUsers).id,
        content: faker.lorem.paragraph(),
        mediaType: randomItem(["text", "text", "image"]),
        mediaUrl: faker.datatype.boolean(0.2) ? faker.image.url() : null,
        createdAt: randomDate(new Date(2024, 6, 1), new Date()),
      }));
    });

    await db.insert(groupPosts).values(groupPostsToCreate).onConflictDoNothing();
    console.log(`  [+] Group Posts: ${groupPostsToCreate.length}`);

    // ========================================================================
    // PHASE 10: Challenges & Gamification
    // ========================================================================
    console.log("\nPHASE 10: Challenges & Gamification");
    console.log("-".repeat(50));

    // Challenges
    const challengesData = [
      { title: "30-Day Coding Challenge", description: "Code every day for 30 days!", type: "skill", points: 500, maxParticipants: 100 },
      { title: "AI Innovation Hackathon", description: "Build an innovative AI project in 48 hours.", type: "hackathon", points: 1000, maxParticipants: 50 },
      { title: "Open Source Contribution", description: "Contribute to open source projects.", type: "skill", points: 300, maxParticipants: 200 },
      { title: "Data Science Challenge", description: "Analyze real-world datasets.", type: "hackathon", points: 750, maxParticipants: 75 },
    ];

    const challengesToCreate = challengesData.map((c) => ({
      ...c,
      creatorId: randomItem([...industryUsers, ...teacherUsers]).id,
      startDate: faker.date.soon({ days: 10 }),
      endDate: faker.date.future({ years: 0.5 }),
    }));

    let insertedChallenges = await db.insert(challenges).values(challengesToCreate).onConflictDoNothing().returning();
    if (insertedChallenges.length === 0) {
      insertedChallenges = await db.select().from(challenges);
    }
    console.log(`  [+] Challenges: ${insertedChallenges.length}`);

    // Challenge Participants
    const participantsToCreate: any[] = [];
    const participantPairs = new Set<string>();
    for (const challenge of insertedChallenges) {
      const numParticipants = faker.number.int({ min: 5, max: 15 });
      const participants = randomItems(studentUsers, numParticipants);
      for (const participant of participants) {
        const pairKey = `${challenge.id}-${participant.id}`;
        if (!participantPairs.has(pairKey)) {
          participantPairs.add(pairKey);
          participantsToCreate.push({
            challengeId: challenge.id,
            userId: participant.id,
            status: randomItem(["active", "active", "completed"]),
          });
        }
      }
    }

    await db.insert(challengeParticipants).values(participantsToCreate).onConflictDoNothing();
    console.log(`  [+] Challenge Participants: ${participantsToCreate.length}`);

    // ========================================================================
    // PHASE 11: Notifications & Announcements
    // ========================================================================
    console.log("\nPHASE 11: Notifications & Announcements");
    console.log("-".repeat(50));

    // Notifications
    const notificationTypes = ["reaction", "comment", "endorsement", "badge", "challenge", "mention"];
    const notificationsToCreate: any[] = [];
    for (const student of studentUsers.slice(0, 20)) {
      const numNotifications = faker.number.int({ min: 3, max: 8 });
      for (let i = 0; i < numNotifications; i++) {
        const notifType = randomItem(notificationTypes);
        notificationsToCreate.push({
          userId: student.id,
          type: notifType,
          title: `New ${notifType}`,
          message: faker.lorem.sentence(),
          link: "/",
          isRead: faker.datatype.boolean(0.5),
          createdAt: randomDate(new Date(2024, 9, 1), new Date()),
        });
      }
    }

    await db.insert(notifications).values(notificationsToCreate).onConflictDoNothing();
    console.log(`  [+] Notifications: ${notificationsToCreate.length}`);

    // Announcements
    const announcementsToCreate = [
      { authorId: adminUsers[0]?.id || insertedUsers[0].id, title: "Welcome to UniNexus!", content: "Welcome to our learning platform. Get started by exploring courses and connecting with peers.", targetAudience: "all", isPinned: true },
      { authorId: industryUsers[0]?.id || insertedUsers[0].id, title: "Hiring Event Coming Soon", content: "Join us for a virtual hiring event next week. All students welcome!", targetAudience: "students", isPinned: false },
      { authorId: teacherUsers[0]?.id || insertedUsers[0].id, title: "New Course Materials Available", content: "Check out the latest course materials uploaded by your instructors.", targetAudience: "students", isPinned: false },
    ];

    await db.insert(announcements).values(announcementsToCreate).onConflictDoNothing();
    console.log(`  [+] Announcements: ${announcementsToCreate.length}`);

    // ========================================================================
    // PHASE 12: Certifications & Feedback
    // ========================================================================
    console.log("\nPHASE 12: Certifications & Feedback");
    console.log("-".repeat(50));

    // Certifications
    const certificationsToCreate = studentUsers.slice(0, 15).map((student: any) => ({
      userId: student.id,
      issuerName: randomItem(CONFIG.UNIVERSITIES),
      issuerId: randomItem(teacherUsers).id,
      type: randomItem(["completion", "skill", "achievement"]),
      title: `${randomItem(["Web Development", "Machine Learning", "Data Science", "Software Engineering"])} Certification`,
      description: faker.lorem.sentence(),
      verificationHash: generateVerificationHash(`cert-${student.id}-${Date.now()}`),
      isPublic: true,
    }));

    await db.insert(certifications).values(certificationsToCreate).onConflictDoNothing();
    console.log(`  [+] Certifications: ${certificationsToCreate.length}`);

    // Recruiter Feedback
    const feedbackToCreate = studentUsers.slice(0, 10).map((student: any) => ({
      studentId: student.id,
      recruiterId: randomItem(industryUsers).id,
      rating: faker.number.int({ min: 3, max: 5 }),
      category: randomItem(["technical", "behavioral", "cultural_fit", "communication"]),
      feedback: faker.lorem.paragraph(),
    }));

    await db.insert(recruiterFeedback).values(feedbackToCreate).onConflictDoNothing();
    console.log(`  [+] Recruiter Feedback: ${feedbackToCreate.length}`);

    // ========================================================================
    // PHASE 13: AI & Admin Data
    // ========================================================================
    console.log("\nPHASE 13: AI & Admin Data");
    console.log("-".repeat(50));

    // AI Chat Sessions
    const sessionsToCreate = studentUsers.slice(0, 20).map((student: any) => ({
      userId: student.id,
      courseId: randomItem(insertedCourses).id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      createdAt: randomDate(new Date(2024, 8, 1), new Date()),
    }));

    const insertedSessions = await db.insert(aiChatSessions).values(sessionsToCreate).returning();
    console.log(`  [+] AI Chat Sessions: ${insertedSessions.length}`);

    // AI Chat Messages
    const aiMessagesToCreate = insertedSessions.flatMap((session: any) => {
      const numMessages = faker.number.int({ min: 4, max: 10 });
      return Array.from({ length: numMessages }, (_, i) => ({
        sessionId: session.id,
        role: i % 2 === 0 ? "user" : "assistant",
        content: faker.lorem.paragraph(),
        createdAt: randomDate(new Date(session.createdAt!), new Date()),
      }));
    });

    await db.insert(aiChatMessages).values(aiMessagesToCreate);
    console.log(`  [+] AI Chat Messages: ${aiMessagesToCreate.length}`);

    // AI Interaction Events
    const aiEventsToCreate = studentUsers.slice(0, 15).map((student: any) => ({
      userId: student.id,
      type: randomItem(["chat_started", "question_asked", "resource_accessed", "recommendation_clicked"]),
      metadata: { source: "unified_seed", timestamp: new Date().toISOString() },
    }));

    await db.insert(aiInteractionEvents).values(aiEventsToCreate).onConflictDoNothing();
    console.log(`  [+] AI Interaction Events: ${aiEventsToCreate.length}`);

    // Moderation Actions
    const moderationToCreate = insertedPosts.slice(0, 5).map((post: any) => ({
      contentType: "post",
      contentId: post.id,
      moderatorId: adminUsers[0]?.id || insertedUsers[0].id,
      action: randomItem(["approved", "flagged", "reviewed"]),
      reason: faker.lorem.sentence(),
      createdAt: randomDate(new Date(2024, 9, 1), new Date()),
    }));

    await db.insert(moderationActions).values(moderationToCreate).onConflictDoNothing();
    console.log(`  [+] Moderation Actions: ${moderationToCreate.length}`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n");
    console.log("=".repeat(70));
    console.log("  UNIFIED SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log("\n");
    console.log("Demo Accounts (password: demo123):");
    console.log("  - demo.student@uninexus.app    (Student)");
    console.log("  - demo.teacher@uninexus.app    (Teacher)");
    console.log("  - demo.university@uninexus.app (University Admin)");
    console.log("  - demo.industry@uninexus.app   (Industry Professional)");
    console.log("  - demo.admin@uninexus.app      (Master Admin)");
    console.log("\n");
    console.log("All tables have been populated with realistic, connected data.");
    console.log("=".repeat(70));
    console.log("\n");

  } catch (error) {
    console.error("\n[ERROR] Seeding failed:", error);
    throw error;
  }
}

// Execute
unifiedSeed()
  .catch((error) => {
    console.error("Fatal error during seeding:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
