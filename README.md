# UniNexus

A production-ready, multi-role university social platform connecting students, teachers, universities, and industry professionals through AI-powered networking, gamification, and collaborative learning.

---

## Overview

UniNexus is a full-stack social learning ecosystem for the Gen Z demographic. It supports five distinct user roles, each with a tailored dashboard and restricted feature access:

| Role | Key Capabilities |
|------|-----------------|
| **Student** | AI-curated social feed, gamified profile, challenge participation, Q&A forum, course enrollment, AI personal tutor, CareerBot |
| **Teacher** | Course creation + management, student validation, content upload, AI course tutor management, certification issuance, student performance insights |
| **University Admin** | Announcements, teacher management, course approval workflow, retention analytics, institution leaderboard |
| **Industry Professional** | Student talent discovery, recruiter feedback submission, challenge hosting, networking |
| **Master Admin** | Platform-wide user management, content moderation, engagement analytics, ethics dashboard, transparency reporting |

---

## Core Features

### Social & Community
- **Personalized AI Feed** — GPT-powered post curation with category filtering (Academic, Social, Projects, Achievements, Reels)
- **Following Feed** — Posts from users you follow
- **Trending Feed** — Engagement-ranked trending content
- **Post Reactions** — Multiple emoji reaction types with live counts
- **Comments** — Threaded comments on posts
- **Groups** — Create/join topic-based communities with group posts
- **Direct Messaging** — One-to-one conversations with unread tracking
- **Network** — Connection requests, follower/following relationships, mutual friends discovery

### Gamification
- **Rank Tiers** — Bronze → Silver → Gold → Platinum based on total points
- **Engagement Score** — Points for posting, reacting, commenting
- **Problem-Solver Score** — Points for Q&A participation
- **Challenge Points** — Points for joining (+5), submitting (+25), and winning challenges
- **Endorsement Score** — Points for endorsements given/received
- **Badges** — Earned automatically based on milestones
- **Streaks** — Daily activity tracking with streak reset on inactivity
- **Leaderboard** — Global and university-scoped rankings

### AI Features
- **AI Post Suggestions** — GPT-4o generates 3 post ideas based on user context
- **CareerBot** — Conversational AI career advisor with persistent chat history
- **Course AI Tutor** — RAG-based chatbot answering questions using only teacher-uploaded materials (per-course, per-student)
- **Personal AI Tutor** — Student's private AI study assistant with uploaded materials
- **Content Moderation** — AI-powered post screening before publish

### Learning
- **Courses** — Teacher-created courses with university validation workflow
- **Course Materials** — Teacher uploads documents/PDFs indexed for AI search
- **Student Enrollment** — Teacher validation triggers automatic enrollment
- **Course Discussions** — Per-course discussion boards with replies and upvotes
- **Q&A Forum** — Platform-wide problem-solving forum with accepted answers
- **Certifications** — Teacher-issued digital certificates with public verify link

### Professional
- **Recruiter Feedback** — Industry professionals rate and comment on student profiles
- **Skills & Endorsements** — Add skills, get endorsed by connections
- **CV Export** — Download profile as a structured CV
- **Challenge Map** — Global view of active challenges

### Administration
- **Announcements** — University admins broadcast to their institution
- **Retention Analytics** — At-risk student detection and career pathway tracking
- **Ethics Dashboard** — AI fairness and bias monitoring
- **Transparency Report** — Platform usage and moderation statistics

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Routing** | Wouter |
| **Server State** | TanStack Query v5 |
| **Forms** | React Hook Form + Zod |
| **UI Components** | Shadcn/UI + Radix UI primitives |
| **Styling** | Tailwind CSS v3 |
| **Animations** | Framer Motion |
| **Backend Framework** | Express.js + Node.js |
| **Language** | TypeScript (ESM, `tsx` for dev, `esbuild` for prod) |
| **Database** | PostgreSQL (Neon Serverless recommended) |
| **ORM** | Drizzle ORM + Drizzle Kit |
| **Auth (Production)** | Firebase Authentication + Firebase Admin SDK |
| **Auth (Development)** | JWT bypass (no Firebase required) |
| **AI** | OpenAI GPT-4o + `text-embedding-3-small` (RAG) |
| **Media Storage** | Firebase Cloud Storage (with local `uploads/` fallback) |
| **Email / OTP** | Nodemailer (SMTP) |
| **Scheduled Jobs** | node-cron |
| **Icons** | Lucide React + React Icons |

