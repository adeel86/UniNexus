import { db } from "../../db";
import { challenges, challengeParticipants, groups, groupMembers, groupPosts, notifications, announcements, certifications } from "@shared/schema";
import type { User, Challenge, Group } from "@shared/schema";
import crypto from "crypto";
import { getDemoUsers } from "./users";

export async function seedChallenges(insertedUsers: User[], config?: any): Promise<Challenge[]> {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const demoUsers = getDemoUsers(insertedUsers);
  const industryScreenGlitz = demoUsers.industryScreenGlitz || insertedUsers.find(u => u.role === 'industry_professional') || insertedUsers[0];
  const industryCouchPotatos = demoUsers.industryCouchPotatos || insertedUsers.find(u => u.role === 'industry_professional' && u.id !== industryScreenGlitz.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  const teacherSheldon = demoUsers.teacherSheldon || insertedUsers.find(u => u.role === 'teacher' && u.id !== teacherDrAdeel.id) || insertedUsers[0];
  
  const mockChallenges = [
    {
      title: "30-Day Coding Challenge",
      description: "Code every day for 30 days and share your progress! Build projects, solve algorithms, and level up your skills.",
      organizerId: industryScreenGlitz?.id || insertedUsers[0].id,
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
      organizerId: industryCouchPotatos?.id || insertedUsers[0].id,
      category: "Hackathon",
      difficulty: "advanced",
      prizes: "Grand Prize: $5,000 + Internship opportunity, Runner Up: $2,500, Best Design: $1,000",
      startDate: new Date(now.getTime() + 7 * oneDay),
      endDate: new Date(now.getTime() + 9 * oneDay),
      status: "upcoming",
      participantCount: 23,
    },
    {
      title: "Sports Tech Challenge",
      description: "Design and build a technology solution for sports analytics or fan engagement. Sponsored by Screen Glitz Sports Blitz.",
      organizerId: industryScreenGlitz?.id || insertedUsers[0].id,
      category: "Hackathon",
      difficulty: "intermediate",
      prizes: "1st Place: $2,000 + Internship Interview, 2nd Place: $1,000, 3rd Place: $500",
      startDate: new Date(now.getTime() - 5 * oneDay),
      endDate: new Date(now.getTime() + 10 * oneDay),
      status: "active",
      participantCount: 34,
    },
    {
      title: "Data Science Competition",
      description: "Analyze real-world datasets and build predictive models. Categories include healthcare, finance, and climate.",
      organizerId: teacherDrAdeel?.id || insertedUsers[0].id,
      category: "Data Science",
      difficulty: "advanced",
      prizes: "1st Place: $3,000, 2nd Place: $1,500, 3rd Place: $500",
      startDate: new Date(now.getTime() - 20 * oneDay),
      endDate: new Date(now.getTime() + 5 * oneDay),
      status: "active",
      participantCount: 89,
    },
    {
      title: "Web Development Bootcamp Challenge",
      description: "Complete weekly web dev challenges and build your portfolio. Perfect for beginners looking to break into tech.",
      organizerId: teacherSheldon?.id || insertedUsers[0].id,
      category: "Web Development",
      difficulty: "beginner",
      prizes: "All completers receive: Certificate of Completion, Top 10: Premium Course Bundle, 1st Place: Mentorship Session + $200",
      startDate: new Date(now.getTime() + 14 * oneDay),
      endDate: new Date(now.getTime() + 44 * oneDay),
      status: "upcoming",
      participantCount: 12,
    },
    {
      title: "Gaming Tech Innovation",
      description: "Create innovative gaming technology solutions. Sponsored by Couch Potatos Playbook. Focus on esports and gaming analytics.",
      organizerId: industryCouchPotatos?.id || insertedUsers[0].id,
      category: "Gaming",
      difficulty: "intermediate",
      prizes: "1st Place: $2,500 + Gaming Setup, 2nd Place: $1,000, 3rd Place: $500",
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

  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  
  const additionalStudents = insertedUsers.filter(u => 
    u?.role === 'student' && u.email !== studentAdeel.email && u.email !== studentAneeqa.email
  ).slice(0, 2);

  const mockParticipants = [
    { challengeId: insertedChallenges[0].id, userId: studentAdeel.id, status: "active" },
    { challengeId: insertedChallenges[0].id, userId: studentAneeqa.id, status: "active" },
    { challengeId: insertedChallenges[2]?.id || insertedChallenges[0].id, userId: studentAdeel.id, status: "active" },
    { challengeId: insertedChallenges[3]?.id || insertedChallenges[0].id, userId: studentAneeqa.id, status: "active" },
    ...(additionalStudents[0] ? [{ challengeId: insertedChallenges[0].id, userId: additionalStudents[0].id, status: "active" }] : []),
    ...(additionalStudents[1] ? [{ challengeId: insertedChallenges[0].id, userId: additionalStudents[1].id, status: "active" }] : []),
  ];

  console.log("Inserting challenge participants...");
  const insertedParticipants = await db.insert(challengeParticipants).values(mockParticipants).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedParticipants.length} challenge participants`);
}

export async function seedGroups(insertedUsers: User[]): Promise<Group[]> {
  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  
  const mockGroups = [
    {
      name: "React Developers Community",
      description: "A community for React enthusiasts to share knowledge and collaborate on projects.",
      groupType: "skill",
      category: "Tech",
      creatorId: studentAdeel.id,
      isPrivate: false,
    },
    {
      name: "AI/ML Study Group",
      description: "Learn and explore artificial intelligence and machine learning together.",
      groupType: "study_group",
      category: "Science",
      creatorId: studentAneeqa.id,
      isPrivate: false,
    },
    {
      name: "Career Prep Hub",
      description: "Prepare for interviews, share job opportunities, and grow your career.",
      groupType: "hobby",
      category: "Career",
      creatorId: teacherDrAdeel.id,
      isPrivate: false,
    },
    {
      name: "Web Development Masters",
      description: "Advanced web development discussions and project collaborations.",
      groupType: "skill",
      category: "Tech",
      creatorId: studentAdeel.id,
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

  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  const industryScreenGlitz = demoUsers.industryScreenGlitz || insertedUsers.find(u => u.role === 'industry_professional') || insertedUsers[0];

  const mockGroupMembers = [
    { groupId: insertedGroups[0].id, userId: studentAdeel.id, role: "admin" },
    { groupId: insertedGroups[0].id, userId: studentAneeqa.id, role: "member" },
    { groupId: insertedGroups[0].id, userId: teacherDrAdeel.id, role: "member" },
    { groupId: insertedGroups[1]?.id || insertedGroups[0].id, userId: studentAneeqa.id, role: "admin" },
    { groupId: insertedGroups[1]?.id || insertedGroups[0].id, userId: studentAdeel.id, role: "member" },
    { groupId: insertedGroups[1]?.id || insertedGroups[0].id, userId: teacherDrAdeel.id, role: "member" },
    { groupId: insertedGroups[2]?.id || insertedGroups[0].id, userId: teacherDrAdeel.id, role: "admin" },
    { groupId: insertedGroups[2]?.id || insertedGroups[0].id, userId: studentAdeel.id, role: "member" },
    { groupId: insertedGroups[2]?.id || insertedGroups[0].id, userId: studentAneeqa.id, role: "member" },
    { groupId: insertedGroups[2]?.id || insertedGroups[0].id, userId: industryScreenGlitz.id, role: "member" },
  ];

  console.log("Inserting group members...");
  const insertedMembers = await db.insert(groupMembers).values(mockGroupMembers).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedMembers.length} group members`);
}

export async function seedGroupPosts(insertedGroups: Group[], insertedUsers: User[]): Promise<void> {
  if (insertedGroups.length === 0) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];

  const mockGroupPosts = [
    { groupId: insertedGroups[0].id, authorId: studentAdeel.id, content: "Welcome to the React Developers group! Share your React tips and tricks here." },
    { groupId: insertedGroups[0].id, authorId: studentAneeqa.id, content: "Has anyone tried the new React Server Components? Would love to hear your experiences." },
    { groupId: insertedGroups[1]?.id || insertedGroups[0].id, authorId: studentAneeqa.id, content: "Starting a weekly ML paper reading session. Who's interested?" },
    { groupId: insertedGroups[2]?.id || insertedGroups[0].id, authorId: teacherDrAdeel.id, content: "Great opportunities coming up! Check the career board for internships and job postings." },
  ];

  console.log("Inserting group posts...");
  const insertedGroupPosts = await db.insert(groupPosts).values(mockGroupPosts).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedGroupPosts.length} group posts`);
}

export async function seedNotifications(insertedUsers: User[], insertedPosts?: any[]): Promise<void> {
  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  
  const mockNotifications = [
    { 
      userId: studentAdeel.id, 
      type: "badge", 
      title: "Badge Earned!", 
      message: "Congratulations! You earned the First Post badge.", 
      link: "/profile",
      isRead: false 
    },
    { 
      userId: studentAdeel.id, 
      type: "comment", 
      title: "New Comment", 
      message: "Aneeqa Ahmed commented on your post.", 
      link: "/feed",
      isRead: true 
    },
    { 
      userId: studentAneeqa.id, 
      type: "reaction", 
      title: "Post Liked", 
      message: "Adeel Leo liked your data science post.", 
      link: "/feed",
      isRead: false 
    },
    { 
      userId: studentAdeel.id, 
      type: "badge", 
      title: "New Endorsement!", 
      message: "Dr. Adeel Rafiq endorsed your JavaScript skills.", 
      link: "/profile",
      isRead: false 
    },
    { 
      userId: studentAdeel.id, 
      type: "challenge", 
      title: "Challenge Started!", 
      message: "The 30-Day Coding Challenge has begun. Good luck!", 
      link: "/challenges",
      isRead: false 
    },
    { 
      userId: studentAneeqa.id, 
      type: "challenge", 
      title: "New Challenge Available", 
      message: "AI Innovation Hackathon is now accepting registrations!", 
      link: "/challenges",
      isRead: false 
    },
    { 
      userId: teacherDrAdeel.id, 
      type: "course", 
      title: "Course Validated", 
      message: "Your course 'Introduction to Web Development' has been validated by the university.", 
      link: "/courses",
      isRead: true 
    },
  ];

  console.log("Inserting notifications...");
  const insertedNotifications = await db.insert(notifications).values(mockNotifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedNotifications.length} notifications`);
}

