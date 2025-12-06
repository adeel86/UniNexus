import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { setupAuth } from "./firebaseAuth";
import { initializeCloudStorage } from "./cloudStorage";

import {
  authRouter,
  feedRouter,
  usersRouter,
  skillsRouter,
  certificationsRouter,
  notificationsRouter,
  coursesRouter,
  challengesRouter,
  groupsRouter,
  connectionsRouter,
  messagingRouter,
  adminRouter,
  recruiterRouter,
  teacherContentRouter,
  aiRouter,
} from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  initializeCloudStorage().then(available => {
    if (available) {
      console.log('Cloud storage ready for file uploads');
    } else {
      console.log('Cloud storage unavailable, using local storage fallback');
    }
  });

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const videosDir = path.join(uploadsDir, 'videos');
  const documentsDir = path.join(uploadsDir, 'documents');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  app.use('/uploads', express.static(uploadsDir));

  app.use("/api/auth", authRouter);
  app.use("/api", feedRouter);
  app.use("/api", usersRouter);
  app.use("/api", skillsRouter);
  app.use("/api", certificationsRouter);
  app.use("/api", notificationsRouter);
  app.use("/api", coursesRouter);
  app.use("/api", challengesRouter);
  app.use("/api", groupsRouter);
  app.use("/api", connectionsRouter);
  app.use("/api", messagingRouter);
  app.use("/api", adminRouter);
  app.use("/api", recruiterRouter);
  app.use("/api/teacher-content", teacherContentRouter);
  app.use(aiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