---

## Project Structure

```
uninexus/
│
├── client/                          # React frontend
│   ├── index.html                   # Vite HTML entry point
│   ├── public/
│   │   ├── logo.png                 # App logo (navbar, favicon)
│   │   ├── favicon.ico / favicon.png
│   │   └── assets/
│   │       ├── logo.png             # Landing hero logo
│   │       └── diverse_college_study.jpg  # Landing page hero image
│   └── src/
│       ├── App.tsx                  # Root component, all route definitions
│       ├── main.tsx                 # React DOM entry
│       ├── index.css                # Tailwind base + CSS custom properties (HSL theme vars)
│       │
│       ├── lib/
│       │   ├── AuthContext.tsx      # Auth state, login/logout, refreshUserData
│       │   ├── firebase.ts          # Firebase SDK client initialization
│       │   ├── queryClient.ts       # TanStack Query client + apiRequest helper
│       │   ├── navigation-config.ts # Role-based sidebar/mobile nav menu items
│       │   └── utils.ts             # cn() class merge utility
│       │
│       ├── hooks/
│       │   ├── useAuth.ts           # Re-export shim → AuthContext (legacy compat)
│       │   ├── useDebounce.ts       # Debounce hook for search inputs
│       │   ├── use-mobile.ts        # Breakpoint hook (returns true if mobile)
│       │   └── use-toast.ts         # Shadcn toast hook
│       │
│       ├── pages/                   # Route-level page components
│       │   ├── Landing.tsx          # Public homepage with login/register
│       │   ├── ForgotPassword.tsx   # Request password reset email
│       │   ├── ResetPassword.tsx    # Submit new password with token
│       │   ├── VerifyEmail.tsx      # OTP entry after registration
│       │   │
│       │   ├── StudentHome.tsx      # Student feed (desktop, 8+4 grid)
│       │   ├── MobileHome.tsx       # Student feed (mobile-only layout)
│       │   ├── TeacherDashboard.tsx # Teacher course/student management hub
│       │   ├── UniversityDashboard.tsx # University analytics + announcements
│       │   ├── IndustryDashboard.tsx # Talent discovery + challenge hosting
│       │   ├── MasterAdminDashboard.tsx # Platform-wide admin controls
│       │   │
│       │   ├── Profile.tsx          # User profile (own or others')
│       │   ├── Settings.tsx         # Account, security, privacy, preferences
│       │   ├── Notifications.tsx    # Notification feed with mark-as-read
│       │   ├── Messages.tsx         # DM inbox + conversation thread
│       │   │
│       │   ├── Network.tsx          # Connections, followers, mutual friends
│       │   ├── Discovery.tsx        # Discover people by role, university
│       │   ├── Leaderboard.tsx      # Global gamification rankings
│       │   ├── UniversityLeaderboard.tsx # Rankings scoped to same university
│       │   │
│       │   ├── Courses.tsx          # Student enrolled courses list
│       │   ├── CourseDetail.tsx     # Course page with discussions + AI tutor
│       │   ├── DiscussionDetail.tsx # Single course discussion thread
│       │   │
│       │   ├── Challenges.tsx       # Browse, join, submit challenge solutions
│       │   ├── GlobalChallengeMap.tsx # World map of challenge locations
│       │   ├── ProblemSolving.tsx   # Community Q&A forum
│       │   │
│       │   ├── PersonalTutorPage.tsx # Student's private AI study assistant
│       │   ├── CareerBotPage.tsx    # Dedicated CareerBot chat page
│       │   │
│       │   ├── GroupsDiscovery.tsx  # Browse and join groups
│       │   ├── GroupPage.tsx        # Single group feed + member list
│       │   │
│       │   ├── MyTeachers.tsx       # Students: view teachers from their institution
│       │   ├── MyStudents.tsx       # Teachers: view enrolled/validated students
│       │   ├── UniversityTeachers.tsx # University admins: view institution teachers
│       │   │
│       │   ├── EthicsDashboard.tsx  # AI ethics and bias metrics
│       │   ├── TransparencyReport.tsx # Platform transparency statistics
│       │   ├── VerifyCertificate.tsx # Public certificate verification by hash
│       │   └── not-found.tsx        # 404 page
│       │
│       └── components/              # Shared UI components
│           ├── Navbar.tsx           # Top navigation bar with notifications + DMs
│           ├── MobileNavigation.tsx # Bottom tab bar for mobile
│           ├── RoleGuard.tsx        # Route-level role-based access wrapper
│           ├── ErrorBoundary.tsx    # React error boundary with fallback UI
│           ├── PostCard.tsx         # Top-level post card export
│           ├── PostDetailDialog.tsx # Expanded post view dialog
│           ├── CreatePostModal.tsx  # New post creation dialog
│           ├── CareerBot.tsx        # Floating CareerBot chat widget
│           ├── Autocomplete.tsx     # Searchable dropdown input
│           ├── ImageViewer.tsx      # Lightbox for post images
│           ├── GradientButton.tsx   # Styled gradient CTA button
│           ├── RankTierBadge.tsx    # Visual rank tier display (Bronze/Gold/etc.)
│           ├── BadgeIcon.tsx        # Renders gamification badge icons
│           ├── SuggestedPosts.tsx   # AI-generated post idea cards
│           ├── TrendingWidget.tsx   # Trending topics sidebar widget
│           ├── StudentAITutor.tsx   # In-course AI tutor dialog
│           ├── PersonalTutor.tsx    # Personal AI tutor chat interface
│           ├── RecruiterFeedbackSection.tsx # Recruiter feedback on profiles
│           ├── SkillsSection.tsx    # Skills + endorsements display
│           ├── EducationSection.tsx # Education records display
│           ├── CertificateShowcase.tsx # Certificate display cards
│           ├── CertificateViewer.tsx # PDF certificate viewer
│           ├── CVExportButton.tsx   # CV download trigger
│           ├── TeacherContentUpload.tsx # Teacher file upload form
│           ├── StudentCourseModal.tsx   # Add student course dialog
│           ├── StudentCoursesSection.tsx # Student courses list in profile
│           ├── ChallengeMilestonesCard.tsx # Challenge progress card
│           ├── CreateAnnouncementModal.tsx # University announcement creation
│           ├── AddSkillModal.tsx    # Add new skill dialog
│           ├── AddEducationModal.tsx # Add education record dialog
│           ├── JobExperienceModal.tsx # Add job experience dialog
│           ├── AuthModal.tsx        # Login/register dialog (used on Landing)
│           │
│           ├── post-card/           # PostCard sub-components
│           │   ├── index.ts         # Barrel export
│           │   ├── usePostCard.ts   # Post interactions logic hook
│           │   ├── PostHeader.tsx   # Author info + timestamp
│           │   ├── PostContent.tsx  # Text, images, video rendering
│           │   ├── ReactionBar.tsx  # Emoji reactions + counts
│           │   ├── CommentsSection.tsx # Comment list + input
│           │   └── DeleteDialogs.tsx # Post/comment delete confirmation
│           │
│           ├── profile/             # Profile page sub-components
│           │   ├── index.ts         # Barrel export
│           │   ├── useProfile.ts    # Profile data fetching logic
│           │   ├── ProfileHeader.tsx # Avatar, name, role, follow/connect
│           │   ├── EditProfileModal.tsx # Profile edit form
│           │   ├── AchievementsSection.tsx # Badges + achievement timeline
│           │   ├── ExtendedProfileSections.tsx # Skills, certs, education cards
│           │   └── FollowersFollowingList.tsx # Followers/following modal list
│           │
│           ├── teacher-dashboard/   # Teacher dashboard sub-components
│           │   ├── index.ts         # Barrel export
│           │   ├── useTeacherDashboard.ts # Dashboard data hook
│           │   ├── StatsGrid.tsx    # KPI stat cards row
│           │   ├── StudentCard.tsx  # Student row with actions
│           │   ├── TopPerformers.tsx # Top students list
│           │   ├── EngagementDistribution.tsx # Rank distribution chart
│           │   ├── CareerInsightsModal.tsx # Student career guidance modal
│           │   ├── CertificateModal.tsx # Issue certification dialog
│           │   └── EndorseModal.tsx # Endorse student skill dialog
│           │
│           ├── teacher/             # Teacher course management components
│           │   ├── CourseAccordionItem.tsx # Expandable course row
│           │   ├── CourseFormModal.tsx # Create/edit course dialog
│           │   ├── CourseMaterialsModal.tsx # Upload/manage course files
│           │   ├── DeleteCourseDialog.tsx # Course deletion confirmation
│           │   └── EditMaterialModal.tsx # Edit course material metadata
│           │
│           ├── industry/            # Industry dashboard sub-components
│           │   ├── index.ts         # Barrel export
│           │   ├── useIndustryDashboard.ts # Industry data hook
│           │   ├── TalentCard.tsx   # Student talent profile card
│           │   ├── FeedbackCard.tsx # Recruiter feedback display
│           │   ├── FeedbackModal.tsx # Submit feedback form
│           │   ├── ChallengeManageCard.tsx # Manage industry challenges
│           │   ├── CreateChallengeModal.tsx # New challenge creation form
│           │   └── RankingModal.tsx # Award ranking points to participants
│           │
│           ├── groups/              # Groups feature components
│           │   ├── index.ts         # Barrel export
│           │   ├── useGroupsDiscovery.ts # Groups data hook
│           │   ├── GroupCard.tsx    # Group preview card
│           │   ├── GroupFormFields.tsx # Shared group form inputs
│           │   ├── CreateGroupModal.tsx # New group creation dialog
│           │   ├── EditGroupModal.tsx   # Edit group details dialog
│           │   └── DeleteGroupDialog.tsx # Group deletion confirmation
│           │
│           └── ui/                  # Shadcn/UI component library
│               └── (button, card, dialog, form, input, select, ... 40+ components)
│
├── server/                          # Express backend
│   ├── index.ts                     # App entry: Express setup, middleware, Vite, cron
│   ├── routes.ts                    # Root router: mounts all feature routers + static files
│   ├── db.ts                        # PostgreSQL pool + Drizzle instance
│   ├── storage.ts                   # IStorage interface + DatabaseStorage implementation
│   ├── firebaseAuth.ts              # Auth middleware (Firebase + dev bypass + session setup)
│   ├── cloudStorage.ts              # Firebase Cloud Storage + local fallback upload/delete
│   ├── emailService.ts              # Nodemailer SMTP wrapper for OTP emails
│   ├── otpService.ts                # OTP generation, hashing, validation, rate-limiting
│   ├── pointsHelper.ts              # applyPointDelta(): atomic score + rank tier updates
│   ├── streakHelper.ts              # updateUserStreakForActivity(): daily streak tracking
│   ├── streakConfig.ts              # ActivityType enum + per-activity streak rules
│   ├── cron.ts                      # Scheduled jobs: streak reset (midnight) + user cleanup (2 AM)
│   ├── unverifiedUserCleanup.ts     # Deletes unverified accounts after 7-day grace period
│   ├── vite.ts                      # Vite middleware integration (dev) + static serving (prod)
│   │
│   ├── routes/                      # Feature-grouped API route handlers
│   │   ├── index.ts                 # Barrel export of all routers
│   │   ├── auth.ts                  # Register, dev-login, OTP, logout, change-password, 2FA
│   │   ├── feed.ts                  # Posts CRUD, personalized/following/trending feeds, comments, reactions
│   │   ├── users.ts                 # Profile updates, search, preferences, image upload, role-specific lists
│   │   ├── skills.ts                # Badges, skills, endorsements (CRUD)
│   │   ├── certifications.ts        # Issue, verify, and retrieve certifications
│   │   ├── notifications.ts         # Notification list, mark-read, group unread counts
│   │   ├── courses.ts               # Universities, majors, courses CRUD, enrollment, validation workflow
│   │   ├── challenges.ts            # Challenge CRUD, join, submit, award rank points, milestones
│   │   ├── groups.ts                # Group CRUD, join/leave, member list, group posts
│   │   ├── connections.ts           # Connection requests, follow/unfollow, discovery, recommendations
│   │   ├── messaging.ts             # Conversations, messages, mark-read, unread count
│   │   ├── admin.ts                 # Admin users, posts, announcements, analytics, ethics, transparency
│   │   ├── recruiter.ts             # Recruiter feedback submission + insights
│   │   ├── teacher-content.ts       # Teacher file upload, content indexing for RAG, CRUD
│   │   ├── ai.ts                    # CareerBot, post suggestions, course AI chat, personal tutor, moderation
│   │   ├── qa.ts                    # Q&A questions, answers, upvotes, resolve (accept answer)
│   │   └── shared.ts                # Video + multi-image upload endpoints
│   │
│   ├── services/                    # Business logic services (called from routes)
│   │   ├── index.ts                 # Barrel export
│   │   ├── badges.service.ts        # Badge award logic (checks conditions, inserts userBadges)
│   │   ├── courses.service.ts       # Course enrollment, validation state transitions
│   │   ├── discussions.service.ts   # Discussion creation, reply logic
│   │   └── notifications.service.ts # Create notifications for various event types
│   │
│   └── seed/                        # Database seeding system
│       ├── index.ts                 # Seed entry point (runs Comprehensive then Supplemental)
│       ├── config.ts                # Seed config flags (FORCE_RESEED, target counts)
│       ├── Comprehensive-seed.ts    # Full seed: users, posts, courses, challenges, groups
│       ├── Supplemental-seed.ts     # Adds conversations, messages, extra social data
│       ├── universities.ts          # University data for seed
│       └── data/                    # Seed data modules
│           ├── users.ts             # Demo users for all 5 roles
│           ├── admin.ts             # Master admin seed data
│           ├── badges.ts            # Badge definitions
│           ├── courses.ts           # Course seed data
│           ├── education.ts         # Education records
│           ├── gamification.ts      # Points, tiers, challenge data
│           ├── institution.ts       # University + major records
│           ├── posts.ts             # Sample post content
│           ├── skills.ts            # Skill definitions
│           └── social.ts            # Connections, follows, group memberships
│
├── shared/                          # Code shared between frontend and backend
│   ├── schema.ts                    # Re-export barrel for all schema sub-modules
│   ├── emailValidation.ts           # Blocked email domains + institutional validation logic
│   ├── universities.ts              # ~100 university domain lookup table
│   └── schema/                      # Drizzle ORM table definitions + Zod schemas
│       ├── index.ts                 # Exports all tables + types from sub-modules
│       ├── users.ts                 # users, userProfiles, educationRecords, jobExperience, userConnections
│       ├── feed.ts                  # posts, comments, reactions, postShares
│       ├── gamification.ts          # userStats, badges, userBadges, skills, userSkills, endorsements
│       ├── academia.ts              # universities, majors
│       ├── courses.ts               # courses, courseEnrollments, courseDiscussions, discussionReplies, studentCourses
│       ├── groups.ts                # groups, groupMembers, groupPosts
│       ├── messaging.ts             # conversations, messages
│       ├── notifications.ts         # notifications, announcements
│       ├── certifications.ts        # certifications, recruiterFeedback
│       ├── ai.ts                    # teacherContent, teacherContentChunks, aiChatSessions, aiChatMessages, personalTutorTables
│       └── auth.ts                  # sessions, emailOtps
│
├── migrations/                      # Drizzle auto-generated SQL migration files
│
├── public/                          # Root static assets (served at /)
│
├── uploads/                         # Local media fallback (git-ignored)
│   ├── images/
│   ├── videos/
│   └── documents/
│
├── drizzle.config.ts                # Drizzle Kit config (schema path, migrations output, DB URL)
├── vite.config.ts                   # Vite config (aliases, plugins, server host)
├── tailwind.config.ts               # Tailwind config (theme, dark mode class, content paths)
├── tsconfig.json                    # TypeScript config (paths, module resolution)
├── package.json                     # Scripts, dependencies
├── README.md                        # This file
└── DEVELOPER.md                     # Developer setup + full codebase reference
```

