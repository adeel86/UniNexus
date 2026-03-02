import { Router, Request, Response } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  badges,
  userBadges,
  skills,
  userSkills,
  endorsements,
  notifications,
  insertEndorsementSchema,
} from "@shared/schema";

import { requireAuth } from "./shared";

const router = Router();

router.get("/user-badges/:userId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;
    
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role !== 'student') {
      return res.json([]);
    }

    const userBadgesData = await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
        badge: badges,
      })
      .from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));

    res.json(userBadgesData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/skills", async (req: Request, res: Response) => {
  try {
    const allSkills = await db.select().from(skills).orderBy(skills.name);
    res.json(allSkills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/endorsements/:userId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;
    
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role !== 'student') {
      return res.json([]);
    }

    const userEndorsements = await db
      .select({
        id: endorsements.id,
        endorserId: endorsements.endorserId,
        endorsedUserId: endorsements.endorsedUserId,
        skillId: endorsements.skillId,
        comment: endorsements.comment,
        createdAt: endorsements.createdAt,
        endorser: users,
        skill: skills,
      })
      .from(endorsements)
      .leftJoin(users, eq(endorsements.endorserId, users.id))
      .leftJoin(skills, eq(endorsements.skillId, skills.id))
      .where(eq(endorsements.endorsedUserId, req.params.userId))
      .orderBy(desc(endorsements.createdAt));

    res.json(userEndorsements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/endorsements", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertEndorsementSchema.parse({
      ...req.body,
      endorserId: req.user.id,
    });

    const [newEndorsement] = await db.insert(endorsements).values(validatedData).returning();

    await db
      .update(users)
      .set({
        endorsementScore: sql`${users.endorsementScore} + 10`,
        engagementScore: sql`${users.engagementScore} + 15`,
      })
      .where(eq(users.id, validatedData.endorsedUserId));

    await db.insert(notifications).values({
      userId: validatedData.endorsedUserId,
      type: "endorsement",
      title: "New Endorsement!",
      message: `${req.user.firstName} ${req.user.lastName} endorsed you`,
      link: "/profile",
    });

    res.json(newEndorsement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/user-skills/:userId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;

    const userSkillsData = await db
      .select({
        id: userSkills.id,
        userId: userSkills.userId,
        skillId: userSkills.skillId,
        level: userSkills.level,
        addedAt: userSkills.addedAt,
        skill: skills,
      })
      .from(userSkills)
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId));

    res.json(userSkillsData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/users/skills", requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    let { skillId, skillName, level } = req.body;

    // If skillName is provided, it's a custom skill
    if (!skillId && skillName) {
      // Check if skill already exists
      const [existingSkill] = await db
        .select()
        .from(skills)
        .where(eq(sql`lower(${skills.name})`, skillName.toLowerCase()))
        .limit(1);

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        // Create new skill
        const [newSkill] = await db
          .insert(skills)
          .values({
            name: skillName,
            category: "Custom",
          })
          .returning();
        
        // Ensure the new skill is available for future dropdowns by returning it
        // and also invalidating the skills query on the frontend
        skillId = newSkill.id;
      }
    }

    if (!skillId) {
      return res.status(400).json({ error: "Skill ID or name is required" });
    }

    // Check if user already has this skill
    const [existingUserSkill] = await db
      .select()
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, req.user.id),
          eq(userSkills.skillId, skillId)
        )
      )
      .limit(1);

    const [newUserSkill] = await db
      .insert(userSkills)
      .values({
        userId: req.user.id,
        skillId,
        level: level || "beginner",
      })
      .onConflictDoUpdate({
        target: [userSkills.userId, userSkills.skillId],
        set: { level: level || "beginner" }
      })
      .returning();

    // Fetch the full skill object to return to the frontend
    const [fullUserSkill] = await db
      .select({
        id: userSkills.id,
        userId: userSkills.userId,
        skillId: userSkills.skillId,
        level: userSkills.level,
        addedAt: userSkills.addedAt,
        skill: skills,
      })
      .from(userSkills)
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.id, newUserSkill.id))
      .limit(1);

    res.json(fullUserSkill);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/user-skills/:skillId", requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { skillId } = req.params;

    await db
      .delete(userSkills)
      .where(
        and(
          eq(userSkills.userId, req.user.id),
          eq(userSkills.skillId, skillId)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
