# Server Domains

This directory organizes backend logic by business domain.

## Structure

Each domain folder contains:
- `routes.ts` - Express route handlers for the domain
- `services/` - Business logic and data access
- `validators.ts` - Request validation schemas (optional)

## Domains

- `auth/` - Authentication, login, registration, sessions
- `feed/` - Social feed, posts, comments, reactions
- `courses/` - Course management, enrollments, discussions
- `groups/` - Group creation, membership, group posts
- `chat/` - Direct messaging and conversations
- `ai/` - AI chatbot, career assistance, teacher AI
- `notifications/` - User notifications and announcements
- `challenges/` - Gamification challenges and leaderboards
- `admin/` - Admin dashboards, analytics, moderation
- `analytics/` - Usage metrics and reporting
- `shared/` - Common middleware, utilities, helpers

## Adding Routes

Each domain exports a router that gets registered in `server/routes/index.ts`:

```typescript
// server/domains/feed/routes.ts
import { Router } from "express";
export const feedRouter = Router();

feedRouter.get("/posts", async (req, res) => { ... });
```

## Guidelines

- Keep routes thin - delegate to services
- Use validators for request body validation
- Use shared middleware from `shared/`
- Export types when needed by frontend
