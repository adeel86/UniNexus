# UniNexus Architecture Guide

**Comprehensive technical architecture for the UniNexus social learning platform.**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Role-Based Architecture](#role-based-architecture)
6. [Data Flow & Workflows](#data-flow--workflows)
7. [Database Schema](#database-schema)
8. [Authentication System](#authentication-system)
9. [API Structure](#api-structure)
10. [Frontend Architecture](#frontend-architecture)
11. [Course & AI Workflow](#course--ai-workflow)
12. [Notifications & Events](#notifications--events)
13. [Scalability & Performance](#scalability--performance)

---

## System Overview

**UniNexus** is a modern web and mobile platform connecting students, teachers, universities, and industry professionals through social learning, course management, and professional networking.

### Core Purpose

To create a **Gen-Z focused, engaging learning ecosystem** where:
- **Students** discover courses, learn collaboratively, build networks, and prepare careers
- **Teachers** create quality educational content and mentor students
- **Universities** validate courses and maintain academic standards
- **Industry Professionals** identify talent and propose challenges
- **Admins** moderate content and manage platform operations

### Key Statistics

- **Languages:** TypeScript (100%)
- **Backend:** ~6,700 lines of route code across 15 modular files
- **Frontend:** React components with 71-86% code reduction through modularization
- **Database Tables:** 40+ tables supporting complex workflows
- **APIs:** 60+ REST endpoints

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Web App (React 18 + TypeScript)                      │    │
│  │ Mobile App (React Native + Expo)                     │    │
│  │ UI: Tailwind CSS + Shadcn UI                         │    │
│  │ State: TanStack Query v5 + Local Context             │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────────────────┘
                 │ REST/HTTP
                 │
┌────────────────┴─────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Express.js + TypeScript                              │    │
│  │ • Authentication Middleware                          │    │
│  │ • CORS & Security Headers                            │    │
│  │ • Request Logging & Rate Limiting                    │    │
│  │ • Error Handling                                     │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────────────────┘
                 │ Drizzle ORM
                 │
┌────────────────┴─────────────────────────────────────────────┐
│                  SERVICE LAYER                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Business Logic & Data Access                         │    │
│  │ • User Management & Validation                       │    │
│  │ • Course & Enrollment Processing                     │    │
│  │ • Social Feed & Engagement Algorithms                │    │
│  │ • AI Chatbot Integration                             │    │
│  │ • File Storage & CDN                                 │    │
│  │ • Notification System                                │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────────────────┘
                 │
┌────────────────┴─────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ PostgreSQL Database (Neon serverless)                │    │
│  │ • Normalized schema with relationships               │    │
│  │ • Indexes for performance                            │    │
│  │ • Transactional integrity                            │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────────────────┘
                 │
┌────────────────┴─────────────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │ Firebase     │  │ OpenAI       │  │ Cloud Storage │      │
│  │ Authentication   │ AI Services │  │ (File uploads)│      │
│  └──────────────┘  └──────────────┘  └───────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Library** | React 18 | Component-based UI |
| **Language** | TypeScript | Type safety & IDE support |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | Shadcn UI | Pre-built accessible components |
| **State Management** | TanStack Query v5 | Server state synchronization |
| **Local State** | React Context | Auth, theme, user session |
| **Routing** | Wouter | Lightweight client-side routing |
| **Forms** | React Hook Form | Form state management |
| **Validation** | Zod | Schema validation |
| **Animations** | Framer Motion | Interactive animations |
| **Icons** | Lucide React | Icon library |

### Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20+ | JavaScript server runtime |
| **Framework** | Express.js | Web server & routing |
| **Language** | TypeScript | Type safety & IDE support |
| **Authentication** | Firebase Admin SDK | OAuth & user management |
| **ORM** | Drizzle | Type-safe database queries |
| **Database** | PostgreSQL | Relational data storage |
| **API Parsing** | express.json() | JSON request parsing |
| **File Upload** | Multer | File upload handling |
| **AI Integration** | OpenAI API | ChatBot & assistance features |

### Database

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **DBMS** | PostgreSQL 12+ | Relational database |
| **Hosting** | Neon | Serverless PostgreSQL |
| **ORM** | Drizzle | Type-safe queries |
| **Migrations** | Drizzle Kit | Schema version control |

### External Services

| Service | Purpose | Configuration |
|---------|---------|-----------------|
| **Firebase** | Authentication & user management | `serviceAccountKey.json` |
| **OpenAI** | AI chatbot & course suggestions | `OPENAI_API_KEY` |
| **Cloud Storage** | File uploads & CDN | Local fallback or cloud bucket |

---

## Project Structure

```
UniNexusGenZ/
├── client/                          # Frontend React Application
│   ├── index.html                   # HTML entry point
│   ├── src/
│   │   ├── App.tsx                  # Main app component with routing
│   │   ├── main.tsx                 # React entry point
│   │   ├── index.css                # Global styles
│   │   ├── pages/                   # Routed pages
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Courses.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Groups.tsx
│   │   │   └── ...
│   │   ├── components/              # Reusable components
│   │   │   ├── ui/                  # Shadcn UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   ├── post-card/           # Post display components
│   │   │   ├── groups/              # Group discovery
│   │   │   ├── profile/             # Profile pages
│   │   │   ├── teacher/             # Teacher features
│   │   │   ├── industry/            # Industry dashboard
│   │   │   └── ...
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── use-toast.ts
│   │   │   └── use-mobile.tsx
│   │   └── lib/                     # Utilities & configuration
│   │       ├── AuthContext.tsx      # Global auth state
│   │       ├── firebase.ts          # Firebase SDK setup
│   │       ├── queryClient.ts       # TanStack Query config
│   │       ├── utils.ts             # Helper functions
│   │       └── ...
│   └── public/                      # Static assets
│
├── server/                          # Backend Express Application
│   ├── index.ts                     # Server entry point
│   ├── routes.ts                    # Main router (~77 lines)
│   ├── routes/                      # Modular API routes
│   │   ├── index.ts                 # Route exports
│   │   ├── shared.ts                # Common middleware
│   │   ├── auth.ts                  # Auth endpoints (134 lines)
│   │   ├── feed.ts                  # Social feed (655 lines)
│   │   ├── users.ts                 # User management (662 lines)
│   │   ├── courses.ts               # Courses (1,356 lines)
│   │   ├── messaging.ts             # Messaging (261 lines)
│   │   ├── groups.ts                # Groups (447 lines)
│   │   ├── challenges.ts            # Challenges (516 lines)
│   │   ├── connections.ts           # Social graph (406 lines)
│   │   ├── ai.ts                    # AI features (622 lines)
│   │   ├── admin.ts                 # Admin tools (362 lines)
│   │   ├── notifications.ts         # Notifications (122 lines)
│   │   ├── teacher-content.ts       # Materials (275 lines)
│   │   ├── skills.ts                # Skills (217 lines)
│   │   ├── certifications.ts        # Certs (418 lines)
│   │   ├── recruiter.ts             # Recruiter tools (193 lines)
│   │   └── qa.ts                    # Q&A system
│   ├── seed/                        # Database seeding
│   │   ├── index.ts                 # Seed orchestrator
│   │   ├── config.ts                # Seed profiles
│   │   └── data/                    # Domain-specific seeds
│   │       ├── users.ts
│   │       ├── posts.ts
│   │       ├── courses.ts
│   │       ├── social.ts
│   │       └── ...
│   ├── db.ts                        # Database connection
│   ├── storage.ts                   # Data access layer
│   ├── firebaseAuth.ts              # Auth middleware
│   └── cloudStorage.ts              # File storage setup
│
├── mobile/                          # React Native Mobile App
│   ├── App.tsx                      # Main app
│   ├── app.json                     # Expo configuration
│   ├── src/
│   │   ├── screens/                 # Mobile screens
│   │   ├── components/              # Mobile components
│   │   ├── hooks/                   # Mobile-specific hooks
│   │   └── lib/                     # Mobile utilities
│   └── package.json
│
├── shared/                          # Shared Code
│   └── schema.ts                    # Drizzle database schema
│                                    # (40+ tables, ~1,500 lines)
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite bundler config
├── drizzle.config.ts                # Drizzle config
├── tailwind.config.ts               # Tailwind config
├── postcss.config.js                # PostCSS config
│
├── .env.example                     # Environment variable template
├── .env                             # Development environment
├── .gitignore                       # Git ignore rules
├── DEVELOPER_GUIDE.md               # Setup & development
├── ARCHITECTURE.md                  # This file
└── README.md                        # Project overview
```

---

## Role-Based Architecture

UniNexus supports 5 distinct user roles with different capabilities:

### 1. **Student**

**Access Level:** Full social & learning features

**Key Permissions:**
- ✅ Create posts, comments, reactions
- ✅ Enroll in courses
- ✅ Join groups and connections
- ✅ Use AI tutoring (with course enrollment)
- ✅ View leaderboards
- ✅ Earn badges and achievements
- ✅ Send messages
- ❌ Cannot create courses
- ❌ Cannot moderate content
- ❌ Cannot validate courses

**Key Data:**
```typescript
{
  role: 'student',
  university: 'MIT',
  major: 'Computer Science',
  engagementScore: 1200,
  enrolledCourses: [...],
  connections: [...],
  badges: [...]
}
```

### 2. **Teacher**

**Access Level:** All student features + course creation & content

**Key Permissions:**
- ✅ All student permissions
- ✅ Create and manage courses
- ✅ Upload educational materials
- ✅ Review student enrollments
- ✅ Respond to student questions
- ✅ Endorse students
- ✅ View course analytics
- ❌ Cannot validate courses (university_admin does)
- ❌ Cannot moderate other users' content

**Key Data:**
```typescript
{
  role: 'teacher',
  university: 'Stanford',
  position: 'Assistant Professor',
  createdCourses: [...],
  studentEndorsements: [...],
  teacherContent: [...]
}
```

### 3. **University Admin**

**Access Level:** Course validation, institutional management

**Key Permissions:**
- ✅ All student permissions
- ✅ View all institution's courses
- ✅ **Validate courses** (required for teacher content)
- ✅ Access institutional analytics
- ✅ Manage university members
- ✅ Moderate content within university
- ❌ Cannot create global content
- ❌ Cannot access other universities' data

**Key Data:**
```typescript
{
  role: 'university_admin',
  university: 'Stanford',
  institution: 'Stanford University',
  validatedCourses: [...],
  institutionalAnalytics: {...}
}
```

### 4. **Industry Professional**

**Access Level:** Talent discovery, challenges

**Key Permissions:**
- ✅ Browse student profiles and portfolios
- ✅ Create industry challenges
- ✅ Access challenge submissions
- ✅ Message students directly
- ✅ Endorse student skills
- ✅ View challenge results
- ❌ Cannot enroll in courses
- ❌ Cannot post to social feed
- ❌ Cannot create courses

**Key Data:**
```typescript
{
  role: 'industry_professional',
  company: 'Google',
  position: 'Engineering Manager',
  createdChallenges: [...],
  candidateMessages: [...]
}
```

### 5. **Master Admin**

**Access Level:** Platform-wide administration

**Key Permissions:**
- ✅ Moderate any content
- ✅ Manage users and roles
- ✅ Access all platform data
- ✅ View analytics
- ✅ Manage announcements
- ✅ Ban/suspend users
- ❌ Cannot participate in social features (restricted)

**Key Data:**
```typescript
{
  role: 'master_admin',
  adminLevel: 'super',
  modrationActions: [...],
  platformAnalytics: {...}
}
```

### Role Separation Logic

```typescript
// Enforced via middleware in server/firebaseAuth.ts

function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage in routes
router.post('/courses', 
  requireRole(['teacher', 'university_admin']), 
  createCourse
);
```

### Shared Logic vs. Role-Specific Logic

**Shared Logic** (applies to all roles):
- Authentication & authorization
- User profiles & basic info
- Social connections & followers
- Messaging system
- Notifications
- Basic analytics

**Role-Specific Logic:**
- Students: Course enrollment, engagement tracking
- Teachers: Content upload, course creation, endorsements
- University Admins: Course validation, institutional oversight
- Industry Professionals: Challenge creation, talent discovery
- Master Admins: Moderation, user management, system analytics

---

## Data Flow & Workflows

### 1. User Registration Flow

```
┌──────────────────────┐
│  New User Signs Up   │
│  (Email/Password)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Firebase Auth Service                │
│ • Create Firebase user               │
│ • Generate Firebase UID              │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Backend: POST /api/auth/register     │
│ • Receive Firebase UID & email       │
│ • Insert into users table            │
│ • Create user profile                │
│ • Return JWT token                   │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Frontend: Store Token                │
│ • Save JWT in localStorage           │
│ • Update AuthContext                 │
│ • Redirect to profile setup          │
└──────────────────────────────────────┘
```

### 2. Course Enrollment Workflow

```
┌─────────────────────────┐
│  Student Views Course   │
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ GET /api/courses/:id                 │
│ • Load course details                │
│ • Load teacher content (if validated)│
│ • Show "Enroll" button               │
└──────────┬───────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│  Student Clicks Enroll  │
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ POST /api/courses/:id/enroll         │
│ • Create course enrollment record    │
│ • Set enrollment date                │
│ • Update user's enrolledCourses      │
│ • Return enrollment confirmation     │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Frontend: Update UI                  │
│ • Show "You are enrolled"            │
│ • Enable "Ask AI" button             │
│ • Show course materials              │
└──────────────────────────────────────┘
```

### 3. AI Tutoring Workflow

```
┌─────────────────────────────────┐
│  Student Asks Question in       │
│  AI Chat (within a course)      │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/ai/chat                │
│ • Verify student enrolled        │
│ • Get course ID & user ID        │
│ • Retrieve teacher content       │
│   for semantic search            │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ OpenAI Integration               │
│ • Embed student question         │
│ • Search relevant materials      │
│ • Generate response with         │
│   citations                      │
│ • Return AI answer               │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Backend Logs                      │
│ • Save chat message to DB        │
│ • Update engagement score        │
│ • Track AI usage                 │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Frontend Display                 │
│ • Show AI response               │
│ • Highlight citations            │
│ • Allow follow-up questions      │
└──────────────────────────────────┘
```

### 4. Course Validation Workflow

```
┌─────────────────────┐
│  Teacher Creates    │
│  Course & Content   │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/courses                │
│ • Create course record           │
│ • Set status: "pending_review"   │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/teacher-content        │
│ • Upload course materials        │
│ • Status: "pending_validation"   │
│ • Notify university_admin        │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ University Admin Approves        │
│ POST /api/admin/courses/validate │
│ • Verify content quality         │
│ • Check academic standards       │
│ • Update status: "validated"     │
│ • Enable AI access               │
│ • Notify teacher                 │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Course is Live                   │
│ • Students can enroll            │
│ • AI can use materials           │
│ • Appears in course listings     │
└──────────────────────────────────┘
```

---

## Database Schema

### Core Tables (40+ total)

#### Users & Authentication
```sql
-- users: All platform users
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  firebaseUid VARCHAR UNIQUE,
  email VARCHAR UNIQUE,
  firstName VARCHAR,
  lastName VARCHAR,
  role VARCHAR,  -- student|teacher|university_admin|industry_professional|master_admin
  university VARCHAR,
  major VARCHAR,
  company VARCHAR,
  position VARCHAR,
  avatar VARCHAR,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- userProfiles: Extended user information
CREATE TABLE user_profiles (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR REFERENCES users.id,
  bio TEXT,
  interests TEXT[], -- array of interests
  cv VARCHAR,       -- file URL
  resume VARCHAR    -- file URL
);
```

#### Social Features
```sql
-- posts: Social feed content
CREATE TABLE posts (
  id VARCHAR PRIMARY KEY,
  authorId VARCHAR REFERENCES users.id,
  content TEXT,
  category VARCHAR,
  mediaType VARCHAR,
  tags TEXT[],
  viewCount INTEGER,
  createdAt TIMESTAMP
);

-- comments: Post comments
CREATE TABLE comments (
  id VARCHAR PRIMARY KEY,
  postId VARCHAR REFERENCES posts.id,
  authorId VARCHAR REFERENCES users.id,
  content TEXT,
  createdAt TIMESTAMP
);

-- reactions: Post/comment reactions
CREATE TABLE reactions (
  id VARCHAR PRIMARY KEY,
  postId VARCHAR REFERENCES posts.id,
  userId VARCHAR REFERENCES users.id,
  type VARCHAR,  -- like|love|laugh|wow|sad|angry
  createdAt TIMESTAMP
);
```

#### Courses & Learning
```sql
-- courses: Course definitions
CREATE TABLE courses (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  code VARCHAR,
  description TEXT,
  university VARCHAR,
  instructorId VARCHAR REFERENCES users.id,
  semester VARCHAR,
  isUniversityValidated BOOLEAN,
  createdAt TIMESTAMP
);

-- courseEnrollments: Student enrollment
CREATE TABLE course_enrollments (
  id VARCHAR PRIMARY KEY,
  courseId VARCHAR REFERENCES courses.id,
  userId VARCHAR REFERENCES users.id,
  enrolledAt TIMESTAMP,
  completedAt TIMESTAMP
);

-- teacherContent: Course materials uploaded by teachers
CREATE TABLE teacher_content (
  id VARCHAR PRIMARY KEY,
  courseId VARCHAR REFERENCES courses.id,
  userId VARCHAR REFERENCES users.id,
  title VARCHAR,
  content TEXT,
  type VARCHAR,  -- pdf|video|text|slides
  isValidated BOOLEAN,
  createdAt TIMESTAMP
);
```

#### Gamification
```sql
-- badges: Achievement badges
CREATE TABLE badges (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  description TEXT,
  icon VARCHAR
);

-- userBadges: Badges earned by users
CREATE TABLE user_badges (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR REFERENCES users.id,
  badgeId VARCHAR REFERENCES badges.id,
  earnedAt TIMESTAMP
);

-- skills: Skill tags
CREATE TABLE skills (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  category VARCHAR
);

-- userSkills: Skills claimed by users
CREATE TABLE user_skills (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR REFERENCES users.id,
  skillId VARCHAR REFERENCES skills.id,
  level VARCHAR,  -- beginner|intermediate|advanced|expert
  endorsements INTEGER
);
```

#### Messaging
```sql
-- conversations: Direct messages or group chats
CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  isGroup BOOLEAN,
  createdAt TIMESTAMP
);

-- conversationMembers: Users in a conversation
CREATE TABLE conversation_members (
  id VARCHAR PRIMARY KEY,
  conversationId VARCHAR REFERENCES conversations.id,
  userId VARCHAR REFERENCES users.id,
  joinedAt TIMESTAMP
);

-- messages: Individual messages
CREATE TABLE messages (
  id VARCHAR PRIMARY KEY,
  conversationId VARCHAR REFERENCES conversations.id,
  senderId VARCHAR REFERENCES users.id,
  content TEXT,
  createdAt TIMESTAMP
);
```

#### AI & Career
```sql
-- aiChatSessions: AI tutoring sessions
CREATE TABLE ai_chat_sessions (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR REFERENCES users.id,
  courseId VARCHAR REFERENCES courses.id,
  createdAt TIMESTAMP
);

-- aiChatMessages: AI chat history
CREATE TABLE ai_chat_messages (
  id VARCHAR PRIMARY KEY,
  sessionId VARCHAR REFERENCES ai_chat_sessions.id,
  role VARCHAR,  -- user|assistant
  content TEXT,
  createdAt TIMESTAMP
);
```

### Schema Organization

The complete schema is defined in `shared/schema.ts` (~1,500 lines) organized by domain:
- Users and authentication
- Social features (posts, comments, reactions)
- Courses and learning
- Messaging and conversations
- Groups and communities
- Gamification (badges, skills, challenges)
- AI and tutoring
- Notifications
- Certifications and recruiter feedback

---

## Authentication System

### Dual Authentication Approach

UniNexus supports two authentication mechanisms depending on environment:

#### **Production: Firebase Authentication**

```
Client
  │
  ├─→ User enters email/password
  │
  └─→ Firebase Auth SDK
         │
         ├─→ Validate credentials
         ├─→ Generate ID token
         └─→ Return to client
              │
              ├─→ Store in localStorage
              │
              ├─→ Include in API requests (Authorization: Bearer <token>)
              │
              └─→ Backend validates with Firebase Admin SDK
                    │
                    ├─→ Verify token signature
                    ├─→ Check token expiration
                    ├─→ Extract user ID
                    │
                    └─→ Allow/deny request
```

**Benefits:**
- ✅ Industry-standard OAuth 2.0
- ✅ Secure token-based sessions
- ✅ Supports email/password, Google, etc.
- ✅ Built-in account security features

#### **Development: JWT Demo Authentication**

```
Client
  │
  ├─→ User selects demo account
  │
  └─→ POST /api/auth/dev-login
         │ (username: demo.student@uninexus.app, password: demo123)
         │
         ├─→ Verify demo credentials match database
         ├─→ Generate JWT with DEV_JWT_SECRET
         └─→ Return to client
              │
              ├─→ Store in localStorage
              │
              └─→ Use in API requests like production
```

**Benefits:**
- ✅ No Firebase setup needed for local testing
- ✅ Fast development iterations
- ✅ Works in CI/CD pipelines
- ✅ Fully configurable demo accounts

### Authentication Middleware

```typescript
// server/firebaseAuth.ts

export async function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  try {
    // Check if dev auth is enabled
    if (process.env.DEV_AUTH_ENABLED === 'true') {
      const payload = jwt.verify(token, process.env.DEV_JWT_SECRET);
      req.user = payload;
      return next();
    }
    
    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## API Structure

### Endpoint Organization

All APIs follow RESTful conventions organized by feature:

```
/api/auth/                   # Authentication (5 endpoints)
  POST /dev-login            # Dev auth login
  POST /register             # User registration
  GET  /user                 # Get current user
  POST /logout               # Logout

/api/users/                  # User management (8 endpoints)
  GET  /:id                  # Get user by ID
  GET  /role/:role           # Get users by role
  PATCH /:id                 # Update user
  GET  /:id/followers        # Get followers
  GET  /:id/following        # Get following users

/api/feed/                   # Social feed (12 endpoints)
  GET  /                     # Get feed posts
  POST /posts                # Create post
  GET  /posts/:id            # Get post
  POST /posts/:id/react      # Add reaction
  POST /posts/:id/comment    # Add comment
  POST /posts/:id/share      # Share post
  DELETE /posts/:id          # Delete post

/api/courses/                # Course management (20 endpoints)
  GET  /                     # List courses
  POST /                     # Create course
  GET  /:id                  # Get course
  PATCH /:id                 # Update course
  POST /:id/enroll           # Enroll student
  GET  /:id/enrollments      # List enrollments
  POST /:id/discuss          # Discussion endpoint

/api/ai/                     # AI features (8 endpoints)
  POST /chat                 # Send message to AI
  GET  /sessions             # List AI sessions
  POST /sessions             # Create session
  GET  /sessions/:id         # Get session

/api/groups/                 # Group management (15 endpoints)
  GET  /                     # List groups
  POST /                     # Create group
  POST /:id/join             # Join group
  POST /:id/members          # Add member
  POST /:id/posts            # Post to group

/api/admin/                  # Admin operations (10 endpoints)
  GET  /analytics            # Platform analytics
  POST /users/:id/ban        # Ban user
  GET  /moderation-queue     # Moderation items
  POST /courses/:id/validate # Validate course

/api/notifications/          # Notifications (5 endpoints)
  GET  /                     # Get notifications
  POST /:id/read             # Mark as read
  DELETE /:id                # Delete notification
```

### Response Format

All endpoints return JSON:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Router (Wouter)
│   ├── Landing (public)
│   ├── Login (public)
│   ├── Layout (protected)
│   │   ├── Navbar
│   │   ├── Sidebar
│   │   └── MainContent
│   │       ├── Dashboard
│   │       ├── Feed
│   │       ├── Courses
│   │       ├── Groups
│   │       ├── Profile
│   │       ├── Messages
│   │       └── Admin
│   └── NotFound (404)
```

### State Management Strategy

**Server State** (TanStack Query):
- API data (users, posts, courses, etc.)
- Caching and synchronization
- Automatic refetching on focus
- Optimistic updates

```typescript
// Example: Fetching courses
const { data: courses, isLoading } = useQuery({
  queryKey: ['/api/courses'],
  queryFn: () => fetch('/api/courses').then(r => r.json())
});

// Example: Creating post
const createPostMutation = useMutation({
  mutationFn: (content) => fetch('/api/feed/posts', {
    method: 'POST',
    body: JSON.stringify({ content })
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
  }
});
```

**Client State** (React Context):
- Authentication status
- Current user
- Theme preference
- UI state (modals, notifications)

```typescript
// AuthContext provides global auth state
const { user, isLoading, logout } = useAuth();
```

### Component Patterns

#### Modularization Pattern
Large components (600+ lines) are split into:
- Main component (< 200 lines)
- Sub-components (feature-specific)
- Custom hooks (state logic)
- Modals/dialogs (separate files)

```
GroupsDiscovery.tsx (1041 → 179 lines, 83% reduction)
├── GroupsDiscovery.tsx (main component)
├── GroupsSearchBar.tsx (search logic)
├── GroupsGrid.tsx (display grid)
├── GroupCard.tsx (individual card)
├── GroupModal.tsx (create group modal)
└── useGroupSearch.ts (search hook)
```

---

## Course & AI Workflow

### Course Lifecycle

```
Stage 1: Creation (Teacher)
├─ Teacher creates course
├─ Set name, description, semester
├─ Status: "draft"
└─ Only teacher can see

Stage 2: Material Upload (Teacher)
├─ Teacher uploads course materials
│  (PDFs, videos, slides, text)
├─ Materials stored in teacher_content table
└─ Status: "pending_validation"

Stage 3: Validation (University Admin)
├─ Admin reviews course quality
├─ Checks academic standards
├─ Approves or requests changes
└─ Status: "validated" (approved)

Stage 4: Publishing (Teacher)
├─ Teacher publishes validated course
├─ Course appears in search/browse
├─ Status: "published"
└─ Students can enroll

Stage 5: Active (Students & Teachers)
├─ Students enroll and learn
├─ Students ask questions (AI enabled)
├─ Teacher responds to discussions
└─ AI searches teacher content for answers
```

### AI Content Integration

```
Teacher Upload
  │
  ├─→ PDF/Text/Video file
  │    stored in teacher_content table
  │    (isValidated = false until approved)
  │
  ├─→ Admin Validation
  │    Reviews content quality
  │    Sets isValidated = true
  │
  └─→ AI Indexing (on validation)
      ├─ Extract text from files
      ├─ Split into chunks
      ├─ Generate embeddings
      ├─ Store in semantic index
      └─ Ready for retrieval

Student Question
  │
  ├─→ "How do I solve problem X?"
  │    in course AI chat
  │
  ├─→ Semantic Search
  │    ├─ Embed question
  │    ├─ Search indexed chunks
  │    └─ Return top-K similar chunks
  │
  ├─→ AI Generation
  │    ├─ Feed question + chunks to GPT
  │    ├─ Generate response with citations
  │    └─ Return answer
  │
  └─→ Response Display
      ├─ Show AI answer
      ├─ Highlight citations
      ├─ Link to source materials
      └─ Allow follow-up questions
```

### AI Access Control

```typescript
// Only students enrolled in validated courses can use AI

async function generateAIResponse(userId, courseId, message) {
  // 1. Check enrollment
  const enrollment = await db.query(
    'SELECT * FROM courseEnrollments WHERE userId = ? AND courseId = ?',
    [userId, courseId]
  );
  
  if (!enrollment) {
    throw new Error('Not enrolled in this course');
  }
  
  // 2. Check course validation
  const course = await db.query(
    'SELECT * FROM courses WHERE id = ? AND isUniversityValidated = true',
    [courseId]
  );
  
  if (!course) {
    throw new Error('Course must be validated for AI access');
  }
  
  // 3. Generate response
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: message }],
    context: retrieveTeacherContent(courseId)
  });
}
```

---

## Notifications & Events

### Notification System

UniNexus uses **event-driven notifications** (polling removed, event-based approach):

#### Notification Types

| Type | Trigger | Recipients |
|------|---------|-----------|
| **Course Enrollment** | User enrolls in course | Teacher |
| **Post Comment** | User comments on post | Post author |
| **Post Reaction** | User reacts to post | Post author |
| **Connection Request** | User sends connection | Target user |
| **Group Invitation** | User invites to group | Invited users |
| **Course Validation** | Admin validates course | Teacher |
| **Message** | Direct message sent | Recipient |
| **Badge Earned** | User earns badge | User |
| **Challenge Submission** | Student submits to challenge | Challenge creator |

#### Notification Flow

```typescript
// When event occurs, create notification record

async function onPostComment(postId, userId, comment) {
  // Find post author
  const post = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
  
  // Create notification
  await db.insert('notifications', {
    recipientId: post.authorId,
    type: 'POST_COMMENT',
    relatedPostId: postId,
    message: `${getUser(userId).name} commented on your post`,
    isRead: false,
    createdAt: new Date()
  });
  
  // In production, could also:
  // - Send email notification
  // - Send push notification (mobile)
  // - Add to in-app notification stream
}
```

#### Notification Delivery

**In-App (Real-time):**
- Fetched on app load
- Displayed in notification center
- Mark as read when viewed

**Email (Optional):**
- Daily digest of important notifications
- Configurable per user

**Push (Mobile):**
- Integrates with Expo Push Notifications
- Alerts for urgent events

---

## Scalability & Performance

### Database Optimization

**Indexes:**
```sql
-- Frequently queried columns
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_posts_authorId ON posts(authorId);
CREATE INDEX idx_courseEnrollments_userId ON courseEnrollments(userId);
CREATE INDEX idx_courses_university ON courses(university);
CREATE INDEX idx_messages_conversationId ON messages(conversationId);
```

**Query Optimization:**
- Use pagination for large result sets
- Load only required columns
- Join judiciously (avoid N+1 queries)
- Cache frequently accessed data

### Caching Strategy

**Frontend (TanStack Query):**
```typescript
// Automatic caching with stale-while-revalidate
const { data } = useQuery({
  queryKey: ['courses'],
  queryFn: fetchCourses,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000  // 10 minutes
});
```

**Backend (In-Memory):**
```typescript
// Cache user roles (checked on every request)
const roleCache = new Map();
const cacheUser = (user) => {
  roleCache.set(user.id, user.role);
  setTimeout(() => roleCache.delete(user.id), 60000); // 1 minute
};
```

### Rate Limiting

```typescript
// Prevent abuse of API endpoints
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                    // 100 requests per window
});

app.use('/api/', apiLimiter);
```

### Pagination

```typescript
// Prevent loading entire datasets
app.get('/api/feed', (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;
  
  const posts = await db.query(
    'SELECT * FROM posts LIMIT ? OFFSET ?',
    [limit, offset]
  );
  
  res.json({ posts, page, limit, total });
});
```

### Mobile Optimization

- **Minimal payload:** Strip unnecessary fields
- **Compression:** gzip responses
- **Lazy loading:** Load images on demand
- **Offline support:** Cache critical data locally

### Deployment Considerations

**Horizontal Scaling:**
- Stateless API servers (no session affinity needed)
- Load balancer (Nginx, AWS ALB)
- Shared database (PostgreSQL RDS)
- File CDN (CloudFlare, AWS CloudFront)

**Vertical Scaling:**
- Database: Connection pooling
- Cache: Redis for session/rate-limit store
- Workers: Background job queue (Bull, RabbitMQ)

**Monitoring:**
- Sentry for error tracking
- DataDog for performance metrics
- CloudWatch for infrastructure logs

---

## Summary

UniNexus is a **comprehensive, scalable social learning platform** built with:

✅ **Modern Stack:** React 18, Express.js, PostgreSQL, TypeScript
✅ **Role-Based Access:** 5 distinct user roles with clear permissions
✅ **Flexible Authentication:** Firebase + dev JWT hybrid approach
✅ **Modular Architecture:** 15+ domain-specific route modules
✅ **AI Integration:** Course-aware chatbot with semantic search
✅ **Event-Driven Notifications:** Real-time user engagement
✅ **Production-Ready:** Optimization, caching, rate limiting, monitoring

The architecture supports deployment on **any cloud platform** (AWS, GCP, Azure) or self-hosted infrastructure with minimal configuration changes.

---

*Last Updated: December 2024*
*Version: 2.0 (Production-Grade)*
