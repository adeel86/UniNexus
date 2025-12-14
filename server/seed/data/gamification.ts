import { db } from "../../db";
import { challenges, challengeParticipants, groups, groupMembers, groupPosts, notifications, announcements, certifications } from "@shared/schema";
import type { User, Challenge, Group } from "@shared/schema";
import crypto from "crypto";

export async function seedChallenges(insertedUsers: User[], config?: any): Promise<Challenge[]> {
  // Use current date to calculate relative challenge dates
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const mockChallenges = [
    {
      title: "30-Day Coding Challenge",
      description: "Code every day for 30 days and share your progress! Build projects, solve algorithms, and level up your skills.",
      organizerId: insertedUsers[3]?.id || insertedUsers[0].id,
      category: "Programming",
      difficulty: "beginner",
      prizes: "1st Place: $500 Amazon Gift Card, 2nd Place: $250, 3rd Place: $100 + Premium Course Access for all participants",
      startDate: new Date(now.getTime() - 15 * oneDay),
      endDate: new Date(now.getTime() + 15 * oneDay),
      status: "active",
      participantCount: 47,
    },
    {
      title: "AI Innovation Hackathon",
      description: "Build an innovative AI project in 48 hours. Use cutting-edge ML/AI tools to solve real-world problems. Team size: 2-4 members.",
      organizerId: insertedUsers[7]?.id || insertedUsers[1]?.id || insertedUsers[0].id,
      category: "Hackathon",
      difficulty: "advanced",
      prizes: "Grand Prize: $5,000 + Internship opportunity at TechCorp, Runner Up: $2,500, Best Design: $1,000",
      startDate: new Date(now.getTime() + 7 * oneDay),
      endDate: new Date(now.getTime() + 9 * oneDay),
      status: "upcoming",
      participantCount: 23,
    },
    {
      title: "Mobile App Design Sprint",
      description: "Design and prototype a mobile app that addresses sustainability challenges. Collaborate with designers and developers.",
      organizerId: insertedUsers[5]?.id || insertedUsers[0].id,
      category: "Design",
      difficulty: "intermediate",
      prizes: "1st Place: $1,500 + Design Tool Subscriptions, 2nd Place: $750, 3rd Place: $300",
      startDate: new Date(now.getTime() - 5 * oneDay),
      endDate: new Date(now.getTime() + 10 * oneDay),
      status: "active",
      participantCount: 34,
    },
    {
      title: "Data Science Competition",
      description: "Analyze real-world datasets and build predictive models. Categories include healthcare, finance, and climate.",
      organizerId: insertedUsers[2]?.id || insertedUsers[0].id,
      category: "Data Science",
      difficulty: "advanced",
      prizes: "1st Place: $3,000 + Job Interview at DataCo, 2nd Place: $1,500, 3rd Place: $500",
      startDate: new Date(now.getTime() - 20 * oneDay),
      endDate: new Date(now.getTime() + 5 * oneDay),
      status: "active",
      participantCount: 89,
    },
    {
      title: "Web Development Bootcamp Challenge",
      description: "Complete weekly web dev challenges and build your portfolio. Perfect for beginners looking to break into tech.",
      organizerId: insertedUsers[1]?.id || insertedUsers[0].id,
      category: "Web Development",
      difficulty: "beginner",
      prizes: "All completers receive: Certificate of Completion, Top 10: Premium Course Bundle, 1st Place: Mentorship Session + $200",
      startDate: new Date(now.getTime() + 14 * oneDay),
      endDate: new Date(now.getTime() + 44 * oneDay),
      status: "upcoming",
      participantCount: 12,
    },
    {
      title: "Cybersecurity CTF Challenge",
      description: "Capture The Flag competition testing your security skills. Find vulnerabilities, decrypt codes, and hack (ethically)!",
      organizerId: insertedUsers[4]?.id || insertedUsers[0].id,
      category: "Security",
      difficulty: "advanced",
      prizes: "1st Place: $2,000 + Security Certification Voucher, 2nd Place: $1,000, 3rd Place: $500",
      startDate: new Date(now.getTime() - 30 * oneDay),
      endDate: new Date(now.getTime() - 2 * oneDay),
      status: "completed",
      participantCount: 156,
    },
  ];

  console.log("Inserting challenges...");
  const insertedChallenges = await db.insert(challenges).values(mockChallenges).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedChallenges.length} challenges`);
  return insertedChallenges;
}

export async function seedChallengeParticipants(insertedChallenges: Challenge[], insertedUsers: User[]): Promise<void> {
  if (insertedChallenges.length === 0) return;

  const mockParticipants = [
    { challengeId: insertedChallenges[0].id, userId: insertedUsers[0].id, status: "active" },
    { challengeId: insertedChallenges[0].id, userId: insertedUsers[5].id, status: "active" },
    { challengeId: insertedChallenges[0].id, userId: insertedUsers[6].id, status: "active" },
  ];

  console.log("Inserting challenge participants...");
  const insertedParticipants = await db.insert(challengeParticipants).values(mockParticipants).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedParticipants.length} challenge participants`);
}

