import { Router, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { updateTotalPointsAfterScoreChange } from "../pointsHelper";
import {
  users,
  skills,
  userSkills,
  endorsements,
  badges,
  userBadges,
  certifications,
  recruiterFeedback,
  teacherContent,
  notifications,
  studentPersonalTutorMaterials,
  studentPersonalTutorSessions,
  studentPersonalTutorMessages,
  insertStudentPersonalTutorMaterialSchema,
  insertStudentPersonalTutorSessionSchema,
  insertStudentPersonalTutorMessageSchema,
} from "@shared/schema";
import OpenAI from "openai";
import { requireAuth, requireRole, upload, saveFileLocally } from "./shared";
import { createNotification } from "../services/notifications.service";
import { storage } from "../storage";
import { uploadToCloud, isCloudStorageAvailable } from "../cloudStorage";

const router = Router();

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Helper function to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string | null> {
  try {
    // Dynamically import pdf-parse if available (optional dependency)
    const pdfParse = await (async () => {
      try {
        // @ts-ignore - optional dependency
        return (await import('pdf-parse')).default;
      } catch {
        return null;
      }
    })();
    
    if (!pdfParse) {
      return null;
    }
    
    const pdfData = await pdfParse(buffer);
    // Extract and clean text from PDF
    const text = pdfData.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join('\n')
      .substring(0, 15000);
    
    if (!text || text.length === 0) {
      return null;
    }
    
    return text;
  } catch (error) {
    // Error parsing PDF - return null
    console.error("PDF text extraction failed:", error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

// Helper function to extract text from Word documents (.docx, .doc)
async function extractTextFromWord(buffer: Buffer, filename: string): Promise<string | null> {
  try {
    // Try to extract from .docx files using mammoth
    if (filename.endsWith('.docx')) {
      const mammoth = await (async () => {
        try {
          // @ts-ignore - optional dependency
          return (await import('mammoth')).default;
        } catch {
          return null;
        }
      })();
      
      if (mammoth) {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join('\n')
          .substring(0, 15000);
        
        if (text && text.length > 0) {
          return text;
        }
      }
    }
    
    // For .doc files or fallback: try to extract basic text by converting to string
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
      const text = buffer
        .toString('latin1')
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 10)
        .slice(0, 400)
        .join('\n')
        .substring(0, 15000);
      
      if (text && text.length > 100) {
        return text;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Word document text extraction failed:", error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

// Personal Tutor Routes
router.get("/api/ai/personal-tutor/materials", requireAuth, async (req: Request, res: Response) => {
  try {
    const materials = await storage.getPersonalTutorMaterials(req.user!.id);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

router.post("/api/ai/personal-tutor/materials", requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    let fileUrl: string;
    if (isCloudStorageAvailable()) {
      const result = await uploadToCloud(req.file.buffer, {
        folder: 'documents',
        contentType: req.file.mimetype,
        originalFilename: req.file.originalname,
      });
      fileUrl = result?.url || await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
    } else {
      fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
    }

    // Extract text content from file
    let textContent: string | null = null;
    
    if (req.file.mimetype.startsWith('text/')) {
      // For text files, directly convert buffer to string
      textContent = req.file.buffer.toString();
    } else if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      // For PDFs, try to extract text using pdf-parse if available
      textContent = await extractTextFromPDF(req.file.buffer);
    } else if (
      req.file.mimetype === 'application/msword' ||
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      req.file.originalname.endsWith('.doc') ||
      req.file.originalname.endsWith('.docx')
    ) {
      // For Word documents, try to extract text
      textContent = await extractTextFromWord(req.file.buffer, req.file.originalname);
    }

    const { sessionId } = req.body;
    const data = insertStudentPersonalTutorMaterialSchema.parse({
      studentId: req.user!.id,
      sessionId: sessionId || null,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      fileType: req.file.originalname.split('.').pop()?.toLowerCase() || req.file.mimetype.substring(0, 50),
      textContent: textContent
    });
    const material = await storage.createPersonalTutorMaterial(data);
    res.json(material);
  } catch (error: any) {
    console.error(`[AI Tutor] Material upload error:`, error);
    res.status(400).json({ error: error.message || "Invalid material data" });
  }
});

router.delete("/api/ai/personal-tutor/materials/:materialId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    
    // Get the material to verify ownership
    const material = await storage.getPersonalTutorMaterial(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    // Verify the material belongs to the current user
    if (material.studentId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this material" });
    }
    
    // Delete the material
    await storage.deletePersonalTutorMaterial(materialId);
    
    res.json({ success: true, message: "Material deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to delete material" });
  }
});

router.get("/api/ai/personal-tutor/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const sessions = await storage.getPersonalTutorSessions(req.user!.id);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.post("/api/ai/personal-tutor/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertStudentPersonalTutorSessionSchema.parse({
      ...req.body,
      studentId: req.user!.id
    });
    const session = await storage.createPersonalTutorSession(data);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: "Invalid session data" });
  }
});

router.patch("/api/ai/personal-tutor/sessions/:sessionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    const session = await db
      .select()
      .from(studentPersonalTutorSessions)
      .where(eq(studentPersonalTutorSessions.id, sessionId));
    if (session.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session[0].studentId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const updated = await storage.updatePersonalTutorSession(sessionId, title.trim().substring(0, 200));
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to rename session" });
  }
});

