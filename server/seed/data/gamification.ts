import { db } from "../../db";
import { challenges, challengeParticipants, groups, groupMembers, groupPosts, notifications, announcements, certifications } from "@shared/schema";
import type { User, Challenge, Group } from "@shared/schema";
import crypto from "crypto";

export async function seedChallenges(insertedUsers: User[]): Promise<Challenge[]> {
  const mockChallenges = [
    {
      title: "30-Day Coding Challenge",
      description: "Code every day for 30 days and share your progress!",
      creatorId: insertedUsers[3].id,
      startDate: new Date("2024-11-01"),
      endDate: new Date("2024-11-30"),
      type: "skill",
      points: 500,
      maxParticipants: 100,
    },
    {
      title: "AI Innovation Hackathon",
      description: "Build an innovative AI project in 48 hours. Top prizes await!",
      creatorId: insertedUsers[7].id,
      startDate: new Date("2024-12-15"),
      endDate: new Date("2024-12-17"),
      type: "hackathon",
      points: 1000,
      maxParticipants: 50,
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
