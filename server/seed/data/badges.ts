import { db } from "../../db";
import { badges, userBadges } from "@shared/schema";
import type { Badge, User } from "@shared/schema";

export const mockBadges = [
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

export async function seedBadges(): Promise<Badge[]> {
  console.log("Inserting badges...");
  let insertedBadges = await db.insert(badges).values(mockBadges).onConflictDoNothing().returning();
  
  if (insertedBadges.length === 0) {
    console.log("Badges already exist, fetching existing badges...");
    insertedBadges = await db.select().from(badges);
  }
  console.log(`Using ${insertedBadges.length} badges`);
  return insertedBadges;
}

export async function seedUserBadges(insertedUsers: User[], insertedBadges: Badge[]): Promise<void> {
  if (insertedUsers.length > 0 && insertedBadges.length > 0) {
    const userBadgeAssignments = [
      { userId: insertedUsers[0].id, badgeId: insertedBadges[0].id },
      { userId: insertedUsers[0].id, badgeId: insertedBadges[1].id },
    ];

    console.log("Assigning badges to users...");
    const assignedBadges = await db.insert(userBadges).values(userBadgeAssignments).onConflictDoNothing().returning();
    console.log(`Assigned ${assignedBadges.length} badges to users`);
  }
}
