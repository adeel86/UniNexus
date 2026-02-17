import { db } from "../../db";
import { users } from "@shared/schema";
import type { User } from "@shared/schema";
import { faker } from "@faker-js/faker";
import type { SeedConfig } from "../config";
import crypto from "crypto";

export const mockUsers = [
  // 8 Required demo accounts (index 0-7)
  {
    firebaseUid: crypto.createHash('sha256').update("dr.adeel.rafiq@gmail.com").digest('hex').slice(0, 28),
    email: "dr.adeel.rafiq@gmail.com",
    firstName: "Adeel",
    lastName: "Rafiq",
    displayName: "Dr. Adeel Rafiq",
    profileImageUrl: "https://i.pravatar.cc/150?img=60",
    role: "teacher",
    bio: "Professor of Computer Science with 15+ years of experience. Passionate about AI, machine learning, and mentoring the next generation of tech leaders.",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    position: "Professor",
    interests: ["AI", "Machine Learning", "Teaching", "Research", "Python"],
    engagementScore: 850,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 850,
    rankTier: "silver" as const,
    streak: 15,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("coopersheldonleecooper@gmail.com").digest('hex').slice(0, 28),
    email: "coopersheldonleecooper@gmail.com",
    firstName: "Sheldon",
    lastName: "Cooper",
    displayName: "Dr. Sheldon Cooper",
    profileImageUrl: "https://i.pravatar.cc/150?img=52",
    role: "teacher",
    bio: "Theoretical physicist turned computer science educator. Expert in algorithms, data structures, and making complex topics accessible.",
    university: "California Institute of Technology",
    institution: "California Institute of Technology",
    position: "Associate Professor",
    interests: ["Algorithms", "Data Structures", "Physics", "Mathematics", "Teaching"],
    engagementScore: 720,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 720,
    rankTier: "silver" as const,
    streak: 12,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("Adeel.leo.86@gmail.com").digest('hex').slice(0, 28),
    email: "Adeel.leo.86@gmail.com",
    firstName: "Adeel",
    lastName: "Leo",
    displayName: "Adeel Leo",
    profileImageUrl: "https://i.pravatar.cc/150?img=33",
    role: "student",
    bio: "Computer Science student passionate about web development and AI. Love building innovative projects and collaborating with peers.",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    major: "Computer Science",
    graduationYear: 2026,
    interests: ["Web Development", "AI", "React", "JavaScript", "Python"],
    engagementScore: 1450,
    problemSolverScore: 920,
    endorsementScore: 55,
    challengePoints: 300,
    totalPoints: 2725,
    rankTier: "gold" as const,
    streak: 18,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("aneeqaahmaed339@gmail.com").digest('hex').slice(0, 28),
    email: "aneeqaahmaed339@gmail.com",
    firstName: "Aneeqa",
    lastName: "Ahmed",
    displayName: "Aneeqa Ahmed",
    profileImageUrl: "https://i.pravatar.cc/150?img=47",
    role: "student",
    bio: "Data Science enthusiast with a passion for turning data into insights. Currently exploring machine learning and statistical analysis.",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    major: "Data Science",
    graduationYear: 2025,
    interests: ["Data Science", "Machine Learning", "Statistics", "Python", "Visualization"],
    engagementScore: 1680,
    problemSolverScore: 1100,
    endorsementScore: 42,
    challengePoints: 450,
    totalPoints: 3272,
    rankTier: "gold" as const,
    streak: 22,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("disc.amarisoft@gmail.com").digest('hex').slice(0, 28),
    email: "disc.amarisoft@gmail.com",
    firstName: "Amari",
    lastName: "Soft",
    displayName: "DISC University Admin",
    profileImageUrl: "https://i.pravatar.cc/150?img=68",
    role: "university_admin",
    bio: "University Administrator focused on student success, retention metrics, and institutional growth. Dedicated to creating an inclusive learning environment.",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    position: "Director of Student Affairs",
    interests: ["Education", "Student Success", "Analytics", "Policy"],
    engagementScore: 320,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 320,
    rankTier: "bronze" as const,
    streak: 8,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("technerdacademy@gmail.com").digest('hex').slice(0, 28),
    email: "technerdacademy@gmail.com",
    firstName: "Tech",
    lastName: "Academy",
    displayName: "TechNerd Academy",
    profileImageUrl: "https://i.pravatar.cc/150?img=69",
    role: "university_admin",
    bio: "Leading online technology education platform. We connect students with industry experts and cutting-edge curriculum.",
    university: "Stanford University",
    institution: "Stanford University",
    position: "Platform Administrator",
    interests: ["Online Education", "Tech Training", "Career Development"],
    engagementScore: 280,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 280,
    rankTier: "bronze" as const,
    streak: 5,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("screen.glitz.sports.blitz@gmail.com").digest('hex').slice(0, 28),
    email: "screen.glitz.sports.blitz@gmail.com",
    firstName: "Screen",
    lastName: "Glitz",
    displayName: "Screen Glitz Sports Blitz",
    profileImageUrl: "https://i.pravatar.cc/150?img=59",
    role: "industry_professional",
    bio: "Sports technology company bridging entertainment and athletics. We offer internships, challenges, and career opportunities for talented students.",
    company: "Screen Glitz Sports Blitz",
    position: "Talent Acquisition Director",
    interests: ["Sports Tech", "Entertainment", "Talent Acquisition", "Innovation"],
    engagementScore: 180,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 180,
    rankTier: "bronze" as const,
    streak: 3,
  },
  {
    firebaseUid: crypto.createHash('sha256').update("couch.potatos.playbook@gmail.com").digest('hex').slice(0, 28),
    email: "couch.potatos.playbook@gmail.com",
    firstName: "Couch",
    lastName: "Playbook",
    displayName: "Couch Potatos Playbook",
    profileImageUrl: "https://i.pravatar.cc/150?img=58",
    role: "industry_professional",
    bio: "Gaming and esports company connecting students with exciting career opportunities in the gaming industry. Hosting hackathons and challenges.",
    company: "Couch Potatos Playbook",
    position: "HR Manager",
    interests: ["Gaming", "Esports", "Career Development", "Technology"],
    engagementScore: 150,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 150,
    rankTier: "bronze" as const,
    streak: 2,
  },
  // Additional demo accounts for platform functionality (index 8+)
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
    challengePoints: 0,
    totalPoints: 825,
    rankTier: "bronze" as const,
    streak: 7,
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
    challengePoints: 0,
    totalPoints: 200,
    rankTier: "bronze" as const,
    streak: 5,
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
    engagementScore: 0,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 0,
    rankTier: "bronze" as const,
    streak: 0,
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
    engagementScore: 0,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 0,
    rankTier: "bronze" as const,
    streak: 0,
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
    engagementScore: 0,
    problemSolverScore: 0,
    endorsementScore: 0,
    challengePoints: 0,
    totalPoints: 0,
    rankTier: "bronze" as const,
    streak: 0,
  },
  {
    firebaseUid: "student1_uid",
    email: "alex.rivera@university.edu",
    firstName: "Alex",
    lastName: "Rivera",
    displayName: "Alex Rivera",
    profileImageUrl: "https://i.pravatar.cc/150?img=1",
    role: "student",
    bio: "Computer Science major passionate about AI and web development. Love collaborating on innovative projects!",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    major: "Computer Science",
    graduationYear: 2026,
    interests: ["AI", "Web Development", "Machine Learning", "React", "Python"],
    engagementScore: 1250,
    problemSolverScore: 890,
    endorsementScore: 45,
    challengePoints: 200,
    totalPoints: 2385,
    rankTier: "silver" as const,
    streak: 12,
  },
  {
    firebaseUid: "student2_uid",
    email: "jordan.chen@university.edu",
    firstName: "Jordan",
    lastName: "Chen",
    displayName: "Jordan Chen",
    profileImageUrl: "https://i.pravatar.cc/150?img=2",
    role: "student",
    bio: "Design enthusiast and creative coder. Building the future one pixel at a time",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    major: "Graphic Design",
    graduationYear: 2025,
    interests: ["UI/UX", "Web Design", "Figma", "Frontend", "Animation"],
    engagementScore: 2100,
    problemSolverScore: 560,
    endorsementScore: 62,
    challengePoints: 500,
    totalPoints: 3222,
    rankTier: "gold" as const,
    streak: 25,
  },
  {
    firebaseUid: "student3_uid",
    email: "maya.patel@university.edu",
    firstName: "Maya",
    lastName: "Patel",
    displayName: "Maya Patel",
    profileImageUrl: "https://i.pravatar.cc/150?img=3",
    role: "student",
    bio: "Data science wizard obsessed with finding patterns in chaos. Coffee-powered analytics machine!",
    university: "Massachusetts Institute of Technology",
    institution: "Massachusetts Institute of Technology",
    major: "Data Science",
    graduationYear: 2026,
    interests: ["Data Science", "Statistics", "Python", "Visualization", "Big Data"],
    engagementScore: 1800,
    problemSolverScore: 1050,
    endorsementScore: 38,
    challengePoints: 150,
    totalPoints: 3038,
    rankTier: "gold" as const,
    streak: 18,
  },
];