router.delete("/api/ai/personal-tutor/sessions/:sessionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Get the session to verify ownership
    const session = await db
      .select()
      .from(studentPersonalTutorSessions)
      .where(eq(studentPersonalTutorSessions.id, sessionId));
    
    if (session.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Verify the session belongs to the current user
    if (session[0].studentId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this session" });
    }
    
    // Delete the session (messages will be deleted via cascade)
    await storage.deletePersonalTutorSession(sessionId);
    
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to delete session" });
  }
});

router.get("/api/ai/personal-tutor/sessions/:sessionId/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const messages = await storage.getPersonalTutorMessages(req.params.sessionId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/api/ai/personal-tutor/chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, mode } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required" });
    }

    if (!openai) {
      return res.status(503).json({ error: "AI Tutor is not available. Please configure the OpenAI API key." });
    }

    // Save user message
    await storage.createPersonalTutorMessage({
      sessionId,
      role: 'user',
      content: message
    });

    // Get context: only materials tied to this specific session
    const materials = await storage.getPersonalTutorMaterialsBySession(sessionId);

    const materialsContext = materials.length === 0
      ? '\n[No documents uploaded in this chat yet. You may upload files using the attachment button.]'
      : materials
          .map(m => {
            if (m.textContent && m.textContent.trim().length > 0) {
              return `\n--- Document: ${m.fileName} ---\n${m.textContent.substring(0, 12000)}`;
            } else {
              return `\n--- Document: ${m.fileName} (could not extract text) ---`;
            }
          })
          .join('\n\n');

    const systemPrompt = `You are a Personal Academic Tutor for ${req.user!.firstName} ${req.user!.lastName}.
Student level: ${req.user!.major || 'Student'} at ${req.user!.university || 'University'}.
Current mode: ${mode || 'Explain'}

INSTRUCTIONS:
1. Use the student's uploaded documents below as your primary source.
2. If documents are available, base your answers on them and reference the document name.
3. If no documents are uploaded yet, you can still answer using your general knowledge as a helpful tutor.
4. Respond according to the current mode:
   - Explain: Break down concepts clearly with examples
   - Practice: Create exercises and problems
   - Quiz: Test the student with questions from the material
   - Revision: Summarise key points

STUDENT'S UPLOADED DOCUMENTS FOR THIS CHAT:
${materialsContext}`;

    // Load conversation history for this session to maintain context
    const previousMessages = await storage.getPersonalTutorMessages(sessionId);
    const historyMessages = previousMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20) // Keep last 20 messages for context window management
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const assistantContent = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

    // Save assistant message
    const savedMessage = await storage.createPersonalTutorMessage({
      sessionId,
      role: 'assistant',
      content: assistantContent
    });

    // Return all messages in this session so frontend has complete conversation
    const allMessages = await storage.getPersonalTutorMessages(sessionId);
    res.json(allMessages);
  } catch (error) {
    console.error("Personal Tutor error:", error);
    res.status(500).json({ error: "Failed to get response from Personal Tutor" });
  }
});

