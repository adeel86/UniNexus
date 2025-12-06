import { db } from "../../db";
import { skills, userSkills } from "@shared/schema";
import type { Skill, User } from "@shared/schema";

export const mockSkills = [
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

export async function seedSkills(): Promise<Skill[]> {
  console.log("Inserting skills...");
  let insertedSkills = await db.insert(skills).values(mockSkills).onConflictDoNothing().returning();
  
  if (insertedSkills.length === 0) {
    console.log("Skills already exist, fetching existing skills...");
    insertedSkills = await db.select().from(skills);
  }
  console.log(`Using ${insertedSkills.length} skills`);
  return insertedSkills;
}

export async function seedUserSkills(insertedUsers: User[], insertedSkills: Skill[]): Promise<void> {
  if (insertedUsers.length > 0 && insertedSkills.length > 0) {
    const userSkillAssignments = [
      { userId: insertedUsers[0].id, skillId: insertedSkills[0].id, level: "advanced" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[1].id, level: "intermediate" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[2].id, level: "advanced" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[6].id, level: "intermediate" },
      { userId: insertedUsers[0].id, skillId: insertedSkills[8].id, level: "advanced" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[3].id, level: "expert" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[0].id, level: "intermediate" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[9].id, level: "expert" },
      { userId: insertedUsers[1].id, skillId: insertedSkills[6].id, level: "expert" },
    ];

    if (insertedUsers.length > 5) {
      userSkillAssignments.push(
        { userId: insertedUsers[5].id, skillId: insertedSkills[0].id, level: "expert" },
        { userId: insertedUsers[5].id, skillId: insertedSkills[2].id, level: "expert" },
        { userId: insertedUsers[5].id, skillId: insertedSkills[1].id, level: "advanced" },
        { userId: insertedUsers[5].id, skillId: insertedSkills[5].id, level: "intermediate" },
        { userId: insertedUsers[5].id, skillId: insertedSkills[8].id, level: "advanced" }
      );
    }
    if (insertedUsers.length > 6 && insertedUsers[6].role === 'student') {
      userSkillAssignments.push(
        { userId: insertedUsers[6].id, skillId: insertedSkills[3].id, level: "expert" },
        { userId: insertedUsers[6].id, skillId: insertedSkills[9].id, level: "expert" },
        { userId: insertedUsers[6].id, skillId: insertedSkills[6].id, level: "advanced" },
        { userId: insertedUsers[6].id, skillId: insertedSkills[7].id, level: "intermediate" }
      );
    }
    if (insertedUsers.length > 8) {
      userSkillAssignments.push(
        { userId: insertedUsers[8].id, skillId: insertedSkills[4].id, level: "expert" },
        { userId: insertedUsers[8].id, skillId: insertedSkills[1].id, level: "advanced" },
        { userId: insertedUsers[8].id, skillId: insertedSkills[5].id, level: "intermediate" },
        { userId: insertedUsers[8].id, skillId: insertedSkills[8].id, level: "advanced" }
      );
    }
    if (insertedUsers.length > 9) {
      userSkillAssignments.push(
        { userId: insertedUsers[9].id, skillId: insertedSkills[0].id, level: "advanced" },
        { userId: insertedUsers[9].id, skillId: insertedSkills[2].id, level: "advanced" },
        { userId: insertedUsers[9].id, skillId: insertedSkills[7].id, level: "advanced" },
        { userId: insertedUsers[9].id, skillId: insertedSkills[6].id, level: "intermediate" }
      );
    }

    console.log("Assigning skills to users...");
    const assignedSkills = await db.insert(userSkills).values(userSkillAssignments).onConflictDoNothing().returning();
    console.log(`Assigned ${assignedSkills.length} skills to users`);
  }
}