---

## Database Schema — Tables at a Glance

| Table | Purpose |
|-------|---------|
| `users` | Core user record: role, email, name, university, engagement score, streak |
| `user_profiles` | Extended profile: bio, avatar, social links |
| `education_records` | Degree/school history |
| `job_experience` | Work history |
| `user_connections` | Connection requests (pending/accepted/rejected) |
| `user_stats` | Gamification scores: engagement, problemSolver, endorsement, challenge, total, rankTier |
| `badges` | Badge definitions (name, icon, condition) |
| `user_badges` | Which badges each user has earned |
| `skills` | Skill catalog |
| `user_skills` | User's claimed skills with proficiency |
| `endorsements` | Skill endorsements between users |
| `posts` | Feed posts (text, images, video, category, tags) |
| `comments` | Comments on posts |
| `reactions` | Emoji reactions on posts |
| `post_shares` | Post share tracking |
| `universities` | University records |
| `majors` | Academic major records |
| `courses` | Teacher-created courses with validation status |
| `course_enrollments` | Student course enrollment records |
| `course_discussions` | Per-course discussion threads |
| `discussion_replies` | Replies to course discussions |
| `discussion_upvotes` | Upvotes on discussions |
| `student_courses` | Student-declared courses awaiting teacher validation |
| `groups` | Community groups |
| `group_members` | Group membership join table |
| `group_posts` | Posts within groups |
| `conversations` | DM conversation threads between two users |
| `messages` | Individual DM messages |
| `notifications` | System notifications (badge, connection, challenge, etc.) |
| `announcements` | University admin broadcast messages |
| `certifications` | Teacher-issued digital certificates |
| `recruiter_feedback` | Industry professional feedback on students |
| `teacher_content` | Uploaded course materials (PDF/docs) |
| `teacher_content_chunks` | Chunked + embedded content for RAG |
| `ai_chat_sessions` | Course AI tutor chat sessions per student/course |
| `ai_chat_messages` | Messages within course AI tutor sessions |
| `ai_chat_session_uploads` | Files uploaded to AI sessions |
| `ai_interaction_events` | AI usage audit log |
| `moderation_actions` | Content moderation decisions |
| `student_personal_tutor_sessions` | Personal tutor chat sessions |
| `student_personal_tutor_materials` | Materials uploaded to personal tutor |
| `student_personal_tutor_messages` | Personal tutor chat messages |
| `sessions` | Express session store |
| `email_otps` | OTP codes for email verification |

