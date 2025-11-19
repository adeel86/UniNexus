import { db } from "./db";
import { sql } from "drizzle-orm";
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
  educationRecords,
  userProfiles,
  jobExperience,
} from "@shared/schema";
import { calculateTotalPoints, getRankTier } from "./rankTiers";
import { faker } from "@faker-js/faker";
import crypto from "crypto";

async function seedDatabase() {
  console.log("Starting database seed...");

  const mockUsers = [
    // Demo Accounts (for easy testing - password: demo123)
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
    // Regular Mock Users
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

  console.log("Inserting users...");
  let insertedUsers = await db.insert(users).values(mockUsers).onConflictDoNothing().returning();
  
  // If users already exist, fetch them
  if (insertedUsers.length === 0) {
    console.log("Users already exist, fetching existing users...");
    insertedUsers = await db.select().from(users);
  }
  console.log(`Using ${insertedUsers.length} users`);

  const mockBadges = [
    {
      name: "First Post",
      description: "Created your first post",
      icon: "MessageSquare",
      category: "engagement",
      tier: "bronze",
      criteria: "Create 1 post",
    },
    {
      name: "Social Butterfly",
      description: "Reached 100 engagement points",
      icon: "Users",
      category: "engagement",
      tier: "silver",
      criteria: "Earn 100 engagement points",
    },
    {
      name: "Conversation Starter",
      description: "Received 50 comments on your posts",
      icon: "MessageCircle",
      category: "social",
      tier: "silver",
      criteria: "Receive 50 comments total",
    },
    {
      name: "Problem Solver",
      description: "Helped solve 10 questions in course discussions",
      icon: "Lightbulb",
      category: "problem_solving",
      tier: "gold",
      criteria: "Solve 10 discussion questions",
    },
    {
      name: "Rising Star",
      description: "Earned 1000 engagement points",
      icon: "Star",
      category: "achievement",
      tier: "gold",
      criteria: "Earn 1000 engagement points",
    },
    {
      name: "Knowledge Sharer",
      description: "Posted 25 helpful responses",
      icon: "BookOpen",
      category: "learning",
      tier: "silver",
      criteria: "Post 25 helpful responses",
    },
    {
      name: "Streak Master",
      description: "Maintained a 30-day streak",
      icon: "Flame",
      category: "engagement",
      tier: "platinum",
      criteria: "Maintain 30-day activity streak",
    },
  ];

  console.log("Inserting badges...");
  let insertedBadges = await db.insert(badges).values(mockBadges).onConflictDoNothing().returning();
  
  // If badges already exist, fetch them
  if (insertedBadges.length === 0) {
    console.log("Badges already exist, fetching existing badges...");
    insertedBadges = await db.select().from(badges);
  }
  console.log(`Using ${insertedBadges.length} badges`);

  if (insertedUsers.length > 0 && insertedBadges.length > 0) {
    // Only assign badges to students (not teachers, university_admin, industry_professional, master_admin)
    const userBadgeAssignments = [
      { userId: insertedUsers[0].id, badgeId: insertedBadges[0].id }, // Demo Student
      { userId: insertedUsers[0].id, badgeId: insertedBadges[1].id }, // Demo Student
      // Removed: Teachers, university_admin, industry_professional, master_admin - only students have badges
    ];

    console.log("Assigning badges to users...");
    const assignedBadges = await db.insert(userBadges).values(userBadgeAssignments).onConflictDoNothing().returning();
    console.log(`Assigned ${assignedBadges.length} badges to users`);
  }

  const mockSkills = [
    { name: "JavaScript", category: "technical" },
    { name: "Python", category: "technical" },
    { name: "React", category: "technical" },
    { name: "UI/UX Design", category: "creative" },
    { name: "Data Analysis", category: "technical" },
    { name: "Machine Learning", category: "technical" },
    { name: "Communication", category: "soft_skills" },
    { name: "Teamwork", category: "soft_skills" },
    { name: "Problem Solving", category: "soft_skills" },
    { name: "Figma", category: "creative" },
  ];

  console.log("Inserting skills...");
  let insertedSkills = await db.insert(skills).values(mockSkills).onConflictDoNothing().returning();
  
  // If skills already exist, fetch them
  if (insertedSkills.length === 0) {
    console.log("Skills already exist, fetching existing skills...");
    insertedSkills = await db.select().from(skills);
  }
  console.log(`Using ${insertedSkills.length} skills`);

  if (insertedUsers.length > 0 && insertedSkills.length > 0) {
    // Only assign skills to student and teacher roles (not university_admin, industry_professional, master_admin)
    const userSkillAssignments = [
      { userId: insertedUsers[0].id, skillId: insertedSkills[0].id, level: "advanced" }, // Demo Student
      { userId: insertedUsers[0].id, skillId: insertedSkills[1].id, level: "intermediate" }, // Demo Student
      { userId: insertedUsers[0].id, skillId: insertedSkills[2].id, level: "advanced" }, // Demo Student
      { userId: insertedUsers[1].id, skillId: insertedSkills[3].id, level: "expert" }, // Demo Teacher
      { userId: insertedUsers[1].id, skillId: insertedSkills[0].id, level: "intermediate" }, // Demo Teacher
      { userId: insertedUsers[1].id, skillId: insertedSkills[9].id, level: "expert" }, // Demo Teacher
      // Removed: insertedUsers[2] (university_admin), [3] (industry_professional), [4] (master_admin)
    ];

    console.log("Assigning skills to users...");
    const assignedSkills = await db.insert(userSkills).values(userSkillAssignments).onConflictDoNothing().returning();
    console.log(`Assigned ${assignedSkills.length} skills to users`);
  }

  if (insertedUsers.length > 0) {
    // Only create education records for student and teacher roles (not university_admin, industry_professional, master_admin)
    const mockEducationRecords = [
      {
        userId: insertedUsers[0].id, // Demo Student
        institution: "Tech University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        startDate: "2022-09-01",
        endDate: "2026-05-31",
        description: "Focused on software engineering, AI, and web development. Active member of the coding club and participated in multiple hackathons."
      },
      {
        userId: insertedUsers[0].id, // Demo Student
        institution: "Online Learning Platform",
        degree: "Certificate",
        fieldOfStudy: "Full-Stack Web Development",
        startDate: "2023-06-01",
        endDate: "2023-09-30",
        description: "Completed comprehensive program covering React, Node.js, PostgreSQL, and modern web development practices."
      },
      {
        userId: insertedUsers[1].id, // Demo Teacher
        institution: "Design Institute",
        degree: "Bachelor of Arts",
        fieldOfStudy: "UI/UX Design",
        startDate: "2021-09-01",
        endDate: "2025-05-31",
        description: "Specialized in user-centered design, visual design principles, and prototyping. Led design projects for local startups."
      },
      // Removed: insertedUsers[2] (university_admin), [3] (industry_professional), [4] (master_admin)
    ];

    console.log("Inserting education records...");
    const insertedEducation = await db.insert(educationRecords).values(mockEducationRecords).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedEducation.length} education records`);
  }

  if (insertedUsers.length > 0) {
    const mockUserProfiles = [
      {
        userId: insertedUsers[2].id,
        universityMission: "Demo University is committed to fostering innovation, critical thinking, and academic excellence. We prepare the next generation of leaders through cutting-edge research, collaborative learning environments, and strong industry partnerships. Our mission is to empower students to make a positive impact on society and succeed in a rapidly evolving global landscape.",
        focusAreas: ["STEM Education", "Innovation & Research", "Industry Partnerships", "Student Success", "Global Learning"],
        opportunitiesOffered: "We offer comprehensive career services, state-of-the-art research facilities, internship programs with leading companies, study abroad opportunities in 50+ countries, and an extensive alumni network spanning across industries worldwide. Students have access to entrepreneurship incubators, mentorship programs, and exclusive networking events.",
        contactEmail: "info@demouniversity.edu",
        contactPhone: "+1 (555) 123-4567",
        website: "https://www.demouniversity.edu"
      },
      {
        userId: insertedUsers[3].id,
        companyMission: "Demo Tech Inc is at the forefront of technological innovation, developing solutions that transform industries and improve lives. We believe in nurturing talent, fostering creativity, and building a diverse workforce that reflects the communities we serve. Our mission is to create breakthrough technologies while maintaining a commitment to sustainability, ethics, and social responsibility.",
        industryFocus: ["Artificial Intelligence", "Cloud Computing", "Software Development", "Data Analytics", "Cybersecurity"],
        partnershipOpportunities: "We partner with universities to create industry-academia collaborations, offer guest lectures and workshops, sponsor student competitions and hackathons, and provide research grants for innovative projects. We're committed to bridging the gap between academic learning and real-world application.",
        hiringOpportunities: "We're actively recruiting talented graduates for positions in software engineering, data science, product management, UX design, and technical consulting. We offer competitive salaries, comprehensive benefits, remote work flexibility, continuous learning opportunities, and a vibrant company culture focused on innovation and work-life balance."
      },
      {
        userId: insertedUsers[6].id,
        universityMission: "At State University, we are dedicated to providing accessible, high-quality education that transforms lives and communities. We pride ourselves on our diverse student body, world-class faculty, and commitment to research that addresses real-world challenges. Our goal is to create an inclusive learning environment where every student can thrive and reach their full potential.",
        focusAreas: ["Social Sciences", "Engineering & Technology", "Business & Entrepreneurship", "Health Sciences", "Environmental Studies"],
        opportunitiesOffered: "Students benefit from personalized academic advising, hands-on research opportunities, industry internships, career development workshops, and access to a robust alumni network. We also offer scholarships, leadership programs, and community engagement initiatives that prepare students for successful careers and meaningful lives.",
        contactEmail: "admissions@stateuniversity.edu",
        contactPhone: "+1 (555) 987-6543",
        website: "https://www.stateuniversity.edu"
      },
      {
        userId: insertedUsers[7].id,
        companyMission: "TechCorp Solutions is a leader in enterprise technology, helping organizations worldwide innovate and succeed in the digital age. We are passionate about creating cutting-edge solutions, fostering talent development, and building long-term partnerships with educational institutions. Our mission is to drive technological advancement while cultivating the next generation of tech leaders.",
        industryFocus: ["Enterprise Software", "Digital Transformation", "Machine Learning", "IoT Solutions", "Blockchain Technology"],
        partnershipOpportunities: "We collaborate with universities through sponsored research, capstone project partnerships, internship programs, and technology donations. We host regular campus recruitment events, tech talks, and career fairs. We're eager to work with institutions that share our commitment to innovation and excellence.",
        hiringOpportunities: "TechCorp is hiring for roles in software development, cloud architecture, data engineering, DevOps, and technical project management. We offer comprehensive onboarding, mentorship programs, professional development stipends, flexible work arrangements, and opportunities for career advancement. Join our team to work on cutting-edge projects that impact millions of users worldwide."
      }
    ];

    console.log("Inserting user profiles...");
    const insertedProfiles = await db.insert(userProfiles).values(mockUserProfiles).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedProfiles.length} user profiles`);
  }

  const mockPosts = [
    {
      authorId: insertedUsers[0].id,
      content: "Just finished my first full-stack project using React and Node.js! The journey was challenging but incredibly rewarding. Here's what I learned about managing state and building REST APIs. Would love to hear your thoughts!",
      category: "project",
      tags: ["React", "Node.js", "Full-Stack", "WebDev"],
      viewCount: 245,
    },
    {
      authorId: insertedUsers[1].id,
      content: "Check out this modern UI design I created for a mobile banking app! Used vibrant gradients and smooth animations to make the experience feel fresh and Gen-Z friendly. What do you think? Any feedback appreciated!",
      category: "project",
      tags: ["UI/UX", "Design", "Mobile", "Figma"],
      viewCount: 189,
    },
    {
      authorId: insertedUsers[5].id,
      content: "Finally cracked the algorithm for sentiment analysis on Twitter data! Spent 3 days debugging but the results are amazing. Machine learning is tough but so satisfying when it clicks. Who else is working on ML projects?",
      category: "achievement",
      tags: ["Machine Learning", "Data Science", "Python", "NLP"],
      viewCount: 321,
    },
    {
      authorId: insertedUsers[0].id,
      content: "Study tip: Use the Pomodoro Technique! 25 min focused work + 5 min break = productivity boost. Been using it all week and my code quality improved significantly. What study techniques work best for you?",
      category: "social",
      tags: ["StudyTips", "Productivity", "StudentLife"],
      viewCount: 156,
    },
    {
      authorId: insertedUsers[1].id,
      content: "Hot take: Dark mode isn't just aesthetically pleasing, it's essential for reducing eye strain during late-night coding sessions. Plus, it makes those neon accents POP! What's your preferred theme?",
      category: "social",
      tags: ["Design", "DarkMode", "Coding"],
      viewCount: 98,
    },
    {
      authorId: insertedUsers[2].id,
      content: "Demo University is excited to announce our new Innovation Lab opening next semester! Students will have access to cutting-edge technology, mentorship from industry experts, and funding opportunities for breakthrough projects. Applications open November 20th. This is your chance to turn your ideas into reality! 🚀",
      category: "academic",
      tags: ["Innovation", "Research", "Opportunities", "University"],
      viewCount: 412,
    },
    {
      authorId: insertedUsers[3].id,
      content: "Demo Tech Inc is hosting a virtual career fair on December 5th! Meet our engineers, explore internship and full-time opportunities, and learn about our exciting projects in AI and cloud computing. Open to all students - register now at the link in our profile. We're looking forward to meeting talented minds! 💼",
      category: "social",
      tags: ["Careers", "Hiring", "Internships", "TechJobs"],
      viewCount: 387,
    },
    {
      authorId: insertedUsers[6].id,
      content: "State University is proud to announce record research funding this year, enabling groundbreaking work in renewable energy, healthcare innovation, and AI ethics. We're committed to solving real-world problems and creating opportunities for students to participate in cutting-edge research. Congratulations to our amazing faculty and students! 🎓",
      category: "academic",
      tags: ["Research", "Innovation", "University", "StudentSuccess"],
      viewCount: 298,
    },
    {
      authorId: insertedUsers[7].id,
      content: "TechCorp Solutions is launching our Student Ambassador Program! Get hands-on experience with enterprise technology, exclusive mentorship, early access to job opportunities, and a chance to represent us on campus. Applications are open - we're looking for passionate students who want to bridge the gap between academia and industry. Apply today! 🌟",
      category: "social",
      tags: ["Opportunities", "Mentorship", "StudentPrograms", "Tech"],
      viewCount: 356,
    },
  ];

  console.log("Inserting posts...");
  let insertedPosts = await db.insert(posts).values(mockPosts).onConflictDoNothing().returning();
  
  // If posts already exist, fetch them
  if (insertedPosts.length === 0) {
    console.log("Posts already exist, fetching existing posts...");
    insertedPosts = await db.select().from(posts).limit(5);
  }
  console.log(`Using ${insertedPosts.length} posts`);

  if (insertedPosts.length > 0) {
    const mockComments = [
      { postId: insertedPosts[0].id, authorId: insertedUsers[1].id, content: "This is amazing! How did you handle authentication?" },
      { postId: insertedPosts[0].id, authorId: insertedUsers[2].id, content: "Great work! Would love to see the code on GitHub" },
      { postId: insertedPosts[1].id, authorId: insertedUsers[0].id, content: "The gradients are fire! Can you share your color palette?" },
      { postId: insertedPosts[2].id, authorId: insertedUsers[0].id, content: "This is so cool! What library did you use for ML?" },
      { postId: insertedPosts[3].id, authorId: insertedUsers[2].id, content: "Pomodoro changed my life too! Been using it for 2 years" },
    ];

    console.log("Inserting comments...");
    const insertedComments = await db.insert(comments).values(mockComments).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedComments.length} comments`);

    const mockReactions = [
      { postId: insertedPosts[0].id, userId: insertedUsers[1].id, type: "celebrate" },
      { postId: insertedPosts[0].id, userId: insertedUsers[2].id, type: "like" },
      { postId: insertedPosts[1].id, userId: insertedUsers[0].id, type: "like" },
      { postId: insertedPosts[1].id, userId: insertedUsers[2].id, type: "celebrate" },
      { postId: insertedPosts[2].id, userId: insertedUsers[0].id, type: "insightful" },
      { postId: insertedPosts[2].id, userId: insertedUsers[1].id, type: "like" },
    ];

    console.log("Inserting reactions...");
    const insertedReactions = await db.insert(reactions).values(mockReactions).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedReactions.length} reactions`);
  }

  const mockCourses = [
    {
      name: "Introduction to Machine Learning",
      code: "CS401",
      description: "Learn the fundamentals of machine learning including supervised and unsupervised learning algorithms.",
      university: "Tech University",
      instructorId: insertedUsers[3].id,
      semester: "Fall 2024",
    },
    {
      name: "Advanced Web Development",
      code: "CS301",
      description: "Master modern web technologies including React, Node.js, and cloud deployment.",
      university: "Tech University",
      instructorId: insertedUsers[3].id,
      semester: "Fall 2024",
    },
    {
      name: "Data Visualization",
      code: "DS201",
      description: "Create compelling visualizations to communicate data insights effectively.",
      university: "Tech University",
      instructorId: insertedUsers[4].id,
      semester: "Fall 2024",
    },
  ];

  console.log("Inserting courses...");
  const insertedCourses = await db.insert(courses).values(mockCourses).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCourses.length} courses`);

  if (insertedCourses.length > 0) {
    const mockEnrollments = [
      { courseId: insertedCourses[0].id, studentId: insertedUsers[0].id },
      { courseId: insertedCourses[0].id, studentId: insertedUsers[2].id },
      { courseId: insertedCourses[1].id, studentId: insertedUsers[0].id },
      { courseId: insertedCourses[1].id, studentId: insertedUsers[1].id },
      { courseId: insertedCourses[2].id, studentId: insertedUsers[2].id },
    ];

    console.log("Inserting course enrollments...");
    const insertedEnrollments = await db.insert(courseEnrollments).values(mockEnrollments).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedEnrollments.length} enrollments`);

    const mockDiscussions = [
      {
        courseId: insertedCourses[0].id,
        authorId: insertedUsers[0].id,
        title: "Question about gradient descent",
        content: "Can someone explain how learning rate affects convergence in gradient descent? Having trouble understanding when to use smaller vs larger values.",
        isQuestion: true,
        isResolved: false,
        replyCount: 2,
      },
      {
        courseId: insertedCourses[1].id,
        authorId: insertedUsers[1].id,
        title: "Best practices for React hooks?",
        content: "What are your favorite patterns for managing complex state with hooks? Looking to improve my code organization.",
        isQuestion: true,
        isResolved: true,
        replyCount: 3,
      },
    ];

    console.log("Inserting course discussions...");
    const insertedDiscussions = await db.insert(courseDiscussions).values(mockDiscussions).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedDiscussions.length} discussions`);

    if (insertedDiscussions.length > 0) {
      const mockReplies = [
        {
          discussionId: insertedDiscussions[0].id,
          authorId: insertedUsers[2].id,
          content: "Smaller learning rates are safer but slower. I usually start with 0.01 and adjust based on how the loss changes. Watch out for oscillation with large values!",
        },
        {
          discussionId: insertedDiscussions[0].id,
          authorId: insertedUsers[3].id,
          content: "Great question! Think of learning rate as step size. Too big and you overshoot the minimum, too small and training takes forever. Adaptive methods like Adam can help!",
        },
      ];

      console.log("Inserting discussion replies...");
      const insertedReplies = await db.insert(discussionReplies).values(mockReplies).onConflictDoNothing().returning();
      console.log(`Inserted ${insertedReplies.length} replies`);
    }
  }

  const mockChallenges = [
    {
      title: "Build a Gen-Z Social App",
      description: "Create an engaging social platform for students with modern UI/UX and creative features. Show us your best work!",
      organizerId: insertedUsers[6].id,
      category: "hackathon",
      difficulty: "advanced",
      prizes: "$5000 First Place, $2000 Second Place, $1000 Third Place",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-15"),
      participantCount: 24,
      status: "active",
    },
    {
      title: "AI Innovation Challenge",
      description: "Develop an AI-powered solution that solves a real-world problem. Focus on practical applications and impact.",
      organizerId: insertedUsers[6].id,
      category: "innovation",
      difficulty: "advanced",
      prizes: "$10000 Grand Prize + Internship Opportunity",
      startDate: new Date("2024-11-20"),
      endDate: new Date("2024-12-20"),
      participantCount: 18,
      status: "active",
    },
  ];

  console.log("Inserting challenges...");
  const insertedChallenges = await db.insert(challenges).values(mockChallenges).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedChallenges.length} challenges`);

  if (insertedChallenges.length > 0) {
    const mockParticipants = [
      { challengeId: insertedChallenges[0].id, userId: insertedUsers[0].id },
      { challengeId: insertedChallenges[0].id, userId: insertedUsers[1].id },
      { challengeId: insertedChallenges[1].id, userId: insertedUsers[0].id },
      { challengeId: insertedChallenges[1].id, userId: insertedUsers[2].id },
    ];

    console.log("Inserting challenge participants...");
    const insertedParticipants = await db.insert(challengeParticipants).values(mockParticipants).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedParticipants.length} participants`);
  }

  const mockNotifications = [
    {
      userId: insertedUsers[0].id,
      type: "reaction",
      title: "New Reaction",
      message: "Jordan Chen reacted to your post",
      link: "/posts",
      isRead: false,
    },
    {
      userId: insertedUsers[0].id,
      type: "comment",
      title: "New Comment",
      message: "Maya Patel commented on your post",
      link: "/posts",
      isRead: false,
    },
    {
      userId: insertedUsers[1].id,
      type: "badge",
      title: "Badge Unlocked!",
      message: "You earned the Rising Star badge!",
      link: "/profile",
      isRead: false,
    },
  ];

  console.log("Inserting notifications...");
  const insertedNotifications = await db.insert(notifications).values(mockNotifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedNotifications.length} notifications`);

  const mockAnnouncements = [
    {
      authorId: insertedUsers[5].id,
      title: "Welcome to Fall 2024 Semester!",
      content: "We're excited to kick off a new semester full of learning, collaboration, and innovation. Check out the new features on UniNexus to connect with peers and mentors!",
      university: "Tech University",
      isPinned: true,
    },
    {
      authorId: insertedUsers[5].id,
      title: "Career Fair This Friday",
      content: "Join us for the virtual career fair this Friday! Meet recruiters from top tech companies and explore internship opportunities. Don't miss out!",
      university: "Tech University",
      isPinned: true,
    },
  ];

  console.log("Inserting announcements...");
  const insertedAnnouncements = await db.insert(announcements).values(mockAnnouncements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedAnnouncements.length} announcements`);

  // ============================================================================
  // NETWORK CONNECTIONS
  // ============================================================================

  const mockConnections = [
    // Demo Student's accepted connections
    {
      requesterId: insertedUsers[0].id, // Demo Student
      receiverId: insertedUsers[6].id, // Jordan Chen
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[7].id, // Maya Patel
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[0].id, // Demo Student
      receiverId: insertedUsers[5].id, // Alex Rivera
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[8].id, // Dr. Sarah Smith
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[0].id, // Demo Student
      receiverId: insertedUsers[9].id, // Prof. Michael Johnson
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[10].id, // Emily Thompson
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    // Demo Student's pending connection requests
    {
      requesterId: insertedUsers[11].id, // David Williams
      receiverId: insertedUsers[0].id, // Demo Student
      status: "pending",
    },
    {
      requesterId: insertedUsers[0].id, // Demo Student
      receiverId: insertedUsers[8].id, // Dr. Sarah Smith
      status: "pending",
    },
    // Demo Teacher's connections
    {
      requesterId: insertedUsers[1].id, // Demo Teacher
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[1].id, // Demo Teacher
      receiverId: insertedUsers[6].id, // Jordan Chen
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[7].id, // Maya Patel
      receiverId: insertedUsers[1].id, // Demo Teacher
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[1].id, // Demo Teacher
      receiverId: insertedUsers[9].id, // Prof. Michael Johnson
      status: "accepted",
      respondedAt: new Date(),
    },
    // Demo University Admin's connections
    {
      requesterId: insertedUsers[2].id, // Demo University Admin
      receiverId: insertedUsers[1].id, // Demo Teacher
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[2].id, // Demo University Admin
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[6].id, // Jordan Chen
      receiverId: insertedUsers[2].id, // Demo University Admin
      status: "accepted",
      respondedAt: new Date(),
    },
    // Demo Industry Partner's connections
    {
      requesterId: insertedUsers[3].id, // Demo Industry Partner
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[6].id, // Jordan Chen
      receiverId: insertedUsers[3].id, // Demo Industry Partner
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[3].id, // Demo Industry Partner
      receiverId: insertedUsers[7].id, // Maya Patel
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[5].id, // Alex Rivera
      receiverId: insertedUsers[3].id, // Demo Industry Partner
      status: "pending",
    },
    // Demo Admin's connections with all demo accounts
    {
      requesterId: insertedUsers[4].id, // Demo Admin
      receiverId: insertedUsers[0].id, // Demo Student
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[4].id, // Demo Admin
      receiverId: insertedUsers[1].id, // Demo Teacher
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[4].id, // Demo Admin
      receiverId: insertedUsers[2].id, // Demo University Admin
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[4].id, // Demo Admin
      receiverId: insertedUsers[3].id, // Demo Industry Partner
      status: "accepted",
      respondedAt: new Date(),
    },
    // Additional student connections
    {
      requesterId: insertedUsers[5].id, // Alex Rivera
      receiverId: insertedUsers[6].id, // Jordan Chen
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[6].id, // Jordan Chen
      receiverId: insertedUsers[7].id, // Maya Patel
      status: "accepted",
      respondedAt: new Date(),
    },
    {
      requesterId: insertedUsers[7].id, // Maya Patel
      receiverId: insertedUsers[5].id, // Alex Rivera
      status: "accepted",
      respondedAt: new Date(),
    },
  ];

  console.log("Inserting user connections...");
  const insertedConnections = await db.insert(userConnections).values(mockConnections).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConnections.length} user connections`);

  // ============================================================================
  // FOLLOWERS
  // ============================================================================

  const mockFollowers = [
    // Students following Demo Student
    {
      followerId: insertedUsers[5].id, // Alex Rivera follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[6].id, // Jordan Chen follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[7].id, // Maya Patel follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[8].id, // Dr. Sarah Smith follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[9].id, // Prof. Michael Johnson follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[10].id, // Emily Thompson follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[11].id, // David Williams follows Demo Student
      followingId: insertedUsers[0].id,
    },
    // Demo Student following others
    {
      followerId: insertedUsers[0].id, // Demo Student follows Alex Rivera
      followingId: insertedUsers[5].id,
    },
    {
      followerId: insertedUsers[0].id, // Demo Student follows Jordan Chen
      followingId: insertedUsers[6].id,
    },
    {
      followerId: insertedUsers[0].id, // Demo Student follows Maya Patel
      followingId: insertedUsers[7].id,
    },
    {
      followerId: insertedUsers[0].id, // Demo Student follows Demo Teacher
      followingId: insertedUsers[1].id,
    },
    // Demo Teacher followers
    {
      followerId: insertedUsers[5].id, // Jordan Chen follows Demo Teacher
      followingId: insertedUsers[1].id,
    },
    {
      followerId: insertedUsers[6].id, // Maya Patel follows Demo Teacher
      followingId: insertedUsers[1].id,
    },
    {
      followerId: insertedUsers[9].id, // Prof. Michael Johnson follows Demo Teacher
      followingId: insertedUsers[1].id,
    },
    // Demo Teacher following
    {
      followerId: insertedUsers[1].id, // Demo Teacher follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[1].id, // Demo Teacher follows Alex Rivera
      followingId: insertedUsers[5].id,
    },
    // Demo Industry Partner followers
    {
      followerId: insertedUsers[0].id, // Demo Student follows Demo Industry Partner
      followingId: insertedUsers[3].id,
    },
    {
      followerId: insertedUsers[5].id, // Alex Rivera follows Demo Industry Partner
      followingId: insertedUsers[3].id,
    },
    {
      followerId: insertedUsers[6].id, // Jordan Chen follows Demo Industry Partner
      followingId: insertedUsers[3].id,
    },
    {
      followerId: insertedUsers[7].id, // Maya Patel follows Demo Industry Partner
      followingId: insertedUsers[3].id,
    },
    // Demo Industry Partner following talented students
    {
      followerId: insertedUsers[3].id, // Demo Industry Partner follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[3].id, // Demo Industry Partner follows Alex Rivera
      followingId: insertedUsers[5].id,
    },
    {
      followerId: insertedUsers[3].id, // Demo Industry Partner follows Jordan Chen
      followingId: insertedUsers[6].id,
    },
    {
      followerId: insertedUsers[3].id, // Demo Industry Partner follows Maya Patel
      followingId: insertedUsers[7].id,
    },
    // Demo University Admin followers
    {
      followerId: insertedUsers[0].id, // Demo Student follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    {
      followerId: insertedUsers[1].id, // Demo Teacher follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    // Demo Admin following all demo accounts
    {
      followerId: insertedUsers[4].id, // Demo Admin follows Demo Student
      followingId: insertedUsers[0].id,
    },
    {
      followerId: insertedUsers[4].id, // Demo Admin follows Demo Teacher
      followingId: insertedUsers[1].id,
    },
    {
      followerId: insertedUsers[4].id, // Demo Admin follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    {
      followerId: insertedUsers[4].id, // Demo Admin follows Demo Industry Partner
      followingId: insertedUsers[3].id,
    },
    // Students following university admins
    {
      followerId: insertedUsers[5].id, // Alex Rivera follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    {
      followerId: insertedUsers[8].id, // Sam Taylor follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    {
      followerId: insertedUsers[9].id, // Chris Anderson follows Demo University Admin
      followingId: insertedUsers[2].id,
    },
    // Students following industry professionals  
    {
      followerId: insertedUsers[5].id, // Alex Rivera follows TechCorp recruiter
      followingId: insertedUsers[7].id,
    },
    {
      followerId: insertedUsers[8].id, // Sam Taylor follows TechCorp recruiter
      followingId: insertedUsers[7].id,
    },
    {
      followerId: insertedUsers[9].id, // Chris Anderson follows TechCorp recruiter
      followingId: insertedUsers[7].id,
    },
    // Cross-student following
    {
      followerId: insertedUsers[5].id, // Alex Rivera follows Jordan Chen
      followingId: insertedUsers[8].id,
    },
    {
      followerId: insertedUsers[8].id, // Sam Taylor follows Chris Anderson
      followingId: insertedUsers[9].id,
    },
    {
      followerId: insertedUsers[9].id, // Chris Anderson follows Alex Rivera
      followingId: insertedUsers[5].id,
    },
  ];

  console.log("Inserting followers...");
  const insertedFollowers = await db.insert(followers).values(mockFollowers).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedFollowers.length} followers`);

  // ============================================================================
  // ENDORSEMENTS
  // ============================================================================

  const mockEndorsements = [
    // Demo Teacher endorsing students
    {
      endorserId: insertedUsers[1].id, // Demo Teacher
      endorsedUserId: insertedUsers[0].id, // Demo Student
      skillId: insertedSkills[0].id, // JavaScript
      comment: "Excellent work on the React project! Shows strong understanding of modern web development.",
    },
    {
      endorserId: insertedUsers[1].id, // Demo Teacher
      endorsedUserId: insertedUsers[5].id, // Alex Rivera
      skillId: insertedSkills[4].id, // Python
      comment: "Outstanding AI project presentation. Deep knowledge of machine learning concepts.",
    },
    {
      endorserId: insertedUsers[1].id, // Demo Teacher
      endorsedUserId: insertedUsers[6].id, // Jordan Chen
      skillId: insertedSkills[1].id, // React
      comment: "Impressive UI/UX design skills demonstrated throughout the semester.",
    },
    // Dr. Sarah Smith endorsing students
    {
      endorserId: insertedUsers[8].id, // Dr. Sarah Smith
      endorsedUserId: insertedUsers[0].id, // Demo Student
      skillId: insertedSkills[4].id, // Python
      comment: "Consistent strong performance in data structures course. Great problem-solving abilities!",
    },
    {
      endorserId: insertedUsers[8].id, // Dr. Sarah Smith
      endorsedUserId: insertedUsers[5].id, // Alex Rivera
      skillId: insertedSkills[5].id, // Communication
      comment: "Excellent teamwork and communication during group projects.",
    },
    {
      endorserId: insertedUsers[8].id, // Dr. Sarah Smith
      endorsedUserId: insertedUsers[7].id, // Maya Patel
      skillId: insertedSkills[3].id, // Data Analysis
      comment: "Exceptional analytical skills shown in the capstone project.",
    },
    // Prof. Michael Johnson endorsing students
    {
      endorserId: insertedUsers[9].id, // Prof. Michael Johnson
      endorsedUserId: insertedUsers[7].id, // Maya Patel
      skillId: insertedSkills[3].id, // Data Analysis
      comment: "Top performer in Advanced Statistics. Natural talent for data visualization!",
    },
    {
      endorserId: insertedUsers[9].id, // Prof. Michael Johnson
      endorsedUserId: insertedUsers[6].id, // Jordan Chen
      skillId: insertedSkills[6].id, // Problem Solving
      comment: "Creative problem-solving approach in data science projects.",
    },
    // Industry professional endorsements
    {
      endorserId: insertedUsers[3].id, // Demo Industry Partner
      endorsedUserId: insertedUsers[0].id, // Demo Student
      skillId: insertedSkills[5].id, // Communication
      comment: "Great collaboration skills during the internship program. Would recommend!",
    },
    {
      endorserId: insertedUsers[3].id, // Demo Industry Partner
      endorsedUserId: insertedUsers[5].id, // Alex Rivera
      skillId: insertedSkills[0].id, // JavaScript
      comment: "Strong technical skills demonstrated in real-world projects.",
    },
    {
      endorserId: insertedUsers[11].id, // David Williams (TechCorp)
      endorsedUserId: insertedUsers[6].id, // Jordan Chen
      skillId: insertedSkills[2].id, // UI/UX Design
      comment: "Exceptional design thinking and user-centered approach.",
    },
    {
      endorserId: insertedUsers[11].id, // David Williams
      endorsedUserId: insertedUsers[7].id, // Maya Patel
      skillId: insertedSkills[4].id, // Python
      comment: "Impressive technical capabilities shown during interview process.",
    },
    // Peer endorsements
    {
      endorserId: insertedUsers[5].id, // Alex Rivera
      endorsedUserId: insertedUsers[0].id, // Demo Student
      skillId: insertedSkills[1].id, // React
      comment: "Amazing mentor! Helped me understand hooks and state management.",
    },
    {
      endorserId: insertedUsers[6].id, // Jordan Chen
      endorsedUserId: insertedUsers[5].id, // Alex Rivera
      skillId: insertedSkills[6].id, // Problem Solving
      comment: "Best teammate I've worked with. Always finds creative solutions!",
    },
    {
      endorserId: insertedUsers[7].id, // Maya Patel
      endorsedUserId: insertedUsers[6].id, // Jordan Chen
      skillId: insertedSkills[2].id, // UI/UX Design
      comment: "Incredible eye for design. Our project UI wouldn't be the same without you!",
    },
  ];

  console.log("Inserting endorsements...");
  const insertedEndorsements = await db.insert(endorsements).values(mockEndorsements).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEndorsements.length} endorsements`);

  // ============================================================================
  // CERTIFICATIONS
  // ============================================================================

  const mockCertifications = [
    {
      userId: insertedUsers[0].id, // Demo Student
      issuerName: "Demo University",
      issuerId: insertedUsers[2].id, // Demo University Admin
      type: "completion",
      title: "Full Stack Web Development Certificate",
      description: "Successfully completed comprehensive full-stack development program covering React, Node.js, databases, and deployment.",
      metadata: JSON.stringify({ course: "CS401", grade: "A", hours: 240 }),
      imageUrl: "https://via.placeholder.com/600x400/667eea/ffffff?text=Full+Stack+Certificate",
      verificationHash: crypto.createHash('sha256').update(`demo-student-fullstack-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[0].id, // Demo Student
      issuerName: "Demo Teacher",
      issuerId: insertedUsers[1].id, // Demo Teacher
      type: "achievement",
      title: "Outstanding Student Award",
      description: "Recognized for exceptional academic performance and active participation in the Fall 2024 semester.",
      metadata: JSON.stringify({ semester: "Fall 2024", gpa: 3.9 }),
      verificationHash: crypto.createHash('sha256').update(`demo-student-award-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[5].id, // Alex Rivera
      issuerName: "Tech University",
      issuerId: insertedUsers[8].id, // Dr. Sarah Smith
      type: "completion",
      title: "Machine Learning Specialization",
      description: "Completed advanced machine learning curriculum including supervised learning, neural networks, and deep learning.",
      metadata: JSON.stringify({ courses: ["ML101", "ML201", "DL301"], finalProject: "Image Classification Model" }),
      imageUrl: "https://via.placeholder.com/600x400/764ba2/ffffff?text=ML+Specialization",
      verificationHash: crypto.createHash('sha256').update(`alex-ml-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[5].id, // Alex Rivera
      issuerName: "Demo Industry Partner",
      issuerId: insertedUsers[3].id, // Demo Industry Partner
      type: "skill",
      title: "Python Programming Expert",
      description: "Demonstrated advanced proficiency in Python programming through project work and assessments.",
      metadata: JSON.stringify({ skills: ["Python", "NumPy", "Pandas", "Scikit-learn"], level: "Advanced" }),
      verificationHash: crypto.createHash('sha256').update(`alex-python-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[6].id, // Jordan Chen
      issuerName: "Tech University",
      issuerId: insertedUsers[2].id, // Demo University Admin
      type: "completion",
      title: "UI/UX Design Professional Certificate",
      description: "Comprehensive UI/UX design training covering user research, wireframing, prototyping, and usability testing.",
      metadata: JSON.stringify({ tools: ["Figma", "Adobe XD", "Sketch"], projects: 12 }),
      imageUrl: "https://via.placeholder.com/600x400/f093fb/ffffff?text=UI/UX+Certificate",
      verificationHash: crypto.createHash('sha256').update(`jordan-uiux-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[7].id, // Maya Patel
      issuerName: "Tech University",
      issuerId: insertedUsers[9].id, // Prof. Michael Johnson
      type: "achievement",
      title: "Data Science Excellence Award",
      description: "Top student in Data Science program. Recognized for outstanding capstone project on predictive analytics.",
      metadata: JSON.stringify({ year: 2024, ranking: 1, totalStudents: 150 }),
      verificationHash: crypto.createHash('sha256').update(`maya-award-${Date.now()}`).digest('hex'),
      isPublic: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  ];

  console.log("Inserting certifications...");
  const insertedCertifications = await db.insert(certifications).values(mockCertifications).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedCertifications.length} certifications`);

  // ============================================================================
  // DISCUSSION UPVOTES
  // ============================================================================

  // Fetch existing discussions and replies for upvotes
  const existingDiscussions = await db.select().from(courseDiscussions).limit(10);
  const existingReplies = await db.select().from(discussionReplies).limit(10);

  if (existingDiscussions.length > 0 && existingReplies.length > 0) {
    const mockUpvotes = [
      // Upvotes on first discussion
      {
        discussionId: existingDiscussions[0].id,
        userId: insertedUsers[1].id,
      },
      {
        discussionId: existingDiscussions[0].id,
        userId: insertedUsers[3].id,
      },
      {
        discussionId: existingDiscussions[0].id,
        userId: insertedUsers[5].id,
      },
      // Upvotes on second discussion
      ...(existingDiscussions.length > 1 ? [
        {
          discussionId: existingDiscussions[1].id,
          userId: insertedUsers[0].id,
        },
        {
          discussionId: existingDiscussions[1].id,
          userId: insertedUsers[2].id,
        },
        {
          discussionId: existingDiscussions[1].id,
          userId: insertedUsers[6].id,
        },
        {
          discussionId: existingDiscussions[1].id,
          userId: insertedUsers[7].id,
        },
      ] : []),
      // Upvotes on replies
      {
        replyId: existingReplies[0].id,
        userId: insertedUsers[0].id,
      },
      {
        replyId: existingReplies[0].id,
        userId: insertedUsers[1].id,
      },
      {
        replyId: existingReplies[0].id,
        userId: insertedUsers[5].id,
      },
      {
        replyId: existingReplies[0].id,
        userId: insertedUsers[6].id,
      },
      ...(existingReplies.length > 1 ? [
        {
          replyId: existingReplies[1].id,
          userId: insertedUsers[0].id,
        },
        {
          replyId: existingReplies[1].id,
          userId: insertedUsers[2].id,
        },
      ] : []),
    ];

    console.log("Inserting discussion upvotes...");
    const insertedUpvotes = await db.insert(discussionUpvotes).values(mockUpvotes).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedUpvotes.length} discussion upvotes`);
  }

  // ============================================================================
  // GROUPS
  // ============================================================================

  const mockGroups = [
    {
      name: "React Developers Community",
      description: "A community for React enthusiasts to share knowledge, projects, and best practices. All skill levels welcome!",
      groupType: "skill",
      category: "Tech",
      university: "Tech University",
      coverImageUrl: "https://via.placeholder.com/1200x400/61dafb/000000?text=React+Community",
      isPrivate: false,
      creatorId: insertedUsers[0].id,
    },
    {
      name: "Data Science Study Group",
      description: "Weekly discussions on data science topics, paper reviews, and collaborative projects. Focus on machine learning and statistics.",
      groupType: "study_group",
      category: "Science",
      university: "Tech University",
      coverImageUrl: "https://via.placeholder.com/1200x400/ff6f00/ffffff?text=Data+Science+Group",
      isPrivate: false,
      creatorId: insertedUsers[7].id,
    },
    {
      name: "UI/UX Design Hub",
      description: "Share designs, get feedback, and learn about the latest trends in user interface and user experience design.",
      groupType: "skill",
      category: "Design",
      university: "Tech University",
      coverImageUrl: "https://via.placeholder.com/1200x400/9c27b0/ffffff?text=UI/UX+Hub",
      isPrivate: false,
      creatorId: insertedUsers[6].id,
    },
    {
      name: "Tech University CS Majors",
      description: "Official group for Computer Science students. Share resources, discuss courses, and network with fellow CS majors.",
      groupType: "university",
      category: "Academic",
      university: "Tech University",
      isPrivate: false,
      creatorId: insertedUsers[2].id,
    },
    {
      name: "Tech Career Prep",
      description: "Preparing for tech interviews, resume reviews, and career advice. Connect with industry professionals and fellow job seekers.",
      groupType: "hobby",
      category: "Career",
      coverImageUrl: "https://via.placeholder.com/1200x400/00bcd4/ffffff?text=Career+Prep",
      isPrivate: false,
      creatorId: insertedUsers[5].id,
    },
    {
      name: "AI Ethics & Society",
      description: "Discussing the ethical implications of artificial intelligence, bias in ML models, and responsible AI development.",
      groupType: "subject",
      category: "Tech",
      university: "Tech University",
      isPrivate: false,
      creatorId: insertedUsers[8].id,
    },
    {
      name: "Startup Founders Circle",
      description: "Connect with fellow entrepreneurs, share startup experiences, pitch ideas, and get mentorship from successful founders.",
      groupType: "hobby",
      category: "Business",
      coverImageUrl: "https://via.placeholder.com/1200x400/4caf50/ffffff?text=Startup+Founders",
      isPrivate: false,
      creatorId: insertedUsers[3].id,
    },
    {
      name: "Creative Writing Workshop",
      description: "Share your creative writing, get constructive feedback, participate in writing challenges, and discuss literature.",
      groupType: "hobby",
      category: "Arts",
      coverImageUrl: "https://via.placeholder.com/1200x400/e91e63/ffffff?text=Creative+Writing",
      isPrivate: false,
      creatorId: insertedUsers[1].id,
    },
    {
      name: "Campus Esports League",
      description: "Competitive gaming community for students. Organize tournaments, form teams, and discuss strategy for popular esports titles.",
      groupType: "hobby",
      category: "Gaming",
      university: "Tech University",
      coverImageUrl: "https://via.placeholder.com/1200x400/673ab7/ffffff?text=Esports+League",
      isPrivate: false,
      creatorId: insertedUsers[5].id,
    },
    {
      name: "Fitness & Wellness Squad",
      description: "Share workout routines, nutrition tips, mental health resources, and support each other's wellness journeys.",
      groupType: "hobby",
      category: "Health",
      coverImageUrl: "https://via.placeholder.com/1200x400/ff5722/ffffff?text=Fitness+Squad",
      isPrivate: false,
      creatorId: insertedUsers[6].id,
    },
    {
      name: "Blockchain & Web3 Innovators",
      description: "Explore decentralized technologies, discuss crypto projects, NFTs, and build the future of the web together.",
      groupType: "skill",
      category: "Tech",
      coverImageUrl: "https://via.placeholder.com/1200x400/ffc107/000000?text=Web3+Innovators",
      isPrivate: false,
      creatorId: insertedUsers[9].id,
    },
  ];

  console.log("Inserting groups...");
  const insertedGroups = await db.insert(groups).values(mockGroups).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedGroups.length} groups`);

  // ============================================================================
  // GROUP MEMBERS
  // ============================================================================

  if (insertedGroups.length > 0) {
    const mockGroupMembers = [
      // React Developers Community members
      { groupId: insertedGroups[0].id, userId: insertedUsers[0].id, role: "admin" }, // Creator
      { groupId: insertedGroups[0].id, userId: insertedUsers[5].id, role: "member" },
      { groupId: insertedGroups[0].id, userId: insertedUsers[6].id, role: "member" },
      { groupId: insertedGroups[0].id, userId: insertedUsers[1].id, role: "moderator" },
      { groupId: insertedGroups[0].id, userId: insertedUsers[8].id, role: "member" },
      // Data Science Study Group members
      { groupId: insertedGroups[1].id, userId: insertedUsers[7].id, role: "admin" }, // Creator
      { groupId: insertedGroups[1].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[1].id, userId: insertedUsers[5].id, role: "member" },
      { groupId: insertedGroups[1].id, userId: insertedUsers[9].id, role: "moderator" },
      // UI/UX Design Hub members
      { groupId: insertedGroups[2].id, userId: insertedUsers[6].id, role: "admin" }, // Creator
      { groupId: insertedGroups[2].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[2].id, userId: insertedUsers[7].id, role: "member" },
      // Tech University CS Majors members
      { groupId: insertedGroups[3].id, userId: insertedUsers[2].id, role: "admin" }, // Creator
      { groupId: insertedGroups[3].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[3].id, userId: insertedUsers[5].id, role: "member" },
      { groupId: insertedGroups[3].id, userId: insertedUsers[6].id, role: "member" },
      { groupId: insertedGroups[3].id, userId: insertedUsers[7].id, role: "member" },
      { groupId: insertedGroups[3].id, userId: insertedUsers[8].id, role: "moderator" },
      // Tech Career Prep members
      { groupId: insertedGroups[4].id, userId: insertedUsers[5].id, role: "admin" }, // Creator
      { groupId: insertedGroups[4].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[4].id, userId: insertedUsers[6].id, role: "member" },
      { groupId: insertedGroups[4].id, userId: insertedUsers[7].id, role: "member" },
      { groupId: insertedGroups[4].id, userId: insertedUsers[3].id, role: "moderator" }, // Industry partner
      { groupId: insertedGroups[4].id, userId: insertedUsers[11].id, role: "member" }, // Recruiter
      // AI Ethics & Society members
      { groupId: insertedGroups[5].id, userId: insertedUsers[8].id, role: "admin" }, // Creator
      { groupId: insertedGroups[5].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[5].id, userId: insertedUsers[5].id, role: "member" },
      { groupId: insertedGroups[5].id, userId: insertedUsers[7].id, role: "member" },
      { groupId: insertedGroups[5].id, userId: insertedUsers[9].id, role: "member" },
      // Startup Founders Circle members
      { groupId: insertedGroups[6].id, userId: insertedUsers[3].id, role: "admin" }, // Creator
      { groupId: insertedGroups[6].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[6].id, userId: insertedUsers[5].id, role: "member" },
      { groupId: insertedGroups[6].id, userId: insertedUsers[11].id, role: "member" },
      // Creative Writing Workshop members
      { groupId: insertedGroups[7].id, userId: insertedUsers[1].id, role: "admin" }, // Creator
      { groupId: insertedGroups[7].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[7].id, userId: insertedUsers[6].id, role: "member" },
      { groupId: insertedGroups[7].id, userId: insertedUsers[8].id, role: "moderator" },
      // Campus Esports League members
      { groupId: insertedGroups[8].id, userId: insertedUsers[5].id, role: "admin" }, // Creator
      { groupId: insertedGroups[8].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[8].id, userId: insertedUsers[2].id, role: "member" },
      { groupId: insertedGroups[8].id, userId: insertedUsers[7].id, role: "member" },
      { groupId: insertedGroups[8].id, userId: insertedUsers[9].id, role: "member" },
      // Fitness & Wellness Squad members
      { groupId: insertedGroups[9].id, userId: insertedUsers[6].id, role: "admin" }, // Creator
      { groupId: insertedGroups[9].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[9].id, userId: insertedUsers[1].id, role: "member" },
      { groupId: insertedGroups[9].id, userId: insertedUsers[5].id, role: "member" },
      // Blockchain & Web3 Innovators members
      { groupId: insertedGroups[10].id, userId: insertedUsers[9].id, role: "admin" }, // Creator
      { groupId: insertedGroups[10].id, userId: insertedUsers[0].id, role: "member" },
      { groupId: insertedGroups[10].id, userId: insertedUsers[3].id, role: "member" },
      { groupId: insertedGroups[10].id, userId: insertedUsers[7].id, role: "moderator" },
    ];

    console.log("Inserting group members...");
    const insertedGroupMembers = await db.insert(groupMembers).values(mockGroupMembers).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedGroupMembers.length} group members`);

    // Update member counts for groups
    for (const group of insertedGroups) {
      const memberCount = mockGroupMembers.filter(m => m.groupId === group.id).length;
      await db.update(groups).set({ memberCount }).where(sql`${groups.id} = ${group.id}`);
    }
  }

  // ============================================================================
  // GROUP POSTS
  // ============================================================================

  if (insertedGroups.length > 0) {
    const mockGroupPosts = [
      // React Developers Community posts
      {
        groupId: insertedGroups[0].id,
        authorId: insertedUsers[0].id,
        content: "Just finished refactoring my project to use custom hooks. The code is so much cleaner now! Anyone else love how hooks simplify state management?",
        isPinned: true,
      },
      {
        groupId: insertedGroups[0].id,
        authorId: insertedUsers[5].id,
        content: "Quick tip: Use React.memo() for components that render often but don't need to re-render on every parent update. Huge performance boost!",
      },
      {
        groupId: insertedGroups[0].id,
        authorId: insertedUsers[6].id,
        content: "Working on a drag-and-drop feature with React DnD. Anyone have experience with this library? Would love to hear best practices!",
      },
      // Data Science Study Group posts
      {
        groupId: insertedGroups[1].id,
        authorId: insertedUsers[7].id,
        content: "This week we're discussing dimensionality reduction techniques. I've prepared a Jupyter notebook comparing PCA, t-SNE, and UMAP. Who's joining our Monday session?",
        isPinned: true,
      },
      {
        groupId: insertedGroups[1].id,
        authorId: insertedUsers[0].id,
        content: "Found an amazing dataset on Kaggle for practicing time series forecasting. Perfect for our group project! Link in the comments.",
      },
      {
        groupId: insertedGroups[1].id,
        authorId: insertedUsers[5].id,
        content: "Just read a fascinating paper on transformer architectures in NLP. The attention mechanism is mind-blowing! Happy to discuss if anyone's interested.",
      },
      // UI/UX Design Hub posts
      {
        groupId: insertedGroups[2].id,
        authorId: insertedUsers[6].id,
        content: "Sharing my latest design system for a fintech app. Focused on accessibility and clean aesthetics. Feedback welcome!",
        imageUrl: "https://via.placeholder.com/800x600/9c27b0/ffffff?text=Design+System",
        isPinned: true,
      },
      {
        groupId: insertedGroups[2].id,
        authorId: insertedUsers[0].id,
        content: "Anyone using Figma's new variables feature? Game changer for maintaining design consistency across themes!",
      },
      // Tech University CS Majors posts
      {
        groupId: insertedGroups[3].id,
        authorId: insertedUsers[2].id,
        content: "Reminder: Career fair is next Friday! Update your resumes and prepare your elevator pitches. Let's make a great impression!",
        isPinned: true,
      },
      {
        groupId: insertedGroups[3].id,
        authorId: insertedUsers[5].id,
        content: "Looking for a partner for the algorithms project. Anyone interested in working on graph optimization problems?",
      },
      // Tech Career Prep posts
      {
        groupId: insertedGroups[4].id,
        authorId: insertedUsers[5].id,
        content: "Starting a weekly mock interview series! Each week we'll focus on different topics: system design, coding, behavioral. Who's in?",
        isPinned: true,
      },
      {
        groupId: insertedGroups[4].id,
        authorId: insertedUsers[3].id,
        content: "As a recruiter, here's my #1 tip: Tailor your resume for each application. Generic resumes rarely make it past the first screening.",
      },
      // AI Ethics & Society posts
      {
        groupId: insertedGroups[5].id,
        authorId: insertedUsers[8].id,
        content: "Let's discuss: What are the ethical implications of using AI in hiring decisions? How do we ensure fairness and prevent bias?",
        isPinned: true,
      },
      {
        groupId: insertedGroups[5].id,
        authorId: insertedUsers[0].id,
        content: "Read an interesting article on explainable AI. We need to understand how models make decisions, especially in critical applications like healthcare.",
      },
    ];

    console.log("Inserting group posts...");
    const insertedGroupPosts = await db.insert(groupPosts).values(mockGroupPosts).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedGroupPosts.length} group posts`);
  }

  // ============================================================================
  // POST SHARES & BOOSTS
  // ============================================================================

  if (insertedPosts.length > 0) {
    const mockShares = [
      { postId: insertedPosts[0].id, userId: insertedUsers[1].id },
      { postId: insertedPosts[0].id, userId: insertedUsers[5].id },
      { postId: insertedPosts[1].id, userId: insertedUsers[0].id },
      { postId: insertedPosts[1].id, userId: insertedUsers[6].id },
      { postId: insertedPosts[2].id, userId: insertedUsers[7].id },
      { postId: insertedPosts[3].id, userId: insertedUsers[0].id },
    ];

    console.log("Inserting post shares...");
    const insertedShares = await db.insert(postShares).values(mockShares).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedShares.length} post shares`);

    const mockBoosts = [
      { postId: insertedPosts[0].id, userId: insertedUsers[2].id },
      { postId: insertedPosts[0].id, userId: insertedUsers[3].id },
      { postId: insertedPosts[1].id, userId: insertedUsers[1].id },
      { postId: insertedPosts[2].id, userId: insertedUsers[0].id },
      { postId: insertedPosts[2].id, userId: insertedUsers[5].id },
      { postId: insertedPosts[3].id, userId: insertedUsers[6].id },
    ];

    console.log("Inserting post boosts...");
    const insertedBoosts = await db.insert(postBoosts).values(mockBoosts).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedBoosts.length} post boosts`);
  }

  // ============================================================================
  // CONVERSATIONS & MESSAGES
  // ============================================================================

  const mockConversations = [
    {
      participantIds: [insertedUsers[0].id, insertedUsers[5].id],
      isGroup: false,
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      participantIds: [insertedUsers[0].id, insertedUsers[1].id],
      isGroup: false,
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      participantIds: [insertedUsers[0].id, insertedUsers[6].id, insertedUsers[7].id],
      isGroup: true,
      groupName: "Project Team",
      lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      participantIds: [insertedUsers[5].id, insertedUsers[6].id],
      isGroup: false,
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  console.log("Inserting conversations...");
  const insertedConversations = await db.insert(conversations).values(mockConversations).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedConversations.length} conversations`);

  if (insertedConversations.length > 0) {
    const mockMessages = [
      // Conversation 1: Demo Student & Alex Rivera
      {
        conversationId: insertedConversations[0].id,
        senderId: insertedUsers[5].id,
        content: "Hey! Did you finish the React assignment?",
        isRead: true,
        readBy: [insertedUsers[0].id],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[0].id,
        senderId: insertedUsers[0].id,
        content: "Yeah, just submitted it! How about you?",
        isRead: true,
        readBy: [insertedUsers[5].id],
        createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[0].id,
        senderId: insertedUsers[5].id,
        content: "Almost done. Can you help me with the custom hooks part?",
        isRead: true,
        readBy: [insertedUsers[0].id],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      // Conversation 2: Demo Student & Demo Teacher
      {
        conversationId: insertedConversations[1].id,
        senderId: insertedUsers[0].id,
        content: "Hi Professor! I have a question about the lecture on algorithms.",
        isRead: true,
        readBy: [insertedUsers[1].id],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[1].id,
        senderId: insertedUsers[1].id,
        content: "Of course! What would you like to know?",
        isRead: true,
        readBy: [insertedUsers[0].id],
        createdAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[1].id,
        senderId: insertedUsers[0].id,
        content: "Could you explain the time complexity of quicksort in the worst case?",
        isRead: true,
        readBy: [insertedUsers[1].id],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      // Conversation 3: Group chat
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[0].id,
        content: "Team meeting at 3pm today?",
        isRead: true,
        readBy: [insertedUsers[6].id, insertedUsers[7].id],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[6].id,
        content: "Works for me!",
        isRead: true,
        readBy: [insertedUsers[0].id, insertedUsers[7].id],
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[7].id,
        content: "I'll be there. Bringing my analysis results to share.",
        isRead: false,
        readBy: [],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      // Conversation 4: Alex & Jordan
      {
        conversationId: insertedConversations[3].id,
        senderId: insertedUsers[5].id,
        content: "Love the new design you shared in the group!",
        isRead: true,
        readBy: [insertedUsers[6].id],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ];

    console.log("Inserting messages...");
    const insertedMessages = await db.insert(messages).values(mockMessages).onConflictDoNothing().returning();
    console.log(`Inserted ${insertedMessages.length} messages`);
  }

  // ============================================================================
  // AI INTERACTION EVENTS
  // ============================================================================

  const mockAIEvents = [
    {
      type: "careerbot_query",
      userId: insertedUsers[0].id,
      metadata: JSON.stringify({ 
        sessionId: "session-1", 
        messageCount: 3,
        query: "How can I prepare for software engineering interviews?",
        response: "Focus on data structures, algorithms, system design, and behavioral questions. Practice on LeetCode and participate in mock interviews."
      }),
    },
    {
      type: "post_suggestion",
      userId: insertedUsers[0].id,
      metadata: JSON.stringify({ 
        interests: ["Web Development", "AI", "React"],
        query: "Suggest posts based on my interests",
        response: "Generated 3 personalized post suggestions about Web Development, AI, and React"
      }),
    },
    {
      type: "careerbot_query",
      userId: insertedUsers[5].id,
      metadata: JSON.stringify({ 
        sessionId: "session-2", 
        messageCount: 5,
        query: "What skills should I learn for machine learning jobs?",
        response: "Essential skills include Python, TensorFlow/PyTorch, statistics, linear algebra, and experience with real-world datasets. Also focus on communication skills to explain models to non-technical stakeholders."
      }),
    },
    {
      type: "post_suggestion",
      userId: insertedUsers[6].id,
      metadata: JSON.stringify({ 
        interests: ["UI/UX", "Web Design", "Figma"],
        query: "Generate post ideas",
        response: "Generated suggestions about UI/UX Design, Frontend, and Animation"
      }),
    },
    {
      type: "careerbot_query",
      userId: insertedUsers[7].id,
      metadata: JSON.stringify({ 
        sessionId: "session-3", 
        messageCount: 2,
        query: "Career paths for data scientists",
        response: "Data scientists can pursue roles like ML Engineer, Data Analyst, Research Scientist, or AI Product Manager. Each has different focus areas and skill requirements."
      }),
    },
  ];

  console.log("Inserting AI interaction events...");
  const insertedAIEvents = await db.insert(aiInteractionEvents).values(mockAIEvents).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedAIEvents.length} AI interaction events`);

  // ============================================================================
  // MODERATION ACTIONS
  // ============================================================================

  const mockModerationActions = [
    {
      moderatorId: insertedUsers[4].id, // Demo Master Admin
      targetType: "post",
      targetId: "flagged-post-id-1",
      action: "hide",
      reason: "Inappropriate content flagged by automated moderation",
      notes: "Post contained spam links. User notified via email.",
    },
    {
      moderatorId: insertedUsers[4].id,
      targetType: "comment",
      targetId: "flagged-comment-id-1",
      action: "warn",
      reason: "Violation of community guidelines - hostile language",
      notes: "First warning issued. User account flagged for review.",
    },
    {
      moderatorId: insertedUsers[4].id,
      targetType: "user",
      targetId: "suspended-user-id-1",
      action: "suspend",
      reason: "Multiple violations of community standards",
      notes: "7-day suspension. User can appeal through support.",
    },
  ];

  console.log("Inserting moderation actions...");
  const insertedModerationActions = await db.insert(moderationActions).values(mockModerationActions).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedModerationActions.length} moderation actions`);

  // ============================================================================
  // RECRUITER FEEDBACK
  // ============================================================================

  const mockRecruiterFeedback = [
    {
      recruiterId: insertedUsers[3].id, // Demo Industry Partner
      studentId: insertedUsers[0].id, // Demo Student
      rating: 5,
      category: "technical_skills",
      feedback: "Strong technical skills demonstrated. Excellent communication abilities and great cultural fit. Would recommend for internship program and potentially full-time role after graduation. Could benefit from more exposure to system design concepts.",
      context: "interview",
      isPublic: false,
    },
    {
      recruiterId: insertedUsers[11].id, // David Williams (TechCorp)
      studentId: insertedUsers[5].id, // Alex Rivera
      rating: 5,
      category: "technical_skills",
      feedback: "Outstanding problem-solving abilities and deep knowledge of ML algorithms. Strong portfolio demonstrates real-world experience. Top candidate - highly recommend for our ML Engineering team. Already extended offer.",
      context: "interview",
      isPublic: false,
    },
    {
      recruiterId: insertedUsers[3].id,
      studentId: insertedUsers[6].id, // Jordan Chen
      rating: 4,
      category: "soft_skills",
      feedback: "Exceptional design skills and creative problem-solving approach. Great team player with excellent collaboration abilities. Perfect fit for UI/UX design roles. Would love to have on our design team.",
      context: "project_review",
      isPublic: false,
    },
    {
      recruiterId: insertedUsers[11].id,
      studentId: insertedUsers[7].id, // Maya Patel
      rating: 5,
      category: "communication",
      feedback: "Excellent analytical skills with strong data visualization abilities. Clear and effective communicator. Great candidate for data analyst and data scientist roles. Strong potential for growth. Would benefit from more cloud computing experience.",
      context: "interview",
      isPublic: false,
    },
  ];

  console.log("Inserting recruiter feedback...");
  const insertedRecruiterFeedback = await db.insert(recruiterFeedback).values(mockRecruiterFeedback).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedRecruiterFeedback.length} recruiter feedback records`);

  // ============================================================================
  // JOB EXPERIENCE
  // ============================================================================

  const mockJobExperience = [
    // Demo Teacher
    {
      userId: insertedUsers[1].id, // Demo Teacher
      position: "Senior Instructor",
      organization: "Demo University",
      startDate: "2020-08",
      endDate: "Present",
      description: "Teaching computer science courses including Web Development, Data Structures, and Algorithms. Mentor students on their academic and career paths.",
      isCurrent: true,
    },
    {
      userId: insertedUsers[1].id, // Demo Teacher
      position: "Software Engineer",
      organization: "Tech Solutions Inc",
      startDate: "2017-06",
      endDate: "2020-07",
      description: "Developed full-stack web applications using React and Node.js. Led team of 3 junior developers.",
      isCurrent: false,
    },
    // Dr. Sarah Smith
    {
      userId: insertedUsers[8].id, // Dr. Sarah Smith
      position: "Associate Professor",
      organization: "Tech University",
      startDate: "2018-01",
      endDate: "Present",
      description: "Research in Machine Learning and AI. Teaching ML courses and supervising graduate students.",
      isCurrent: true,
    },
    {
      userId: insertedUsers[8].id,
      position: "Research Scientist",
      organization: "AI Research Lab",
      startDate: "2014-09",
      endDate: "2017-12",
      description: "Conducted research on neural networks and deep learning. Published 12 papers in top conferences.",
      isCurrent: false,
    },
    // Prof. Michael Johnson
    {
      userId: insertedUsers[9].id, // Prof. Michael Johnson
      position: "Professor of Computer Science",
      organization: "Tech University",
      startDate: "2012-01",
      endDate: "Present",
      description: "Leading research in Distributed Systems and Cloud Computing. Department Chair 2018-2022.",
      isCurrent: true,
    },
    {
      userId: insertedUsers[9].id,
      position: "Senior Software Architect",
      organization: "CloudTech Corp",
      startDate: "2008-03",
      endDate: "2011-12",
      description: "Designed and implemented scalable cloud infrastructure serving millions of users.",
      isCurrent: false,
    },
    // Emily Thompson (Industry Professional)
    {
      userId: insertedUsers[10].id,
      position: "Lead UX Designer",
      organization: "Design Studio Pro",
      startDate: "2019-05",
      endDate: "Present",
      description: "Leading UX design for enterprise products. Managing team of 5 designers.",
      isCurrent: true,
    },
  ];

  console.log("Inserting job experience...");
  const insertedJobExperience = await db.insert(jobExperience).values(mockJobExperience).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedJobExperience.length} job experience records`);

  // ============================================================================
  // ADDITIONAL CERTIFICATIONS (Teachers receiving from Universities/Industries)
  // ============================================================================

  const additionalCertifications = [
    // Teacher certifications - can only receive from Universities and Industries
    {
      userId: insertedUsers[1].id, // Demo Teacher
      issuerName: "Demo University",
      issuerId: insertedUsers[2].id, // Demo University Admin
      type: "completion",
      title: "Excellence in Teaching Award",
      description: "Recognized for outstanding teaching performance and student satisfaction ratings.",
      metadata: JSON.stringify({ year: 2024, studentRating: 4.9 }),
      verificationHash: crypto.createHash('sha256').update(`demo-teacher-award-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[8].id, // Dr. Sarah Smith
      issuerName: "TechCorp Industries",
      issuerId: insertedUsers[11].id, // David Williams (Industry Professional)
      type: "skill",
      title: "Industry Partnership Excellence",
      description: "Recognized for exceptional collaboration on industry-academic research projects.",
      metadata: JSON.stringify({ projects: 5, impactScore: "High" }),
      verificationHash: crypto.createHash('sha256').update(`sarah-industry-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
    {
      userId: insertedUsers[9].id, // Prof. Michael Johnson
      issuerName: "Tech University",
      issuerId: insertedUsers[2].id, // Demo University Admin
      type: "achievement",
      title: "Distinguished Professor Award",
      description: "Awarded for exceptional contributions to research and education in Computer Science.",
      metadata: JSON.stringify({ year: 2023, researchPapers: 45, citations: 1200 }),
      verificationHash: crypto.createHash('sha256').update(`michael-distinguished-${Date.now()}`).digest('hex'),
      isPublic: true,
    },
  ];

  console.log("Inserting additional certifications for teachers...");
  const additionalCerts = await db.insert(certifications).values(additionalCertifications).onConflictDoNothing().returning();
  console.log(`Inserted ${additionalCerts.length} additional certifications`);

  console.log("Database seed completed successfully!");
  console.log("=".repeat(80));
  console.log("SEED SUMMARY:");
  console.log(`- Users: ${insertedUsers.length}`);
  console.log(`- Posts: ${insertedPosts.length}`);
  console.log(`- Badges: ${insertedBadges.length}`);
  console.log(`- Skills: ${insertedSkills.length}`);
  console.log(`- Courses: ${insertedCourses.length}`);
  console.log(`- Challenges: ${insertedChallenges.length}`);
  console.log(`- Groups: ${insertedGroups.length}`);
  console.log(`- Endorsements: ${insertedEndorsements.length}`);
  console.log(`- Certifications: ${insertedCertifications.length}`);
  console.log(`- Conversations: ${insertedConversations.length}`);
  console.log(`- Followers: ${insertedFollowers.length}`);
  console.log(`- Connections: ${insertedConnections.length}`);
  console.log("=".repeat(80));
}

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
