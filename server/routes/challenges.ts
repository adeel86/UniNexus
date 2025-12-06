import { Router, Request, Response } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  users,
  challenges,
  challengeParticipants,
  notifications,
  certifications,
  insertChallengeSchema,
} from "@shared/schema";
import { applyPointDelta, recalculateUserRank } from "../pointsHelper";
import { calculateChallengePoints } from "../rankTiers";

const router = Router();

// Get challenges with optional status filter
router.get("/challenges/:status?", async (req: Request, res: Response) => {
  try {
    let query = db.select().from(challenges).orderBy(desc(challenges.createdAt)).$dynamic();

    if (req.params.status && req.params.status !== 'all') {
      query = query.where(eq(challenges.status, req.params.status));
    }

    const challengesData = await query;
    res.json(challengesData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new challenge
router.post("/challenges", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertChallengeSchema.parse({
      ...req.body,
      organizerId: req.user.id,
    });

    const [newChallenge] = await db.insert(challenges).values(validatedData).returning();
    res.json(newChallenge);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get challenge milestones for a user
router.get("/users/:userId/challenge-milestones", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const userId = req.params.userId;
    
    const participations = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        joinedAt: challengeParticipants.joinedAt,
        challenge: challenges,
      })
      .from(challengeParticipants)
      .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(eq(challengeParticipants.userId, userId))
      .orderBy(desc(challengeParticipants.joinedAt));

    const milestones = participations.map((p) => {
      let status = 'joined';
      let placement = null;
      
      if (p.rank && p.rank <= 3) {
        status = 'winner';
        placement = p.rank === 1 ? '1st Place' : p.rank === 2 ? '2nd Place' : '3rd Place';
      } else if (p.submittedAt) {
        status = 'submitted';
      }

      return {
        ...p,
        participationStatus: status,
        placement,
      };
    });

    const activeCount = milestones.filter(m => m.challenge?.status === 'active').length;
    const completedCount = milestones.filter(m => m.challenge?.status === 'completed').length;
    const winsCount = milestones.filter(m => m.placement).length;
    const upcomingDeadlines = milestones
      .filter(m => m.challenge?.status === 'active' && m.challenge?.endDate)
      .slice(0, 3);

    res.json({
      milestones: milestones.slice(0, 10),
      stats: {
        activeCount,
        completedCount,
        winsCount,
      },
      upcomingDeadlines,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenges for global map
router.get("/challenges/map", async (req: Request, res: Response) => {
  try {
    const challengesData = await db
      .select()
      .from(challenges)
      .orderBy(desc(challenges.createdAt));

    const universityCounts: Record<string, { active: number; upcoming: number; completed: number; total: number; challenges: typeof challengesData }> = {};

    challengesData.forEach((challenge) => {
      const university = challenge.hostUniversity || 'Global';
      if (!universityCounts[university]) {
        universityCounts[university] = { active: 0, upcoming: 0, completed: 0, total: 0, challenges: [] };
      }
      universityCounts[university].total++;
      universityCounts[university].challenges.push(challenge);
      
      if (challenge.status === 'active') universityCounts[university].active++;
      else if (challenge.status === 'upcoming') universityCounts[university].upcoming++;
      else if (challenge.status === 'completed') universityCounts[university].completed++;
    });

    res.json({
      challenges: challengesData,
      universityCounts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all challenges with organizer info
router.get("/challenges-list", async (req: Request, res: Response) => {
  try {
    const allChallenges = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        organizerId: challenges.organizerId,
        category: challenges.category,
        difficulty: challenges.difficulty,
        prizes: challenges.prizes,
        startDate: challenges.startDate,
        endDate: challenges.endDate,
        participantCount: challenges.participantCount,
        status: challenges.status,
        createdAt: challenges.createdAt,
        organizer: users,
      })
      .from(challenges)
      .leftJoin(users, eq(challenges.organizerId, users.id))
      .orderBy(desc(challenges.createdAt));

    res.json(allChallenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join a challenge
router.post("/challenges/:challengeId/join", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [existingParticipant] = await db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, req.user.id)
        )
      )
      .limit(1);

    if (existingParticipant) {
      return res.status(400).json({ error: "Already joined this challenge" });
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const [participant] = await db.insert(challengeParticipants).values({
      challengeId,
      userId: req.user.id,
    }).returning();

    await db
      .update(challenges)
      .set({
        participantCount: sql`${challenges.participantCount} + 1`,
      })
      .where(eq(challenges.id, challengeId));

    await applyPointDelta(req.user.id, {
      engagementDelta: 10,
      challengeDelta: 5,
    });

    await db.insert(notifications).values({
      userId: req.user.id,
      type: 'challenge',
      title: 'Challenge Joined!',
      message: `You joined "${challenge.title}" and earned +5 Challenge Points! Submit your solution to earn more.`,
      link: '/challenges',
    });

    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit to a challenge
router.post("/challenges/:challengeId/submit", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;
    const { submissionUrl } = req.body;

    if (!submissionUrl) {
      return res.status(400).json({ error: "Submission URL is required" });
    }

    const [participant] = await db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, req.user.id)
        )
      )
      .limit(1);

    if (!participant) {
      return res.status(400).json({ error: "You must join the challenge before submitting" });
    }

    const [updatedParticipant] = await db
      .update(challengeParticipants)
      .set({
        submissionUrl,
        submittedAt: new Date(),
      })
      .where(eq(challengeParticipants.id, participant.id))
      .returning();

    await applyPointDelta(req.user.id, {
      engagementDelta: 20,
      problemSolverDelta: 15,
      challengeDelta: 25,
    });

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (challenge) {
      const verificationHash = createHash('sha256')
        .update(`${req.user.id}-${challengeId}-${Date.now()}`)
        .digest('hex');
      
      await db.insert(certifications).values({
        userId: req.user.id,
        title: `${challenge.title} - Participation`,
        description: `Successfully participated and submitted a solution for the ${challenge.title} challenge`,
        issuerName: 'UniNexus Platform',
        issuerId: challenge.organizerId || null,
        verificationHash,
        type: 'challenge',
        metadata: {
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          submissionUrl,
          certificateType: 'participation',
        },
      });

      await db.insert(notifications).values({
        userId: req.user.id,
        type: 'achievement',
        title: 'Certificate Earned!',
        message: `You've earned a participation certificate for ${challenge.title}!`,
        link: '/certificates',
      });
    }

    await db.insert(notifications).values({
      userId: req.user.id,
      type: 'challenge',
      title: 'Submission Received!',
      message: 'Your challenge submission has been recorded successfully.',
      link: '/challenges',
    });

    res.json(updatedParticipant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge participants
router.get("/challenges/:challengeId/participants", async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;

    const participants = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        joinedAt: challengeParticipants.joinedAt,
        user: users,
      })
      .from(challengeParticipants)
      .leftJoin(users, eq(challengeParticipants.userId, users.id))
      .where(eq(challengeParticipants.challengeId, challengeId))
      .orderBy(desc(challengeParticipants.submittedAt));

    res.json(participants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Award challenge points when ranks are assigned
router.post("/challenges/:participantId/award-rank-points", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { participantId } = req.params;
    const { rank } = req.body;

    if (!rank || typeof rank !== 'number') {
      return res.status(400).json({ error: "Valid rank is required" });
    }

    const [participant] = await db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.id, participantId))
      .limit(1);

    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, participant.challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    await db
      .update(challengeParticipants)
      .set({ rank })
      .where(eq(challengeParticipants.id, participantId));

    const points = calculateChallengePoints(rank, challenge.participantCount);
    await applyPointDelta(participant.userId, {
      challengeDelta: points,
    });

    if (rank <= 3) {
      const rankLabels = ['1st Place', '2nd Place', '3rd Place'];
      const verificationHash = createHash('sha256')
        .update(`${participant.userId}-${challenge.id}-winner-${Date.now()}`)
        .digest('hex');
      
      await db.insert(certifications).values({
        userId: participant.userId,
        title: `${challenge.title} - ${rankLabels[rank - 1]}`,
        description: `Achieved ${rankLabels[rank - 1]} in the ${challenge.title} challenge, demonstrating exceptional skills and problem-solving abilities`,
        issuerName: 'UniNexus Platform',
        issuerId: challenge.organizerId || null,
        verificationHash,
        type: 'challenge',
        metadata: {
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          rank,
          totalParticipants: challenge.participantCount,
          points,
          certificateType: 'winner',
        },
      });

      await db.insert(notifications).values({
        userId: participant.userId,
        type: 'achievement',
        title: 'Winner Certificate Earned!',
        message: `Congratulations! You've earned a ${rankLabels[rank - 1]} certificate for ${challenge.title}!`,
        link: '/certificates',
      });
    }

    await db.insert(notifications).values({
      userId: participant.userId,
      type: 'challenge',
      title: 'Challenge Rank Awarded!',
      message: `You ranked #${rank} and earned ${points} challenge points!`,
      link: '/challenges',
    });

    res.json({ success: true, points, rank });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate user rank tier
router.post("/users/:userId/recalculate-rank", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;
    
    if (req.user.role !== 'master_admin' && req.user.id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await recalculateUserRank(userId);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({ 
      success: true, 
      totalPoints: user?.totalPoints,
      rankTier: user?.rankTier 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's challenge participations
router.get("/challenges/my-participations", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const myParticipations = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        joinedAt: challengeParticipants.joinedAt,
        challenge: challenges,
      })
      .from(challengeParticipants)
      .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(eq(challengeParticipants.userId, req.user.id))
      .orderBy(desc(challengeParticipants.joinedAt));

    res.json(myParticipations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