---

## API Endpoints Summary

### Auth (`/api/auth/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/dev-login` | Dev-only: issue JWT for any user by email |
| POST | `/api/auth/register` | Create account + send OTP |
| POST | `/api/auth/verify-otp` | Validate OTP, mark email verified |
| POST | `/api/auth/resend-otp` | Resend OTP (rate-limited: 3/hour) |
| GET | `/api/auth/user` | Get current authenticated user |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/auth/change-password` | Update password |
| POST | `/api/auth/2fa/enable` | Enable 2FA |
| POST | `/api/auth/resend-verification` | Resend email verification |

### Feed & Posts (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | All posts (filterable by userId, category) |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/:id` | Edit post |
| DELETE | `/api/posts/:id` | Delete post |
| GET | `/api/feed/personalized` | AI-curated feed for current user |
| GET | `/api/feed/following` | Posts from followed users |
| GET | `/api/feed/trending` | Top posts by engagement |
| POST | `/api/comments` | Add comment |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/reactions` | Add/toggle reaction |
| DELETE | `/api/reactions/:postId/:type` | Remove reaction |

### Users (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| DELETE | `/api/users/me` | Delete own account |
| PATCH | `/api/users/profile` | Update profile |
| PATCH | `/api/users/preferences/notifications` | Update notification preferences |
| GET | `/api/users/preferences` | Get notification preferences |
| GET | `/api/users/search` | Search users by name/email |
| GET | `/api/users/groups` | Get current user's groups |
| GET | `/api/teachers` | List all teachers |
| GET | `/api/students` | List all students (with stats) |
| GET | `/api/teachers/university/:uni` | Teachers at a given university |
| GET | `/api/university/teachers` | Teachers at current user's university |
| GET | `/api/teachers/:id/students` | Students enrolled under teacher |
| POST | `/api/upload/image` | Upload profile/post image |
| POST | `/api/upload/images` | Upload multiple post images |
| POST | `/api/upload/video` | Upload post video |

### Skills & Badges (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user-badges/:userId` | Badges for a user |
| GET | `/api/skills` | All available skills |
| GET | `/api/user-skills/:userId` | User's skills |
| POST | `/api/users/skills` | Add a skill |
| PATCH | `/api/users/skills/:id` | Update skill |
| DELETE | `/api/user-skills/:id` | Remove skill |
| GET | `/api/endorsements/:userId` | Endorsements for user |
| POST | `/api/endorsements` | Endorse a skill |

