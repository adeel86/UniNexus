import OpenAI from "openai";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import {
  teacherContent,
  teacherContentChunks,
  aiChatSessions,
  aiChatMessages,
  courseEnrollments,
  courses,
  users,
  studentCourses,
  type TeacherContentChunk,
} from "@shared/schema";

// Lazy-loaded OpenAI client to avoid initialization errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const TOP_K_CHUNKS = 5;

interface ChunkWithScore {
  chunk: TeacherContentChunk;
  score: number;
  contentTitle: string;
}

// Helper function to extract text from PDF documents
export async function extractTextFromPDF(buffer: Buffer): Promise<string | null> {
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
      console.debug("pdf-parse not installed, PDF text extraction skipped");
      return null;
    }
    
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join('\n')
      .substring(0, 15000);
    
    if (!text || text.length === 0) {
      console.debug("PDF has no extractable text");
      return null;
    }
    
    return text;
  } catch (error) {
    console.error("PDF text extraction failed:", error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

// Helper function to extract text from Word documents (.docx, .doc)
export async function extractTextFromWord(buffer: Buffer, filename: string): Promise<string | null> {
  try {
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
    
    // Fallback for .doc files
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
      const text = buffer
        .toString('latin1')
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 10)
        .slice(0, 200)
        .join('\n')
        .substring(0, 8000);
      
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

function splitLongSentence(sentence: string, maxLength: number): string[] {
  if (sentence.length <= maxLength) {
    return [sentence];
  }
  
  const words = sentence.split(/\s+/);
  const result: string[] = [];
  let currentPart = "";
  
  for (const word of words) {
    if ((currentPart + " " + word).length > maxLength && currentPart.length > 0) {
      result.push(currentPart.trim());
      currentPart = word;
    } else {
      currentPart = currentPart ? currentPart + " " + word : word;
    }
  }
  
  if (currentPart.trim()) {
    result.push(currentPart.trim());
  }
  
  return result;
}

function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  
  for (const sentence of sentences) {
    const sentenceParts = splitLongSentence(sentence, chunkSize);
    
    for (const part of sentenceParts) {
      if ((currentChunk + " " + part).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + part;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + part : part;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50);
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function extractTextFromContent(content: { textContent?: string | null; fileUrl?: string | null; contentType: string }): Promise<string> {
  // If text is already extracted and stored, use it
  if (content.textContent) {
    return content.textContent;
  }
  
  // For non-text types, we need to extract from the file
  // This is handled in the upload endpoint by extracting during upload
  // For now, return empty string if no text content
  return "";
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API key not configured, skipping embedding generation");
    return null;
  }
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000),
    });
    return response.data[0].embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error.message);
    return null;
  }
}

