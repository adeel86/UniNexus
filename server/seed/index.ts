import { getSeedProfile, parseSeedProfile } from "./config";

// Import seed functions from data modules
import { seedUsers } from "./data/users";
import { seedBadges, seedUserBadges } from "./data/badges";
import { seedSkills, seedUserSkills } from "./data/skills";
import { seedEducation, seedUserProfiles } from "./data/education";
import { seedPosts, seedCommentsAndReactions } from "./data/posts";
import { seedCourses, seedEnrollmentsAndDiscussions, seedTeacherContent } from "./data/courses";
import { seedConnections, seedFollowers, seedEndorsements, seedConversations, seedMessages } from "./data/social";
import { seedChallenges, seedChallengeParticipants, seedGroups, seedGroupMembers, seedGroupPosts, seedNotifications, seedAnnouncements, seedCertifications } from "./data/gamification";
import { seedAIEvents, seedModerationActions, seedRecruiterFeedback, seedJobExperience, seedStudentCourses, seedPostSharesAndBoosts } from "./data/admin";

export async function seedDatabase(profileName?: string) {
  const config = getSeedProfile(profileName);
  console.log(`\n🌱 Starting database seed with profile: ${config.profile.toUpperCase()}`);
  
  // 1. Users - foundational data
  const insertedUsers = await seedUsers(config);
  
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
    const insertedChallenges = await seedChallenges(insertedUsers, config);
    if (insertedChallenges.length > 0) {
      await seedChallengeParticipants(insertedChallenges, insertedUsers);
    }
    const insertedGroups = await seedGroups(insertedUsers);
    if (insertedGroups.length > 0) {
      await seedGroupMembers(insertedGroups, insertedUsers);
      await seedGroupPosts(insertedGroups, insertedUsers);
    }
    await seedNotifications(insertedUsers, insertedPosts);
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

  console.log("\n✅ Database seeding completed successfully!");
}

// Support CLI usage (ESM-compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
  process.argv[1]?.endsWith('seed/index.ts');

if (isMainModule) {
  const profile = parseSeedProfile(process.argv);
  seedDatabase(profile).catch(console.error);
}