### Certifications (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/certifications/user/:userId` | Certs for a user |
| POST | `/api/certifications` | Issue certification (teacher only) |
| GET | `/api/certifications/verify/:hash` | Public verify by hash |
| GET | `/api/certifications/:id` | Single cert details |

### Courses & Learning (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/universities` | All universities |
| GET | `/api/universities/search` | Search universities |
| POST | `/api/universities` | Create university |
| GET | `/api/majors` / `search` | Majors list + search |
| GET | `/api/courses` | All courses |
| POST | `/api/courses` | Create course (teacher) |
| PATCH | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course + cascade |
| POST | `/api/courses/:id/enroll` | Enroll in course |
| POST | `/api/courses/:id/request-validation` | Teacher requests uni validation |
| POST | `/api/courses/:id/university-validation` | Uni admin approves/rejects |
| GET | `/api/me/enrolled-courses` | Student enrolled courses |
| GET | `/api/me/created-courses` | Teacher created courses |
| GET | `/api/teacher/courses` | Teacher's courses (detailed) |
| GET | `/api/teacher/pending-validations` | Pending student course validations |
| POST | `/api/student-courses/:id/validate` | Teacher validates student course |
| DELETE | `/api/student-courses/:id/validation` | Remove validation |
| GET | `/api/university/pending-course-validations` | Pending course validations (uni admin) |

