# UniNexus - Gen Z Social Learning & Engagement Platform

## Overview
UniNexus is a social learning and engagement platform designed for Gen Z, integrating social networking, gamification, career development, and AI. It supports multiple user roles (students, teachers, university admins, industry professionals, and master admins) with tailored dashboards. Key features include a social feed, gamified profiles, AI career guidance, course discussion forums, leaderboards, and real-time notifications. The platform emphasizes a mobile-first design with a neon gradient aesthetic and smooth animations. The business vision is to create a vibrant ecosystem that fosters academic success, career readiness, and community engagement for the Gen Z demographic.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Frameworks**: React 18 with TypeScript, Vite for fast development, Wouter for routing, TanStack Query for server state.
- **UI/UX**: Radix UI for accessibility, Shadcn/ui for consistent components, Tailwind CSS for styling, custom neon gradient theme (purple-pink-blue) with HSL-based theming, Poppins and Inter fonts, mobile-first responsive design, Framer Motion for animations.
- **State Management**: Custom AuthContext for authentication, TanStack Query for server data, React Hook Form with Zod for form validation, `useState`/`useReducer` for local UI state.

### Backend Architecture
- **Server**: Node.js with Express.js, TypeScript, ESM modules, `tsx` for development, `esbuild` for production.
- **API Design**: RESTful endpoints (`/api/*`), Firebase Admin SDK for production authentication, session-based authentication with `connect-pg-simple`, custom middleware for auth and role-based access control.
- **Authentication**:
    - **Development**: Database-only authentication using JWTs signed with `userId` (DEV_AUTH_ENABLED=true).
    - **Production**: Firebase Authentication (client-side) and Firebase Admin (server-side).
    - User lookup chain: `userId` → `firebaseUid` → `email`.
    - `DEV_JWT_SECRET` for development mode token signing.
    - PostgreSQL-backed session store.
    - OpenID Connect support via Replit Auth integration (Passport strategy).
- **Route Organization**: Main routes in `server/routes.ts`, grouped by feature (posts, comments, etc.), admin routes (`/api/admin/*`), AI routes (`/api/ai/*`), Q&A routes (`/api/qa/*`), and CareerBot endpoint.
- **Enrolled Courses Page**: Students can view their enrolled courses at `/courses`, each with an AI Tutor button. Routes include `/api/me/enrolled-courses` (GET - returns enrolled courses with stats).
- **Problem-Solving Q&A System**: General Q&A feature for problem-solving with points system: +10 for asking, +15 for answering, +2/+5 for question/answer upvotes, +20 for accepted answers. Routes include `/api/qa/questions` (GET/POST), `/api/qa/questions/:id` (GET), `/api/qa/questions/:id/answers` (POST), `/api/qa/upvote` (POST), `/api/qa/questions/:id/resolve` (POST).
- **Challenge Points System**: Challenges award challenge points: Join (+5), Submit (+25). Rankings award bonus: 1st (+500), 2nd (+300), 3rd (+200), Top 10% (+150), Top 25% (+100), Participation (+50). Uses `applyPointDelta` helper from `server/pointsHelper.ts` for atomic updates with automatic rank tier recalculation.
- **Middleware**: `express.json()`, `express.urlencoded()`, custom logging, session middleware, Passport.js.

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon Serverless) with connection pooling.
- **ORM & Schema**: Drizzle ORM for type-safe queries, Drizzle Kit for migrations. Schema defined in `shared/schema.ts` with Zod integration.
- **Schema Design**: Users table with nullable Firebase UID, role-based fields, engagement metrics, social features (posts, comments, reactions), gamification (badges, skills, endorsements), learning (courses, discussions), challenges, notifications, and sessions.
- **Relationships**: One-to-many, many-to-many (via join tables), self-referential, and computed fields for scores.
- **Storage Interface**: `IStorage` interface abstraction with `DatabaseStorage` implementation.

### Media Storage (Cloud Storage)
- **Service**: Firebase Cloud Storage with local fallback.
- **Implementation**: `server/cloudStorage.ts` module with upload, multi-upload, and delete functions.
- **Supported Media Types**:
  - Images: JPEG, PNG, GIF, WebP (10MB max)
  - Videos: MP4, WebM, QuickTime, MKV (100MB max)
  - Documents: PDF, DOC, DOCX, TXT, PPT, PPTX (50MB max)
- **Endpoints**:
  - `POST /api/upload/image` - Single image upload
  - `POST /api/upload/images` - Multiple images (up to 10)
  - `POST /api/upload/video` - Video upload
  - `POST /api/teacher-content/upload` - Teacher document upload
- **Configuration**: Requires Firebase service account JSON at `serviceAccountKey.json` and `VITE_FIREBASE_STORAGE_BUCKET` secret.
- **Fallback**: Automatically falls back to local `uploads/` directory if cloud storage is unavailable.

## External Dependencies

- **Firebase Services**: Firebase Authentication (client-side email/password), Firebase Admin SDK (server-side token verification), Firebase Storage (media uploads - if configured). Development mode bypasses Firebase.
- **AI/ML Integration**: OpenAI API (GPT models) for post suggestions, career guidance chatbot, content moderation, and hyper-localized course chatbot with RAG, requiring `OPENAI_API_KEY`.

### Hyper-Localized AI Course Chatbot
- **Purpose**: Students can ask questions about course materials and receive AI-generated answers based ONLY on teacher-uploaded content.
- **Implementation**: RAG (Retrieval Augmented Generation) with OpenAI embeddings (`text-embedding-3-small`) and GPT-4o for chat responses.
- **Database Tables**:
  - `teacherContentChunks`: Stores chunked content with vector embeddings for similarity search
  - `aiChatSessions`: Chat sessions per student per course
  - `aiChatMessages`: Message history with citation references
- **Text Processing**: Content is chunked (800 tokens with 100 token overlap) and indexed with embeddings for semantic search.
- **Authorization**: Students must be enrolled in a course to access its AI tutor; content filtered by courseId.
- **API Endpoints**:
  - `POST /api/ai/course-chat` - Send message to AI course tutor
  - `GET /api/ai/course-chat/:courseId/history` - Get chat sessions for a course
  - `GET /api/ai/course-chat/session/:sessionId` - Get messages for a session
  - `GET /api/ai/course-chat/:courseId/status` - Check if course has indexed content
  - `POST /api/teacher-content/:contentId/index` - Index teacher content for RAG (teacher only)
- **Frontend Component**: `StudentAITutor.tsx` - Dialog component for course-specific AI chat with citations.
- **Replit Platform Services**: Replit Auth (OAuth/OIDC), Replit Secrets (environment variables).
- **Third-Party Libraries**: `@radix-ui/*`, `@tanstack/react-query`, `date-fns`, `nanoid`, `passport`, `ws`.
- **Development Tools**: `tsx`, `esbuild`, `drizzle-kit`, Vite plugins.
- **Session & State Management**: `connect-pg-simple`, `express-session`, `jsonwebtoken`, `memoizee`.
- **Validation & Type Safety**: Zod, TypeScript, Drizzle-Zod, `@hookform/resolvers`.