router.post("/api/careerbot/chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!openai) {
      return res.status(503).json({ error: "AI CareerBot is not available. Please configure the OpenAI API key." });
    }

    const userSkillsData = await db
      .select({
        skill: skills,
        level: userSkills.level,
      })
      .from(userSkills)
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, req.user!.id));

    const skillsList = userSkillsData.map(s => `${s.skill?.name} (${s.level})`).join(', ') || 'None listed';
    const userInterests = (req.user as any).interests?.join(', ') || 'Not specified';

    const recruiterFeedbackData = await db
      .select({
        rating: recruiterFeedback.rating,
        category: recruiterFeedback.category,
        feedback: recruiterFeedback.feedback,
        context: recruiterFeedback.context,
        recruiterCompany: users.company,
        createdAt: recruiterFeedback.createdAt,
      })
      .from(recruiterFeedback)
      .leftJoin(users, eq(recruiterFeedback.recruiterId, users.id))
      .where(and(
        eq(recruiterFeedback.studentId, req.user!.id),
        eq(recruiterFeedback.isPublic, true)
      ))
      .orderBy(desc(recruiterFeedback.createdAt))
      .limit(10);

    let recruiterInsights = '';
    if (recruiterFeedbackData.length > 0) {
      const avgRating = recruiterFeedbackData.reduce((sum, f) => sum + f.rating, 0) / recruiterFeedbackData.length;
      const strengths = recruiterFeedbackData.filter(f => f.rating >= 4).map(f => f.category);
      const improvementAreas = recruiterFeedbackData.filter(f => f.rating <= 2).map(f => f.category);
      
      recruiterInsights = `\n\nIndustry Professional Feedback (${recruiterFeedbackData.length} reviews, avg: ${avgRating.toFixed(1)}/5):
- Strengths noted by recruiters: ${strengths.join(', ') || 'None yet'}
- Areas for improvement: ${improvementAreas.join(', ') || 'None yet'}
- Recent feedback highlights: ${recruiterFeedbackData.slice(0, 3).map(f => `"${f.feedback.substring(0, 100)}..." (${f.category}, ${f.rating}/5 from ${f.recruiterCompany || 'industry partner'})`).join('; ')}`;
    }

    const systemPrompt = `You are an AI Career Companion for university students on UniNexus. You provide comprehensive, personalized career guidance including:

1. **Job Market Insights**: Current trends, in-demand skills, emerging industries
2. **CV/Resume Enhancement**: Specific suggestions for improving professional profiles
3. **Skill Gap Analysis**: Identify missing skills for target careers
4. **Learning Path Recommendations**: Courses, projects, and communities to join
5. **Career Planning**: Strategic advice for employability and professional growth
6. **Industry Feedback Integration**: Leverage real recruiter feedback to provide highly personalized guidance

User Profile:
- Name: ${req.user!.firstName} ${req.user!.lastName}
- Major: ${req.user!.major || "Not specified"}
- University: ${req.user!.university || "Not specified"}
- Interests: ${userInterests}
- Current Skills: ${skillsList}
- Engagement Score: ${req.user!.engagementScore} (indicates platform activity level)
- Problem Solver Score: ${req.user!.problemSolverScore} (indicates problem-solving abilities)
- Endorsement Score: ${req.user!.endorsementScore} (indicates peer recognition)${recruiterInsights}

Guidelines:
- Provide actionable, specific advice tailored to their profile
- When discussing careers, mention current job market trends (2024-2025)
- For resume/CV questions, give concrete examples and formatting tips
- For skill gaps, suggest specific resources (courses, certifications, projects)
- Recommend relevant online communities, platforms, or networking opportunities
- Use an encouraging, professional tone suitable for Gen Z professionals
- Keep responses concise (2-4 paragraphs) but information-rich
- Include metrics or data when discussing job markets when relevant
- **IMPORTANT**: If recruiter feedback is available, incorporate it into your advice - validate their strengths and provide targeted suggestions for improvement areas
- Reference specific recruiter feedback when relevant to the user's question

Example responses:
- For "What skills should I learn?": Analyze their major, current skills, recruiter feedback, and suggest 3-5 specific in-demand skills with learning resources
- For "Help with my resume": Provide specific sections to improve, formatting tips, action words, and leverage recruiter feedback on strengths to highlight
- For "Job market for X field": Discuss current trends, salary ranges, growth projections, required skills, and how their recruiter feedback aligns with industry needs
- For "Career advice": Provide strategic roadmap based on their current position, goals, and recruiter-validated strengths/improvement areas`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    await db
      .update(users)
      .set({
        engagementScore: sql`${users.engagementScore} + 3`,
      })
      .where(eq(users.id, req.user!.id));

    // Recalculate totalPoints after engagement score change
    await updateTotalPointsAfterScoreChange(req.user!.id).catch((err: any) => 
      console.error("Failed to update total points:", err)
    );

    // Optional: Notify user about points earned via AI interaction
    if (req.user!.engagementScore % 10 === 0) { // Subtle notification every 10 points
       await createNotification({
         userId: req.user!.id,
         type: 'achievement',
         title: 'Career Explorer!',
         message: 'You are earning engagement points for using the AI CareerBot. Keep it up!',
         link: '/career'
       });
    }

    res.json({ message: assistantMessage });
  } catch (error: any) {
    console.error("CareerBot error:", error);
    res.status(500).json({ error: "Failed to get response from CareerBot" });
  }
});