### Challenges (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/challenges/:status?` | All challenges (optional status filter) |
| POST | `/api/challenges` | Create challenge |
| GET | `/api/challenges/map` | Challenges with location data |
| GET | `/api/challenges/my-participations` | Current user's participations |
| POST | `/api/challenges/:id/join` | Join challenge (+5 pts) |
| POST | `/api/challenges/:id/submit` | Submit solution (+25 pts) |
| GET | `/api/challenges/:id/participants` | Challenge participants |
| POST | `/api/challenges/:id/award-rank-points` | Award placement points |
| GET | `/api/users/:id/challenge-milestones` | User's challenge milestone history |
| POST | `/api/users/:id/recalculate-rank` | Force rank recalculation |

### Groups (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups` | All groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Group details |
| PATCH | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |
| POST | `/api/groups/:id/join` | Join group |
| DELETE | `/api/groups/:id/leave` | Leave group |
| GET | `/api/groups/:id/members` | Group members |
| POST | `/api/groups/:id/posts` | Post to group |
| GET | `/api/groups/:id/posts` | Group posts |

### Connections & Network (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/connections/request` | Send connection request |
| PATCH | `/api/connections/:id` | Accept/reject connection |
| DELETE | `/api/connections/:id` | Remove connection |
| GET | `/api/connections` | User's connections (filterable: pending/accepted) |
| GET | `/api/connections/status/:userId` | Connection status with user |
| GET | `/api/connections/search` | Search connections |
| POST | `/api/follow` | Follow a user |
| DELETE | `/api/follow/:userId` | Unfollow |
| GET | `/api/followers/:userId` | Followers list |
| GET | `/api/following/:userId` | Following list |
| GET | `/api/follow/status/:userId` | Follow status check |
| DELETE | `/api/followers/remove/:userId` | Remove a follower |
| GET | `/api/recommendations/friends` | Friend recommendations |
| GET | `/api/discovery/universities` | Universities for discovery |

