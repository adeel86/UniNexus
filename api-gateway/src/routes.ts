// uninexus-api-gateway/src/routes.ts

import type { Express } from "express";
import { type Server } from "http";
import { setupWebSocket } from "./services/websocket";
// In a production environment, you would use a dedicated library like http-proxy-middleware
// Here we use a placeholder function.
import { proxyRequest } from "./utils/proxy"; 

// 💡 Internal Service URLs (to be set in .env.local)
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001/api/v1';
const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:3002/api/v1';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3003/api/v1';

export async function registerRoutes(app: Express, httpServer: Server): Promise<void> {
  
  // 1. WebSocket Setup (using the moved websocket logic)
  setupWebSocket(httpServer);

  // 2. IDENTITY/AUTH Routes (Proxying to Identity Service)
  // This maps /api/auth/* to the internal Identity Service
  app.all("/api/auth/*", (req, res) => proxyRequest(IDENTITY_SERVICE_URL, req, res));

  // 3. SOCIAL Routes (Proxying to Social Service)
  app.all("/api/posts/*", (req, res) => proxyRequest(SOCIAL_SERVICE_URL, req, res));
  app.all("/api/comments/*", (req, res) => proxyRequest(SOCIAL_SERVICE_URL, req, res));
  
  // 4. AI Routes (Proxying to AI Service)
  app.all("/api/ai/*", (req, res) => proxyRequest(AI_SERVICE_URL, req, res));
  
  // 5. Leaderboard/Events (Temporary proxy to Social/LMS)
  app.all("/api/leaderboard/*", (req, res) => proxyRequest(SOCIAL_SERVICE_URL, req, res)); 
}