export async function seedGroups(insertedUsers: User[]): Promise<Group[]> {
  const mockGroups = [
    {
      name: "React Developers Community",
      description: "A community for React enthusiasts to share knowledge and collaborate.",
      groupType: "skill",
      category: "Tech",
      creatorId: insertedUsers[0].id,
      isPrivate: false,
    },
    {
      name: "AI/ML Study Group",
      description: "Learn and explore artificial intelligence and machine learning together.",
      groupType: "study_group",
      category: "Science",
      creatorId: insertedUsers[5].id,
      isPrivate: false,
    },
    {
      name: "Career Prep Hub",
      description: "Prepare for interviews, share job opportunities, and grow your career.",
      groupType: "hobby",
      category: "Career",
      creatorId: insertedUsers[3].id,
      isPrivate: false,
    },
  ];

  console.log("Inserting groups...");
  const insertedGroups = await db.insert(groups).values(mockGroups).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedGroups.length} groups`);
  return insertedGroups;
}

export async function seedGroupMembers(insertedGroups: Group[], insertedUsers: User[]): Promise<void> {
  if (insertedGroups.length === 0) return;

  const mockGroupMembers = [
    { groupId: insertedGroups[0].id, userId: insertedUsers[0].id, role: "admin" },
    { groupId: insertedGroups[0].id, userId: insertedUsers[1].id, role: "member" },
    { groupId: insertedGroups[0].id, userId: insertedUsers[5].id, role: "member" },
    { groupId: insertedGroups[1].id, userId: insertedUsers[5].id, role: "admin" },
    { groupId: insertedGroups[1].id, userId: insertedUsers[0].id, role: "member" },
    { groupId: insertedGroups[1].id, userId: insertedUsers[6].id, role: "member" },
    { groupId: insertedGroups[2].id, userId: insertedUsers[3].id, role: "admin" },
    { groupId: insertedGroups[2].id, userId: insertedUsers[0].id, role: "member" },
    { groupId: insertedGroups[2].id, userId: insertedUsers[1].id, role: "member" },
  ];

  console.log("Inserting group members...");
  const insertedMembers = await db.insert(groupMembers).values(mockGroupMembers).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedMembers.length} group members`);
}

export async function seedGroupPosts(insertedGroups: Group[], insertedUsers: User[]): Promise<void> {
  if (insertedGroups.length === 0) return;

  const mockGroupPosts = [
    { groupId: insertedGroups[0].id, authorId: insertedUsers[0].id, content: "Welcome to the React Developers group! Share your React tips and tricks here." },
    { groupId: insertedGroups[0].id, authorId: insertedUsers[1].id, content: "Has anyone tried the new React Server Components? Would love to hear your experiences." },
    { groupId: insertedGroups[1].id, authorId: insertedUsers[5].id, content: "Starting a weekly ML paper reading session. Who's interested?" },
  ];

  console.log("Inserting group posts...");
  const insertedGroupPosts = await db.insert(groupPosts).values(mockGroupPosts).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedGroupPosts.length} group posts`);
}

export async function seedNotifications(insertedUsers: User[], insertedPosts?: any[]): Promise<void> {
  const mockNotifications = [
    { 
      userId: insertedUsers[0].id, 
      type: "badge", 
      title: "Badge Earned!", 
      message: "Congratulations! You earned the First Post badge.", 
      link: "/profile",
      isRead: false 
    },
    { 
      userId: insertedUsers[0].id, 
      type: "comment", 
      title: "New Comment", 
      message: "Jordan Chen commented on your post.", 
      link: "/feed",
      isRead: true 
    },
    { 
      userId: insertedUsers[1].id, 
      type: "reaction", 
      title: "Post Liked", 
      message: "Alex Rivera liked your design post.", 
      link: "/feed",
      isRead: false 
    },
    { 
      userId: insertedUsers[5].id, 
      type: "badge", 
      title: "New Endorsement!", 
      message: "Dr. Smith endorsed your JavaScript skills.", 
      link: "/profile",
      isRead: false 
    },
    { 
      userId: insertedUsers[0].id, 
      type: "challenge", 
      title: "Challenge Started!", 
      message: "The 30-Day Coding Challenge has begun. Good luck!", 
      link: "/challenges",
      isRead: false 
    },
  ];

  console.log("Inserting notifications...");
  const insertedNotifications = await db.insert(notifications).values(mockNotifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedNotifications.length} notifications`);
}

export async function seedAnnouncements(insertedUsers: User[]): Promise<void> {
  const mockAnnouncements = [
    { authorId: insertedUsers[2].id, title: "Welcome to UniNexus!", content: "Welcome to our learning platform. Get started by exploring courses and connecting with peers.", targetAudience: "all", isPinned: true },
    { authorId: insertedUsers[3].id, title: "Hiring Event", content: "Demo Tech Inc is hosting a virtual hiring event next week. All students welcome!", targetAudience: "students", isPinned: false },
  ];

  console.log("Inserting announcements...");
  const insertedAnnouncements = await db.insert(announcements).values(mockAnnouncements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedAnnouncements.length} announcements`);
}

export async function seedCertifications(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 9) return;

  const mockCertifications = [
    {
      userId: insertedUsers[0].id,
      issuerName: "Tech University",
      issuerId: insertedUsers[8].id,
      type: "completion",
      title: "Web Development Fundamentals",
      description: "Successfully completed the Web Development Fundamentals course.",
      verificationHash: crypto.createHash('sha256').update(`cert-web-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[5].id,
      issuerName: "Tech University",
      issuerId: insertedUsers[9].id,
      type: "skill",
      title: "Advanced JavaScript Certification",
      description: "Demonstrated advanced proficiency in JavaScript programming.",
      verificationHash: crypto.createHash('sha256').update(`cert-js-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[1].id,
      issuerName: "Demo University",
      issuerId: insertedUsers[2].id,
      type: "completion",
      title: "Excellence in Teaching Award",
      description: "Recognized for outstanding teaching performance.",
      verificationHash: crypto.createHash('sha256').update(`cert-teach-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
  ];

  console.log("Inserting certifications...");
  const insertedCertifications = await db.insert(certifications).values(mockCertifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCertifications.length} certifications`);
}