router.get("/api/ai/suggest-posts", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI post suggestions are not available. Please configure the OpenAI API key." });
    }

    const userInterests = (req.user as any).interests || [];
    const interestsText = userInterests.length > 0 ? userInterests.join(', ') : 'general academic topics';

    const systemPrompt = `You are a creative content generator for a Gen Z student social platform. Generate 3 engaging post ideas that would resonate with university students. The posts should be inspiring, educational, or thought-provoking.

User Profile:
- Name: ${req.user!.firstName} ${req.user!.lastName}
- Major: ${req.user!.major || "Not specified"}
- Interests: ${interestsText}

Generate 3 diverse post ideas (one academic, one social/community, one project/achievement related) that would be interesting to this user. Each post should be:
- Engaging and relevant to Gen Z students
- 2-3 sentences long
- Include a call-to-action or question to encourage discussion
- Appropriate for a university social platform

Format your response as a JSON array of objects with fields: category (academic/social/project), content (the post text), and tags (array of 2-3 relevant hashtags).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate 3 personalized post ideas for me." },
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || '{"posts":[]}';
    let parsed;
    
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return res.json({ posts: [] });
    }

    const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    
    res.json({ posts });
  } catch (error: any) {
    console.error("AI post suggestions error:", error);
    res.status(500).json({ error: "Failed to generate post suggestions" });
  }
});

router.post("/api/ai/moderate-content", requireAuth, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: "Content is required" });
    }

    if (!openai) {
      return res.json({ 
        approved: true, 
        reason: "Moderation unavailable",
        confidence: 0 
      });
    }

    const moderationPrompt = `You are a content moderator for a university social platform. Analyze the following content and determine if it's appropriate. Content should be rejected if it contains:
