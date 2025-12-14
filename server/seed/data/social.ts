import { db } from "../../db";
import { userConnections, followers, endorsements, conversations, messages } from "@shared/schema";
import type { User, Skill, Conversation } from "@shared/schema";
import { getDemoUsers } from "./users";

export async function seedConnections(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 8) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel!;
  const teacherSheldon = demoUsers.teacherSheldon!;
  const studentAdeel = demoUsers.studentAdeel!;
  const studentAneeqa = demoUsers.studentAneeqa!;
  const uniAdminDISC = demoUsers.uniAdminDISC!;
  const industryScreenGlitz = demoUsers.industryScreenGlitz!;
  const industryCouchPotatos = demoUsers.industryCouchPotatos!;
  
  const additionalUsers = insertedUsers.filter(u => 
    u.email !== teacherDrAdeel.email && u.email !== teacherSheldon.email &&
    u.email !== studentAdeel.email && u.email !== studentAneeqa.email &&
    u.email !== uniAdminDISC.email && u.email !== industryScreenGlitz.email &&
    u.email !== industryCouchPotatos.email
  ).slice(0, 2);
  
  const mockConnections = [
    // Students connected to each other
    { requesterId: studentAdeel.id, receiverId: studentAneeqa.id, status: "accepted", respondedAt: new Date() },
    
    // Students connected to teachers
    { requesterId: studentAdeel.id, receiverId: teacherDrAdeel.id, status: "accepted", respondedAt: new Date() },
    { requesterId: studentAdeel.id, receiverId: teacherSheldon.id, status: "accepted", respondedAt: new Date() },
    { requesterId: studentAneeqa.id, receiverId: teacherDrAdeel.id, status: "accepted", respondedAt: new Date() },
    { requesterId: studentAneeqa.id, receiverId: teacherSheldon.id, status: "accepted", respondedAt: new Date() },
    
    // Industry connected to students
    { requesterId: industryScreenGlitz.id, receiverId: studentAdeel.id, status: "accepted", respondedAt: new Date() },
    { requesterId: industryScreenGlitz.id, receiverId: studentAneeqa.id, status: "pending" },
    { requesterId: industryCouchPotatos.id, receiverId: studentAdeel.id, status: "accepted", respondedAt: new Date() },
    
    // Teachers connected to university admins
    { requesterId: teacherDrAdeel.id, receiverId: uniAdminDISC.id, status: "accepted", respondedAt: new Date() },
    { requesterId: teacherSheldon.id, receiverId: uniAdminDISC.id, status: "accepted", respondedAt: new Date() },
    
    // Additional connections with other users if they exist
    ...(additionalUsers[0] ? [{ requesterId: studentAdeel.id, receiverId: additionalUsers[0].id, status: "accepted", respondedAt: new Date() }] : []),
    ...(additionalUsers[1] ? [{ requesterId: studentAneeqa.id, receiverId: additionalUsers[1].id, status: "accepted", respondedAt: new Date() }] : []),
  ];

  console.log("Inserting user connections...");
  const insertedConnections = await db.insert(userConnections).values(mockConnections).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConnections.length} connections`);
}

export async function seedFollowers(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 8) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel!;
  const teacherSheldon = demoUsers.teacherSheldon!;
  const studentAdeel = demoUsers.studentAdeel!;
  const studentAneeqa = demoUsers.studentAneeqa!;
  const industryScreenGlitz = demoUsers.industryScreenGlitz!;
  const industryCouchPotatos = demoUsers.industryCouchPotatos!;
  
  const additionalUsers = insertedUsers.filter(u => 
    u.email !== teacherDrAdeel.email && u.email !== teacherSheldon.email &&
    u.email !== studentAdeel.email && u.email !== studentAneeqa.email &&
    u.email !== industryScreenGlitz.email && u.email !== industryCouchPotatos.email
  ).slice(0, 3);

  const mockFollowers = [
    // Students follow teachers
    { followerId: studentAdeel.id, followingId: teacherDrAdeel.id },
    { followerId: studentAdeel.id, followingId: teacherSheldon.id },
    { followerId: studentAneeqa.id, followingId: teacherDrAdeel.id },
    { followerId: studentAneeqa.id, followingId: teacherSheldon.id },
    
    // Students follow each other
    { followerId: studentAdeel.id, followingId: studentAneeqa.id },
    { followerId: studentAneeqa.id, followingId: studentAdeel.id },
    
    // Industry follows students (talent scouting)
    { followerId: industryScreenGlitz.id, followingId: studentAdeel.id },
    { followerId: industryScreenGlitz.id, followingId: studentAneeqa.id },
    { followerId: industryCouchPotatos.id, followingId: studentAdeel.id },
    
    // Teachers follow each other
    { followerId: teacherDrAdeel.id, followingId: teacherSheldon.id },
    { followerId: teacherSheldon.id, followingId: teacherDrAdeel.id },
    
    // Additional followers if more users exist
    ...(additionalUsers[0] ? [{ followerId: additionalUsers[0].id, followingId: teacherDrAdeel.id }] : []),
    ...(additionalUsers[1] ? [{ followerId: additionalUsers[1].id, followingId: teacherDrAdeel.id }] : []),
    ...(additionalUsers[2] ? [{ followerId: additionalUsers[2].id, followingId: studentAdeel.id }] : []),
  ];

  console.log("Inserting followers...");
  const insertedFollowers = await db.insert(followers).values(mockFollowers).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedFollowers.length} followers`);
}

