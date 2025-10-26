import { Router } from "express";
import { generateAIResponse, analyzeCareerPath, type ChatMessage } from "./ai";
import { z } from "zod";

const router = Router();

const chatMessageSchema = z.object({ /* ... */ });
router.post("/ai/chat", async (req, res) => { /* ... */ });

const careerAnalysisSchema = z.object({ /* ... */ });
router.post("/ai/career-analysis", async (req, res) => { /* ... */ });

export default router;
