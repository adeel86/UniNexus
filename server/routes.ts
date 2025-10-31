import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertQuestionSchema, insertAnswerSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { generateAIResponse, analyzeCareerPath, type ChatMessage } from "./ai";
import { setupWebSocket, sendNotification } from "./websocket";
import admin from './firebase-admin';

// Allowed school domains (comma-separated) for signup. If empty, all domains allowed.
const allowedDomains = (process.env.FIREBASE_ALLOWED_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
const continueUrl = process.env.FIREBASE_CONTINUE_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

function handleError(res: Response, error: any, status = 500) {
  // Log the full error server-side for debugging
  if (error && error.stack) {
    console.error(error.stack);
  } else {
    console.error(error);
  }

  const message = (error && error.message) || String(error) || "Internal Server Error";
  res.status(status).json({ error: message });
}

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

  // Email/password signup using Firebase Auth (server creates Firebase user and local record)
  const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().optional(),
  });

  app.post('/api/auth/signup-email', async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = signupSchema.parse(req.body);

      // Create user in Firebase Auth via admin SDK
      const firebaseUser = await admin.auth().createUser({ email, password, displayName });

      // Create local DB user linked to firebase uid
      const newUser = await storage.createUser({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: displayName || firebaseUser.displayName || '',
      } as any);

      // Sign in via REST API to get an ID token to return to client
      const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      let idToken: string | undefined = undefined;
      if (apiKey) {
        const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        if (resp.ok) {
          const data = await resp.json();
          idToken = data.idToken;
        }
      }

      res.status(201).json({ user: newUser, idToken });
    } catch (error: any) {
      // If firebase reports email exists, respond accordingly
      if (error && error.code && error.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already in use' });
      }
      handleError(res, error, 500);
    }
  });

  // Email/password login - uses Firebase REST API to verify password and returns local user + idToken
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  app.post('/api/auth/login-email', async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Firebase API key not configured on server' });

      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return res.status(401).json({ error: err.error?.message || 'Invalid credentials' });
      }

      const data = await resp.json();
      const idToken = data.idToken as string;
      const uid = data.localId as string;

      // Find local user by firebase uid
      const user = await storage.getUserByFirebaseUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User record not found' });
      }

      res.json({ user, idToken });
    } catch (error: any) {
      handleError(res, error, 500);
    }
  });

  // Send magic link (email sign-in link) to the user's school email.
  const magicLinkSchema = z.object({ email: z.string().email() });
  app.post('/api/auth/send-magic-link', async (req: Request, res: Response) => {
    try {
      const { email } = magicLinkSchema.parse(req.body);

      if (allowedDomains.length > 0) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain || !allowedDomains.includes(domain)) {
          return res.status(400).json({ error: 'Email domain not allowed' });
        }
      }

      const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Firebase API key not configured on server' });

      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'EMAIL_SIGNIN',
          email,
          continueUrl,
          canHandleCodeInApp: true,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        return res.status(500).json({ error: body.error?.message || 'Failed to send magic link' });
      }

      res.json({ success: true });
    } catch (error: any) {
      handleError(res, error, 500);
    }
  });

  // Verify Firebase ID token (used after client signs in with Google or clicks magic link)
  const tokenSchema = z.object({ idToken: z.string() });
  app.post('/api/auth/verify-token', async (req: Request, res: Response) => {
    try {
      const { idToken } = tokenSchema.parse(req.body);
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (!decoded || !decoded.uid) return res.status(401).json({ error: 'Invalid token' });

      const uid = decoded.uid;
      const email = decoded.email;
      const displayName = decoded.name || decoded.displayName || '';

      let user = await storage.getUserByFirebaseUid(uid);
      if (!user) {
        // Create local user record for new signups
        user = await storage.createUser({ firebaseUid: uid, email: email || '', displayName } as any);
      }

      res.json({ user });
    } catch (error: any) {
      handleError(res, error, 500);
    }
  });

  // Flexible user lookup: accept either a Firebase UID (string) or an internal numeric ID.
  // If the path param is numeric, we treat it as an internal user ID; otherwise as a Firebase UID.
  app.get("/api/auth/user/:idOrFirebaseUid", async (req: Request, res: Response) => {
    try {
      const key = req.params.idOrFirebaseUid;
      let user;

      if (/^\d+$/.test(key)) {
        // numeric -> internal user id
        user = await storage.getUserById(parseInt(key, 10));
      } else {
        // non-numeric -> firebase UID
        user = await storage.getUserByFirebaseUid(key);
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
    }
  });

  app.get("/api/posts/user/:userId", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByUserId(parseInt(req.params.userId));
      res.json(posts);
    } catch (error: any) {
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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
      handleError(res, error, 500);
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

  // Health check endpoint - verifies DB and Firebase presence
  app.get('/api/_health', async (req: Request, res: Response) => {
    const result: any = { ok: true };
    try {
      // quick DB check: try to fetch a small dataset
      await storage.getPosts(1, 0);
      result.db = 'ok';
    } catch (e) {
      result.db = 'error';
      result.ok = false;
    }

    try {
      // firebase admin should be initialized if credentials were provided
      result.firebase = admin.apps && admin.apps.length > 0 ? 'ok' : 'missing';
      if (result.firebase !== 'ok') result.ok = false;
    } catch (e) {
      result.firebase = 'error';
      result.ok = false;
    }

    res.status(result.ok ? 200 : 500).json(result);
  });
  
  return httpServer;
}
