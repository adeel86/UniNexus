import { db } from "../db";
import { sql } from "drizzle-orm";

// Import seed functions from data modules
import { mockUsers, seedUsers } from "./data/users";
import { mockBadges, seedBadges, seedUserBadges } from "./data/badges";
import { mockSkills, seedSkills, seedUserSkills } from "./data/skills";
import { seedEducation, seedUserProfiles } from "./data/education";
import { seedPosts, seedCommentsAndReactions } from "./data/posts";
import { seedCourses, seedEnrollmentsAndDiscussions, seedTeacherContent } from "./data/courses";
import { seedConnections, seedFollowers, seedEndorsements, seedConversations, seedMessages } from "./data/social";
import { seedChallenges, seedChallengeParticipants, seedGroups, seedGroupMembers, seedGroupPosts, seedNotifications, seedAnnouncements, seedCertifications } from "./data/gamification";
import { seedAIEvents, seedModerationActions, seedRecruiterFeedback, seedJobExperience, seedStudentCourses, seedPostSharesAndBoosts } from "./data/admin";

export async function seedDatabase() {
  console.log("Starting database seed...");

  // 1. Users - foundational data
  const insertedUsers = await seedUsers();
  console.log(`Using ${insertedUsers.length} users`);

  // 2. Badges and user badge assignments
  const insertedBadges = await seedBadges();
  if (insertedUsers.length > 0 && insertedBadges.length > 0) {
    await seedUserBadges(insertedUsers, insertedBadges);
  }

  // 3. Skills and user skill assignments
  const insertedSkills = await seedSkills();
  if (insertedUsers.length > 0 && insertedSkills.length > 0) {
    await seedUserSkills(insertedUsers, insertedSkills);
  }

  // 4. Education and user profiles
  if (insertedUsers.length > 0) {
    await seedEducation(insertedUsers);
    await seedUserProfiles(insertedUsers);
  }

  // 5. Posts and engagement
  const insertedPosts = await seedPosts(insertedUsers);
  if (insertedPosts.length > 0) {
    await seedCommentsAndReactions(insertedPosts, insertedUsers);
  }

  // 6. Courses and enrollments
  const insertedCourses = await seedCourses(insertedUsers);
  if (insertedCourses.length > 0 && insertedUsers.length > 0) {
    await seedEnrollmentsAndDiscussions(insertedCourses, insertedUsers);
    await seedTeacherContent(insertedCourses, insertedUsers);
  }

  // 7. Social connections
  if (insertedUsers.length > 0) {
    await seedConnections(insertedUsers);
    await seedFollowers(insertedUsers);
    await seedEndorsements(insertedUsers, insertedSkills);
    const insertedConversations = await seedConversations(insertedUsers);
    if (insertedConversations.length > 0) {
      await seedMessages(insertedConversations, insertedUsers);
    }
  }

  // 8. Gamification
  if (insertedUsers.length > 0) {
    const insertedChallenges = await seedChallenges(insertedUsers);
    if (insertedChallenges.length > 0) {
      await seedChallengeParticipants(insertedChallenges, insertedUsers);
    }
    const insertedGroups = await seedGroups(insertedUsers);
    if (insertedGroups.length > 0) {
      await seedGroupMembers(insertedGroups, insertedUsers);
      await seedGroupPosts(insertedGroups, insertedUsers);
    }
    await seedNotifications(insertedUsers);
    await seedAnnouncements(insertedUsers);
    await seedCertifications(insertedUsers);
  }

  // 9. Admin and auxiliary data
  if (insertedUsers.length > 0) {
    await seedAIEvents(insertedUsers);
    await seedModerationActions(insertedUsers);
    await seedRecruiterFeedback(insertedUsers);
    await seedJobExperience(insertedUsers);
    await seedStudentCourses(insertedUsers, insertedCourses);
    if (insertedPosts.length > 0) {
      await seedPostSharesAndBoosts(insertedPosts, insertedUsers);
    }
  }

  console.log("Database seeding completed successfully!");
}
