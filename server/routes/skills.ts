import { Router, Request, Response } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../db";
import { updateTotalPointsAfterScoreChange } from "../pointsHelper";
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

router.get("/user-badges/:userId", requireAuth, async (req: Request, res: Response) => {
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

router.get("/endorsements/:userId", requireAuth, async (req: Request, res: Response) => {
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

router.post("/endorsements", requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = insertEndorsementSchema.parse({
      ...req.body,
      endorserId: req.user!.id,
    });

    const [newEndorsement] = await db.insert(endorsements).values(validatedData).returning();

    await db
      .update(users)
      .set({
        endorsementScore: sql`${users.endorsementScore} + 10`,
        engagementScore: sql`${users.engagementScore} + 15`,
      })
      .where(eq(users.id, validatedData.endorsedUserId));

    // Recalculate totalPoints after both endorsement and engagement score changes
    await updateTotalPointsAfterScoreChange(validatedData.endorsedUserId).catch((err: any) => 
      console.error("Failed to update total points:", err)
    );

    await db.insert(notifications).values({
      userId: validatedData.endorsedUserId,
      type: "endorsement",
      title: "New Endorsement!",
      message: `${req.user!.firstName} ${req.user!.lastName} endorsed you`,
      link: "/profile",
    });

    res.json(newEndorsement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/user-skills/:userId", requireAuth, async (req: Request, res: Response) => {
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
        
        skillId = newSkill.id;
      }
    }

    if (!skillId) {
      return res.status(400).json({ error: "Skill ID or name is required" });
    }

    // Insert or update the user skill
    const [newUserSkill] = await db
      .insert(userSkills)
      .values({
        userId: req.user!.id,
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
  try {
    const { skillId } = req.params;
    const userId = (req.user as any).id;

    const result = await db
      .delete(userSkills)
      .where(
        and(
          eq(userSkills.id, skillId),
          eq(userSkills.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }

    res.json({ success: true, deletedCount: result.length });
  } catch (error: any) {
    console.error("DELETE /api/user-skills error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/users/skills/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level } = req.body;
    const userId = (req.user as any).id;

    if (!level) {
      return res.status(400).json({ error: "Level is required" });
    }

    const updateResult = await db
      .update(userSkills)
      .set({ level })
      .where(
        and(
          eq(userSkills.id, id),
          eq(userSkills.userId, userId)
        )
      )
      .returning();

    if (!updateResult || updateResult.length === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Return the first updated item
    res.json(updateResult[0]);
  } catch (error: any) {
    console.error("PATCH /api/users/skills error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
