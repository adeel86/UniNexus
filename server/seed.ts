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
  educationRecords,
  userProfiles,
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
    const userBadgeAssignments = [
      { userId: insertedUsers[0].id, badgeId: insertedBadges[0].id },
      { userId: insertedUsers[0].id, badgeId: insertedBadges[1].id },
      { userId: insertedUsers[1].id, badgeId: insertedBadges[0].id },
      { userId: insertedUsers[1].id, badgeId: insertedBadges[1].id },
      { userId: insertedUsers[1].id, badgeId: insertedBadges[4].id },
      { userId: insertedUsers[2].id, badgeId: insertedBadges[0].id },
      { userId: insertedUsers[2].id, badgeId: insertedBadges[3].id },
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
    const userSkillAssignments = [
      { userId: insertedUsers[0].id, skillId: insertedSkills[0].id, level: "advanced" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[1].id, level: "intermediate" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[2].id, level: "advanced" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[3].id, level: "expert" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[0].id, level: "intermediate" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[9].id, level: "expert" },
      { userId: insertedUsers[2].id, skillId: insertedSkills[1].id, level: "expert" },
      { userId: insertedUsers[2].id, skillId: insertedSkills[4].id, level: "advanced" },
      { userId: insertedUsers[2].id, skillId: insertedSkills[5].id, level: "intermediate" },
    ];

    console.log("Assigning skills to users...");
    const assignedSkills = await db.insert(userSkills).values(userSkillAssignments).onConflictDoNothing().returning();
    console.log(`Assigned ${assignedSkills.length} skills to users`);
  }

  if (insertedUsers.length > 0) {
    const mockEducationRecords = [
      {
        userId: insertedUsers[0].id,
        institution: "Tech University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        startDate: "2022-09-01",
        endDate: "2026-05-31",
        description: "Focused on software engineering, AI, and web development. Active member of the coding club and participated in multiple hackathons."
      },
      {
        userId: insertedUsers[0].id,
        institution: "Online Learning Platform",
        degree: "Certificate",
        fieldOfStudy: "Full-Stack Web Development",
        startDate: "2023-06-01",
        endDate: "2023-09-30",
        description: "Completed comprehensive program covering React, Node.js, PostgreSQL, and modern web development practices."
      },
      {
        userId: insertedUsers[1].id,
        institution: "Design Institute",
        degree: "Bachelor of Arts",
        fieldOfStudy: "UI/UX Design",
        startDate: "2021-09-01",
        endDate: "2025-05-31",
        description: "Specialized in user-centered design, visual design principles, and prototyping. Led design projects for local startups."
      },
      {
        userId: insertedUsers[2].id,
        institution: "Tech University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Data Science",
        startDate: "2022-09-01",
        endDate: "2026-05-31",
        description: "Focus on machine learning, statistical analysis, and data visualization. Research assistant in the AI lab."
      },
      {
        userId: insertedUsers[3].id,
        institution: "State University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        startDate: "2023-09-01",
        endDate: "2027-05-31",
        description: "First-year student exploring various areas of CS, with particular interest in mobile development and cybersecurity."
      },
      {
        userId: insertedUsers[4].id,
        institution: "Tech University",
        degree: "Master of Science",
        fieldOfStudy: "Computer Science",
        startDate: "2015-09-01",
        endDate: "2017-05-31",
        description: "Specialized in distributed systems and cloud computing. Thesis on scalable web architectures."
      },
      {
        userId: insertedUsers[4].id,
        institution: "State University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Engineering",
        startDate: "2011-09-01",
        endDate: "2015-05-31",
        description: "Foundation in hardware and software engineering with focus on embedded systems."
      },
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

  console.log("Database seed completed successfully!");
}

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