export async function indexTeacherContent(contentId: string): Promise<number> {
  const [content] = await db
    .select()
    .from(teacherContent)
    .where(eq(teacherContent.id, contentId));
  
  if (!content) {
    throw new Error("Content not found");
  }
  
  // Delete existing chunks for this content
  await db.delete(teacherContentChunks).where(eq(teacherContentChunks.contentId, contentId));
  
  const text = await extractTextFromContent(content);
  
  if (!text || text.length < 50) {
    return 0;
  }
  
  const chunks = chunkText(text);
  
  let indexedCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const embedding = await generateEmbedding(chunkText);
    
    if (!embedding) {
      continue;
    }
    
    try {
      await db.insert(teacherContentChunks).values({
        contentId: content.id,
        courseId: content.courseId,
        teacherId: content.teacherId,
        chunkIndex: i,
        text: chunkText,
        embedding: embedding,
        tokenCount: estimateTokenCount(chunkText),
      });
      indexedCount++;
    } catch (dbError) {
      console.error(`[IndexTeacherContent] Failed to insert chunk for content ${contentId}:`, dbError);
    }
  }
  
  return indexedCount;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveRelevantChunks(
  courseId: string,
  query: string,
  topK: number = TOP_K_CHUNKS
): Promise<ChunkWithScore[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  const chunks = await db
    .select({
      chunk: teacherContentChunks,
      contentTitle: teacherContent.title,
    })
    .from(teacherContentChunks)
    .innerJoin(teacherContent, eq(teacherContentChunks.contentId, teacherContent.id))
    .where(eq(teacherContentChunks.courseId, courseId));
  
  if (chunks.length === 0) {
    return [];
  }
  
  if (!queryEmbedding) {
    return chunks.slice(0, topK).map(c => ({
      chunk: c.chunk,
      score: 1,
      contentTitle: c.contentTitle,
    }));
  }
  
  // Check for chunks with missing embeddings
  const chunksWithoutEmbeddings = chunks.filter(c => !c.chunk.embedding);
  if (chunksWithoutEmbeddings.length > 0) {
    console.warn(`[RetrieveChunks] Found ${chunksWithoutEmbeddings.length}/${chunks.length} chunks without embeddings for course ${courseId}`);
  }
  
  const scoredChunks: ChunkWithScore[] = chunks
    .map(c => {
      const embeddingArray = Array.isArray(c.chunk.embedding) ? c.chunk.embedding : (typeof c.chunk.embedding === 'string' ? JSON.parse(c.chunk.embedding) : []);
      const score = embeddingArray.length > 0 ? cosineSimilarity(queryEmbedding, embeddingArray as number[]) : 0;
      return {
        chunk: c.chunk,
        score,
        contentTitle: c.contentTitle,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  
  return scoredChunks;
}

export async function verifyStudentEnrollment(userId: string, courseId: string): Promise<boolean> {
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.studentId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    );
  
  return !!enrollment;
}

export async function verifyCourseAccess(userId: string, courseId: string): Promise<boolean> {
  // Check if user is enrolled in the course via courseEnrollments
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.studentId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    );
  
  if (enrollment) return true;
  
  // Check if user has a validated/enrolled studentCourse linked to this courseId
  const [studentCourse] = await db
    .select()
    .from(studentCourses)
    .where(
      and(
        eq(studentCourses.userId, userId),
        eq(studentCourses.courseId, courseId),
        or(
          eq(studentCourses.validationStatus, "validated"),
          eq(studentCourses.isValidated, true)
        )
      )
    );
  
  if (studentCourse) return true;
  
  // Check if user is the instructor of the course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  
  if (course && course.instructorId === userId) return true;
  
  return false;
}

export async function getCourseInfo(courseId: string): Promise<{ name: string; code: string; instructorName: string } | null> {
  const result = await db
    .select({
      name: courses.name,
      code: courses.code,
      instructorName: users.displayName,
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.id, courseId));
  
  const course = result[0];
  if (!course) return null;
  
  return {
    name: course.name,
    code: course.code || "",
    instructorName: course.instructorName || "Instructor",
  };
}

export async function generateChatResponse(
  courseId: string,
  sessionId: string,
  userMessage: string,
  userId: string
): Promise<{ answer: string; citations: Array<{ contentId: string; title: string; chunkIndex: number }> }> {
  const courseInfo = await getCourseInfo(courseId);
  if (!courseInfo) {
    throw new Error("Course not found");
  }
  
  // First check if there's any content for this course
  const allContent = await db
    .select()
    .from(teacherContent)
    .where(eq(teacherContent.courseId, courseId));
  
  if (!allContent || allContent.length === 0) {
    return {
      answer: `I don't have any course materials for ${courseInfo.name} yet. Please ask your teacher to upload content first.`,
      citations: [],
    };
  }

  // Auto-index any content that has textContent but no chunks yet
  const allChunks = await db
    .select()
    .from(teacherContentChunks)
    .where(eq(teacherContentChunks.courseId, courseId));

  if (allChunks.length === 0) {
    // Attempt to index any content that has extracted text available
    const contentWithText = allContent.filter(c => c.textContent && c.textContent.trim().length > 50);
    if (contentWithText.length > 0) {
      for (const c of contentWithText) {
        try {
          await indexTeacherContent(c.id);
        } catch (e) {
          console.error(`[GenerateChatResponse] Auto-index failed for ${c.id}:`, e);
        }
      }
    } else {
      return {
        answer: `This topic is not covered in this course material.`,
        citations: [],
      };
    }
  }

  let relevantChunks = await retrieveRelevantChunks(courseId, userMessage);
  
  if (relevantChunks.length === 0) {
    return {
      answer: `This topic is not covered in this course material.`,
      citations: [],
    };
  }
  
  const contextParts = relevantChunks.map((c, i) => 
    `[Source ${i + 1}: ${c.contentTitle}]\n${c.chunk.text}`
  );
  const context = contextParts.join("\n\n---\n\n");
  
  const systemPrompt = `You are a course tutor assistant for "${courseInfo.name}" (${courseInfo.code}), taught by ${courseInfo.instructorName}.

CRITICAL RULES:
1. Answer ONLY using the course materials provided below. Do NOT use outside knowledge.
2. If the answer is not in the materials, respond with exactly: "This topic is not covered in this course material."
3. When answering, cite your source (e.g., "According to [Source 1]...").
4. Be educational, clear, and precise.
5. Never fabricate or guess information beyond what the materials state.

COURSE MATERIALS:
${context}`;

  const openai = getOpenAI();
  if (!openai) {
    return {
      answer: "AI features require an OpenAI API key. Please contact your administrator to enable this feature.",
      citations: [],
    };
  }

  // Load conversation history to maintain multi-turn context
  const history = await getChatHistory(sessionId);
  const historyMessages = history
    .slice(-16) // Keep last 16 messages for context window management
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });
    
    const answer = response.choices[0].message.content || "I couldn't generate a response.";
    
    const citations = relevantChunks.map(c => ({
      contentId: c.chunk.contentId,
      title: c.contentTitle,
      chunkIndex: c.chunk.chunkIndex,
    }));
    
    return { answer, citations };
  } catch (error: any) {
    console.error("Error generating chat response:", error.message);
    throw new Error("Failed to generate response. Please try again.");
  }
}