- Hate speech or discrimination
- Harassment or bullying
- Explicit sexual content
- Violence or threats
- Spam or scams
- Academic dishonesty promotion

Respond with a JSON object containing:
- approved: boolean
- reason: string (only if rejected)
- confidence: number (0-1)

Content to moderate: "${content}"

Be lenient with academic discussions, debates, and Gen Z slang. Only flag clearly inappropriate content.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: moderationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const moderation = JSON.parse(responseText);

    res.json(moderation);
  } catch (error: any) {
    console.error("Content moderation error:", error);
    res.json({ 
      approved: true, 
      reason: "Moderation check failed, defaulting to approval",
      confidence: 0 
    });
  }
});

router.get("/api/ai/career-summary/:userId", requireAuth, requireRole('teacher', 'university_admin', 'master_admin'), async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ 
        error: "AI career summaries are not available. Please configure the OpenAI API key.",
        summary: "Career summary feature requires OpenAI API configuration."
      });
    }

    const { userId } = req.params;

    const [student] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentSkills = await db
      .select({
        skill: skills,
      })
      .from(userSkills)
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId));

    const studentEndorsements = await db
      .select({
        skill: skills,
        endorser: users,
        comment: endorsements.comment,
      })
      .from(endorsements)
      .leftJoin(skills, eq(endorsements.skillId, skills.id))
      .leftJoin(users, eq(endorsements.endorserId, users.id))
      .where(eq(endorsements.endorsedUserId, userId));

    const studentBadges = await db
      .select({
        badge: badges,
      })
      .from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));

    const studentCertifications = await db
      .select()
      .from(certifications)
      .where(eq(certifications.userId, userId));

    const skillsList = studentSkills.map(s => s.skill?.name).filter(Boolean).join(', ') || 'No skills listed';
    const endorsementsList = studentEndorsements.length > 0 
      ? studentEndorsements.map(e => `${e.skill?.name || 'General'}: ${e.comment || 'Endorsed by ' + e.endorser?.firstName}`).join('; ')
      : 'No endorsements yet';
    const badgesList = studentBadges.map(b => b.badge?.name).filter(Boolean).join(', ') || 'No badges earned';
    const certificationsList = studentCertifications.map(c => c.title).join(', ') || 'No certificates earned';

    const systemPrompt = `You are a career counselor and academic advisor for university students. Generate a comprehensive career progression summary that teachers can use for employability discussions with students.

Student Profile:
- Name: ${student.firstName} ${student.lastName}
- Major: ${student.major || "Not specified"}
- University: ${student.university || "Not specified"}
- Graduation Year: ${student.graduationYear || "Not specified"}
- Bio: ${student.bio || "No bio provided"}
- Interests: ${student.interests?.join(', ') || "Not specified"}

Engagement Metrics:
- Engagement Score: ${student.engagementScore} points
- Problem Solver Score: ${student.problemSolverScore} points
- Endorsement Score: ${student.endorsementScore} points
- Challenge Points: ${student.challengePoints} points
- Rank Tier: ${student.rankTier}
- Streak: ${student.streak} days

Skills: ${skillsList}
Endorsements: ${endorsementsList}
Badges: ${badgesList}
Certificates: ${certificationsList}

Generate a career progression summary with the following sections:
1. **Strengths & Expertise** (2-3 sentences highlighting their strongest areas based on metrics, skills, and endorsements)
2. **Skill Gap Analysis** (identify 2-3 skills they should develop for their career goals, considering their major and current skills)
3. **Employability Assessment** (rate their career readiness on a scale and explain the rating)
4. **Recommended Next Steps** (3-4 actionable recommendations for courses, projects, or experiences to improve employability)

Make it personalized, constructive, and actionable. Use a professional but encouraging tone suitable for sharing with the student during career counseling sessions.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a career progression summary for ${student.firstName} ${student.lastName}.` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const summary = completion.choices[0]?.message?.content || "Unable to generate career summary at this time.";

    res.json({ 
      summary,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        major: student.major,
        university: student.university,
        rankTier: student.rankTier,
      }
    });
  } catch (error: any) {
    console.error("Career summary error:", error);
    res.status(500).json({ error: "Failed to generate career summary" });
  }
});

