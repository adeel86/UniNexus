/**
 * Comprehensive Mock Data Generator for UniNexus Platform
 * 
 * This script generates realistic, diverse, and internally consistent mock data
 * across all major platform tables using a multi-phase pipeline approach.
 * 
 * Usage: npm run db:seed:comprehensive
 * 
 * Data Volume: ~5000 rows total across 30+ tables
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
} from "../shared/schema";
import { faker } from "@faker-js/faker";
import crypto from "crypto";
import { calculateTotalPoints, getRankTier } from "./rankTiers";
import { eq } from "drizzle-orm";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  STUDENTS_PER_UNIVERSITY: 10,
  TEACHERS_PER_UNIVERSITY: 2,
  UNIVERSITIES: ["MIT", "Stanford", "UC Berkeley", "Carnegie Mellon", "Georgia Tech"],
  INDUSTRY_PROFESSIONALS: 8,
  UNIVERSITY_ADMINS: 3,
  COURSES_PER_UNIVERSITY: 4,
  POSTS_PER_STUDENT: 5,
  CHALLENGES: 5,
  GROUPS: 6,
};

// Initialize faker with a seed for reproducibility
faker.seed(42);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

function randomItem<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr);
}

function randomItems<T>(arr: T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, count);
}

function generateVerificationHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

interface MakeUserOptions {
  role: "student" | "teacher" | "university_admin" | "industry_professional" | "master_admin";
  university?: string;
  major?: string;
  graduationYear?: number;
  company?: string;
  position?: string;
}

function makeUser(options: MakeUserOptions): any {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const baseUser = {
    firebaseUid: `${options.role}_${faker.string.uuid()}`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    profileImageUrl: faker.image.avatar(),
    role: options.role,
    bio: faker.lorem.sentence(),
    interests: randomItems([
      "Machine Learning", "Web Development", "Mobile Apps", "Cloud Computing",
      "Cybersecurity", "Data Science", "AI Research", "Blockchain",
      "IoT", "DevOps", "Game Development", "AR/VR"
    ], faker.number.int({ min: 2, max: 5 })),
    isVerified: true,
    verifiedAt: new Date(),
  };

  if (options.role === "student") {
    return {
      ...baseUser,
      university: options.university,
      major: options.major || faker.helpers.arrayElement([
        "Computer Science", "Data Science", "Software Engineering",
        "Cybersecurity", "AI Research", "Information Systems"
      ]),
      graduationYear: options.graduationYear || faker.number.int({ min: 2025, max: 2027 }),
      engagementScore: faker.number.int({ min: 0, max: 1500 }),
      problemSolverScore: faker.number.int({ min: 0, max: 1000 }),
      endorsementScore: faker.number.int({ min: 0, max: 100 }),
      challengePoints: faker.number.int({ min: 0, max: 500 }),
      totalPoints: 0, // Will be calculated
      rankTier: "bronze",
      streak: faker.number.int({ min: 0, max: 30 }),
    };
  } else if (options.role === "teacher") {
    return {
      ...baseUser,
      university: options.university,
      position: options.position || faker.helpers.arrayElement([
        "Professor", "Associate Professor", "Assistant Professor", "Lecturer"
      ]),
    };
  } else if (options.role === "university_admin") {
    return {
      ...baseUser,
      university: options.university,
      position: options.position || "Administrator",
    };
  } else if (options.role === "industry_professional") {
    return {
      ...baseUser,
      company: options.company || faker.company.name(),
      position: options.position || faker.person.jobTitle(),
    };
  }

  return baseUser;
}

function makePost(authorId: string, authorInterests: string[]): any {
  const categories = ["academic", "social", "project", "achievement"];
  return {
    authorId,
    content: faker.lorem.paragraph({ min: 1, max: 3 }),
    category: randomItem(categories),
    mediaType: faker.helpers.arrayElement(["text", "image"]),
    tags: randomItems(authorInterests, faker.number.int({ min: 1, max: 3 })),
    viewCount: faker.number.int({ min: 0, max: 500 }),
    shareCount: faker.number.int({ min: 0, max: 50 }),
    createdAt: randomDate(new Date(2024, 0, 1), new Date()),
  };
}

function makeCourse(university: string, instructorId: string): any {
  const courseNames = [
    "Introduction to Computer Science",
    "Data Structures and Algorithms",
    "Machine Learning Fundamentals",
    "Web Development",
    "Database Systems",
    "Software Engineering",
    "Cybersecurity Essentials",
    "Cloud Computing"
  ];
  
  const name = randomItem(courseNames);
  return {
    name,
    code: `CS${faker.number.int({ min: 100, max: 499 })}`,
    description: `Comprehensive ${name} course covering fundamental and advanced topics.`,
    university,
    instructorId,
    semester: "Fall 2024",
  };
}

// ============================================================================
// PHASE 1: CANONICAL LOOKUP DATA
// ============================================================================

async function seedCanonicalData() {
  console.log("\n📚 Phase 1: Seeding canonical lookup data...");

  // Skills
  const skillsData = [
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
    { name: "UI/UX Design", category: "creative" },
    { name: "Leadership", category: "soft_skills" },
    { name: "Communication", category: "soft_skills" },
    { name: "Problem Solving", category: "soft_skills" },
    { name: "Teamwork", category: "soft_skills" },
    { name: "Project Management", category: "soft_skills" },
  ];

  let insertedSkills = await db.insert(skills).values(skillsData).onConflictDoNothing().returning();
  
  // If no skills were inserted (already exist), fetch them instead
  if (insertedSkills.length === 0) {
    insertedSkills = await db.select().from(skills);
  }
  
  console.log(`  ✓ Created ${insertedSkills.length} skills`);

  // Badges
  const badgesData = [
    { name: "First Post", description: "Created your first post", icon: "Sparkles", category: "engagement", tier: "bronze", criteria: "Post 1 time" },
    { name: "Social Butterfly", description: "Made 10 posts", icon: "MessageSquare", category: "engagement", tier: "silver", criteria: "Post 10 times" },
    { name: "Content Creator", description: "Made 50 posts", icon: "Star", category: "engagement", tier: "gold", criteria: "Post 50 times" },
    { name: "Problem Solver", description: "Helped solve 5 questions", icon: "Lightbulb", category: "problem_solving", tier: "bronze", criteria: "Resolve 5 discussions" },
    { name: "Expert Helper", description: "Helped solve 25 questions", icon: "Award", category: "problem_solving", tier: "silver", criteria: "Resolve 25 discussions" },
    { name: "Course Explorer", description: "Enrolled in your first course", icon: "BookOpen", category: "learning", tier: "bronze", criteria: "Enroll in 1 course" },
    { name: "Eager Learner", description: "Enrolled in 5 courses", icon: "GraduationCap", category: "learning", tier: "silver", criteria: "Enroll in 5 courses" },
    { name: "Team Player", description: "Received first endorsement", icon: "Users", category: "social", tier: "bronze", criteria: "Get 1 endorsement" },
    { name: "Challenge Accepted", description: "Joined your first challenge", icon: "Flag", category: "achievement", tier: "bronze", criteria: "Join 1 challenge" },
    { name: "Champion", description: "Won a challenge", icon: "Trophy", category: "achievement", tier: "gold", criteria: "Win a challenge" },
  ];

  let insertedBadges = await db.insert(badges).values(badgesData).onConflictDoNothing().returning();
  
  // If no badges were inserted (already exist), fetch them instead
  if (insertedBadges.length === 0) {
    insertedBadges = await db.select().from(badges);
  }
  
  console.log(`  ✓ Created ${insertedBadges.length} badges`);

  return { skills: insertedSkills, badges: insertedBadges };
}

// ============================================================================
// PHASE 2: PRIMARY ACTORS (USERS)
// ============================================================================

async function seedUsers() {
  console.log("\n👥 Phase 2: Seeding users...");

  const usersToCreate: any[] = [];

  // ========================================================================
  // DEMO ACCOUNTS (Password: demo123 for all)
  // ========================================================================
  
  usersToCreate.push({
    firebaseUid: "demo_student_uid",
    email: "demo.student@uninexus.app",
    firstName: "Demo",
    lastName: "Student",
    displayName: "Demo Student",
    profileImageUrl: "https://i.pravatar.cc/150?img=10",
    role: "student",
    bio: "Demo student account to explore the social feed, gamification, and AI CareerBot features.",
    university: "MIT",
    major: "Computer Science",
    graduationYear: 2026,
    interests: ["Web Development", "AI", "React", "JavaScript", "Python"],
    engagementScore: 500,
    problemSolverScore: 300,
    endorsementScore: 25,
    challengePoints: 0,
    totalPoints: 825,
    rankTier: "bronze" as const,
    streak: 7,
    isVerified: true,
    verifiedAt: new Date(),
  });

  usersToCreate.push({
    firebaseUid: "demo_teacher_uid",
    email: "demo.teacher@uninexus.app",
    firstName: "Demo",
    lastName: "Teacher",
    displayName: "Demo Teacher",
    profileImageUrl: "https://i.pravatar.cc/150?img=11",
    role: "teacher",
    bio: "Demo teacher account to access student analytics and endorsement tools.",
    university: "MIT",
    position: "Instructor",
    interests: ["Teaching", "Technology", "Student Success"],
    isVerified: true,
    verifiedAt: new Date(),
  });

  usersToCreate.push({
    firebaseUid: "demo_university_uid",
    email: "demo.university@uninexus.app",
    firstName: "Demo",
    lastName: "Admin",
    displayName: "Demo University Admin",
    profileImageUrl: "https://i.pravatar.cc/150?img=12",
    role: "university_admin",
    bio: "Demo university admin account to view retention metrics and institutional insights.",
    university: "MIT",
    position: "Administrator",
    interests: ["Education", "Analytics", "Student Success"],
    isVerified: true,
    verifiedAt: new Date(),
  });

  usersToCreate.push({
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
  });

  usersToCreate.push({
    firebaseUid: "demo_master_uid",
    email: "demo.master@uninexus.app",
    firstName: "Demo",
    lastName: "Master",
    displayName: "Demo Master Admin",
    profileImageUrl: "https://i.pravatar.cc/150?img=14",
    role: "master_admin",
    bio: "Demo master admin account with full platform access.",
    interests: ["Platform Management", "Analytics", "System Admin"],
    isVerified: true,
    verifiedAt: new Date(),
  });

  console.log("  ✓ Added 5 demo accounts");

  // Create students
  for (const university of CONFIG.UNIVERSITIES) {
    for (let i = 0; i < CONFIG.STUDENTS_PER_UNIVERSITY; i++) {
      usersToCreate.push(makeUser({ role: "student", university }));
    }
  }

  // Create teachers
  for (const university of CONFIG.UNIVERSITIES) {
    for (let i = 0; i < CONFIG.TEACHERS_PER_UNIVERSITY; i++) {
      usersToCreate.push(makeUser({ role: "teacher", university }));
    }
  }

  // Create industry professionals
  for (let i = 0; i < CONFIG.INDUSTRY_PROFESSIONALS; i++) {
    usersToCreate.push(makeUser({ role: "industry_professional" }));
  }

  // Create university admins
  for (let i = 0; i < CONFIG.UNIVERSITY_ADMINS; i++) {
    usersToCreate.push(makeUser({ 
      role: "university_admin", 
      university: randomItem(CONFIG.UNIVERSITIES) 
    }));
  }

  // Create master admin
  usersToCreate.push(makeUser({ role: "master_admin" }));

  // Calculate total points and rank tiers
  usersToCreate.forEach((user) => {
    if (user.role === "student") {
      user.totalPoints = calculateTotalPoints(
        user.engagementScore,
        user.problemSolverScore,
        user.endorsementScore,
        user.challengePoints
      );
      user.rankTier = getRankTier(user.totalPoints);
    }
  });

  let insertedUsers = await db.insert(users).values(usersToCreate).onConflictDoNothing().returning();
  
  // If no users were inserted (already exist), fetch them instead
  if (insertedUsers.length === 0) {
    insertedUsers = await db.select().from(users);
  }
  
  console.log(`  ✓ Created ${insertedUsers.length} users`);

  // Organize users by role
  const usersByRole = {
    students: insertedUsers.filter((u: any) => u.role === "student"),
    teachers: insertedUsers.filter((u: any) => u.role === "teacher"),
    industryPros: insertedUsers.filter((u: any) => u.role === "industry_professional"),
    univAdmins: insertedUsers.filter((u: any) => u.role === "university_admin"),
    masterAdmins: insertedUsers.filter((u: any) => u.role === "master_admin"),
  };

  return { users: insertedUsers, usersByRole };
}

// ============================================================================
// PHASE 3: ACADEMIC ARTIFACTS
// ============================================================================

async function seedAcademicData(
  usersByRole: any,
  skillsData: any[]
) {
  console.log("\n🎓 Phase 3: Seeding academic data...");

  // Create courses
  const coursesToCreate: any[] = [];
  for (const university of CONFIG.UNIVERSITIES) {
    const instructors = usersByRole.teachers.filter((t: any) => t.university === university);
    if (instructors.length === 0) continue;

    for (let i = 0; i < CONFIG.COURSES_PER_UNIVERSITY; i++) {
      coursesToCreate.push(makeCourse(university, randomItem(instructors).id));
    }
  }

  let insertedCourses = await db.insert(courses).values(coursesToCreate).onConflictDoNothing().returning();
  
  // If no courses were inserted (already exist), fetch them instead
  if (insertedCourses.length === 0) {
    insertedCourses = await db.select().from(courses);
  }
  
  console.log(`  ✓ Created ${insertedCourses.length} courses`);

  // Create enrollments
  const enrollmentsToCreate: any[] = [];
  for (const student of usersByRole.students) {
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
  
  // If no enrollments were inserted (already exist), fetch them instead
  if (insertedEnrollments.length === 0) {
    insertedEnrollments = await db.select().from(courseEnrollments);
  }
  
  console.log(`  ✓ Created ${insertedEnrollments.length} enrollments`);

  // Create course discussions
  const discussionsToCreate: any[] = [];
  for (const course of insertedCourses) {
    const enrolledStudents = usersByRole.students.filter((s: any) => s.university === course.university);
    const numDiscussions = faker.number.int({ min: 3, max: 8 });

    for (let i = 0; i < numDiscussions; i++) {
      discussionsToCreate.push({
        courseId: course.id,
        authorId: randomItem(enrolledStudents).id,
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        isQuestion: faker.datatype.boolean(0.7),
        isResolved: faker.datatype.boolean(0.5),
        replyCount: 0,
        upvoteCount: 0,
        createdAt: randomDate(new Date(2024, 8, 1), new Date()),
      });
    }
  }

  let insertedDiscussions = await db.insert(courseDiscussions).values(discussionsToCreate).onConflictDoNothing().returning();
  
  // If no discussions were inserted (already exist), fetch them instead
  if (insertedDiscussions.length === 0) {
    insertedDiscussions = await db.select().from(courseDiscussions);
  }
  
  console.log(`  ✓ Created ${insertedDiscussions.length} discussions`);

  // Create discussion replies
  const repliesToCreate: any[] = [];
  for (const discussion of insertedDiscussions) {
    const course = insertedCourses.find((c: any) => c.id === discussion.courseId);
    const enrolledStudents = usersByRole.students.filter((s: any) => s.university === course?.university);
    const numReplies = faker.number.int({ min: 1, max: 5 });

    for (let i = 0; i < numReplies; i++) {
      repliesToCreate.push({
        discussionId: discussion.id,
        authorId: randomItem(enrolledStudents).id,
        content: faker.lorem.paragraph(),
        upvoteCount: faker.number.int({ min: 0, max: 15 }),
        createdAt: randomDate(new Date(discussion.createdAt!), new Date()),
      });
    }
  }

  let insertedReplies = await db.insert(discussionReplies).values(repliesToCreate).onConflictDoNothing().returning();
  
  // If no replies were inserted (already exist), fetch them instead
  if (insertedReplies.length === 0) {
    insertedReplies = await db.select().from(discussionReplies);
  }
  
  console.log(`  ✓ Created ${insertedReplies.length} replies`);

  // Update discussion reply counts
  for (const discussion of insertedDiscussions) {
    const replyCount = insertedReplies.filter((r: any) => r.discussionId === discussion.id).length;
    await db.update(courseDiscussions)
      .set({ replyCount })
      .where(eq(courseDiscussions.id, discussion.id));
  }

  return { courses: insertedCourses, enrollments: insertedEnrollments, discussions: insertedDiscussions, replies: insertedReplies };
}

// ============================================================================
// PHASE 4: ENGAGEMENT SURFACES
// ============================================================================

async function seedEngagementData(
  usersByRole: any
) {
  console.log("\n💬 Phase 4: Seeding engagement data...");

  // Create posts
  const postsToCreate: any[] = [];
  for (const student of usersByRole.students) {
    const numPosts = faker.number.int({ min: 3, max: CONFIG.POSTS_PER_STUDENT });
    for (let i = 0; i < numPosts; i++) {
      postsToCreate.push(makePost(student.id, student.interests));
    }
  }

  let insertedPosts = await db.insert(posts).values(postsToCreate).onConflictDoNothing().returning();
  
  // If no posts were inserted (already exist), fetch them instead
  if (insertedPosts.length === 0) {
    insertedPosts = await db.select().from(posts);
  }
  
  console.log(`  ✓ Created ${insertedPosts.length} posts`);

  // Create comments
  const commentsToCreate: any[] = [];
  for (const post of insertedPosts) {
    const numComments = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < numComments; i++) {
      commentsToCreate.push({
        postId: post.id,
        authorId: randomItem(usersByRole.students).id,
        content: faker.lorem.sentence(),
        createdAt: randomDate(new Date(post.createdAt!), new Date()),
      });
    }
  }

  let insertedComments = await db.insert(comments).values(commentsToCreate).onConflictDoNothing().returning();
  
  // If no comments were inserted (already exist), fetch them instead
  if (insertedComments.length === 0) {
    insertedComments = await db.select().from(comments);
  }
  
  console.log(`  ✓ Created ${insertedComments.length} comments`);

  // Create reactions
  const reactionsToCreate: any[] = [];
  const reactionTypes = ["like", "celebrate", "insightful", "support"];
  for (const post of insertedPosts) {
    const numReactions = faker.number.int({ min: 5, max: 20 });
    const reactors = randomItems(usersByRole.students, numReactions);

    for (const reactor of reactors) {
      reactionsToCreate.push({
        postId: post.id,
        userId: reactor.id,
        type: randomItem(reactionTypes),
        createdAt: randomDate(new Date(post.createdAt!), new Date()),
      });
    }
  }

  let insertedReactions = await db.insert(reactions).values(reactionsToCreate).onConflictDoNothing().returning();
  
  // If no reactions were inserted (already exist), fetch them instead
  if (insertedReactions.length === 0) {
    insertedReactions = await db.select().from(reactions);
  }
  
  console.log(`  ✓ Created ${insertedReactions.length} reactions`);

  // Create followers
  const followersToCreate: any[] = [];
  for (const student of usersByRole.students) {
    const numFollowers = faker.number.int({ min: 5, max: 15 });
    const followersList = randomItems(
      usersByRole.students.filter((s: any) => s.id !== student.id),
      numFollowers
    );

    for (const follower of followersList) {
      followersToCreate.push({
        followerId: follower.id,
        followingId: student.id,
      });
    }
  }

  let insertedFollowers = await db.insert(followers).values(followersToCreate).onConflictDoNothing().returning();
  
  // If no followers were inserted (already exist), fetch them instead
  if (insertedFollowers.length === 0) {
    insertedFollowers = await db.select().from(followers);
  }
  
  console.log(`  ✓ Created ${insertedFollowers.length} follower relationships`);

  // Create groups
  const groupsData = [
    { name: "AI/ML Enthusiasts", groupType: "skill", category: "Tech", description: "Group for AI and ML students" },
    { name: "Web Developers Club", groupType: "skill", category: "Tech", description: "Web dev community" },
    { name: "Hackathon Lovers", groupType: "hobby", category: "Events", description: "Hackathon participants" },
    { name: "Open Source Contributors", groupType: "skill", category: "Tech", description: "Open source community" },
    { name: "Data Science Hub", groupType: "skill", category: "Tech", description: "Data science enthusiasts" },
    { name: "Cybersecurity Network", groupType: "skill", category: "Tech", description: "Security professionals" },
  ];

  const groupsToCreate = groupsData.map((g) => ({
    ...g,
    creatorId: randomItem(usersByRole.students).id,
    isPrivate: false,
    memberCount: 0,
  }));

  let insertedGroups = await db.insert(groups).values(groupsToCreate).onConflictDoNothing().returning();
  
  // If no groups were inserted (already exist), fetch them instead
  if (insertedGroups.length === 0) {
    insertedGroups = await db.select().from(groups);
  }
  
  console.log(`  ✓ Created ${insertedGroups.length} groups`);

  // Create group members
  const groupMembersToCreate: any[] = [];
  for (const group of insertedGroups) {
    const numMembers = faker.number.int({ min: 10, max: 25 });
    const members = randomItems(usersByRole.students, numMembers);

    for (let i = 0; i < members.length; i++) {
      groupMembersToCreate.push({
        groupId: group.id,
        userId: members[i].id,
        role: i === 0 ? "admin" : i < 3 ? "moderator" : "member",
      });
    }
  }

  let insertedGroupMembers = await db.insert(groupMembers).values(groupMembersToCreate).onConflictDoNothing().returning();
  
  // If no group members were inserted (already exist), fetch them instead
  if (insertedGroupMembers.length === 0) {
    insertedGroupMembers = await db.select().from(groupMembers);
  }
  
  console.log(`  ✓ Created ${insertedGroupMembers.length} group memberships`);

  // Update group member counts
  for (const group of insertedGroups) {
    const memberCount = insertedGroupMembers.filter((m: any) => m.groupId === group.id).length;
    await db.update(groups)
      .set({ memberCount })
      .where(eq(groups.id, group.id));
  }

  return { posts: insertedPosts, comments: insertedComments, reactions: insertedReactions, groups: insertedGroups };
}

// ============================================================================
// PHASE 5: ANCILLARY SYSTEMS
// ============================================================================

async function seedAncillarySystems(
  usersByRole: any,
  skillsData: any[]
) {
  console.log("\n🔧 Phase 5: Seeding ancillary systems...");

  // Create challenges
  const challengesData = [
    {
      title: "AI Hackathon 2024",
      description: "Build an AI-powered solution for real-world problems",
      category: "hackathon",
      difficulty: "advanced",
      prizes: "$10,000 in prizes",
      status: "active",
    },
    {
      title: "Web Development Sprint",
      description: "Create a full-stack web application in 48 hours",
      category: "coding",
      difficulty: "intermediate",
      prizes: "$5,000 in prizes",
      status: "active",
    },
    {
      title: "Cybersecurity Challenge",
      description: "Solve security puzzles and capture the flags",
      category: "coding",
      difficulty: "advanced",
      prizes: "$7,500 in prizes",
      status: "active",
    },
    {
      title: "Mobile App Innovation",
      description: "Design an innovative mobile application",
      category: "design",
      difficulty: "intermediate",
      prizes: "$4,000 in prizes",
      status: "upcoming",
    },
    {
      title: "Data Science Competition",
      description: "Analyze datasets and present insights",
      category: "hackathon",
      difficulty: "intermediate",
      prizes: "$6,000 in prizes",
      status: "completed",
    },
  ];

  const challengesToCreate = challengesData.map((c) => ({
    ...c,
    organizerId: randomItem(usersByRole.industryPros).id,
    startDate: randomDate(new Date(2024, 9, 1), new Date(2024, 11, 31)),
    endDate: new Date(2025, 0, 15), // Fixed future date for determinism
    participantCount: 0,
  }));

  let insertedChallenges = await db.insert(challenges).values(challengesToCreate).onConflictDoNothing().returning();
  
  // If no challenges were inserted (already exist), fetch them instead
  if (insertedChallenges.length === 0) {
    insertedChallenges = await db.select().from(challenges);
  }
  
  console.log(`  ✓ Created ${insertedChallenges.length} challenges`);

  // Create challenge participants
  const participantsToCreate: any[] = [];
  for (const challenge of insertedChallenges) {
    const numParticipants = faker.number.int({ min: 10, max: 30 });
    const participants = randomItems(usersByRole.students, numParticipants);

    for (let i = 0; i < participants.length; i++) {
      participantsToCreate.push({
        challengeId: challenge.id,
        userId: participants[i].id,
        submissionUrl: faker.datatype.boolean(0.7) ? `https://github.com/student/project-${i}` : null,
        submittedAt: faker.datatype.boolean(0.7) ? randomDate(new Date(challenge.startDate!), new Date()) : null,
        rank: challenge.status === "completed" && i < 3 ? i + 1 : null,
      });
    }
  }

  let insertedParticipants = await db.insert(challengeParticipants).values(participantsToCreate).onConflictDoNothing().returning();
  
  // If no participants were inserted (already exist), fetch them instead
  if (insertedParticipants.length === 0) {
    insertedParticipants = await db.select().from(challengeParticipants);
  }
  
  console.log(`  ✓ Created ${insertedParticipants.length} challenge participants`);

  // Create certifications
  const certificationsToCreate: any[] = [];
  const certTypes = ["course_completion", "project", "skill_endorsement", "achievement"];
  
  for (const student of usersByRole.students.slice(0, 15)) {
    const numCerts = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numCerts; i++) {
      const certType = randomItem(certTypes);
      const issuer = randomItem([...usersByRole.teachers, ...usersByRole.industryPros]);
      const certData = `${student.id}-${certType}-${issuer.id}-${i}`;

      certificationsToCreate.push({
        userId: student.id,
        type: certType,
        title: `${certType.replace("_", " ")} Certificate`,
        description: `Awarded for excellence in ${randomItem(student.interests)}`,
        issuerName: issuer.displayName,
        issuerId: issuer.id,
        verificationHash: generateVerificationHash(certData),
        metadata: { skills: randomItems(skillsData.map((s) => s.name), 3) },
        isPublic: true,
        issuedAt: randomDate(new Date(2024, 0, 1), new Date()),
      });
    }
  }

  let insertedCertifications = await db.insert(certifications).values(certificationsToCreate).onConflictDoNothing().returning();
  
  // If no certifications were inserted (already exist), fetch them instead
  if (insertedCertifications.length === 0) {
    insertedCertifications = await db.select().from(certifications);
  }
  
  console.log(`  ✓ Created ${insertedCertifications.length} certifications`);

  // Create recruiter feedback
  const feedbackToCreate: any[] = [];
  const feedbackCategories = ["technical_skills", "soft_skills", "leadership", "communication", "teamwork"];

  for (const student of usersByRole.students.slice(0, 10)) {
    const numFeedback = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numFeedback; i++) {
      feedbackToCreate.push({
        recruiterId: randomItem(usersByRole.industryPros).id,
        studentId: student.id,
        rating: faker.number.int({ min: 3, max: 5 }),
        category: randomItem(feedbackCategories),
        feedback: faker.lorem.paragraph(),
        context: randomItem(["challenge", "interview", "project_review", "general"]),
        challengeId: faker.datatype.boolean(0.5) ? randomItem(insertedChallenges).id : null,
        isPublic: faker.datatype.boolean(0.6),
      });
    }
  }

  let insertedFeedback = await db.insert(recruiterFeedback).values(feedbackToCreate).onConflictDoNothing().returning();
  
  // If no feedback was inserted (already exist), fetch it instead
  if (insertedFeedback.length === 0) {
    insertedFeedback = await db.select().from(recruiterFeedback);
  }
  
  console.log(`  ✓ Created ${insertedFeedback.length} recruiter feedback entries`);

  // Create AI interaction events
  const aiEventsToCreate: any[] = [];
  const aiEventTypes = ["careerbot", "content_moderation", "post_suggestion"];

  for (const student of usersByRole.students.slice(0, 15)) {
    const numEvents = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < numEvents; i++) {
      aiEventsToCreate.push({
        type: randomItem(aiEventTypes),
        userId: student.id,
        metadata: { query: "Sample AI interaction", responseLength: faker.number.int({ min: 100, max: 500 }) },
        createdAt: randomDate(new Date(2024, 9, 1), new Date()),
      });
    }
  }

  let insertedAiEvents = await db.insert(aiInteractionEvents).values(aiEventsToCreate).onConflictDoNothing().returning();
  
  // If no AI events were inserted (already exist), fetch them instead
  if (insertedAiEvents.length === 0) {
    insertedAiEvents = await db.select().from(aiInteractionEvents);
  }
  
  console.log(`  ✓ Created ${insertedAiEvents.length} AI interaction events`);

  return { challenges: insertedChallenges, certifications: insertedCertifications };
}

// ============================================================================
// ADDITIONAL DATA: USER SKILLS, BADGES, ENDORSEMENTS, NOTIFICATIONS
// ============================================================================

async function seedAdditionalData(
  usersByRole: any,
  skillsData: any[],
  badgesData: any[]
) {
  console.log("\n➕ Seeding additional data...");

  // User skills
  const userSkillsToCreate: any[] = [];
  const levels = ["beginner", "intermediate", "advanced", "expert"];

  for (const student of usersByRole.students) {
    const numSkills = faker.number.int({ min: 4, max: 8 });
    const studentSkills = randomItems(skillsData, numSkills);
    
    for (const skill of studentSkills) {
      userSkillsToCreate.push({
        userId: student.id,
        skillId: skill.id,
        level: randomItem(levels),
      });
    }
  }

  let insertedUserSkills = await db.insert(userSkills).values(userSkillsToCreate).onConflictDoNothing().returning();
  
  // If no user skills were inserted (already exist), fetch them instead
  if (insertedUserSkills.length === 0) {
    insertedUserSkills = await db.select().from(userSkills);
  }
  
  console.log(`  ✓ Created ${insertedUserSkills.length} user skills`);

  // User badges
  const userBadgesToCreate: any[] = [];
  for (const student of usersByRole.students) {
    const numBadges = faker.number.int({ min: 2, max: 5 });
    const studentBadges = randomItems(badgesData, numBadges);
    
    for (const badge of studentBadges) {
      userBadgesToCreate.push({
        userId: student.id,
        badgeId: badge.id,
        earnedAt: randomDate(new Date(2024, 0, 1), new Date()),
      });
    }
  }

  let insertedUserBadges = await db.insert(userBadges).values(userBadgesToCreate).onConflictDoNothing().returning();
  
  // If no user badges were inserted (already exist), fetch them instead
  if (insertedUserBadges.length === 0) {
    insertedUserBadges = await db.select().from(userBadges);
  }
  
  console.log(`  ✓ Created ${insertedUserBadges.length} user badges`);

  // Endorsements
  const endorsementsToCreate: any[] = [];
  for (const student of usersByRole.students) {
    const numEndorsements = faker.number.int({ min: 2, max: 8 });
    
    for (let i = 0; i < numEndorsements; i++) {
      const endorser = randomItem([...usersByRole.teachers, ...usersByRole.students.filter((s: any) => s.id !== student.id)]);
      const skill = randomItem(skillsData);

      endorsementsToCreate.push({
        endorserId: endorser.id,
        endorsedUserId: student.id,
        skillId: skill.id,
        comment: `Great ${skill.name} skills!`,
      });
    }
  }

  let insertedEndorsements = await db.insert(endorsements).values(endorsementsToCreate).onConflictDoNothing().returning();
  
  // If no endorsements were inserted (already exist), fetch them instead
  if (insertedEndorsements.length === 0) {
    insertedEndorsements = await db.select().from(endorsements);
  }
  
  console.log(`  ✓ Created ${insertedEndorsements.length} endorsements`);

  // Notifications
  const notificationsToCreate: any[] = [];
  const notificationTypes = ["reaction", "comment", "endorsement", "badge", "challenge"];

  for (const student of usersByRole.students.slice(0, 20)) {
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

  let insertedNotifications = await db.insert(notifications).values(notificationsToCreate).onConflictDoNothing().returning();
  
  // If no notifications were inserted (already exist), fetch them instead
  if (insertedNotifications.length === 0) {
    insertedNotifications = await db.select().from(notifications);
  }
  
  console.log(`  ✓ Created ${insertedNotifications.length} notifications`);

  // Announcements
  const announcementsToCreate: any[] = [];
  for (const admin of usersByRole.univAdmins) {
    const numAnnouncements = faker.number.int({ min: 2, max: 4 });
    
    for (let i = 0; i < numAnnouncements; i++) {
      announcementsToCreate.push({
        authorId: admin.id,
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        university: admin.university,
        isPinned: faker.datatype.boolean(0.3),
      });
    }
  }

  let insertedAnnouncements = await db.insert(announcements).values(announcementsToCreate).onConflictDoNothing().returning();
  
  // If no announcements were inserted (already exist), fetch them instead
  if (insertedAnnouncements.length === 0) {
    insertedAnnouncements = await db.select().from(announcements);
  }
  
  console.log(`  ✓ Created ${insertedAnnouncements.length} announcements`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function comprehensiveSeed() {
  console.log("🌱 Starting comprehensive database seed...\n");
  console.log("═══════════════════════════════════════════════════════════");

  try {
    // Phase 1: Canonical data
    const { skills: skillsData, badges: badgesData } = await seedCanonicalData();

    // Phase 2: Users
    const { users: allUsers, usersByRole } = await seedUsers();

    // Phase 3: Academic data
    const academicData = await seedAcademicData(usersByRole, skillsData);

    // Phase 4: Engagement data
    const engagementData = await seedEngagementData(usersByRole);

    // Phase 5: Ancillary systems
    const ancillaryData = await seedAncillarySystems(usersByRole, skillsData);

    // Additional data
    await seedAdditionalData(usersByRole, skillsData, badgesData);

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("🎉 Comprehensive database seed completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Users: ${allUsers.length}`);
    console.log(`   - Skills: ${skillsData.length}`);
    console.log(`   - Badges: ${badgesData.length}`);
    console.log(`   - Courses: ${academicData.courses.length}`);
    console.log(`   - Posts: ${engagementData.posts.length}`);
    console.log(`   - Comments: ${engagementData.comments.length}`);
    console.log(`   - Reactions: ${engagementData.reactions.length}`);
    console.log(`   - Challenges: ${ancillaryData.challenges.length}`);
    console.log(`   - Groups: ${engagementData.groups.length}`);
    console.log(`   - Certifications: ${ancillaryData.certifications.length}`);
    console.log("\n✨ Your UniNexus platform is now populated with comprehensive mock data!");
    console.log("═══════════════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Execute seed
comprehensiveSeed()
  .catch((error) => {
    console.error("Fatal error during seeding:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
