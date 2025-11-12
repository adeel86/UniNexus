# UniNexus - Gen Z Social Learning & Engagement Platform

## Overview

UniNexus is a vibrant, Gen Z-focused social learning and engagement platform that combines social networking, gamification, career development, and AI-powered features. The platform serves multiple user roles (students, teachers, university admins, industry professionals, and master admins), each with customized dashboards and features.

The application provides a social feed for students to share posts and engage with content, gamified profiles with badges and achievement timelines, AI-powered career guidance through a chatbot, course discussion forums, leaderboards, and real-time notifications. The platform emphasizes mobile-first design with neon gradient aesthetics (purple-blue-pink) and smooth animations tailored to Gen Z preferences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript for type safety and modern component patterns
- Vite as the build tool and dev server for fast development experience
- Wouter for lightweight client-side routing instead of React Router
- TanStack Query (React Query) for server state management, caching, and data fetching
- React Hook Form with Zod for form validation and type-safe schemas

**UI Component System:**
- Radix UI primitives for accessible, unstyled component foundations
- Shadcn/ui design system with "new-york" style variant for consistent component library
- Tailwind CSS for utility-first styling with custom theme configuration
- CSS variables for theming with support for light/dark modes
- Custom gradient components (GradientButton) for branded UI elements

**Design System:**
- Typography: Poppins for headings/emphasis, Inter for body text and UI elements
- Color scheme: Neon gradient palette (purple-pink-blue) with HSL-based theming
- Spacing: Tailwind's standard spacing scale (2, 4, 6, 8, 12, 16)
- Responsive breakpoints: Mobile-first approach with md/lg breakpoints
- Animation: Framer Motion ready (imported but minimal current usage)

**State Management Strategy:**
- Authentication state: Custom AuthContext provider wrapping Firebase Auth
- Server state: TanStack Query with queryClient for data fetching and caching
- Form state: React Hook Form for controlled form inputs
- Local UI state: React useState/useReducer hooks
- No global client state library (Redux/Zustand) - relies on context and query cache

### Backend Architecture

**Server Framework:**
- Node.js with Express.js for HTTP server and REST API endpoints
- ESM modules (type: "module" in package.json) for modern JavaScript syntax
- TypeScript with tsx for development and esbuild for production bundling
- HTTP server created via createServer for potential WebSocket support

**API Design:**
- RESTful endpoints under `/api/*` namespace
- Firebase Admin SDK for server-side authentication and token verification
- Session-based authentication with connect-pg-simple for session storage
- Custom middleware for auth verification (verifyToken, isAuthenticated)
- Role-based access control via AuthRequest interface extension

**Authentication System:**
- Primary: Firebase Authentication (client-side) + Firebase Admin (server-side)
- Development bypass: DEV_AUTH_ENABLED flag with allowlisted demo accounts
- JWT tokens for dev auth with configurable secret (DEV_JWT_SECRET)
- Session management with PostgreSQL-backed session store
- OpenID Connect support via Replit Auth integration (passport strategy)

**Route Organization:**
- Main routes defined in `server/routes.ts` registered via `registerRoutes()`
- Grouped by feature: posts, comments, reactions, badges, endorsements, courses, challenges
- Admin routes: `/api/admin/*` for user/content management
- AI routes: `/api/ai/*` for OpenAI integrations (post suggestions, career chat, moderation)
- CareerBot: `/api/careerbot/chat` endpoint proxying to OpenAI

**Middleware Stack:**
- express.json() with raw body capture for webhook support
- express.urlencoded() for form data parsing
- Custom logging middleware for API request/response tracking
- Session middleware with PostgreSQL backing
- Passport.js for OAuth/OIDC authentication flows

### Data Storage Solutions

**Primary Database:**
- PostgreSQL as the relational database (via DATABASE_URL environment variable)
- Neon Serverless PostgreSQL driver (@neondatabase/serverless)
- Connection pooling via Neon's Pool implementation
- WebSocket support for serverless connections (ws library)

**ORM & Schema Management:**
- Drizzle ORM for type-safe database queries and schema definition
- Schema defined in `shared/schema.ts` using drizzle-orm/pg-core
- Drizzle Kit for database migrations (drizzle.config.ts)
- Migration files stored in `migrations/` directory
- Zod integration via drizzle-zod for runtime validation

**Database Schema Design:**
- Users table: Firebase UID mapping, role-based fields, engagement metrics
- Social features: posts, comments, reactions with relational links
- Gamification: badges, userBadges, skills, userSkills, endorsements
- Learning: courses, courseEnrollments, courseDiscussions, discussionReplies
- Engagement: challenges, challengeParticipants, notifications, announcements
- Auth: sessions table for connect-pg-simple session storage

**Data Relationships:**
- One-to-many: User → Posts, User → Comments, Post → Comments
- Many-to-many: Users ↔ Badges (via userBadges), Users ↔ Skills (via userSkills)
- Self-referential: DiscussionReplies for threaded discussions
- Computed fields: Engagement scores, problem solver scores, endorsement scores

**Storage Interface:**
- IStorage interface in `server/storage.ts` for abstraction layer
- DatabaseStorage implementation for PostgreSQL operations
- Firebase Storage for media uploads (images, attachments)
- Potential local storage fallback for development

### External Dependencies

**Firebase Services:**
- Firebase Authentication: Client-side user authentication with Google OAuth support
- Firebase Admin SDK: Server-side token verification and user management
- Firebase Storage: Media file uploads and CDN delivery
- Service account key: `serviceAccountKey.json` (not in repo, environment-based)

**AI/ML Integration:**
- OpenAI API: GPT models for post suggestions, career guidance chatbot, and content moderation
- API key: OPENAI_API_KEY environment variable
- Endpoints: Chat completions, moderation API
- Safety: Content moderation for user-generated posts to ensure platform safety

**Replit Platform Services:**
- Replit Auth: OAuth/OIDC authentication as Firebase alternative
- Replit Database: Optional quick database for prototyping (not primary)
- Replit Secrets: Environment variable management
- Replit deployment: Production hosting via `npm start` script

**Third-Party Libraries:**
- @radix-ui/*: 20+ accessible UI component primitives
- @tanstack/react-query: Server state management and data synchronization
- date-fns: Date formatting and manipulation utilities
- nanoid: Unique ID generation for sessions/entities
- passport: Authentication middleware for OAuth flows
- ws: WebSocket library for real-time connections

**Development Tools:**
- tsx: TypeScript execution for development server
- esbuild: Fast bundling for production server build
- drizzle-kit: Database schema management and migrations
- Vite plugins: Runtime error overlay, cartographer, dev banner (Replit-specific)

**Session & State Management:**
- connect-pg-simple: PostgreSQL session store for Express sessions
- express-session: Session middleware configuration
- JWT (jsonwebtoken): Token-based auth for development mode
- memoizee: Function memoization for OIDC config caching

**Validation & Type Safety:**
- Zod: Runtime schema validation for API inputs
- TypeScript: Compile-time type checking across client/server/shared
- Drizzle-Zod: Bridge between ORM schemas and Zod validators
- @hookform/resolvers: Zod resolver for React Hook Form integration

**Demo & Development:**
- Seed script: `server/seed.ts` for populating demo data
- Demo accounts: 5 allowlisted emails with shared password (demo123)
- Mock data: 30 users, 60 posts, 12 courses, forums, badges, endorsements
- Development auth: Optional bypass for Firebase setup (DEV_AUTH_ENABLED)