import { db } from "../db";
import { sql } from "drizzle-orm";
import { getSeedProfile, parseSeedProfile, type SeedConfig } from "./config";

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

export async function seedDatabase(profileName?: string) {
  const config = getSeedProfile(profileName);
  console.log(`\n🌱 Starting database seed with profile: ${config.profile.toUpperCase()}`);
  console.log(`📊 Configuration:`);
  console.log(`   - Users: ${config.users.bulkUserCount} bulk + ${config.users.demoAccountsOnly ? 'demo only' : 'all roles'}`);
  console.log(`   - Posts: ${config.posts.perUser} per user`);
  console.log(`   - Courses: ${config.courses.count} courses`);
  console.log(`   - Connection rate: ${(config.connections.connectionRate * 100).toFixed(0)}%\n`);

  // 1. Users - foundational data
  const insertedUsers = await seedUsers(config);
  console.log(`Using ${insertedUsers.length} users`);

  // 2. Badges and user badge assignments
  const insertedBadges = await seedBadges();
  if (insertedUsers.length > 0 && insertedBadges.length > 0) {
    await seedUserBadges(insertedUsers, insertedBadges, config);
  }

  // 3. Skills and user skill assignments
  const insertedSkills = await seedSkills();
  if (insertedUsers.length > 0 && insertedSkills.length > 0) {
    await seedUserSkills(insertedUsers, insertedSkills, config);
  }

  // 4. Education and user profiles
  if (insertedUsers.length > 0) {
    await seedEducation(insertedUsers, config);
    await seedUserProfiles(insertedUsers, config);
  }

  // 5. Posts and engagement
  const insertedPosts = await seedPosts(insertedUsers, config);
  if (insertedPosts.length > 0) {
    await seedCommentsAndReactions(insertedPosts, insertedUsers, config);
  }

  // 6. Courses and enrollments
  const insertedCourses = await seedCourses(insertedUsers, config);
  if (insertedCourses.length > 0 && insertedUsers.length > 0) {
    await seedEnrollmentsAndDiscussions(insertedCourses, insertedUsers, config);
    await seedTeacherContent(insertedCourses, insertedUsers, config);
  }

  // 7. Social connections
  if (insertedUsers.length > 0) {
    await seedConnections(insertedUsers, config);
    await seedFollowers(insertedUsers, config);
    await seedEndorsements(insertedUsers, insertedSkills, config);
    const insertedConversations = await seedConversations(insertedUsers, config);
    if (insertedConversations.length > 0) {
      await seedMessages(insertedConversations, insertedUsers, config);
    }
  }

  // 8. Gamification
  if (insertedUsers.length > 0) {
    const insertedChallenges = await seedChallenges(insertedUsers, config);
    if (insertedChallenges.length > 0) {
      await seedChallengeParticipants(insertedChallenges, insertedUsers, config);
    }
    const insertedGroups = await seedGroups(insertedUsers, config);
    if (insertedGroups.length > 0) {
      await seedGroupMembers(insertedGroups, insertedUsers, config);
      await seedGroupPosts(insertedGroups, insertedUsers, config);
    }
    await seedNotifications(insertedUsers, config);
    await seedAnnouncements(insertedUsers, config);
    await seedCertifications(insertedUsers, config);
  }

  // 9. Admin and auxiliary data
  if (insertedUsers.length > 0) {
    await seedAIEvents(insertedUsers, config);
    await seedModerationActions(insertedUsers, config);
    await seedRecruiterFeedback(insertedUsers, config);
    await seedJobExperience(insertedUsers, config);
    await seedStudentCourses(insertedUsers, insertedCourses, config);
    if (insertedPosts.length > 0) {
      await seedPostSharesAndBoosts(insertedPosts, insertedUsers, config);
    }
  }

  console.log("\n✅ Database seeding completed successfully!");
  console.log(`📈 Summary: ${insertedUsers.length} users, ${insertedPosts.length} posts, ${insertedCourses.length} courses\n`);
}

// Support CLI usage (ESM-compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
  process.argv[1]?.endsWith('seed/index.ts');

if (isMainModule) {
  const profile = parseSeedProfile(process.argv);
  seedDatabase(profile).catch(console.error);
}
