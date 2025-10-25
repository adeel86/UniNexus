// uninexus-api-gateway/src/index.ts

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 💡 Simplified request logging (kept from original index.ts)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  const httpServer = createServer(app);
  await registerRoutes(app, httpServer); // Registers all proxy routes and WebSocket

  // Error handling middleware (kept from original index.ts)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Start API Gateway on the specified port
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`API Gateway serving on port ${port}`);
  });
})();

// NOTE: The logic for setupVite and serveStatic from original vite.ts is DELETED
// or moved to a separate client-serving layer if needed.