// Demo account emails for lookup
export const DEMO_EMAILS = {
  teacherDrAdeel: "dr.adeel.rafiq@gmail.com",
  teacherSheldon: "coopersheldonleecooper@gmail.com",
  studentAdeel: "Adeel.leo.86@gmail.com",
  studentAneeqa: "aneeqaahmaed339@gmail.com",
  uniAdminDISC: "disc.amarisoft@gmail.com",
  uniAdminTechNerd: "technerdacademy@gmail.com",
  industryScreenGlitz: "screen.glitz.sports.blitz@gmail.com",
  industryCouchPotatos: "couch.potatos.playbook@gmail.com",
};

// Helper to get demo users by email from user list
export function getDemoUsers(allUsers: User[]): Record<string, User | undefined> {
  const usersByEmail = new Map(allUsers.map(u => [u.email, u]));
  return {
    teacherDrAdeel: usersByEmail.get(DEMO_EMAILS.teacherDrAdeel),
    teacherSheldon: usersByEmail.get(DEMO_EMAILS.teacherSheldon),
    studentAdeel: usersByEmail.get(DEMO_EMAILS.studentAdeel),
    studentAneeqa: usersByEmail.get(DEMO_EMAILS.studentAneeqa),
    uniAdminDISC: usersByEmail.get(DEMO_EMAILS.uniAdminDISC),
    uniAdminTechNerd: usersByEmail.get(DEMO_EMAILS.uniAdminTechNerd),
    industryScreenGlitz: usersByEmail.get(DEMO_EMAILS.industryScreenGlitz),
    industryCouchPotatos: usersByEmail.get(DEMO_EMAILS.industryCouchPotatos),
  };
}