export async function seedAnnouncements(insertedUsers: User[]): Promise<void> {
  const demoUsers = getDemoUsers(insertedUsers);
  const uniAdminDISC = demoUsers.uniAdminDISC || insertedUsers.find(u => u.role === 'university_admin') || insertedUsers[0];
  const industryScreenGlitz = demoUsers.industryScreenGlitz || insertedUsers.find(u => u.role === 'industry_professional') || insertedUsers[0];
  
  const mockAnnouncements = [
    { authorId: uniAdminDISC.id, title: "Welcome to UniNexus!", content: "Welcome to our learning platform. Get started by exploring courses and connecting with peers.", targetAudience: "all", isPinned: true },
    { authorId: industryScreenGlitz.id, title: "Hiring Event", content: "Screen Glitz Sports Blitz is hosting a virtual hiring event next week. All students welcome!", targetAudience: "students", isPinned: false },
    { authorId: uniAdminDISC.id, title: "New Semester Registration", content: "Spring 2025 course registration is now open. Don't miss out on your favorite courses!", targetAudience: "students", isPinned: true },
  ];

  console.log("Inserting announcements...");
  const insertedAnnouncements = await db.insert(announcements).values(mockAnnouncements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedAnnouncements.length} announcements`);
}

export async function seedCertifications(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 2) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const studentAdeel = demoUsers.studentAdeel || insertedUsers.find(u => u.role === 'student') || insertedUsers[0];
  const studentAneeqa = demoUsers.studentAneeqa || insertedUsers.find(u => u.role === 'student' && u.id !== studentAdeel.id) || insertedUsers[0];
  const teacherDrAdeel = demoUsers.teacherDrAdeel || insertedUsers.find(u => u.role === 'teacher') || insertedUsers[0];
  const teacherSheldon = demoUsers.teacherSheldon || insertedUsers.find(u => u.role === 'teacher' && u.id !== teacherDrAdeel.id) || insertedUsers[0];

  const mockCertifications = [
    {
      userId: studentAdeel.id,
      issuerName: "Tech University",
      issuerId: teacherDrAdeel.id,
      type: "completion",
      title: "Web Development Fundamentals",
      description: "Successfully completed the Web Development Fundamentals course with distinction.",
      verificationHash: crypto.createHash('sha256').update(`cert-web-${Date.now()}-1`).digest('hex'),
      isPublic: true,
    },
    {
      userId: studentAneeqa.id,
      issuerName: "Tech University",
      issuerId: teacherDrAdeel.id,
      type: "skill",
      title: "Advanced Machine Learning Certification",
      description: "Demonstrated advanced proficiency in machine learning algorithms and applications.",
      verificationHash: crypto.createHash('sha256').update(`cert-ml-${Date.now()}-2`).digest('hex'),
      isPublic: true,
    },
    {
      userId: studentAdeel.id,
      issuerName: "Tech University",
      issuerId: teacherSheldon.id,
      type: "completion",
      title: "Data Structures & Algorithms",
      description: "Completed the Data Structures and Algorithms course with excellent performance.",
      verificationHash: crypto.createHash('sha256').update(`cert-dsa-${Date.now()}-3`).digest('hex'),
      isPublic: true,
    },
  ];

  console.log("Inserting certifications...");
  const insertedCertifications = await db.insert(certifications).values(mockCertifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCertifications.length} certifications`);
}