### Messaging (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | All conversations for user |
| GET | `/api/unread-count` | Total unread message count |
| GET | `/api/conversations/:id/messages` | Messages in a conversation |
| POST | `/api/conversations/:id/messages` | Send a message |
| PATCH | `/api/conversations/:id/read` | Mark conversation as read |

### Notifications (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | All notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| PATCH | `/api/notifications/mark-all-read` | Mark all as read |
| GET | `/api/notifications/groups/unread-count` | Unread group notifications |

### Admin & Analytics (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | All users with stats (master admin) |
| DELETE | `/api/admin/users/:id` | Delete any user (master admin) |
| DELETE | `/api/university/users/:id` | Remove user from university |
| GET | `/api/admin/posts` | All posts (master admin) |
| GET | `/api/announcements` | Announcements for user's institution |
| POST | `/api/announcements` | Create announcement (uni admin) |
| GET | `/api/university/retention/overview` | At-risk student metrics |
| GET | `/api/university/retention/career` | Career pathway analytics |
| GET | `/api/university/analytics` | University engagement analytics |
| GET | `/api/university/courses-stats` | Course enrollment statistics |
| GET | `/api/university/leaderboard` | Institution-scoped leaderboard |
| GET | `/api/ethics/metrics` | AI ethics monitoring data |
| GET | `/api/transparency/metrics` | Platform transparency report |