export async function seedUsers(config?: SeedConfig): Promise<User[]> {
  console.log("Inserting users...");
  const usersToInsert = [...mockUsers];
  
  // Generate bulk users if config allows
  if (config && !config.users.demoAccountsOnly && config.users.bulkUserCount > 0) {
    console.log(`Generating ${config.users.bulkUserCount} bulk users...`);
    const bulkUsers = generateBulkUsers(config.users.bulkUserCount);
    usersToInsert.push(...bulkUsers);
  }
  
  let insertedUsers = await db.insert(users).values(usersToInsert).onConflictDoNothing().returning();
  
  if (insertedUsers.length === 0) {
    console.log("Users already exist, fetching existing users...");
    insertedUsers = await db.select().from(users);
  }
  console.log(`Using ${insertedUsers.length} users`);
  return insertedUsers;
}

/**
 * Generate bulk users with realistic faker data
 */
function generateBulkUsers(count: number): any[] {
  const universities = [
    "Tech University",
    "State University",
    "Demo University",
    "Innovation Institute",
    "Digital Academy",
  ];
  
  const majors = [
    "Computer Science",
    "Data Science",
    "Software Engineering",
    "Information Technology",
    "Cybersecurity",
    "Business Analytics",
    "Game Development",
  ];
  
  const interests = [
    "Web Development",
    "AI",
    "Machine Learning",
    "React",
    "Python",
    "JavaScript",
    "UI/UX Design",
    "Data Analysis",
    "Cloud Computing",
    "DevOps",
    "Blockchain",
    "Mobile Development",
    "Teaching",
    "Research",
  ];
  
  const companies = [
    "TechCorp Solutions",
    "Innovation Labs",
    "Digital Ventures",
    "Future Systems",
    "Cloud Dynamics",
  ];
  
  const bulkUsers: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const role = faker.helpers.arrayElement(['student', 'teacher', 'university_admin', 'industry_professional'] as const);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    // Deterministic Firebase UID based on email for consistency
    const firebaseUid = crypto.createHash('sha256').update(email).digest('hex').slice(0, 28);
    
    const baseUser = {
      firebaseUid,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      profileImageUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      role,
      bio: faker.lorem.sentences(2),
      engagementScore: faker.number.int({ min: 0, max: 2000 }),
      problemSolverScore: faker.number.int({ min: 0, max: 1500 }),
      endorsementScore: faker.number.int({ min: 0, max: 100 }),
      challengePoints: faker.number.int({ min: 0, max: 1000 }),
      totalPoints: faker.number.int({ min: 0, max: 5000 }),
      rankTier: faker.helpers.arrayElement(['bronze', 'silver', 'gold', 'platinum'] as const),
      streak: faker.number.int({ min: 0, max: 30 }),
      interests: faker.helpers.arrayElements(interests, faker.number.int({ min: 2, max: 5 })),
    };
    
    if (role === 'student') {
      bulkUsers.push({
        ...baseUser,
        university: faker.helpers.arrayElement(universities),
        major: faker.helpers.arrayElement(majors),
        graduationYear: faker.number.int({ min: 2024, max: 2028 }),
      });
    } else if (role === 'teacher') {
      bulkUsers.push({
        ...baseUser,
        university: faker.helpers.arrayElement(universities),
        position: faker.helpers.arrayElement(['Professor', 'Associate Professor', 'Assistant Professor', 'Instructor', 'Lecturer']),
      });
    } else if (role === 'university_admin') {
      bulkUsers.push({
        ...baseUser,
        university: faker.helpers.arrayElement(universities),
        position: faker.helpers.arrayElement(['Administrator', 'Director', 'Dean', 'Vice Chancellor']),
      });
    } else {
      // industry_professional
      bulkUsers.push({
        ...baseUser,
        company: faker.helpers.arrayElement(companies),
        position: faker.helpers.arrayElement(['Recruiter', 'Senior Recruiter', 'HR Manager', 'Talent Acquisition Lead', 'Career Coach']),
      });
    }
  }
  
  return bulkUsers;
}
