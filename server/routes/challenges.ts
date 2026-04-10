import { Router, Request, Response } from "express";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  users,
  userStats,
  challenges,
  challengeParticipants,
  notifications,
  certifications,
  insertChallengeSchema,
} from "@shared/schema";
import { applyPointDelta, recalculateUserRank } from "../pointsHelper";
import { calculateChallengePoints } from "../rankTiers";
import { updateUserStreakForActivity } from "../streakHelper";

const router = Router();

// Get challenges for global map (must be before /:status? to avoid being shadowed)
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

// Get user's challenge participations (must be before /:status? to avoid being shadowed)
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
        submissionDescription: challengeParticipants.submissionDescription,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        score: challengeParticipants.score,
        feedback: challengeParticipants.feedback,
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

// Get challenge results (published only, for participants and university admins)
router.get("/challenges/:challengeId/results", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (!challenge.resultsPublished) {
      return res.status(403).json({ error: "Results have not been published yet" });
    }

    const results = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submissionDescription: challengeParticipants.submissionDescription,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        score: challengeParticipants.score,
        feedback: challengeParticipants.feedback,
        joinedAt: challengeParticipants.joinedAt,
        user: users,
      })
      .from(challengeParticipants)
      .leftJoin(users, eq(challengeParticipants.userId, users.id))
      .where(eq(challengeParticipants.challengeId, challengeId))
      .orderBy(challengeParticipants.rank);

    res.json({ challenge, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenges for university - their students' results
router.get("/challenges/university-results", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const allowedRoles = ['university_admin', 'master_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!adminUser?.university) {
      return res.status(400).json({ error: "University not found for this admin" });
    }

    // Get all students from this university
    const universityStudents = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.university, adminUser.university));

    if (universityStudents.length === 0) {
      return res.json({ challenges: [], participantsByChallenge: {} });
    }

    const studentIds = universityStudents.map(s => s.id);

    // Get all challenge participations for these students with published results
    const participations = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submissionDescription: challengeParticipants.submissionDescription,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        score: challengeParticipants.score,
        feedback: challengeParticipants.feedback,
        joinedAt: challengeParticipants.joinedAt,
        user: users,
        challenge: challenges,
      })
      .from(challengeParticipants)
      .leftJoin(users, eq(challengeParticipants.userId, users.id))
      .leftJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(inArray(challengeParticipants.userId, studentIds))
      .orderBy(desc(challengeParticipants.joinedAt));

    // Group by challenge
    const challengeMap: Record<string, any> = {};
    const participantsByChallenge: Record<string, any[]> = {};

    participations.forEach((p) => {
      if (!p.challenge) return;
      if (!challengeMap[p.challengeId]) {
        challengeMap[p.challengeId] = p.challenge;
        participantsByChallenge[p.challengeId] = [];
      }
      participantsByChallenge[p.challengeId].push({
        id: p.id,
        userId: p.userId,
        submissionUrl: p.submissionUrl,
        submissionDescription: p.submissionDescription,
        submittedAt: p.submittedAt,
        rank: p.rank,
        score: p.score,
        feedback: p.feedback,
        joinedAt: p.joinedAt,
        user: p.user,
      });
    });

    res.json({
      challenges: Object.values(challengeMap),
      participantsByChallenge,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenges with optional status filter
router.get("/challenges/:status?", async (req: Request, res: Response) => {
  try {
    const validStatuses = ['active', 'upcoming', 'completed'];
    let query = db.select().from(challenges).orderBy(desc(challenges.createdAt)).$dynamic();

    if (req.params.status && validStatuses.includes(req.params.status)) {
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

  const allowedRoles = ['master_admin', 'industry_professional'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Only industry partners can create challenges" });
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

// Edit a challenge (organizer or admin only)
router.patch("/challenges/:challengeId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const allowedRoles = ['master_admin'];
    if (challenge.organizerId !== req.user.id && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Only the challenge organizer can edit this challenge" });
    }

    const allowedFields = ['title', 'description', 'requirements', 'evaluationCriteria', 'category', 'difficulty', 'prizes', 'maxParticipants', 'startDate', 'endDate', 'status'];
    const updates: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const [updated] = await db
      .update(challenges)
      .set(updates)
      .where(eq(challenges.id, challengeId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a challenge (organizer or admin only)
router.delete("/challenges/:challengeId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (challenge.organizerId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Only the challenge organizer can delete this challenge" });
    }

    await db.delete(challenges).where(eq(challenges.id, challengeId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publish challenge results
router.post("/challenges/:challengeId/publish-results", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (challenge.organizerId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Only the challenge organizer can publish results" });
    }

    await db
      .update(challenges)
      .set({ resultsPublished: 1, status: 'completed' })
      .where(eq(challenges.id, challengeId));

    // Notify all participants
    const participants = await db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));

    for (const participant of participants) {
      await db.insert(notifications).values({
        userId: participant.userId,
        type: 'challenge',
        title: 'Challenge Results Published!',
        message: `Results for "${challenge.title}" have been published. Check your ranking and feedback!`,
        link: '/challenges',
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
        submissionDescription: challengeParticipants.submissionDescription,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        score: challengeParticipants.score,
        feedback: challengeParticipants.feedback,
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

// Join a challenge
router.post("/challenges/:challengeId/join", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const blockedRoles = ['university_admin'];
  if (blockedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "University admins cannot join challenges" });
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

    if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
      return res.status(400).json({ error: "This challenge is no longer accepting participants" });
    }

    if (challenge.maxParticipants && challenge.participantCount >= challenge.maxParticipants) {
      return res.status(400).json({ error: "This challenge has reached its maximum participant limit" });
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

    await updateUserStreakForActivity(req.user.id, 'CHALLENGE_JOIN').catch((error) => {
      console.error('Failed to update streak for challenge join:', error);
    });

    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit to a challenge (or update existing submission before deadline)
router.post("/challenges/:challengeId/submit", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;
    const { submissionUrl, submissionDescription } = req.body;

    if (!submissionUrl && !submissionDescription) {
      return res.status(400).json({ error: "Please provide a submission URL or description" });
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

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Deadline enforcement
    if (challenge.endDate && new Date() > new Date(challenge.endDate)) {
      return res.status(400).json({ error: "The submission deadline for this challenge has passed" });
    }

    const isFirstSubmission = !participant.submittedAt;

    const [updatedParticipant] = await db
      .update(challengeParticipants)
      .set({
        submissionUrl: submissionUrl || participant.submissionUrl,
        submissionDescription: submissionDescription || participant.submissionDescription,
        submittedAt: participant.submittedAt || new Date(),
      })
      .where(eq(challengeParticipants.id, participant.id))
      .returning();

    // Only award points and certificate on first submission
    if (isFirstSubmission) {
      await applyPointDelta(req.user.id, {
        engagementDelta: 20,
        problemSolverDelta: 15,
        challengeDelta: 25,
      });

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

      await db.insert(notifications).values({
        userId: req.user.id,
        type: 'challenge',
        title: 'Submission Received! +25 Challenge Points',
        message: 'Your challenge submission has been recorded successfully.',
        link: '/challenges',
      });

      await updateUserStreakForActivity(req.user.id, 'CHALLENGE_SUBMIT').catch((error) => {
        console.error('Failed to update streak for challenge submit:', error);
      });
    } else {
      await db.insert(notifications).values({
        userId: req.user.id,
        type: 'challenge',
        title: 'Submission Updated',
        message: 'Your challenge submission has been updated successfully.',
        link: '/challenges',
      });
    }

    res.json(updatedParticipant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge participants
router.get("/challenges/:challengeId/participants", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { challengeId } = req.params;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Only organizer, master admin, or challenge participants can view
    const allowedRoles = ['master_admin', 'industry_professional', 'university_admin'];
    if (!allowedRoles.includes(req.user.role) && challenge.organizerId !== req.user.id) {
      // Check if user is a participant
      const [participation] = await db
        .select()
        .from(challengeParticipants)
        .where(and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, req.user.id)
        ))
        .limit(1);

      if (!participation) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const participants = await db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        submissionUrl: challengeParticipants.submissionUrl,
        submissionDescription: challengeParticipants.submissionDescription,
        submittedAt: challengeParticipants.submittedAt,
        rank: challengeParticipants.rank,
        score: challengeParticipants.score,
        feedback: challengeParticipants.feedback,
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

// Evaluate a participant: assign rank, score, and feedback
router.post("/challenges/:participantId/award-rank-points", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const allowedRoles = ['master_admin', 'industry_professional', 'university_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Only challenge organizers and admins can evaluate submissions" });
  }

  try {
    const { participantId } = req.params;
    const { rank, score, feedback } = req.body;

    if (rank !== undefined && (typeof rank !== 'number' || rank < 1)) {
      return res.status(400).json({ error: "Rank must be a positive number" });
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

    // Verify organizer ownership (unless master_admin)
    if (req.user.role !== 'master_admin' && challenge.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Only the challenge organizer can evaluate submissions" });
    }

    const updates: Record<string, any> = {};
    if (rank !== undefined) updates.rank = rank;
    if (score !== undefined) updates.score = score;
    if (feedback !== undefined) updates.feedback = feedback;

    await db
      .update(challengeParticipants)
      .set(updates)
      .where(eq(challengeParticipants.id, participantId));

    let points = 0;
    if (rank !== undefined) {
      const previousRank = participant.rank;
      points = calculateChallengePoints(rank, challenge.participantCount);
      await applyPointDelta(participant.userId, {
        challengeDelta: points,
      });

      if (rank <= 3 && previousRank !== rank) {
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
    }

    if (feedback !== undefined) {
      await db.insert(notifications).values({
        userId: participant.userId,
        type: 'challenge',
        title: 'Feedback Received',
        message: `The organizer left feedback on your submission for "${challenge.title}".`,
        link: '/challenges',
      });
    }

    res.json({ success: true, points, rank, score, feedback });
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

    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    res.json({ 
      success: true, 
      totalPoints: stats?.totalPoints,
      rankTier: stats?.rankTier 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
