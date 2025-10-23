# UniNexus - Student Social & Professional Network

## Overview

UniNexus is a Gen Z-focused student social and professional networking platform that combines social media features with academic collaboration and career development tools. The platform connects university students across the UK, enabling them to share posts, engage in Q&A discussions, participate in study events, build professional portfolios, and gain visibility to universities and industries through a gamified ranking system.

**Core Purpose**: Bridge the gap between social networking and professional development for university students, improving engagement, retention, and employability through AI-powered guidance and peer collaboration.

**Target Audience**: University and college students aged 18-25, with future expansion to educators and industry recruiters.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack**
- **React** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR (Hot Module Replacement)
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query (React Query)** for server state management and data fetching with automatic caching

**UI/UX Design System**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Mobile-first responsive design** optimized for Gen Z users
- **Dark/Light theme support** with system preference detection
- **Custom color palette**: Violet primary (#8B5CF6), Cyan secondary (#06B6D4), Rose accent (#F43F5E)
- **Typography**: Poppins for headings/display, Inter for body text
- **Design inspiration**: Instagram (feed), LinkedIn (profiles), Discord (channels), Duolingo (gamification)

**Component Architecture**
- Atomic design pattern with reusable UI components in `client/src/components/ui/`
- Feature-specific components (PostCard, QuestionCard, EventCard, etc.)
- Page-level components in `client/src/pages/`
- Centralized theme management via ThemeProvider context
- Custom hooks for data fetching and business logic

### Backend Architecture

**Server Framework**
- **Express.js** on Node.js for RESTful API endpoints
- **TypeScript** for type safety across the entire stack
- **Session-based architecture** with middleware for request logging and error handling

**API Design**
- RESTful endpoints organized by domain (`/api/auth`, `/api/posts`, `/api/channels`, etc.)
- JSON request/response format
- Validation using Zod schemas from shared schema definitions
- Error handling with appropriate HTTP status codes

**Real-time Features**
- **WebSocket server** for live notifications and updates
- Persistent connections managed via user authentication
- Notification types: posts, comments, likes, answers, events, achievements
- Automatic reconnection logic with exponential backoff

### Data Storage

**Database System**
- **PostgreSQL** via Neon serverless database
- **Drizzle ORM** for type-safe database queries and migrations
- Connection pooling through `@neondatabase/serverless` with WebSocket support

**Schema Design**
- **Users table**: Firebase UID, profile data, university/course info, gamification score, badges, onboarding status
- **Posts table**: User-generated content with media URLs, tags, like/comment counts
- **Comments table**: Threaded discussions on posts
- **Likes table**: Many-to-many relationship for post engagement
- **Channels table**: Course/university-based discussion groups
- **Questions/Answers tables**: Q&A system with upvoting and solved status
- **Events table**: Study sessions and meetups with RSVP tracking
- **Follows table**: Social graph for user connections

**Data Access Layer**
- Storage interface abstraction in `server/storage.ts`
- CRUD operations for all domain entities
- Cascading deletes for referential integrity
- Timestamp tracking for created/updated records

### Authentication & Authorization

**Authentication Provider**
- **Firebase Authentication** for user identity management
- **Google OAuth** as primary sign-in method (with redirect flow)
- Email/password authentication placeholder for future implementation
- Firebase UID stored as primary user identifier

**Authorization Flow**
1. User authenticates via Firebase (Google OAuth)
2. Redirect result handled client-side
3. User record created/fetched from backend via Firebase UID
4. Onboarding flow for new users to collect university/course data
5. Session maintained via Firebase Auth state

**Security Considerations**
- Firebase handles token validation and refresh
- Backend validates user existence before operations
- WebSocket connections require user authentication
- CORS and credential handling configured for API requests

### AI Integration

**OpenAI Integration**
- **GPT-5 model** for AI-powered career and academic mentorship
- Conversational interface for student guidance
- System prompts define AI persona as "UniNexus AI" mentor
- Context-aware responses based on conversation history

**AI Features**
- Career guidance and job search advice
- CV/resume feedback
- Skill recommendations based on career goals
- Academic planning and course selection
- Study strategies and time management
- Internship and opportunity suggestions
- Motivational support

**Implementation Notes**
- Graceful degradation when API key is not configured
- Error handling for API failures
- Token limits and response constraints (2048 max completion tokens)
- Chat message history maintained client-side

### Gamification System

**UniNexus Score**
- Integer-based reputation metric stored per user
- Increases through engagement, endorsements, and problem-solving
- Displayed on profiles and leaderboard
- Default starting score: 0

**Badges System**
- JSON array storage for earned achievements
- Extensible for future badge types
- Displayed on user profiles

**Leaderboard**
- National, university, and course-level rankings
- Sorted by UniNexus Score in descending order
- Top 50 users displayed by default
- Real-time updates via query invalidation

## External Dependencies

### Third-Party Services

**Firebase (Authentication)**
- Project configuration via environment variables (`VITE_FIREBASE_*`)
- Google OAuth provider for social login
- Session management and token refresh handled automatically

**OpenAI API**
- Requires `OPENAI_API_KEY` environment variable
- Used for AI chat completions and career analysis
- Model: GPT-5 (latest as of August 2025)

**Neon Database**
- Serverless PostgreSQL instance
- Connection string via `DATABASE_URL` environment variable
- WebSocket support for real-time queries

### NPM Packages

**Core Dependencies**
- `express` - Web server framework
- `react`, `react-dom` - UI library
- `drizzle-orm` - Type-safe ORM
- `@neondatabase/serverless` - Database driver
- `firebase` - Authentication SDK
- `openai` - AI API client
- `ws` - WebSocket implementation
- `zod` - Runtime type validation

**UI/UX Libraries**
- `@radix-ui/*` - Accessible component primitives (20+ components)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Variant-based component styling
- `cmdk` - Command palette component
- `embla-carousel-react` - Touch-friendly carousel
- `framer-motion` - Animation library (referenced in design docs)

**Developer Tools**
- `typescript` - Type checking
- `vite` - Build tool and dev server
- `tsx` - TypeScript execution for Node
- `esbuild` - Production bundler for server
- `drizzle-kit` - Database migrations

**State Management**
- `@tanstack/react-query` - Server state and caching
- `wouter` - Client-side routing

**Development Utilities**
- `@replit/vite-plugin-*` - Replit-specific dev tools
- `date-fns` - Date formatting and manipulation
- `nanoid` - ID generation
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Form validation integration

### Environment Variables Required

**Production**
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API authentication
- `VITE_FIREBASE_API_KEY` - Firebase web API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project identifier
- `VITE_FIREBASE_APP_ID` - Firebase app identifier
- `NODE_ENV` - Runtime environment (development/production)

**Optional**
- `REPL_ID` - Replit-specific identifier for dev plugins