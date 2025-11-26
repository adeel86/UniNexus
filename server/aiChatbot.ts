import OpenAI from "openai";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  teacherContent,
  teacherContentChunks,
  aiChatSessions,
  aiChatMessages,
  courseEnrollments,
  courses,
  users,
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

function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
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
  if (content.textContent) {
    return content.textContent;
  }
  
  if (content.contentType === 'text' && content.textContent) {
    return content.textContent;
  }
  
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
  
  await db.delete(teacherContentChunks).where(eq(teacherContentChunks.contentId, contentId));
  
  const text = await extractTextFromContent(content);
  
  if (!text || text.length < 50) {
    console.log(`Content ${contentId} has no indexable text`);
    return 0;
  }
  
  const chunks = chunkText(text);
  let indexedCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const embedding = await generateEmbedding(chunkText);
    
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
  }
  
  console.log(`Indexed ${indexedCount} chunks for content ${contentId}`);
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
  
  if (!queryEmbedding) {
    return chunks.slice(0, topK).map(c => ({
      chunk: c.chunk,
      score: 1,
      contentTitle: c.contentTitle,
    }));
  }
  
  const scoredChunks: ChunkWithScore[] = chunks
    .map(c => ({
      chunk: c.chunk,
      score: cosineSimilarity(queryEmbedding, c.chunk.embedding as number[] || []),
      contentTitle: c.contentTitle,
    }))
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
  
  const relevantChunks = await retrieveRelevantChunks(courseId, userMessage);
  
  if (relevantChunks.length === 0) {
    return {
      answer: `I don't have any course materials for ${courseInfo.name} yet. Please ask your teacher to upload content first.`,
      citations: [],
    };
  }
  
  const contextParts = relevantChunks.map((c, i) => 
    `[Source ${i + 1}: ${c.contentTitle}]\n${c.chunk.text}`
  );
  const context = contextParts.join("\n\n---\n\n");
  
  const systemPrompt = `You are a helpful tutor assistant for the course "${courseInfo.name}" (${courseInfo.code}), taught by ${courseInfo.instructorName}.

IMPORTANT RULES:
1. ONLY answer questions using the provided course materials below.
2. If the answer is not found in the materials, say: "I don't have information about that in the course materials. Please ask your teacher for clarification."
3. When answering, cite which source you're using (e.g., "According to [Source 1]...").
4. Be helpful, clear, and educational in your responses.
5. Do NOT make up information or use knowledge outside of the provided materials.

COURSE MATERIALS:
${context}`;

  const openai = getOpenAI();
  if (!openai) {
    return {
      answer: "AI features require an OpenAI API key. Please contact your administrator to enable this feature.",
      citations: [],
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
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
  const chunks = await db
    .select({ id: teacherContentChunks.id })
    .from(teacherContentChunks)
    .where(eq(teacherContentChunks.courseId, courseId));
  
  return chunks.length;
}