export async function createOrGetSession(userId: string, courseId: string): Promise<string> {
  const [existingSession] = await db
    .select()
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.courseId, courseId)
      )
    )
    .orderBy(desc(aiChatSessions.createdAt))
    .limit(1);
  
  if (existingSession) {
    return existingSession.id;
  }
  
  const courseInfo = await getCourseInfo(courseId);
  const [newSession] = await db
    .insert(aiChatSessions)
    .values({
      userId,
      courseId,
      title: `Chat - ${courseInfo?.name || 'Course'}`,
    })
    .returning();
  
  return newSession.id;
}

export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  usedChunkIds: string[] = []
): Promise<void> {
  await db.insert(aiChatMessages).values({
    sessionId,
    role,
    content,
    usedChunkIds,
  });
  
  await db
    .update(aiChatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiChatSessions.id, sessionId));
}

export async function getChatHistory(sessionId: string): Promise<Array<{ role: string; content: string; createdAt: Date | null }>> {
  const messages = await db
    .select({
      role: aiChatMessages.role,
      content: aiChatMessages.content,
      createdAt: aiChatMessages.createdAt,
    })
    .from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, sessionId))
    .orderBy(aiChatMessages.createdAt);
  
  return messages;
}

export async function getUserSessions(userId: string, courseId: string): Promise<Array<{ id: string; title: string | null; lastMessageAt: Date | null; messageCount: number }>> {
  const sessions = await db
    .select({
      id: aiChatSessions.id,
      title: aiChatSessions.title,
      lastMessageAt: aiChatSessions.lastMessageAt,
    })
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.courseId, courseId)
      )
    )
    .orderBy(desc(aiChatSessions.lastMessageAt));
  
  return sessions.map(s => ({
    ...s,
    messageCount: 0,
  }));
}

export async function getContentChunkCount(courseId: string): Promise<number> {
  // Check both chunks and raw content to be safe
  const [chunkCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teacherContentChunks)
    .where(eq(teacherContentChunks.courseId, courseId));
  
  if (Number(chunkCount?.count || 0) > 0) return Number(chunkCount.count);

  const [contentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teacherContent)
    .where(eq(teacherContent.courseId, courseId));

  return Number(contentCount?.count || 0);
}
