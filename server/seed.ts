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
  challenges,
  challengeParticipants,
  notifications,
  announcements,
} from "@shared/schema";
import { calculateTotalPoints, getRankTier } from "./rankTiers";

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
      authorId: insertedUsers[2].id,
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

  console.log("Database seed completed successfully!");
}

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