export async function seedEndorsements(insertedUsers: User[], insertedSkills: Skill[]): Promise<void> {
  if (insertedUsers.length < 8 || insertedSkills.length === 0) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel!;
  const teacherSheldon = demoUsers.teacherSheldon!;
  const studentAdeel = demoUsers.studentAdeel!;
  const studentAneeqa = demoUsers.studentAneeqa!;

  const mockEndorsements = [
    { 
      endorserId: teacherDrAdeel.id, 
      endorsedUserId: studentAdeel.id, 
      skillId: insertedSkills[0].id, 
      comment: "Exceptional work on the web development projects. Adeel demonstrates strong problem-solving skills and attention to detail." 
    },
    { 
      endorserId: teacherDrAdeel.id, 
      endorsedUserId: studentAdeel.id, 
      skillId: insertedSkills[1]?.id || insertedSkills[0].id, 
      comment: "Outstanding understanding of React patterns and best practices." 
    },
    { 
      endorserId: teacherDrAdeel.id, 
      endorsedUserId: studentAneeqa.id, 
      skillId: insertedSkills[0].id, 
      comment: "Aneeqa shows remarkable aptitude for data analysis and machine learning concepts." 
    },
    { 
      endorserId: teacherSheldon.id, 
      endorsedUserId: studentAdeel.id, 
      skillId: insertedSkills[2]?.id || insertedSkills[0].id, 
      comment: "Excellent grasp of algorithms and data structures. Top performer in class." 
    },
    { 
      endorserId: teacherSheldon.id, 
      endorsedUserId: studentAneeqa.id, 
      skillId: insertedSkills[1]?.id || insertedSkills[0].id, 
      comment: "Aneeqa's analytical thinking and problem-solving abilities are impressive." 
    },
  ];

  console.log("Inserting endorsements...");
  const insertedEndorsements = await db.insert(endorsements).values(mockEndorsements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEndorsements.length} endorsements`);
}

export async function seedConversations(insertedUsers: User[]): Promise<Conversation[]> {
  if (insertedUsers.length < 4) return [];

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel!;
  const teacherSheldon = demoUsers.teacherSheldon!;
  const studentAdeel = demoUsers.studentAdeel!;
  const studentAneeqa = demoUsers.studentAneeqa!;
  const industryScreenGlitz = demoUsers.industryScreenGlitz!;

  const mockConversations = [
    // Student to student
    { 
      participantIds: [studentAdeel.id, studentAneeqa.id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    // Student to teacher
    { 
      participantIds: [studentAdeel.id, teacherDrAdeel.id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    // Student to industry
    { 
      participantIds: [studentAdeel.id, industryScreenGlitz.id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    // Another student to teacher
    { 
      participantIds: [studentAneeqa.id, teacherDrAdeel.id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
    // Teachers discussing
    { 
      participantIds: [teacherDrAdeel.id, teacherSheldon.id],
      isGroup: false,
      lastMessageAt: new Date(),
    },
  ];

  console.log("Inserting conversations...");
  const insertedConversations = await db.insert(conversations).values(mockConversations).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConversations.length} conversations`);
  return insertedConversations;
}