router.post("/api/ai/moderate-image", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ 
        error: "AI moderation is not available",
        approved: true
      });
    }

    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content moderator for a university social platform. Analyze images for inappropriate content including: violence, hate speech symbols, explicit content, illegal activities, or harmful behavior. Respond with ONLY 'APPROVED' or 'REJECTED: [brief reason]'."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image for inappropriate content:" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 100,
    });

    const result = response.choices[0]?.message?.content || "APPROVED";
    const approved = result.toUpperCase().startsWith("APPROVED");
    const reason = approved ? null : result.replace(/^REJECTED:\s*/i, '');

    res.json({
      approved,
      reason,
      confidence: approved ? 1.0 : 0.9
    });
  } catch (error: any) {
    console.error("Image moderation error:", error);
    res.json({
      approved: true,
      reason: null,
      confidence: 0,
      error: "Moderation service unavailable"
    });
  }
});

let aiChatbotModule: any = null;

async function getAiChatbot() {
  if (!aiChatbotModule) {
    aiChatbotModule = await import("../aiChatbot");
  }
  return aiChatbotModule;
}

router.post("/api/ai/course-chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId, message, sessionId } = req.body;

    if (!courseId || !message) {
      return res.status(400).json({ error: "courseId and message are required" });
    }

    const aiChatbot = await getAiChatbot();

    const hasAccess = await aiChatbot.verifyCourseAccess(req.user!.id, courseId);
    if (!hasAccess) {
      return res.status(403).json({ error: "You must be enrolled in this course or be the instructor to use the AI tutor" });
    }

    const activeSessionId = sessionId || await aiChatbot.createOrGetSession(req.user!.id, courseId);

    await aiChatbot.saveMessage(activeSessionId, 'user', message);

    // Include any student-uploaded files in this session as additional context
    const sessionUploads = await storage.getAiChatSessionUploads(activeSessionId);
    const studentUploads = sessionUploads.map(u => ({
      fileName: u.fileName,
      textContent: u.textContent || null,
    }));

    const response = await aiChatbot.generateChatResponse(courseId, activeSessionId, message, req.user!.id, studentUploads);

    await aiChatbot.saveMessage(
      activeSessionId, 
      'assistant', 
      response.answer, 
      response.citations.map((c: any) => c.contentId)
    );

    res.json({
      sessionId: activeSessionId,
      answer: response.answer,
      citations: response.citations,
    });
  } catch (error: any) {
    console.error("AI course chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate response" });
  }
});

