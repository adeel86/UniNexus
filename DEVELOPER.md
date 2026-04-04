# UniNexus — Developer Reference

Complete guide for setting up, understanding, and extending the UniNexus codebase.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [NPM Scripts](#npm-scripts)
5. [Architecture Overview](#architecture-overview)
6. [Authentication System](#authentication-system)
7. [Database Schema](#database-schema)
8. [Gamification Engine](#gamification-engine)
9. [AI Systems](#ai-systems)
10. [Email & OTP System](#email--otp-system)
11. [File Uploads & Media](#file-uploads--media)
12. [Scheduled Jobs](#scheduled-jobs)
13. [Backend — File-by-File Reference](#backend--file-by-file-reference)
14. [Frontend — File-by-File Reference](#frontend--file-by-file-reference)
15. [Shared Code Reference](#shared-code-reference)
16. [Seed System](#seed-system)
17. [Configuration Files](#configuration-files)
18. [Adding New Features](#adding-new-features)
19. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Use nvm: `nvm install 20 && nvm use 20` |
| npm | 10+ | Comes with Node 20 |
| PostgreSQL | 14+ | Or a [Neon](https://neon.tech) serverless database (recommended) |

**Optional (only needed for specific features):**
- Firebase project — production auth + media storage
- OpenAI API key — AI features (CareerBot, feed suggestions, course AI tutor, personal tutor)
- SMTP credentials — Email OTP verification

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd uninexus

# 2. Install
npm install

# 3. Create environment file
cp .env.example .env   # or create .env manually (see below)

# 4. Provision database (creates all tables)
npm run db:push

# 5. Seed with demo data
npm run db:seed

# 6. Start
npm run dev
```

Open `http://localhost:5000`. The dev seed prints login credentials to the console.

---

## Environment Variables

Create a `.env` file in the project root. Only the first three are required for local development.

```env
# ── Required ──────────────────────────────────────────────────────────────────

# PostgreSQL connection string (Neon, Supabase, or local)
DATABASE_URL=postgresql://user:password@host:5432/uninexus

# Enables the dev auth bypass — no Firebase needed in development
DEV_AUTH_ENABLED=true

# Secret used to sign dev JWTs (any string works in development)
DEV_JWT_SECRET=change-me-to-anything

# ── Session (Recommended) ─────────────────────────────────────────────────────

# Express session secret — use a long random string in production
SESSION_SECRET=another-long-random-string

# ── AI Features (Optional) ────────────────────────────────────────────────────

# Required for: CareerBot, post suggestions, course AI tutor, personal tutor, content moderation
OPENAI_API_KEY=sk-...

# ── Firebase — Production Auth (Optional) ────────────────────────────────────
# Only needed when DEV_AUTH_ENABLED=false (i.e. production)
# Place serviceAccountKey.json at /etc/secrets/serviceAccountKey.json
# OR set these per-variable:
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=   # Also needed for cloud media uploads
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# ── Email / OTP (Optional) ────────────────────────────────────────────────────
# Required for email verification OTP delivery. Without this, OTPs only log to console.
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false              # true for port 465
SMTP_USER=you@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@uninexus.app
```

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite dev server on port 5000 |
| `npm run build` | TypeScript compile + Vite build → `dist/` |
| `npm start` | Run production build (`dist/index.js`) |
| `npm run db:push` | Sync Drizzle schema to the database (no data loss) |
| `npm run db:seed` | Seed database with demo users, posts, courses, etc. |
| `npm run db:studio` | Open Drizzle Studio at port 4983 (visual DB browser) |

> **Never edit `package.json` scripts without agreement.** Use the package manager tool to install dependencies.

---

## Architecture Overview

```
Browser
  └── Vite dev proxy (port 5000)
        ├── /api/* → Express API handlers
        │     ├── firebaseAuth.ts  (isAuthenticated middleware)
        │     ├── routes/*.ts      (feature route files)
        │     ├── storage.ts       (DB access via Drizzle)
        │     ├── services/*.ts    (business logic)
        │     └── pointsHelper.ts  (gamification scoring)
        └── /* → React SPA (Vite)
              ├── AuthContext.tsx   (auth state)
              ├── queryClient.ts    (TanStack Query + apiRequest)
              └── pages/*.tsx       (route components)
```

### Request Lifecycle (Frontend → Backend)

1. React component calls `useQuery` or `useMutation` with a path key.
2. `queryClient.ts` default fetcher builds the URL from the query key array and calls `fetch`.
3. Express receives the request, runs `isAuthenticated` middleware.
4. Route handler reads/writes via `storage.ts` (never queries DB directly outside storage or routes).
5. Response returned as JSON; TanStack Query caches and delivers to component.

---

## Authentication System

### Development Mode (`DEV_AUTH_ENABLED=true`)

Firebase is completely bypassed. The app uses its own JWTs:

- `POST /api/auth/dev-login` — accepts `{ email }`, looks up the user in the DB, issues a signed JWT
- All requests carry the JWT in `Authorization: Bearer <token>` header
- `isAuthenticated` middleware in `server/firebaseAuth.ts` verifies it with `DEV_JWT_SECRET`

```bash
# Get a dev token for any seeded user
curl -X POST http://localhost:5000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@university.ac.uk"}'
```

### Production Mode (`DEV_AUTH_ENABLED=false`)

1. Firebase SDK (client) handles login/register with email+password.
2. Firebase issues an ID token to the browser.
3. `Authorization: Bearer <firebase-id-token>` is sent with every API request.
4. `server/firebaseAuth.ts` calls `admin.auth().verifyIdToken()` on every request.
5. User lookup: `firebaseUid` → `email` → database record.

### Auth Middleware (`server/firebaseAuth.ts`)

```typescript
isAuthenticated   // Verifies token, attaches req.user (full user object from DB)
requireAuth       // Alias used in some routes
blockRestrictedRoles  // Prevents master_admin from posting
requireRole(...roles)  // Role whitelist check
```

### `setupAuth(app)` — called once on startup
- Configures `express-session` with PostgreSQL store
- Attaches Passport.js strategies
- Syncs Firebase `email_verified` status to DB on every authenticated request

---

## Database Schema

All tables are in `shared/schema/`. Changes are made by editing the TypeScript schema files and running `npm run db:push`.

> **Never write raw SQL migrations.** Drizzle Kit computes the diff and applies it safely.

### Schema Files

#### `shared/schema/users.ts`
- `users` — Core user table. Fields: `id` (varchar UUID), `email`, `firstName`, `lastName`, `username`, `role`, `university`, `universityId`, `major`, `majorId`, `profileImageUrl`, `bio`, `firebaseUid`, `engagementScore`, `streak`, `isActive`, `emailVerified`, `createdAt`
- `userProfiles` — Extended profile: headline, website, linkedin, github, location
- `educationRecords` — University/school history with degree, field, dates
- `jobExperience` — Work history with company, title, description, dates
- `userConnections` — Connection requests between users (status: pending/accepted/rejected)

#### `shared/schema/feed.ts`
- `posts` — Feed posts: `authorId`, `content`, `imageUrls[]`, `videoUrl`, `category`, `tags[]`, `isReel`, `reactionCounts`, view/share counts
- `comments` — Comments on posts: `postId`, `authorId`, `content`
- `reactions` — Emoji reactions: `postId`, `userId`, `type` (like/love/insightful/etc.)
- `postShares` — Tracking when posts are shared

#### `shared/schema/gamification.ts`
- `userStats` — `userId`, `engagementScore`, `problemSolverScore`, `endorsementScore`, `challengePoints`, `totalPoints`, `rankTier`, `streak`, `lastActivityDate`
- `badges` — Badge catalog: `name`, `description`, `icon`, `condition`, `category`
- `userBadges` — Which badges a user has earned and when
- `skills` — Skill catalog: `name`, `category`
- `userSkills` — User's claimed skills: `userId`, `skillId`, `proficiencyLevel`, `yearsOfExperience`
- `endorsements` — `endorserId`, `endorsedUserId`, `skillId`, `comment`

#### `shared/schema/academia.ts`
- `universities` — University records: `name`, `domain`, `country`, `type`, `isVerified`
- `majors` — Academic major records: `name`, `category`

#### `shared/schema/courses.ts`
- `courses` — Teacher-created courses: `instructorId`, `title`, `description`, `universityId`, `validationStatus` (pending/validated/rejected), `isPublic`
- `courseEnrollments` — Student enrollment: `courseId`, `userId`, `enrolledAt`
- `courseDiscussions` — Discussion threads per course: `courseId`, `authorId`, `title`, `content`, `upvoteCount`
- `discussionReplies` — Replies to discussions
- `discussionUpvotes` — Upvote tracking for discussions
- `courseMilestones` — Progress milestones per course
- `studentCourses` — Student-declared courses: `userId`, `courseName`, `courseCode`, `validationStatus`, `isEnrolled`, `validatedBy`, `courseId` (linked teacher course)

#### `shared/schema/groups.ts`
- `groups` — Community groups: `name`, `description`, `category`, `creatorId`, `memberCount`, `isPrivate`
- `groupMembers` — `groupId`, `userId`, `role` (admin/member), `joinedAt`
- `groupPosts` — Posts within groups: `groupId`, `authorId`, `content`, `imageUrls[]`

#### `shared/schema/messaging.ts`
- `conversations` — DM threads: `participant1Id`, `participant2Id`, `lastMessageAt`
- `messages` — Individual messages: `conversationId`, `senderId`, `content`, `isRead`

#### `shared/schema/notifications.ts`
- `notifications` — System notifications: `userId`, `type`, `title`, `message`, `isRead`, `relatedId`, `relatedType`
- `announcements` — University broadcast: `universityId`, `authorId`, `title`, `content`, `priority`

#### `shared/schema/certifications.ts`
- `certifications` — Teacher-issued certs: `issuerId`, `recipientId`, `title`, `description`, `skills[]`, `verificationHash`, `courseId`
- `recruiterFeedback` — Industry feedback: `recruiterId`, `studentId`, `rating` (1-5), `feedback`, `skills[]`, `hiringIntent`

#### `shared/schema/ai.ts`
- `teacherContent` — Uploaded course materials: `teacherId`, `courseId`, `title`, `contentType`, `fileUrl`, `isIndexed`
- `teacherContentChunks` — Chunked content with embeddings: `contentId`, `chunkIndex`, `content`, `embedding` (vector)
- `aiChatSessions` — Course AI tutor sessions: `courseId`, `studentId`, `title`
- `aiChatMessages` — Session messages: `sessionId`, `role` (user/assistant), `content`, `citations[]`
- `aiChatSessionUploads` — Files attached to AI sessions
- `aiInteractionEvents` — AI usage audit log
- `moderationActions` — Content moderation decisions
- `studentPersonalTutorSessions` — Personal tutor sessions: `userId`, `title`, `subject`
- `studentPersonalTutorMaterials` — Study materials: `userId`, `sessionId`, `filename`, `content`
- `studentPersonalTutorMessages` — Chat messages in personal tutor sessions

#### `shared/schema/auth.ts`
- `sessions` — Express session store (connect-pg-simple format)
- `emailOtps` — OTP records: `email`, `otpHash` (SHA-256), `expiresAt`, `attempts`, `isUsed`

---

## Gamification Engine

### `server/pointsHelper.ts` — `applyPointDelta(userId, delta)`

The single entry point for all score mutations. Never update `userStats` directly.

```typescript
await applyPointDelta(userId, {
  engagementDelta: 10,        // posting, reacting, commenting
  problemSolverDelta: 15,     // answering Q&A
  endorsementDelta: 5,        // giving/receiving endorsements
  challengeDelta: 25,         // joining/submitting challenges
});
```

What it does internally:
1. Fetches current `userStats` (creates if missing)
2. Fetches `industryFeedbackPoints` from `recruiterFeedback` table (rating × 20 each)
3. Fetches `certificationPoints` from `certifications` where issuerRole = teacher (150 pts each)
4. Applies deltas atomically
5. Recomputes `totalPoints` = all scores + badge bonuses + endorsement count × 25 + external points
6. Updates `rankTier` based on totalPoints threshold
7. Calls `badgeService.checkAndAwardBadges(userId)` to award any newly unlocked badges

### Rank Tier Thresholds

| Tier | Total Points |
|------|-------------|
| Bronze | 0 – 999 |
| Silver | 1,000 – 2,999 |
| Gold | 3,000 – 6,999 |
| Platinum | 7,000+ |

### Point Award Table

| Action | Delta Type | Points |
|--------|-----------|--------|
| Create a post | engagement | +10 |
| Comment on a post | engagement | +2 |
| Receive a reaction | engagement | +1 |
| Ask a Q&A question | problemSolver | +10 |
| Answer a Q&A question | problemSolver | +15 |
| Question upvoted | problemSolver | +2 |
| Answer upvoted | problemSolver | +5 |
| Answer accepted | problemSolver | +20 |
| Give an endorsement | endorsement | +5 |
| Receive an endorsement | endorsement | +10 |
| Join a challenge | challenge | +5 |
| Submit a challenge | challenge | +25 |
| Challenge ranking 1st | challenge | +500 |
| Challenge ranking 2nd | challenge | +300 |
| Challenge ranking 3rd | challenge | +200 |
| Top 10% | challenge | +150 |
| Top 25% | challenge | +100 |
| Participation | challenge | +50 |
| Per badge earned | total bonus | +50 |
| Per endorsement received | total bonus | +25 |
| Industry feedback rating | external | rating × 20 |
| Teacher-issued certificate | external | +150 |

### `server/streakHelper.ts` — `updateUserStreakForActivity(userId, activityType)`

Updates the streak counter. Only increments once per day (UTC). Resets if more than 1 day has passed since last activity.

### `server/streakConfig.ts`

Defines `ActivityType` enum and per-activity rules (which activities count for streak, minimum threshold, etc.).

### `server/services/badges.service.ts`

Called after every `applyPointDelta`. Checks conditions and inserts new `userBadges` records. Creates a notification for each new badge earned.

---

## AI Systems

### Course AI Tutor (RAG)

**Flow:**
1. Teacher uploads a document → `POST /api/teacher-content/upload`
2. Teacher indexes it → `POST /api/teacher-content/:id/index`
3. Server chunks text (800 tokens, 100 overlap), generates embeddings via `text-embedding-3-small`, stores in `teacher_content_chunks`
4. Student sends message → `POST /api/ai/course-chat`
5. Server embeds the query, finds top-k similar chunks via cosine similarity
6. Chunks injected as context into GPT-4o prompt
7. Response + citations returned to student

**Authorization:** Students must be enrolled in the course (`courseEnrollments` record) to access its AI tutor.

**Key files:** `server/routes/ai.ts` (lines 1–131), `server/routes/teacher-content.ts`

### CareerBot

- Conversational career guidance AI
- Maintains chat history in session for context
- Prompt includes user's profile data (role, university, skills, scores)
- `POST /api/careerbot/chat`

### Personal AI Tutor

- Student-private AI study assistant
- Student uploads their own study materials (any file type)
- Materials stored in `student_personal_tutor_materials`
- Separate session/message history per subject

### AI Post Suggestions

- `GET /api/ai/suggest-posts`
- Returns 3 post ideas based on user's role, university, and recent activity
- One-shot GPT-4o call, no persistence

### Content Moderation

- `POST /api/ai/moderate-content`
- Called before creating a post
- Returns `{ allowed: boolean, reason?: string }`

---

## Email & OTP System

### `server/otpService.ts`

```
OTP flow:
  Register → generateOtp() → hashOtp() → store in emailOtps → sendOtpEmail()
  Verify  → hashOtp(submitted) → compare with stored hash → mark isUsed
```

Constants:
- `OTP_LENGTH = 6` digits
- `OTP_EXPIRY_MINUTES = 10`
- `MAX_ATTEMPTS = 5` per OTP
- `RATE_LIMIT_MAX_REQUESTS = 3` requests per `RATE_LIMIT_WINDOW_MINUTES = 60`

### `server/emailService.ts`

Thin Nodemailer wrapper. Falls back gracefully (logs OTP to console) if `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are not set.

```typescript
await sendOtpEmail(email, otp);           // Registration OTP
await sendPasswordResetEmail(email, url); // Password reset link
```

---

## File Uploads & Media

### `server/cloudStorage.ts`

Attempts Firebase Cloud Storage. Falls back to local `uploads/` directory if `VITE_FIREBASE_STORAGE_BUCKET` is not set or Firebase Admin is not initialized.

```typescript
uploadFile(buffer, options: UploadOptions): Promise<UploadResult>
uploadMultipleFiles(buffers, options): Promise<UploadResult[]>
deleteFile(url): Promise<void>
```

**Supported types and size limits:**

| Type | Formats | Max Size |
|------|---------|---------|
| Images | JPEG, PNG, GIF, WebP | 10 MB |
| Videos | MP4, WebM, MOV, MKV | 100 MB |
| Documents | PDF, DOC, DOCX, TXT, PPT, PPTX | 50 MB |

**Upload endpoints:**
- `POST /api/upload/image` — single image (via `server/routes/users.ts`)
- `POST /api/upload/images` — up to 5 images (via `server/routes/shared.ts`)
- `POST /api/upload/video` — single video (via `server/routes/shared.ts`)
- `POST /api/teacher-content/upload` — documents (teacher only)

Local uploads are served at `/uploads/*` as static files.

---

## Scheduled Jobs

### `server/cron.ts`

Two jobs initialized once at startup via `initializeScheduledJobs()`:

| Schedule | Job | File |
|----------|-----|------|
| Daily 00:00 UTC | Reset streaks for users inactive > 1 day | `streakHelper.ts → resetInactiveStreaks()` |
| Daily 02:00 UTC | Delete unverified accounts older than 7 days | `unverifiedUserCleanup.ts → cleanupUnverifiedUsers()` |

### `server/unverifiedUserCleanup.ts`

- Users in the 5–7 day window: logged as warning (hook up email here to send reminders)
- After 7 days: deleted from Firebase Auth first, then from PostgreSQL
- Dev accounts (firebaseUid prefix `dev_user_`) are excluded from cleanup

---

## Backend — File-by-File Reference

### `server/index.ts`
Entry point. Sets up:
- `dotenv/config` (loads `.env`)
- `express.json()` with raw body capture (for signature verification)
- `express.urlencoded()`
- Request logging middleware (logs method, path, status, response time)
- Calls `registerRoutes(app)` → returns HTTP server
- Calls `initializeScheduledJobs()` (cron)
- Dev: Vite middleware via `setupVite()`
- Prod: static file serving via `serveStatic()`
- Listens on `PORT` (default 5000)

### `server/routes.ts`
Root router. Responsibilities:
- Calls `setupAuth(app)` (session + passport)
- Calls `initializeCloudStorage()` (Firebase or local)
- Creates `uploads/images`, `uploads/videos`, `uploads/documents` directories
- Serves `uploads/` as static at `/uploads`
- Mounts all feature routers under `/api`

### `server/db.ts`
Creates the Drizzle database instance:
```typescript
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```
Imported everywhere database access is needed.

### `server/storage.ts`
The `IStorage` interface defines every database operation the app performs. `DatabaseStorage` implements it using Drizzle. All route handlers call `storage.*` methods — they never query the DB directly.

**Pattern for adding a new operation:**
1. Add method signature to `IStorage`
2. Implement in `DatabaseStorage`
3. Call from route handler

### `server/firebaseAuth.ts`
- Initializes Firebase Admin SDK (from `serviceAccountKey.json` or env vars)
- `setupAuth(app)` — configures express-session + Passport
- `isAuthenticated` — verifies Firebase ID token or dev JWT, attaches `req.user`
- `requireAuth` — same as isAuthenticated (alias)
- `blockRestrictedRoles` — blocks master_admin from posting
- `requireRole(...roles)` — role whitelist middleware factory

### `server/routes/auth.ts`
Handles everything authentication-related:
- `POST /dev-login` — dev-only JWT issuance
- `POST /register` — validate email domain → create user → send OTP
- `POST /verify-otp` — hash-compare OTP, mark verified, sync Firebase
- `POST /resend-otp` — rate-limited OTP resend
- `GET /user` — return current user's full profile
- `POST /logout` — clear session
- `POST /change-password` — Firebase password update
- `POST /2fa/enable` — 2FA setup stub
- `POST /resend-verification` — resend Firebase email verification
- `POST /dev/trigger-cleanup` — manually trigger unverified user cleanup (dev only)

### `server/routes/feed.ts`
- `GET /posts` — filterable by `userId`, `category`, `limit`, `offset`
- `GET /feed/personalized` — AI-ranked feed: fetches recent posts, scores them with GPT-4o based on user profile, returns sorted
- `GET /feed/following` — posts from users the current user follows
- `GET /feed/trending` — posts ranked by reaction count + comment count
- `POST /posts` — create post, trigger streak update, award engagement points
- `PATCH /posts/:id` — edit own post
- `DELETE /posts/:id` — delete own post (or admin)
- `POST /comments` — add comment, award points
- `DELETE /comments/:id` — delete comment
- `POST /reactions` — toggle reaction, update reactionCounts JSON on post
- `DELETE /reactions/:postId/:type` — remove reaction

### `server/routes/users.ts`
- User search, profile updates, preferences, image uploads
- Role-specific lists: `GET /teachers`, `GET /students`, `GET /university/teachers`
- `DELETE /users/me` — account deletion (Firebase + DB cascade)

### `server/routes/skills.ts`
- Badge retrieval, skill CRUD, endorsement give/view

### `server/routes/certifications.ts`
- `POST /certifications` — issue cert, generate SHA-256 verification hash, award student 150 pts, create notification
- `GET /certifications/verify/:hash` — public endpoint (no auth), returns cert details

### `server/routes/courses.ts`
Universities, majors, courses, enrollment, validation workflow:
- Course validation workflow: Teacher creates → requests uni validation → uni approves → teacher uploads materials
- Student course workflow: Student declares course → teacher validates → student auto-enrolled

### `server/routes/challenges.ts`
- Challenge CRUD (industry creates, anyone views)
- Join: check not already joined, award +5 pts, notify organizer
- Submit: check joined, not already submitted, award +25 pts
- Award rank points: `POST /challenges/:participantId/award-rank-points` (industry/admin only)
- Milestone tracking per user

### `server/routes/groups.ts`
- Group CRUD with creator as admin
- Join/leave with member count updates
- Group posts with comment/reaction support

### `server/routes/connections.ts`
Full social graph:
- Connection requests (pending/accepted/rejected)
- Follow/unfollow (asymmetric)
- Friend recommendations based on mutual connections + university
- University discovery endpoint

### `server/routes/messaging.ts`
- Conversations between pairs of users (auto-created on first message)
- Message pagination
- Mark-as-read updates `unreadCount` on conversation

### `server/routes/notifications.ts`
- CRUD for notification feed
- Mark individual or all as read
- Group notification unread count

### `server/routes/admin.ts`
- `GET /admin/users` — all users with joined stats (master admin)
- `DELETE /admin/users/:id` — delete any user
- Announcements (create, list)
- University retention analytics (at-risk detection)
- University leaderboard
- Ethics metrics
- Transparency report data

### `server/routes/recruiter.ts`
- Submit feedback: creates `recruiterFeedback` record, awards student points (rating × 20), notifies student
- View feedback for a student
- Aggregated insights (average rating, hiring intent distribution)

### `server/routes/teacher-content.ts`
- File upload via multer → cloud/local storage
- Content indexing: extracts text from PDF/DOC/DOCX/TXT, chunks, embeds with OpenAI, stores in `teacherContentChunks`
- CRUD for teacher content records (gated to course owner)

### `server/routes/ai.ts`
All AI endpoints. Requires `OPENAI_API_KEY`.
- CareerBot: stateless per-request GPT-4o call with user context injected in system prompt
- Post suggestions: GPT-4o generates 3 ideas based on user profile
- Content moderation: GPT-4o policy check
- Course AI tutor: embedding similarity search → GPT-4o with retrieved chunks as context
- Personal tutor: private per-user AI with uploaded study materials

### `server/routes/qa.ts`
Q&A forum:
- Questions list with filter by `status` (open/resolved)
- Full question detail with answers and upvote status
- Post question (+10 pts), answer (+15 pts), upvote (+2 or +5 pts), resolve/accept answer (+20 pts to answerer)

### `server/routes/shared.ts`
Video + multi-image upload endpoints (shared across post creation flows).

### `server/services/badges.service.ts`
Called by `pointsHelper.ts` after every score update. Checks milestone conditions (e.g. "reach Gold tier", "earn 5 endorsements") and inserts `userBadges` records. Creates a notification for each new badge.

### `server/services/courses.service.ts`
Encapsulates course enrollment state transitions and validation logic.

### `server/services/discussions.service.ts`
Course discussion creation and reply business rules.

### `server/services/notifications.service.ts`
`createNotification(userId, type, title, message, relatedId?, relatedType?)` — used throughout routes to create typed notifications.

### `server/pointsHelper.ts`
`applyPointDelta(userId, delta)` — the only correct way to award or deduct gamification points. Handles stats creation, external point computation, total recalculation, tier update, and badge check atomically.

### `server/streakHelper.ts`
`updateUserStreakForActivity(userId, activityType)` — increments streak at most once per UTC day. Resets streak if last activity was more than 1 day ago.
`resetInactiveStreaks()` — called by cron to zero out streaks for users who missed a day.

### `server/streakConfig.ts`
`ActivityType` enum (POST, COMMENT, REACT, Q&A, etc.) and per-type configuration for whether the activity counts toward streak.

### `server/otpService.ts`
`generateAndStoreOtp(email)` → `{ otp, id }` — generates 6-digit OTP, hashes with SHA-256, stores in DB.
`verifyOtp(email, submitted)` → `boolean` — hash-compares, checks expiry and attempt limit.
`incrementOtpAttempts(id)` — tracks failed attempts.

### `server/emailService.ts`
`sendOtpEmail(email, otp)` — sends the 6-digit code.
`sendPasswordResetEmail(email, resetUrl)` — sends reset link.
Gracefully no-ops (logs to console) if SMTP env vars are missing.

### `server/cloudStorage.ts`
`initializeCloudStorage()` — tries Firebase, sets `isInitialized`.
`uploadFile(buffer, opts)` → `UploadResult` — uses Firebase if available, local `uploads/` otherwise.
`deleteFile(url)` — removes from Firebase or local filesystem.

### `server/cron.ts`
`initializeScheduledJobs()` — registers two node-cron tasks. Called once from `server/index.ts`.

### `server/unverifiedUserCleanup.ts`
`cleanupUnverifiedUsers()` → `{ warned, deleted, skipped, errors }` — runs through unverified accounts by age and takes appropriate action.

### `server/vite.ts`
- Dev: sets up Vite as Express middleware (HMR, fast refresh)
- Prod: serves `dist/public` as static, SPA fallback to `index.html`

---

## Frontend — File-by-File Reference

### `client/src/App.tsx`
Root component. Sets up:
- `QueryClientProvider` (TanStack Query)
- `AuthProvider` (auth state)
- `TooltipProvider`
- `Toaster`
- `Router` (Wouter `<Switch>`)
- All route definitions with `<RoleGuard>` wrappers
- `CareerBot` floating widget (rendered globally for authenticated users)

### `client/src/lib/AuthContext.tsx`
Global auth state. Provides:
```typescript
userData: User | null       // current user from DB
signOut()                   // Firebase signOut + localStorage clear
refreshUserData()           // re-fetch /api/auth/user
isLoading: boolean
```
On mount: reads stored JWT/token, calls `/api/auth/user` to hydrate `userData`.

### `client/src/lib/queryClient.ts`
```typescript
apiRequest(method, url, body?)  // fetch wrapper with auth headers + JSON parsing
queryClient                     // TanStack Query client instance
```
Default query function: builds URL from queryKey array segments, calls `fetch` with auth header.

### `client/src/lib/firebase.ts`
Initializes Firebase SDK with env vars (`VITE_FIREBASE_*`). Exports `auth` instance. Only used client-side for production Firebase auth flows.

### `client/src/lib/navigation-config.ts`
`navigationConfig` — record of role → `MenuItem[]`. Used by both `Navbar` and `MobileNavigation` to stay in sync. Add/remove nav items here.

### `client/src/lib/utils.ts`
`cn(...classes)` — Tailwind class merge utility (clsx + tailwind-merge).

### `client/src/hooks/useAuth.ts`
Re-export shim: `export { useAuth } from "@/lib/AuthContext"`. Exists for legacy import compatibility.

### `client/src/hooks/useDebounce.ts`
`useDebounce(value, delay)` — returns debounced value. Used in search inputs.

### `client/src/hooks/use-mobile.ts`
`useIsMobile()` — returns `true` if viewport width < 768px (md breakpoint).

### `client/src/hooks/use-toast.ts`
Shadcn toast hook. Usage: `const { toast } = useToast(); toast({ title, description, variant })`.

### Pages

| Page | Path | Role Access | Description |
|------|------|-------------|-------------|
| `Landing.tsx` | `/` `/login` | Public | Hero section, auth modal trigger |
| `ForgotPassword.tsx` | `/forgot-password` | Public | Request password reset |
| `ResetPassword.tsx` | `/reset-password` | Public | Submit new password |
| `VerifyEmail.tsx` | `/verify-email` | Public | Enter 6-digit OTP after register |
| `StudentHome.tsx` | `/student-feed` | Student | AI-curated feed + sidebar (desktop) |
| `MobileHome.tsx` | `/student-feed` | Student | Same feed, mobile-optimized layout |
| `TeacherDashboard.tsx` | `/teacher-dashboard` | Teacher | Course mgmt + student performance hub |
| `UniversityDashboard.tsx` | `/university-dashboard` | University Admin | Analytics, announcements, teacher management |
| `IndustryDashboard.tsx` | `/industry-dashboard` | Industry | Talent discovery, challenge hosting |
| `MasterAdminDashboard.tsx` | `/admin-dashboard` | Master Admin | Platform-wide controls + analytics |
| `Profile.tsx` | `/profile` `/profile/:userId` | Any | User profile (own or others') |
| `Settings.tsx` | `/settings` | Any | Account, security, privacy settings |
| `Notifications.tsx` | `/notifications` | Any | Notification feed |
| `Messages.tsx` | `/messages` | Any | DM inbox + thread view |
| `Network.tsx` | `/network` | Any | Connections, followers, requests |
| `Discovery.tsx` | `/discovery` | Any | Discover people by role/university |
| `Leaderboard.tsx` | `/leaderboard` | Any | Global gamification rankings |
| `UniversityLeaderboard.tsx` | `/university-leaderboard` | Any | University-scoped rankings |
| `Courses.tsx` | `/courses` | Student | Enrolled courses with AI tutor access |
| `CourseDetail.tsx` | `/courses/:id` | Student | Course discussions + AI tutor dialog |
| `DiscussionDetail.tsx` | `/courses/:id/discussions/:did` | Student | Single discussion thread |
| `Challenges.tsx` | `/challenges` | Any | Browse, join, submit challenges |
| `GlobalChallengeMap.tsx` | `/challenge-map` | Any | World map of active challenges |
| `ProblemSolving.tsx` | `/problem-solving` | Any | Community Q&A forum |
| `PersonalTutorPage.tsx` | `/personal-tutor` | Student | Private AI study assistant |
| `CareerBotPage.tsx` | `/careerbot` | Any | Full-page CareerBot chat |
| `GroupsDiscovery.tsx` | `/groups` | Any | Browse and join groups |
| `GroupPage.tsx` | `/groups/:id` | Any | Group feed + members |
| `MyTeachers.tsx` | `/my-teachers` | Student | Teachers from same institution |
| `MyStudents.tsx` | `/my-students` | Teacher | Students enrolled/validated by teacher |
| `UniversityTeachers.tsx` | `/university-teachers` | University Admin | Institution teachers list |
| `EthicsDashboard.tsx` | `/ethics-dashboard` | Admin | AI ethics and bias metrics |
| `TransparencyReport.tsx` | `/transparency` | Admin | Platform transparency stats |
| `VerifyCertificate.tsx` | `/verify/:hash` | Public | Verify certificate by hash |
| `not-found.tsx` | `*` | Any | 404 fallback |

### Key Components

#### `Navbar.tsx`
- Polls `/api/notifications` every 5 seconds for live unread badge
- Fetches conversations for unread message count
- Fetches pending connections count
- Role-aware nav items
- Hidden on mobile (MobileNavigation takes over)

#### `MobileNavigation.tsx`
- Bottom tab bar for mobile users
- Uses same `navigationConfig` as Navbar
- Role-aware: shows different tabs per role

#### `RoleGuard.tsx`
```tsx
<RoleGuard allowedRoles={["student", "teacher"]}>
  <SomePage />
</RoleGuard>
```
Redirects to home if current user's role is not in `allowedRoles`.

#### `ErrorBoundary.tsx`
Wraps route-level components. Catches React render errors and shows a fallback UI instead of a white screen.

#### `PostCard.tsx` / `post-card/`
Full post card with all interactions:
- `usePostCard.ts` — mutation hooks for react, comment, delete, share
- `PostHeader.tsx` — author avatar, name, timestamp, edit/delete menu
- `PostContent.tsx` — text with URL linkification, image grid, video player, `ImageViewer` lightbox
- `ReactionBar.tsx` — emoji row with live counts, comment toggle
- `CommentsSection.tsx` — lazy-loaded comment thread with inline input
- `DeleteDialogs.tsx` — confirm dialogs for post and comment deletion

#### `profile/`
- `useProfile.ts` — data fetching for profile pages (user, badges, skills, endorsements, certs, posts)
- `ProfileHeader.tsx` — avatar, name, role chip, follow/connect buttons, stats row
- `EditProfileModal.tsx` — form for bio, headline, social links, avatar upload
- `AchievementsSection.tsx` — badge grid + `AchievementTimeline`
- `ExtendedProfileSections.tsx` — skills, certifications, education, job experience cards
- `FollowersFollowingList.tsx` — paginated list in a sheet modal

#### `teacher-dashboard/`
- `useTeacherDashboard.ts` — aggregates data from multiple queries (students, stats, courses)
- `StatsGrid.tsx` — KPI row: total students, avg engagement, courses, certifications issued
- `StudentCard.tsx` — student row with endorse / issue cert / career insights actions
- `TopPerformers.tsx` — top 5 students by engagement
- `EngagementDistribution.tsx` — bar chart of rank tier distribution
- `CertificateModal.tsx` — issue certificate form (title, description, skills)
- `EndorseModal.tsx` — endorse student's skill form
- `CareerInsightsModal.tsx` — AI career recommendations for a student

#### `industry/`
- `useIndustryDashboard.ts` — data for talent, challenges, feedback
- `TalentCard.tsx` — student profile card with feedback action
- `FeedbackModal.tsx` — submit rating + written feedback
- `ChallengeManageCard.tsx` — manage challenge status, award winners
- `RankingModal.tsx` — select participant rankings for point awards

#### `groups/`
- `useGroupsDiscovery.ts` — groups list + join/leave mutations
- `GroupCard.tsx` — group preview with member count and category badge
- `CreateGroupModal.tsx` / `EditGroupModal.tsx` — group form dialogs

#### `CareerBot.tsx`
Floating chat widget (bottom-right corner). Sends messages to `/api/careerbot/chat`. Maintains local chat history in state.

#### `StudentAITutor.tsx`
Dialog component opened from `CourseDetail.tsx`. Sends course-specific questions to `/api/ai/course-chat`. Displays citations from matched content chunks.

#### `RankTierBadge.tsx`
Visual badge component displaying tier name and color (Bronze/Silver/Gold/Platinum). Used in profiles and welcome cards.

#### `SuggestedPosts.tsx`
Calls `/api/ai/suggest-posts` to show 3 AI-generated post ideas. Clicking one pre-fills the `CreatePostModal`.

#### `TrendingWidget.tsx`
Shows top trending posts from `/api/feed/trending`. Sidebar widget in StudentHome.

#### `AuthModal.tsx`
Login/register dialog with tab switching. Used on the Landing page.

#### `CVExportButton.tsx`
Triggers CV generation and download. Builds a formatted document from the user's profile data.

#### `CertificateViewer.tsx`
PDF-style certificate display with verify link and download option.

---

## Shared Code Reference

### `shared/schema/index.ts`
Re-exports everything from all sub-schema files. Import from `@shared/schema` everywhere.

### `shared/schema.ts`
Top-level re-export barrel. Exists for backwards compatibility with older imports.

### `shared/emailValidation.ts`
- `BLOCKED_DOMAINS` — set of 50+ personal email providers (Gmail, Yahoo, Hotmail, etc.)
- `validateInstitutionalEmail(email, role)` → `{ status, message, detectedUniversity? }`
  - status: `'blocked'` | `'approved'` | `'unknown'`
  - Industry professionals: any non-personal domain is approved
  - `.ac.uk` domains: auto-approved for all academic roles
- Used both client-side (real-time feedback on Register page) and server-side (enforced on `/api/auth/register`)

### `shared/universities.ts`
`getUniversityByEmail(email)` — matches email domain to university record. Covers ~100 institutions (UK Russell Group, post-92, US, Canada, Australia, Europe, Asia). Returns `{ name, domain, country }` or `null`.

---

## Seed System

### `server/seed/index.ts`
Entry point. Runs `Comprehensive-seed.ts` then `Supplemental-seed.ts`. Checks `FORCE_RESEED` config flag to avoid double-seeding.

### `server/seed/Comprehensive-seed.ts`
Creates the full data set:
1. Universities and majors
2. Users for all 5 roles (one of each at minimum, more students)
3. Posts with varied categories and media
4. Courses with different validation states
5. Teacher content (materials)
6. Challenges
7. Groups with memberships
8. Connections and follows
9. Badges and badge awards
10. Gamification stats

### `server/seed/Supplemental-seed.ts`
Adds realistic conversation and messaging data, extra social interactions.

### `server/seed/data/users.ts`
Demo user definitions. Each user has a role, email, and institutional email domain.

---

## Configuration Files

### `drizzle.config.ts`
```typescript
{
  schema: "./shared/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL }
}
```
Used by `drizzle-kit push` and `drizzle-kit studio`.

### `vite.config.ts`
- `@` alias → `client/src/`
- `@assets` alias → `client/public/assets/` and `attached_assets/`
- `@shared` alias → `shared/`
- `server.allowedHosts: true` — required for Replit proxy
- No custom proxy — Express serves both API and frontend on same port

### `tailwind.config.ts`
- `darkMode: ["class"]` — dark mode via `.dark` class on `html`
- Content paths include `client/src/**` and `components/**`
- Extended theme: custom `font-heading` family (Poppins), animation utilities

### `tsconfig.json`
- `moduleResolution: "bundler"` (Vite-compatible)
- Path aliases matching `vite.config.ts`: `@/*`, `@shared/*`, `@assets/*`
- `"target": "ES2020"`, `"module": "ESNext"`

### `client/index.html`
Vite entry point. Loads `src/main.tsx`. Meta tags for SEO and Open Graph.

---

## Adding New Features

### New API Route

1. **Create or edit** `server/routes/<feature>.ts`
2. **Add to storage**: add method to `IStorage` interface + `DatabaseStorage` in `server/storage.ts`
3. **Register router** in `server/routes.ts` with `app.use("/api", featureRouter)`
4. **Export** from `server/routes/index.ts`

### New Page

1. Create `client/src/pages/NewPage.tsx`
2. Import and add `<Route path="/new-page" component={NewPage} />` in `client/src/App.tsx`
3. Optionally wrap with `<RoleGuard allowedRoles={[...]}>` for role restriction
4. Add to `navigationConfig` in `client/src/lib/navigation-config.ts` if it should appear in the nav

### New Database Table

1. Add table definition to the appropriate `shared/schema/*.ts` file
2. Export from `shared/schema/index.ts`
3. Run `npm run db:push` to apply changes
4. Add CRUD methods to `IStorage` + implement in `DatabaseStorage`
5. Never write raw SQL; never alter primary key types

### New Gamification Action

1. Call `applyPointDelta(userId, { engagementDelta: N })` in the route handler
2. Add the action to the points table in this file's documentation
3. If it should trigger a streak, call `updateUserStreakForActivity(userId, ActivityType.ACTION)` and add the type to `server/streakConfig.ts`

### New Badge

1. Insert a record into the `badges` table (via seed or admin API)
2. Add condition logic to `server/services/badges.service.ts` in `checkAndAwardBadges()`

### New Notification Type

1. Add a `type` string to the notification type set
2. Call `notificationService.createNotification(userId, type, title, message)` from the relevant route
3. Update `Notifications.tsx` if the new type needs a custom icon or action

---

## Troubleshooting

**`DATABASE_URL` error on startup**
Set `DATABASE_URL` in `.env`. The app will throw immediately if it's missing.

**Firebase Admin SDK not configured**
Normal in development. Set `DEV_AUTH_ENABLED=true` to bypass Firebase entirely.

**`VITE_FIREBASE_STORAGE_BUCKET not configured`**
Media uploads fall back to `uploads/` directory. Fine for local dev.

**Login returns 401 in development**
Make sure `DEV_AUTH_ENABLED=true` and `DEV_JWT_SECRET` are both set in `.env`, then restart.

**Schema out of sync after pulling new code**
Run `npm run db:push` to apply new table definitions.

**AI features not working**
Set `OPENAI_API_KEY` in `.env`. Without it, AI endpoints return errors.

**OTPs not arriving by email**
Expected without SMTP config. The OTP is printed to the server console — use it directly.

**Vite HMR stops working**
Hard-refresh (`Ctrl+Shift+R`). If it persists, restart the dev server.

**Port 5000 already in use**
`lsof -ti:5000 | xargs kill -9` then restart.

**`db:push` fails with type errors**
This usually means a column type was changed in a way Drizzle can't safely migrate. Check for any changes to primary key types (`serial` ↔ `varchar`). Revert those changes — never change primary key types on existing tables.
