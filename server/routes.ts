import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertQuestionSchema, insertAnswerSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { generateAIResponse, analyzeCareerPath, type ChatMessage } from "./ai";
import { setupWebSocket, sendNotification } from "./websocket";

// Validation schemas for request bodies
const userActionSchema = z.object({
  userId: z.number().int().positive(),
});

const joinLeaveSchema = z.object({
  userId: z.number().int().positive(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/user/:firebaseUid", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.params.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/auth/user/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Create partial schema for user updates
      const updateSchema = insertUserSchema.partial().pick({
        displayName: true,
        photoURL: true,
        bio: true,
        university: true,
        course: true,
        skills: true,
        interests: true,
        onboarded: true,
      });
      
      const updateData = updateSchema.parse(req.body);
      const user = await storage.updateUser(id, updateData);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Post routes
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const post = await storage.getPostById(parseInt(req.params.id));
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/posts/user/:userId", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByUserId(parseInt(req.params.userId));
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts", async (req: Request, res: Response) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/posts/:id/like", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const { userId } = userActionSchema.parse(req.body);
      await storage.likePost(postId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/posts/:id/like", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const { userId } = userActionSchema.parse(req.body);
      await storage.unlikePost(postId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Comment routes
  app.get("/api/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getCommentsByPostId(parseInt(req.params.postId));
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);
      const commentData = insertCommentSchema.parse({ ...req.body, postId });
      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Channel routes
  app.get("/api/channels", async (req: Request, res: Response) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/channels/:id", async (req: Request, res: Response) => {
    try {
      const channel = await storage.getChannelById(parseInt(req.params.id));
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json(channel);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channels/:id/join", async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      const { userId } = joinLeaveSchema.parse(req.body);
      await storage.joinChannel(channelId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/channels/:id/leave", async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      const { userId } = joinLeaveSchema.parse(req.body);
      await storage.leaveChannel(channelId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Question routes
  app.get("/api/questions", async (req: Request, res: Response) => {
    try {
      const filter = req.query.filter as string;
      const questions = await storage.getQuestions(filter);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const question = await storage.getQuestionById(parseInt(req.params.id));
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/questions", async (req: Request, res: Response) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Answer routes
  app.get("/api/questions/:questionId/answers", async (req: Request, res: Response) => {
    try {
      const answers = await storage.getAnswersByQuestionId(parseInt(req.params.questionId));
      res.json(answers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/questions/:questionId/answers", async (req: Request, res: Response) => {
    try {
      const questionId = parseInt(req.params.questionId);
      const answerData = insertAnswerSchema.parse({ ...req.body, questionId });
      const answer = await storage.createAnswer(answerData);
      res.json(answer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Event routes
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const filter = req.query.filter as string;
      const events = await storage.getEvents(filter);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const event = await storage.getEventById(parseInt(req.params.id));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/events/:id/join", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = joinLeaveSchema.parse(req.body);
      await storage.joinEvent(eventId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/events/:id/leave", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = joinLeaveSchema.parse(req.body);
      await storage.leaveEvent(eventId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Leaderboard route
  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const filter = req.query.filter as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getLeaderboard(filter, limit);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat routes
  const chatMessageSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })),
  });

  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { messages } = chatMessageSchema.parse(req.body);
      const response = await generateAIResponse(messages as ChatMessage[]);
      res.json({ message: response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const careerAnalysisSchema = z.object({
    currentSkills: z.array(z.string()),
    interests: z.array(z.string()),
    targetRole: z.string().optional(),
  });

  app.post("/api/ai/career-analysis", async (req: Request, res: Response) => {
    try {
      const data = careerAnalysisSchema.parse(req.body);
      const analysis = await analyzeCareerPath(
        data.currentSkills,
        data.interests,
        data.targetRole
      );
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  setupWebSocket(httpServer);
  
  return httpServer;
}