router.get("/api/ai/course-chat/:courseId/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const aiChatbot = await getAiChatbot();

    const hasAccess = await aiChatbot.verifyCourseAccess(req.user!.id, courseId);
    if (!hasAccess) {
      return res.status(403).json({ error: "You must be enrolled in this course or be the instructor" });
    }

    const sessions = await aiChatbot.getUserSessions(req.user!.id, courseId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/ai/course-chat/session/:sessionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const aiChatbot = await getAiChatbot();
    const messages = await aiChatbot.getChatHistory(sessionId);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/ai/course-chat/:courseId/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const aiChatbot = await getAiChatbot();

    const hasAccess = await aiChatbot.verifyCourseAccess(req.user!.id, courseId);
    if (!hasAccess) {
      return res.status(403).json({ error: "You must be enrolled in this course or be the instructor" });
    }

    const chunkCount = await aiChatbot.getContentChunkCount(courseId);
    const courseInfo = await aiChatbot.getCourseInfo(courseId);

    res.json({
      courseId,
      courseName: courseInfo?.name || "Unknown Course",
      instructorName: courseInfo?.instructorName || "Instructor",
      indexedChunks: chunkCount,
      isReady: chunkCount > 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ai/course-chat/upload", requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    let fileUrl: string;
    if (isCloudStorageAvailable()) {
      const result = await uploadToCloud(req.file.buffer, {
        folder: 'documents',
        contentType: req.file.mimetype,
        originalFilename: req.file.originalname,
      });
      fileUrl = result?.url || await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
    } else {
      fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
    }

    let textContent: string | null = null;
    if (req.file.mimetype.startsWith('text/')) {
      textContent = req.file.buffer.toString('utf-8');
    } else if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      const aiChatbot = await getAiChatbot();
      textContent = await (aiChatbot as any).extractTextFromPDF(req.file.buffer);
    } else if (req.file.originalname.endsWith('.docx') || req.file.originalname.endsWith('.doc')) {
      const aiChatbot = await getAiChatbot();
      textContent = await (aiChatbot as any).extractTextFromWord(req.file.buffer, req.file.originalname);
    }

    const upload = await storage.createAiChatSessionUpload({
      sessionId,
      studentId: req.user!.id,
      fileName: req.file.originalname,
      fileType: req.file.originalname.split('.').pop()?.toLowerCase() || 'file',
      fileUrl,
      textContent,
    });

    res.json(upload);
  } catch (error: any) {
    console.error("[CourseChatUpload] Error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

router.delete("/api/ai/course-chat/session/:sessionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await storage.deleteAiChatSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[CourseChatDelete] Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete session" });
  }
});

router.get("/api/ai/course-chat/:courseId/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const aiChatbot = await getAiChatbot();
    const hasAccess = await aiChatbot.verifyCourseAccess(req.user!.id, courseId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }
    const sessions = await aiChatbot.getUserSessions(req.user!.id, courseId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/teacher-ai/chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const { teacherId, courseId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let teacherMaterials;
    if (courseId) {
      teacherMaterials = await db
        .select()
        .from(teacherContent)
        .where(
          and(
            eq(teacherContent.courseId, courseId),
            eq(teacherContent.isPublic, true)
          )
        );
    } else if (teacherId) {
      teacherMaterials = await db
        .select()
        .from(teacherContent)
        .where(
          and(
            eq(teacherContent.teacherId, teacherId),
            eq(teacherContent.isPublic, true)
          )
        );
    } else {
      return res.status(400).json({ error: "Either teacherId or courseId is required" });
    }

    const [teacher] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId || teacherMaterials[0]?.teacherId));

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const materialsContext = teacherMaterials
      .map((material) => {
        let context = `Material: ${material.title}\n`;
        if (material.description) context += `Description: ${material.description}\n`;
        if (material.textContent) context += `Content: ${material.textContent}\n`;
        if (material.tags && material.tags.length > 0) context += `Tags: ${material.tags.join(', ')}\n`;
        return context;
      })
      .join('\n---\n');

    const systemPrompt = `You are an AI teaching assistant for ${teacher.firstName} ${teacher.lastName}'s class. 
Your role is to help students understand the course materials by answering questions based ONLY on the provided materials.

CRITICAL RULES:
- Answer questions using ONLY the information from the teacher's materials provided below
- If the answer isn't in the materials, clearly say "I don't have that information in the course materials"
- Never make up or hallucinate information beyond what's provided
- Cite specific materials when answering (e.g., "According to the lecture notes on...")
- Use the teacher's terminology and teaching style
- Be helpful, clear, and encourage learning

TEACHER'S MATERIALS:
${materialsContext || 'No materials have been uploaded yet. Please ask the teacher to upload course materials.'}`;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

    res.json({ 
      response: aiResponse,
      materialsUsed: teacherMaterials.length,
      teacherName: `${teacher.firstName} ${teacher.lastName}`
    });
  } catch (error: any) {
    console.error("Teacher AI chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
