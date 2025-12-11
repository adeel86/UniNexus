# UniNexus Developer Guide

This comprehensive guide provides all the technical documentation needed to understand, develop, and maintain the UniNexus platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [API Reference](#api-reference)
7. [Frontend Architecture](#frontend-architecture)
8. [AI Integration](#ai-integration)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)

---

## Architecture Overview

UniNexus follows a modern full-stack JavaScript architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│   React + TypeScript + Tailwind CSS + Shadcn UI              │
│   State Management: TanStack Query                            │
│   Routing: Wouter                                             │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────┴─────────────────────────────────────┐
│                         Backend                               │
│   Express.js + TypeScript                                     │
│   Authentication: Firebase Admin SDK                          │
│   File Storage: Local/Cloud Storage                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ Drizzle ORM
┌───────────────────────┴─────────────────────────────────────┐
│                         Database                              │
│   PostgreSQL (Neon)                                           │
│   Schema: Drizzle ORM                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/          # Shadcn UI components
│   │   │   └── ...          # Feature components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   │   ├── AuthContext.tsx   # Authentication context
│   │   │   ├── firebase.ts       # Firebase configuration
│   │   │   └── queryClient.ts    # TanStack Query setup
│   │   ├── pages/           # Page components
│   │   └── App.tsx          # Main app component
│   └── index.html
│
├── server/                  # Backend Express application
│   ├── routes/              # API route handlers
│   │   ├── auth.ts          # Authentication routes
│   │   ├── ai.ts            # AI chatbot routes
│   │   ├── courses.ts       # Course management
│   │   ├── feed.ts          # Social feed
│   │   └── ...              # Other route modules
│   ├── services/            # Business logic services
│   ├── seed/                # Database seed modules
│   │   └── data/            # Seed data files
│   ├── db.ts                # Database connection
│   ├── storage.ts           # Data access layer
│   ├── firebaseAuth.ts      # Firebase authentication
│   ├── aiChatbot.ts         # AI integration
│   └── unified-seed.ts      # Unified database seeding
│
├── shared/                  # Shared code (frontend + backend)
│   └── schema/              # Database schema definitions
│       ├── users.ts         # User-related tables
│       ├── feed.ts          # Social feed tables
│       ├── courses.ts       # Course tables
│       ├── gamification.ts  # Badges, skills, challenges
│       ├── ai.ts            # AI-related tables
│       └── index.ts         # Schema barrel export
│
└── package.json
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Shadcn UI | Component library |
| TanStack Query | Server state management |
| Wouter | Routing |
| Framer Motion | Animations |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Express | Web framework |
| TypeScript | Type safety |
| Firebase Admin SDK | Authentication |
| OpenAI | AI integration |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Database |
| Drizzle ORM | Type-safe ORM |
| Neon | Serverless Postgres |

---

## Database Schema

### Core Tables

#### Users
The central user table supporting multiple roles:
- `student` - Learning and engagement
- `teacher` - Course creation and endorsements
- `university_admin` - Institutional oversight
- `industry_professional` - Talent discovery
- `master_admin` - Platform administration

```typescript
// shared/schema/users.ts
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  firebaseUid: varchar("firebase_uid").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role"),        // student, teacher, etc.
  university: varchar("university"),
  major: varchar("major"),
  company: varchar("company"),
  // Gamification fields
  engagementScore: integer("engagement_score"),
  problemSolverScore: integer("problem_solver_score"),
  endorsementScore: integer("endorsement_score"),
  totalPoints: integer("total_points"),
  rankTier: varchar("rank_tier"),
  streak: integer("streak"),
  // ...
});
```

#### Courses
```typescript
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code"),
  description: text("description"),
  university: varchar("university"),
  instructorId: varchar("instructor_id"),
  semester: varchar("semester"),
  isUniversityValidated: boolean("is_university_validated"),
  // ...
});
```

#### Posts (Social Feed)
```typescript
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey(),
  authorId: varchar("author_id"),
  content: text("content"),
  category: varchar("category"),
  mediaType: varchar("media_type"),
  tags: text("tags").array(),
  viewCount: integer("view_count"),
  // ...
});
```

### Schema Organization

Schemas are organized by domain in `shared/schema/`:
- `users.ts` - Users, profiles, connections, followers
- `feed.ts` - Posts, comments, reactions, shares
- `courses.ts` - Courses, enrollments, discussions
- `gamification.ts` - Badges, skills, challenges
- `messaging.ts` - Conversations, messages
- `notifications.ts` - Notifications, announcements
- `certifications.ts` - Certifications, recruiter feedback
- `ai.ts` - AI chat sessions, teacher content

---

## Authentication System

UniNexus uses a dual authentication system:

### 1. Firebase Authentication (Production)
- Email/password authentication
- Token-based session management
- Integration with Firebase Admin SDK on backend

### 2. Development Authentication (Demo Mode)
- JWT-based bypass for demo accounts
- Enabled via `DEV_AUTH_ENABLED=true`
- All demo accounts use password: `demo123`

### Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───>│ /api/auth│───>│ Firebase │
│          │    │ /dev-login│   │  Admin   │
└──────────┘    └──────────┘    └──────────┘
      │               │               │
      │  JWT Token    │  Verify       │
      │<──────────────│<──────────────│
      │               │               │
      ▼               ▼               ▼
   localStorage   AuthContext      User DB
```

### Key Files
- `client/src/lib/AuthContext.tsx` - React auth context
- `client/src/lib/firebase.ts` - Firebase client config
- `server/firebaseAuth.ts` - Firebase Admin middleware
- `server/routes/auth.ts` - Auth API routes

### Environment Variables
```bash
# Firebase (Production)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Development Auth
DEV_AUTH_ENABLED=true
DEV_JWT_SECRET=your-secret-key
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/dev-login` | Development login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/user` | Get current user |
| POST | `/api/auth/logout` | Logout |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/role/:role` | Get users by role |
| PATCH | `/api/users/:id` | Update user |

### Feed Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed` | Get feed posts |
| POST | `/api/feed/posts` | Create post |
| POST | `/api/feed/posts/:id/react` | React to post |
| POST | `/api/feed/posts/:id/comment` | Comment on post |

### Course Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List courses |
| GET | `/api/courses/:id` | Get course |
| POST | `/api/courses` | Create course |
| POST | `/api/courses/:id/enroll` | Enroll in course |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Send AI message |
| GET | `/api/ai/sessions` | Get chat sessions |
| POST | `/api/ai/sessions` | Create session |

---

## Frontend Architecture

### State Management

TanStack Query is used for server state:

```typescript
// Fetching data
const { data, isLoading } = useQuery({
  queryKey: ['/api/courses'],
});

// Mutations
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/courses', 'POST', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
  },
});
```

### Routing

Wouter is used for client-side routing:

```typescript
// App.tsx
<Switch>
  <Route path="/" component={Home} />
  <Route path="/courses" component={Courses} />
  <Route path="/profile/:id" component={Profile} />
</Switch>
```

### Component Patterns

```typescript
// Use Shadcn UI components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Use react-hook-form for forms
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
```

---

## AI Integration

### Teacher Content Pipeline

1. **Upload**: Teachers upload course materials (PDF, text, slides)
2. **Processing**: Content is chunked and stored
3. **Indexing**: Chunks are embedded for semantic search
4. **Retrieval**: AI queries retrieve relevant chunks
5. **Generation**: OpenAI generates responses with citations

### Key Components

```typescript
// server/aiChatbot.ts
export async function generateAIResponse(
  userId: string,
  courseId: string,
  message: string
): Promise<AIResponse>
```

### AI Tables
- `teacher_content` - Uploaded course materials
- `teacher_content_chunks` - Processed text chunks
- `ai_chat_sessions` - User chat sessions
- `ai_chat_messages` - Chat history

---

## Development Workflow

### Running Locally

```bash
# Start development server
npm run dev
```

The server starts on port 5000 with hot reloading.

### Database Operations

```bash
# Push schema changes
npm run db:push

# Generate migrations (if needed)
npm run db:generate

# Run seed
npx tsx server/unified-seed.ts
```

### Adding New Features

1. **Schema First**: Define tables in `shared/schema/`
2. **Storage Layer**: Add CRUD methods to `server/storage.ts`
3. **API Routes**: Create routes in `server/routes/`
4. **Frontend**: Add components and pages in `client/src/`

### Code Conventions

- Use TypeScript for all code
- Follow existing patterns for consistency
- Use Shadcn UI components
- Add `data-testid` attributes to interactive elements

---

## Deployment

### Replit Deployment

1. Configure deployment in Replit
2. Set production environment variables
3. Click "Deploy"

### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://...

# Firebase
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx

# OpenAI
OPENAI_API_KEY=xxx

# Session
SESSION_SECRET=xxx
```

### Build Process

```bash
npm run build  # Builds frontend
npm run start  # Starts production server
```

---

## Troubleshooting

### Common Issues

**1. Authentication not working**
- Check `DEV_AUTH_ENABLED` and `DEV_JWT_SECRET` are set
- Verify Firebase configuration

**2. Database connection failed**
- Check `DATABASE_URL` is set
- Verify Neon database is active

**3. AI responses failing**
- Verify `OPENAI_API_KEY` is set
- Check rate limits

### Debug Tips

- Check browser console for frontend errors
- Check workflow logs for backend errors
- Use `/api/health` endpoint to verify server status

---

## Contributing

1. Create a feature branch
2. Make changes following code conventions
3. Test thoroughly
4. Submit for review

---

*Last updated: December 2024*
