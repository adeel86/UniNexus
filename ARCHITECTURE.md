# UniNexus Architecture

## Overview

UniNexus is a university social networking platform that connects students, teachers, university administrators, and industry professionals. The platform provides features for social engagement, course management, career development, and professional networking.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM
- **Authentication**: Firebase Auth with fallback dev authentication
- **AI Integration**: OpenAI for CareerBot assistant
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter (frontend), Express Router (backend)

## Directory Structure

```
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Shadcn base components
│   │   │   └── *.tsx         # Feature components
│   │   ├── pages/            # Page components (routed)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and configurations
│   │   └── App.tsx           # Main app with routing
├── server/                    # Backend application
│   ├── routes.ts             # API route definitions (~8000 lines)
│   ├── storage.ts            # Data access layer
│   ├── db.ts                 # Database connection
│   ├── seed.ts               # Test data seeding
│   └── firebaseAuth.ts       # Authentication middleware
├── shared/                    # Shared code
│   └── schema.ts             # Drizzle schema and types
└── attached_assets/          # User-uploaded files
```

## User Roles

| Role | Access Level |
|------|--------------|
| `student` | Full social features, courses, AI CareerBot |
| `teacher` | Student features + course management, endorsements, content upload |
| `university_admin` | Full social features, course validation, institutional analytics |
| `industry_professional` | Talent discovery, challenges, messaging |
| `master_admin` | Platform management, moderation (restricted from social features) |

## Key Features

### Course Management
- Teachers create courses and upload educational materials
- University admins validate courses before materials can be added
- Cascade delete removes all related data (materials, enrollments, discussions)

### Social Features
- News feed with posts, reactions, comments
- Network connections and followers
- Direct messaging and group chats
- Groups with moderation roles

### Gamification
- Points system across engagement, problem-solving, endorsements
- Rank tiers (Bronze → Diamond)
- Badges and achievements
- Challenges with industry partners

### AI Integration
- CareerBot for career guidance
- Post suggestions based on interests

## API Structure

All API endpoints follow RESTful patterns:

```
/api/auth/*          # Authentication
/api/users/*         # User management
/api/posts/*         # Social feed
/api/courses/*       # Course management
/api/conversations/* # Messaging
/api/groups/*        # Group management
/api/challenges/*    # Industry challenges
/api/notifications/* # Notifications
/api/ai/*            # AI features
```

## Database Schema

Key tables and relationships:
- `users` - All platform users with role-based access
- `posts` - Social feed content with reactions/comments
- `courses` - University courses with validation workflow
- `teacherContent` - Course materials (only for validated courses)
- `conversations/messages` - Direct and group messaging
- `groups/groupMembers` - Community groups

## Authentication Flow

1. **Firebase Auth** (production): Token-based authentication with Firebase
2. **Dev Auth** (development): JWT-based auth with demo accounts (password: `demo123`)

Demo accounts available:
- `demo.student@uninexus.app`
- `demo.teacher@uninexus.app`
- `demo.university@uninexus.app`
- `demo.industry@uninexus.app`
- `demo.admin@uninexus.app`

## Development

### Setup
```bash
npm install
npm run db:push    # Sync database schema
npm run seed       # Populate test data
npm run dev        # Start development server
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `DEV_AUTH_ENABLED` - Enable development authentication
- `DEV_JWT_SECRET` - JWT secret for dev auth
- `OPENAI_API_KEY` - OpenAI API key for CareerBot

## Future Improvements

### Routes Refactoring
The current `server/routes.ts` (~8000 lines) should be split into domain-specific modules:

```
server/routes/
├── index.ts        # Route aggregator
├── shared.ts       # Common middleware
├── auth.ts         # Authentication routes
├── posts.ts        # Social feed routes
├── courses.ts      # Course management
├── messaging.ts    # Conversations/messages
├── groups.ts       # Groups and moderation
├── challenges.ts   # Industry challenges
├── users.ts        # User profiles/connections
├── content.ts      # Teacher content management
├── ai.ts           # AI/CareerBot routes
└── notifications.ts# Notification system
```

### Component Optimization
Large components that could benefit from splitting:
- `TeacherValidatedCoursesSection.tsx` (900+ lines)
- `UniversityAdminAnalytics.tsx`
- `IndustryDashboard.tsx`