export async function seedMessages(insertedConversations: Conversation[], insertedUsers: User[]): Promise<void> {
  if (insertedConversations.length === 0) return;

  const demoUsers = getDemoUsers(insertedUsers);
  const teacherDrAdeel = demoUsers.teacherDrAdeel!;
  const studentAdeel = demoUsers.studentAdeel!;
  const studentAneeqa = demoUsers.studentAneeqa!;
  const industryScreenGlitz = demoUsers.industryScreenGlitz!;

  const mockMessages = [
    // Conversation 0: Students chatting
    { 
      conversationId: insertedConversations[0].id, 
      senderId: studentAdeel.id, 
      content: "Hey Aneeqa! Did you finish the machine learning assignment?",
      readBy: [studentAdeel.id, studentAneeqa.id]
    },
    { 
      conversationId: insertedConversations[0].id, 
      senderId: studentAneeqa.id, 
      content: "Hi Adeel! Almost done. The neural network part was tricky but I figured it out.",
      readBy: [studentAneeqa.id]
    },
    { 
      conversationId: insertedConversations[0].id, 
      senderId: studentAdeel.id, 
      content: "Nice! Want to study together for the midterm next week?",
      readBy: [studentAdeel.id]
    },
    
    // Conversation 1: Student asking teacher
    { 
      conversationId: insertedConversations[1]?.id || insertedConversations[0].id, 
      senderId: studentAdeel.id, 
      content: "Dr. Rafiq, I have a question about the React hooks assignment.",
      readBy: [studentAdeel.id, teacherDrAdeel.id]
    },
    { 
      conversationId: insertedConversations[1]?.id || insertedConversations[0].id, 
      senderId: teacherDrAdeel.id, 
      content: "Sure Adeel, what's your question? Feel free to share your code.",
      readBy: [teacherDrAdeel.id]
    },
    
    // Conversation 2: Industry reaching out to student
    { 
      conversationId: insertedConversations[2]?.id || insertedConversations[0].id, 
      senderId: industryScreenGlitz.id, 
      content: "Hi Adeel! I noticed your impressive project portfolio. We have some exciting opportunities at Screen Glitz Sports Blitz that might interest you.",
      readBy: [industryScreenGlitz.id]
    },
    
    // Conversation 3: Another student with teacher
    { 
      conversationId: insertedConversations[3]?.id || insertedConversations[0].id, 
      senderId: studentAneeqa.id, 
      content: "Professor, could you recommend some resources for learning more about deep learning?",
      readBy: [studentAneeqa.id, teacherDrAdeel.id]
    },
    { 
      conversationId: insertedConversations[3]?.id || insertedConversations[0].id, 
      senderId: teacherDrAdeel.id, 
      content: "Absolutely! I'll share some excellent papers and online courses. Check the course materials I just uploaded.",
      readBy: [teacherDrAdeel.id]
    },
  ];

  console.log("Inserting messages...");
  const insertedMessages = await db.insert(messages).values(mockMessages).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedMessages.length} messages`);
}
