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
│   ├── routes/               # Modular API routes (refactored)
│   │   ├── index.ts          # Route exports
│   │   ├── shared.ts         # Common middleware
│   │   ├── auth.ts           # Authentication (134 lines)
│   │   ├── feed.ts           # Social feed (655 lines)
│   │   ├── users.ts          # User management (662 lines)
│   │   ├── courses.ts        # Course management (1356 lines)
│   │   ├── messaging.ts      # Conversations (261 lines)
│   │   ├── groups.ts         # Group management (447 lines)
│   │   ├── challenges.ts     # Industry challenges (516 lines)
│   │   ├── connections.ts    # Follow/connect (406 lines)
│   │   ├── ai.ts             # AI features (622 lines)
│   │   ├── admin.ts          # Admin operations (362 lines)
│   │   ├── notifications.ts  # Notifications (122 lines)
│   │   ├── teacher-content.ts# Teacher materials (275 lines)
│   │   ├── skills.ts         # Skills management (217 lines)
│   │   ├── certifications.ts # Certifications (418 lines)
│   │   └── recruiter.ts      # Recruiter tools (193 lines)
│   ├── routes.ts             # Main router setup (~77 lines)
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

## Refactoring Status (Completed December 2024)

The backend routes have been successfully refactored from a single 8000+ line file into 15 domain-specific modules:

- Total backend route code: ~6,700 lines across 15 files (average ~450 lines each)
- Main router (`routes.ts`): Reduced to ~77 lines
- All routes follow RESTful patterns with consistent authentication

### Component Optimization (Future)
Large components that could benefit from further splitting:
- `TeacherContentUpload.tsx` (1330 lines) - multiple modals and forms
- `PostCard.tsx` (693 lines) - complex interactions
- `GroupsDiscovery.tsx` (1041 lines) - page component
- `IndustryDashboard.tsx` (976 lines) - dashboard component

## Additional Documentation

- **DEVELOPER_GUIDE.md** - Quick navigation and common tasks
- **TEST_CHECKLIST.md** - Smoke test flows for verification
