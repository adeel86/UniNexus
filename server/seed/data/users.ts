import { db } from "../../db";
import { users } from "@shared/schema";
import type { User } from "@shared/schema";
import { faker } from "@faker-js/faker";
import type { SeedConfig } from "../config";
import crypto from "crypto";

export const mockUsers = [
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
    university: "Tech University",
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
    university: "Tech University",
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
    university: "Tech University",
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
  {
    firebaseUid: "teacher1_uid",
    email: "dr.smith@university.edu",
    firstName: "Sarah",
    lastName: "Smith",
    displayName: "Dr. Sarah Smith",
    profileImageUrl: "https://i.pravatar.cc/150?img=4",
    role: "teacher",
    bio: "Professor of Computer Science. Helping students discover their potential in tech.",
    university: "Tech University",
    position: "Professor",
    interests: ["Teaching", "Research", "AI", "Education Technology"],
    engagementScore: 450,
    problemSolverScore: 0,
    endorsementScore: 0,
    streak: 5,
  },
  {
    firebaseUid: "teacher2_uid",
    email: "prof.johnson@university.edu",
    firstName: "Michael",
    lastName: "Johnson",
    displayName: "Prof. Michael Johnson",
    profileImageUrl: "https://i.pravatar.cc/150?img=5",
    role: "teacher",
    bio: "Associate Professor of Data Science. Passionate about making data accessible and fun!",
    university: "Tech University",
    position: "Associate Professor",
    interests: ["Data Science", "Statistics", "Teaching", "Research"],
    engagementScore: 320,
    problemSolverScore: 0,
    endorsementScore: 0,
    streak: 3,
  },
  {
    firebaseUid: "university1_uid",
    email: "admin@university.edu",
    firstName: "Emily",
    lastName: "Thompson",
    displayName: "Emily Thompson",
    profileImageUrl: "https://i.pravatar.cc/150?img=6",
    role: "university_admin",
    bio: "University Administrator focused on student success and engagement.",
    university: "Tech University",
    position: "Director of Student Engagement",
    interests: ["Education", "Student Success", "Analytics"],
    engagementScore: 0,
    problemSolverScore: 0,
    endorsementScore: 0,
    streak: 0,
  },
  {
    firebaseUid: "industry1_uid",
    email: "recruit@techcorp.com",
    firstName: "David",
    lastName: "Williams",
    displayName: "David Williams",
    profileImageUrl: "https://i.pravatar.cc/150?img=7",
    role: "industry_professional",
    bio: "Senior Recruiter at TechCorp. Connecting brilliant students with amazing opportunities!",
    company: "TechCorp Solutions",
    position: "Senior Technical Recruiter",
    interests: ["Talent Acquisition", "Innovation", "Startups"],
    engagementScore: 0,
    problemSolverScore: 0,
    endorsementScore: 0,
    streak: 0,
  },
];

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
