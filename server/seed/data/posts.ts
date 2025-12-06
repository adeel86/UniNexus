import { db } from "../../db";
import { posts, comments, reactions } from "@shared/schema";
import type { User, Post } from "@shared/schema";

export async function seedPosts(insertedUsers: User[]): Promise<Post[]> {
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
      content: "Demo University is excited to announce our new Innovation Lab opening next semester! Students will have access to cutting-edge technology, mentorship from industry experts, and funding opportunities for breakthrough projects.",
      category: "academic",
      tags: ["Innovation", "Research", "Opportunities", "University"],
      viewCount: 412,
    },
    {
      authorId: insertedUsers[3].id,
      content: "Demo Tech Inc is hosting a virtual career fair on December 5th! Meet our engineers, explore internship and full-time opportunities, and learn about our exciting projects in AI and cloud computing.",
      category: "social",
      tags: ["Careers", "Hiring", "Internships", "TechJobs"],
      viewCount: 387,
    },
    {
      authorId: insertedUsers[6].id,
      content: "State University is proud to announce record research funding this year, enabling groundbreaking work in renewable energy, healthcare innovation, and AI ethics.",
      category: "academic",
      tags: ["Research", "Innovation", "University", "StudentSuccess"],
      viewCount: 298,
    },
    {
      authorId: insertedUsers[7].id,
      content: "TechCorp Solutions is launching our Student Ambassador Program! Get hands-on experience with enterprise technology, exclusive mentorship, early access to job opportunities.",
      category: "social",
      tags: ["Opportunities", "Mentorship", "StudentPrograms", "Tech"],
      viewCount: 356,
    },
  ];

  console.log("Inserting posts...");
  let insertedPosts = await db.insert(posts).values(mockPosts).onConflictDoNothing().returning();
  
  if (insertedPosts.length === 0) {
    console.log("Posts already exist, fetching existing posts...");
    insertedPosts = await db.select().from(posts).limit(5);
  }
  console.log(`Using ${insertedPosts.length} posts`);
  return insertedPosts;
}

export async function seedCommentsAndReactions(insertedPosts: Post[], insertedUsers: User[]): Promise<void> {
  if (insertedPosts.length === 0) return;

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