### Recruiter & Industry (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recruiter-feedback/student/:id` | Feedback for a student |
| POST | `/api/recruiter-feedback` | Submit feedback (+points to student) |
| GET | `/api/recruiter-feedback/insights/:id` | Aggregated feedback insights |
| GET | `/api/recruiter-feedback/my-feedback` | Feedback submitted by current user |

### Q&A Forum (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/qa/questions` | All questions |
| GET | `/api/qa/questions/:id` | Question + answers |
| POST | `/api/qa/questions` | Ask question (+10 pts) |
| POST | `/api/qa/questions/:id/answers` | Answer question (+15 pts) |
| POST | `/api/qa/upvote` | Upvote question or answer |
| POST | `/api/qa/questions/:id/resolve` | Accept answer (+20 pts) |

### AI (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/careerbot/chat` | CareerBot conversation |
| GET | `/api/ai/suggest-posts` | AI post suggestion ideas |
| POST | `/api/ai/moderate-content` | Screen post for policy violations |
| POST | `/api/ai/course-chat` | Course AI tutor message |
| GET | `/api/ai/course-chat/:courseId/history` | Course chat sessions |
| GET | `/api/ai/course-chat/session/:id` | Session messages |
| GET | `/api/ai/personal-tutor/materials` | Personal tutor materials |
| POST | `/api/ai/personal-tutor/materials` | Upload material to personal tutor |
| DELETE | `/api/ai/personal-tutor/materials/:id` | Remove personal tutor material |
| GET | `/api/ai/personal-tutor/sessions` | Personal tutor sessions |
| POST | `/api/ai/personal-tutor/sessions` | Create personal tutor session |
| PATCH | `/api/ai/personal-tutor/sessions/:id` | Update session |
| DELETE | `/api/ai/personal-tutor/sessions/:id` | Delete session |
| GET | `/api/ai/personal-tutor/sessions/:id/messages` | Session messages |
| POST | `/api/ai/personal-tutor/chat` | Send personal tutor message |

### Teacher Content (`/api/teacher-content/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/teacher-content/upload` | Upload document (teacher only) |
| POST | `/api/teacher-content/` | Create content record |
| POST | `/api/teacher-content/:id/index` | Index content chunks for RAG |
| GET | `/api/teacher-content/teacher/:id` | Content by teacher |
| GET | `/api/teacher-content/course/:id` | Content for a course |
| PATCH | `/api/teacher-content/:id` | Update content metadata |
| DELETE | `/api/teacher-content/:id` | Delete content |
