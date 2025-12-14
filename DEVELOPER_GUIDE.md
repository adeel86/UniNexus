# UniNexus Developer Guide# UniNexus Developer Guide



**Complete setup, development, and deployment guide for developers joining the UniNexus project.**This comprehensive guide provides all the technical documentation needed to understand, develop, and maintain the UniNexus platform.



Estimated setup time: **45-60 minutes** (including database initialization)## Table of Contents



---1. [Architecture Overview](#architecture-overview)

2. [Project Structure](#project-structure)

## Table of Contents3. [Technology Stack](#technology-stack)

4. [Database Schema](#database-schema)

1. [Local Development Setup](#local-development-setup)5. [Authentication System](#authentication-system)

2. [Database Setup](#database-setup)6. [API Reference](#api-reference)

3. [Authentication Configuration](#authentication-configuration)7. [Frontend Architecture](#frontend-architecture)

4. [Running the System](#running-the-system)8. [AI Integration](#ai-integration)

5. [Mobile App Setup](#mobile-app-setup)9. [Development Workflow](#development-workflow)

6. [Troubleshooting](#troubleshooting)10. [Deployment](#deployment)

7. [Deployment Guide](#deployment-guide)

---

---

## Architecture Overview

## Local Development Setup

UniNexus follows a modern full-stack JavaScript architecture:

### Prerequisites

```

Before starting, ensure you have installed:┌─────────────────────────────────────────────────────────────┐

│                         Frontend                              │

| Tool | Version | Purpose |│   React + TypeScript + Tailwind CSS + Shadcn UI              │

|------|---------|---------|│   State Management: TanStack Query                            │

| **Node.js** | 18+ (20+ recommended) | JavaScript runtime |│   Routing: Wouter                                             │

| **npm** or **yarn** | Latest | Package manager |└───────────────────────┬─────────────────────────────────────┘

| **PostgreSQL** | 12+ | Database |                        │ HTTP/REST

| **Git** | Latest | Version control |┌───────────────────────┴─────────────────────────────────────┐

│                         Backend                               │

**Installation:**│   Express.js + TypeScript                                     │

- **macOS:** `brew install node postgresql`│   Authentication: Firebase Admin SDK                          │

- **Windows:** Download from nodejs.org and postgresql.org│   File Storage: Local/Cloud Storage                           │

- **Linux:** `sudo apt install nodejs postgresql`└───────────────────────┬─────────────────────────────────────┘

                        │ Drizzle ORM

### Step 1: Clone and Install┌───────────────────────┴─────────────────────────────────────┐

│                         Database                              │

```bash│   PostgreSQL (Neon)                                           │

# Clone the repository│   Schema: Drizzle ORM                                         │

git clone https://github.com/yourusername/UniNexusGenZ.git└─────────────────────────────────────────────────────────────┘

cd UniNexusGenZ```



# Install dependencies---

npm install

```## Project Structure



### Step 2: Set Up Environment Variables```

/

Copy the example environment file:├── client/                  # Frontend React application

│   ├── src/

```bash│   │   ├── components/      # React components

cp .env.example .env│   │   │   ├── ui/          # Shadcn UI components

```│   │   │   └── ...          # Feature components

│   │   ├── hooks/           # Custom React hooks

Edit `.env` with your configuration:│   │   ├── lib/             # Utilities and helpers

│   │   │   ├── AuthContext.tsx   # Authentication context

```bash│   │   │   ├── firebase.ts       # Firebase configuration

# ==========================================│   │   │   └── queryClient.ts    # TanStack Query setup

# DATABASE│   │   ├── pages/           # Page components

# ==========================================│   │   └── App.tsx          # Main app component

DATABASE_URL="postgresql://username:password@localhost:5432/uninexusgenz"│   └── index.html

│

# ==========================================├── server/                  # Backend Express application

# FIREBASE (Authentication & Storage)│   ├── routes/              # API route handlers

# ==========================================│   │   ├── auth.ts          # Authentication routes

VITE_FIREBASE_API_KEY="your-api-key"│   │   ├── ai.ts            # AI chatbot routes

VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"│   │   ├── courses.ts       # Course management

VITE_FIREBASE_PROJECT_ID="your-project-id"│   │   ├── feed.ts          # Social feed

VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"│   │   └── ...              # Other route modules

VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"│   ├── services/            # Business logic services

VITE_FIREBASE_APP_ID="1:123456789:web:abc123"│   ├── seed/                # Database seed modules

│   │   └── data/            # Seed data files

# ==========================================│   ├── db.ts                # Database connection

# DEVELOPMENT AUTH (Demo Accounts)│   ├── storage.ts           # Data access layer

# ==========================================│   ├── firebaseAuth.ts      # Firebase authentication

# Enable development-only demo accounts│   ├── aiChatbot.ts         # AI integration

DEV_AUTH_ENABLED=true│   └── unified-seed.ts      # Unified database seeding

DEV_JWT_SECRET="your-dev-secret-key-min-32-chars"│

├── shared/                  # Shared code (frontend + backend)

# ==========================================│   └── schema/              # Database schema definitions

# AI FEATURES (Optional)│       ├── users.ts         # User-related tables

# ==========================================│       ├── feed.ts          # Social feed tables

OPENAI_API_KEY="sk-your-openai-api-key"│       ├── courses.ts       # Course tables

│       ├── gamification.ts  # Badges, skills, challenges

# ==========================================│       ├── ai.ts            # AI-related tables

# ENVIRONMENT│       └── index.ts         # Schema barrel export

# ==========================================│

NODE_ENV="development"└── package.json

VITE_API_URL="http://localhost:5000"```

```

---

### Step 3: Set Up Firebase (Local Development)

## Technology Stack

#### Option A: Firebase Emulator (Recommended for Local Dev)

### Frontend

```bash| Technology | Purpose |

# Install Firebase CLI|------------|---------|

npm install -g firebase-tools| React 18 | UI library |

| TypeScript | Type safety |

# Login to Firebase| Tailwind CSS | Styling |

firebase login| Shadcn UI | Component library |

| TanStack Query | Server state management |

# In your project root, initialize Firebase emulator| Wouter | Routing |

firebase init emulator| Framer Motion | Animations |

| Lucide React | Icons |

# Start the emulator

firebase emulators:start### Backend

```| Technology | Purpose |

|------------|---------|

In `.env`, point to the emulator:| Node.js 20 | Runtime |

```bash| Express | Web framework |

VITE_FIREBASE_EMULATOR_HOST="localhost:9099"| TypeScript | Type safety |

```| Firebase Admin SDK | Authentication |

| OpenAI | AI integration |

#### Option B: Use Cloud Firebase (Development Project)

### Database

1. Go to [Firebase Console](https://console.firebase.google.com)| Technology | Purpose |

2. Create a new project (e.g., "UniNexus-Dev")|------------|---------|

3. In **Project Settings**, find your Web API credentials| PostgreSQL | Database |

4. Copy and paste into `.env`| Drizzle ORM | Type-safe ORM |

| Neon | Serverless Postgres |

#### Set Up Firebase Service Account (Backend)

---

The backend needs Firebase Admin credentials:

## Database Schema

1. In Firebase Console → Project Settings → Service Accounts

2. Click **"Generate New Private Key"**### Core Tables

3. Save the JSON file as `serviceAccountKey.json` in project root

4. **⚠️ DO NOT COMMIT** this file to git (already in `.gitignore`)#### Users

The central user table supporting multiple roles:

### Step 4: Verify Prerequisites- `student` - Learning and engagement

- `teacher` - Course creation and endorsements

```bash- `university_admin` - Institutional oversight

# Check Node.js version (should be 18+)- `industry_professional` - Talent discovery

node --version- `master_admin` - Platform administration



# Check PostgreSQL is running```typescript

psql --version// shared/schema/users.ts

export const users = pgTable("users", {

# Test database connection  id: varchar("id").primaryKey(),

psql "postgresql://username:password@localhost:5432/postgres" -c "SELECT version();"  firebaseUid: varchar("firebase_uid").unique(),

```  email: varchar("email").unique(),

  firstName: varchar("first_name"),

---  lastName: varchar("last_name"),

  role: varchar("role"),        // student, teacher, etc.

## Database Setup  university: varchar("university"),

  major: varchar("major"),

### Creating the Database  company: varchar("company"),

  // Gamification fields

```bash  engagementScore: integer("engagement_score"),

# Connect as postgres user  problemSolverScore: integer("problem_solver_score"),

psql -U postgres  endorsementScore: integer("endorsement_score"),

  totalPoints: integer("total_points"),

# In PostgreSQL console, create database  rankTier: varchar("rank_tier"),

CREATE DATABASE uninexusgenz;  streak: integer("streak"),

\q  // ...

```});

```

Or using one command:

#### Courses

```bash```typescript

createdb -U postgres uninexusgenzexport const courses = pgTable("courses", {

```  id: varchar("id").primaryKey(),

  name: varchar("name").notNull(),

### Running Migrations  code: varchar("code"),

  description: text("description"),

UniNexus uses **Drizzle ORM** for migrations:  university: varchar("university"),

  instructorId: varchar("instructor_id"),

```bash  semester: varchar("semester"),

# Push the current schema to the database  isUniversityValidated: boolean("is_university_validated"),

npm run db:push  // ...

```});

```

This command:

- ✅ Creates all tables from `shared/schema.ts`#### Posts (Social Feed)

- ✅ Sets up relationships and constraints```typescript

- ✅ Creates indexes for performanceexport const posts = pgTable("posts", {

- ✅ **Does NOT drop existing data** (safe to re-run)  id: varchar("id").primaryKey(),

  authorId: varchar("author_id"),

### Seeding the Database  content: text("content"),

  category: varchar("category"),

UniNexus has three seed profiles for different needs:  mediaType: varchar("media_type"),

  tags: text("tags").array(),

```bash  viewCount: integer("view_count"),

# Standard profile (default) - 55 users + realistic data  // ...

npm run db:seed});

```

# Minimal profile - 5 demo users only

npm run db:seed -- minimal### Schema Organization



# Comprehensive profile - 205 users + large datasetSchemas are organized by domain in `shared/schema/`:

npm run db:seed -- comprehensive- `users.ts` - Users, profiles, connections, followers

```- `feed.ts` - Posts, comments, reactions, shares

- `courses.ts` - Courses, enrollments, discussions

**Seed profiles include:**- `gamification.ts` - Badges, skills, challenges

- Demo user accounts (for testing)- `messaging.ts` - Conversations, messages

- Realistic generated users with roles (student, teacher, admin, industry, etc.)- `notifications.ts` - Notifications, announcements

- Courses and enrollments- `certifications.ts` - Certifications, recruiter feedback

- Posts, comments, and reactions- `ai.ts` - AI chat sessions, teacher content

- Groups and challenges

- Connections and followers---

- Notifications and messages

- AI chat sessions## Authentication System

- Badges and skills

UniNexus uses a dual authentication system:

**Estimated seed times:**

- Minimal: <1 second### 1. Firebase Authentication (Production)

- Standard: 5-10 seconds (recommended for development)- Email/password authentication

- Comprehensive: 30-60 seconds (for load testing)- Token-based session management

- Integration with Firebase Admin SDK on backend

See [SEEDING_GUIDE.md](./server/seed/SEEDING_GUIDE.md) for full details on seed profiles.

### 2. Development Authentication (Demo Mode)

### Demo Accounts- JWT-based bypass for demo accounts

- Enabled via `DEV_AUTH_ENABLED=true`

After seeding, use these demo accounts to log in:- All demo accounts use password: `demo123`



| Role | Email | Password |### Authentication Flow

|------|-------|----------|

| **Student** | demo.student@uninexus.app | demo123 |```

| **Teacher** | demo.teacher@uninexus.app | demo123 |┌──────────┐    ┌──────────┐    ┌──────────┐

| **University Admin** | demo.university@uninexus.app | demo123 |│  Client  │───>│ /api/auth│───>│ Firebase │

| **Industry Professional** | demo.industry@uninexus.app | demo123 |│          │    │ /dev-login│   │  Admin   │

| **Master Admin** | demo.admin@uninexus.app | demo123 |└──────────┘    └──────────┘    └──────────┘

      │               │               │

**Note:** Demo accounts only work when `DEV_AUTH_ENABLED=true` in `.env`      │  JWT Token    │  Verify       │

      │<──────────────│<──────────────│

### Resetting the Database (For Testing)      │               │               │

      ▼               ▼               ▼

```bash   localStorage   AuthContext      User DB

# Drop and recreate all tables```

npm run db:push -- --force

### Key Files

# Or manually in PostgreSQL- `client/src/lib/AuthContext.tsx` - React auth context

psql -U postgres -d uninexusgenz -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"- `client/src/lib/firebase.ts` - Firebase client config

- `server/firebaseAuth.ts` - Firebase Admin middleware

# Then re-seed- `server/routes/auth.ts` - Auth API routes

npm run db:seed -- standard

```### Environment Variables

```bash

### Verifying the Setup# Firebase (Production)

VITE_FIREBASE_API_KEY=xxx

```bashVITE_FIREBASE_PROJECT_ID=xxx

# Check tables were createdVITE_FIREBASE_APP_ID=xxx

psql -U postgres -d uninexusgenz -c "\dt"

# Development Auth

# Check row counts in key tablesDEV_AUTH_ENABLED=true

psql -U postgres -d uninexusgenz -c "DEV_JWT_SECRET=your-secret-key

  SELECT 'users' AS table_name, COUNT(*) FROM users```

  UNION ALL

  SELECT 'posts', COUNT(*) FROM posts---

  UNION ALL

  SELECT 'courses', COUNT(*) FROM courses;## API Reference

"

```### Authentication Endpoints



---| Method | Endpoint | Description |

|--------|----------|-------------|

## Authentication Configuration| POST | `/api/auth/dev-login` | Development login |

| POST | `/api/auth/register` | Register new user |

### How Authentication Works| GET | `/api/auth/user` | Get current user |

| POST | `/api/auth/logout` | Logout |

UniNexus supports two authentication methods:

### User Endpoints

```

Development (DEV_AUTH_ENABLED=true)| Method | Endpoint | Description |

    ↓|--------|----------|-------------|

Demo accounts: JWT-based, no Firebase needed| GET | `/api/users/:id` | Get user by ID |

    ↓| GET | `/api/users/role/:role` | Get users by role |

Perfect for: Local testing, CI/CD pipelines| PATCH | `/api/users/:id` | Update user |



Production (DEV_AUTH_ENABLED=false)### Feed Endpoints

    ↓

Firebase Admin SDK: Production authentication| Method | Endpoint | Description |

    ↓|--------|----------|-------------|

Perfect for: Cloud deployment, real users| GET | `/api/feed` | Get feed posts |

```| POST | `/api/feed/posts` | Create post |

| POST | `/api/feed/posts/:id/react` | React to post |

### Firebase Setup Steps| POST | `/api/feed/posts/:id/comment` | Comment on post |



#### 1. Create Firebase Project### Course Endpoints



```bash| Method | Endpoint | Description |

# Go to Firebase Console|--------|----------|-------------|

# Create new project "UniNexus" (or your name)| GET | `/api/courses` | List courses |

# Choose region closest to you| GET | `/api/courses/:id` | Get course |

# Enable Google Analytics (optional)| POST | `/api/courses` | Create course |

```| POST | `/api/courses/:id/enroll` | Enroll in course |



#### 2. Enable Authentication Methods### AI Endpoints



In Firebase Console → Authentication → Sign-in methods:| Method | Endpoint | Description |

- ✅ Enable **Email/Password**|--------|----------|-------------|

- ✅ Enable **Google** (optional)| POST | `/api/ai/chat` | Send AI message |

- ✅ Add authorized domains (e.g., `localhost`, `yourdomain.com`)| GET | `/api/ai/sessions` | Get chat sessions |

| POST | `/api/ai/sessions` | Create session |

#### 3. Configure Firebase Security Rules

---

Set database rules for Firestore/Realtime Database:

## Frontend Architecture

```json

{### State Management

  "rules": {

    "users": {TanStack Query is used for server state:

      "$uid": {

        ".read": "$uid === auth.uid",```typescript

        ".write": "$uid === auth.uid"// Fetching data

      }const { data, isLoading } = useQuery({

    }  queryKey: ['/api/courses'],

  }});

}

```// Mutations

const mutation = useMutation({

#### 4. Add Firebase SDK to Frontend  mutationFn: (data) => apiRequest('/api/courses', 'POST', data),

  onSuccess: () => {

Already configured in `client/src/lib/firebase.ts` — just update `.env`    queryClient.invalidateQueries({ queryKey: ['/api/courses'] });

  },

#### 5. Add Firebase Admin SDK to Backend});

```

Backend automatically uses `serviceAccountKey.json`:

### Routing

```typescript

// server/firebaseAuth.tsWouter is used for client-side routing:

import admin from 'firebase-admin';

const serviceAccount = require('../serviceAccountKey.json');```typescript

// App.tsx

admin.initializeApp({<Switch>

  credential: admin.credential.cert(serviceAccount),  <Route path="/" component={Home} />

});  <Route path="/courses" component={Courses} />

```  <Route path="/profile/:id" component={Profile} />

</Switch>

### Authentication Flow```



```### Component Patterns

┌─────────────────┐

│   User Login    │```typescript

│   (Web/Mobile)  │// Use Shadcn UI components

└────────┬────────┘import { Button } from "@/components/ui/button";

         │import { Card } from "@/components/ui/card";

         ▼

┌─────────────────────────────────────┐// Use react-hook-form for forms

│  Check: DEV_AUTH_ENABLED?           │import { useForm } from "react-hook-form";

└────────┬────────────────────────────┘import { zodResolver } from "@hookform/resolvers/zod";

         │```

    ┌────┴────┐

    │          │---

   YES        NO

    │          │## AI Integration

    ▼          ▼

Dev Auth   Firebase Auth### Teacher Content Pipeline

(JWT)      (Admin SDK)

    │          │1. **Upload**: Teachers upload course materials (PDF, text, slides)

    └────┬─────┘2. **Processing**: Content is chunked and stored

         │3. **Indexing**: Chunks are embedded for semantic search

         ▼4. **Retrieval**: AI queries retrieve relevant chunks

┌─────────────────────────────────────┐5. **Generation**: OpenAI generates responses with citations

│  Create/Update User in Database     │

│  Generate Session Token             │### Key Components

└─────────────────────────────────────┘

         │```typescript

         ▼// server/aiChatbot.ts

┌─────────────────────────────────────┐export async function generateAIResponse(

│  Store in localStorage              │  userId: string,

│  Use in API requests (header)       │  courseId: string,

└─────────────────────────────────────┘  message: string

```): Promise<AIResponse>

```

### Environment-Specific Settings

### AI Tables

**Development (.env):**- `teacher_content` - Uploaded course materials

```bash- `teacher_content_chunks` - Processed text chunks

DEV_AUTH_ENABLED=true- `ai_chat_sessions` - User chat sessions

VITE_FIREBASE_EMULATOR_HOST=localhost:9099- `ai_chat_messages` - Chat history

```

---

**Production (.env.production):**

```bash## Development Workflow

DEV_AUTH_ENABLED=false

# Real Firebase project credentials### Running Locally

VITE_FIREBASE_API_KEY=...

``````bash

# Start development server

### Common Authentication Issuesnpm run dev

```

| Issue | Solution |

|-------|----------|The server starts on port 5000 with hot reloading.

| "Firebase not initialized" | Ensure `VITE_FIREBASE_API_KEY` in `.env` and `firebase.ts` is loaded |

| "Demo login not working" | Check `DEV_AUTH_ENABLED=true` in `.env` and restart server |### Database Operations

| "Token expired" | Clear localStorage and log in again |

| "serviceAccountKey.json not found" | Download from Firebase Console → Project Settings |```bash

| "Invalid credentials" | Verify email/password match database users table |# Push schema changes

npm run db:push

---

# Generate migrations (if needed)

## Running the Systemnpm run db:generate



### Starting Development Servers# Run seed

npx tsx server/unified-seed.ts

**Terminal 1: Backend API**```



```bash### Adding New Features

npm run dev

```1. **Schema First**: Define tables in `shared/schema/`

2. **Storage Layer**: Add CRUD methods to `server/storage.ts`

Output should show:3. **API Routes**: Create routes in `server/routes/`

```4. **Frontend**: Add components and pages in `client/src/`

🔥 Dev mode enabled

🌳 Express server listening on port 5000### Code Conventions

📡 API: http://localhost:5000

```- Use TypeScript for all code

- Follow existing patterns for consistency

**Terminal 2: Frontend Web**- Use Shadcn UI components

- Add `data-testid` attributes to interactive elements

```bash

cd client && npm run dev---

```

## Deployment

Opens automatically in browser at `http://localhost:5173`

### Replit Deployment

**Terminal 3 (Optional): Mobile Simulator**

1. Configure deployment in Replit

```bash2. Set production environment variables

cd mobile && npm start3. Click "Deploy"



# Then in the terminal:### Environment Variables (Production)

# Press 'i' for iOS Simulator

# Press 'a' for Android Emulator```bash

# Press 'w' for Web# Database

```DATABASE_URL=postgresql://...



### Verifying the System is Running# Firebase

VITE_FIREBASE_API_KEY=xxx

#### 1. Backend Health CheckVITE_FIREBASE_PROJECT_ID=xxx



```bash# OpenAI

curl http://localhost:5000/api/healthOPENAI_API_KEY=xxx

# Should return: {"status":"ok"}

```# Session

SESSION_SECRET=xxx

#### 2. Test Login```



Try logging in with demo account:### Build Process

- Email: `demo.student@uninexus.app`

- Password: `demo123````bash

npm run build  # Builds frontend

#### 3. Check Feednpm run start  # Starts production server

```

After login, navigate to Home → should see demo posts

---

#### 4. Verify Courses

## Troubleshooting

Click "Courses" → should see seeded courses

### Common Issues

#### 5. Test AI Features

**1. Authentication not working**

Open a course → click "Ask AI" → should connect to ChatBot- Check `DEV_AUTH_ENABLED` and `DEV_JWT_SECRET` are set

- Verify Firebase configuration

#### 6. Check Admin Panel

**2. Database connection failed**

Login as `demo.admin@uninexus.app` → access admin dashboard- Check `DATABASE_URL` is set

- Verify Neon database is active

### Hot Reloading

**3. AI responses failing**

Both frontend and backend support hot reloading:- Verify `OPENAI_API_KEY` is set

- **Frontend:** Changes to `.tsx` files auto-refresh- Check rate limits

- **Backend:** Changes to `.ts` files auto-reload (via tsx watch)

### Debug Tips

### Stopping Servers

- Check browser console for frontend errors

```bash- Check workflow logs for backend errors

# Press Ctrl+C in each terminal- Use `/api/health` endpoint to verify server status

```

---

---

## Contributing

## Mobile App Setup

1. Create a feature branch

### Prerequisites2. Make changes following code conventions

3. Test thoroughly

- Node.js 18+4. Submit for review

- Expo CLI: `npm install -g expo-cli`

- iOS Simulator (macOS): Xcode command line tools---

- Android Emulator: Android Studio

*Last updated: December 2024*

### Installation

```bash
cd mobile
npm install
```

### Configuration

Mobile uses the same `.env` from project root.

For API connections, update `mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://your-backend-ip:5000"
    }
  }
}
```

On physical devices, replace `localhost` with your machine's IP:
```bash
# Get your IP
ipconfig getifaddr en0  # macOS
# or
hostname -I  # Linux
```

### Running on Simulators

**iOS Simulator (macOS only)**

```bash
npm run ios
```

**Android Emulator**

1. Start Android Emulator from Android Studio
2. Run:
```bash
npm run android
```

**Web (for testing)**

```bash
npm run web
```

### Running on Physical Device

```bash
npm start

# Scan QR code with Expo Go app (iOS) or Expo app (Android)
```

### Building for Distribution

**Android APK**

```bash
npm run build:android
# Output: ./android/app/build/outputs/apk/release/app-release.apk
```

**iOS App**

```bash
npm run build:ios
# Requires Apple Developer account
```

### Mobile Demo Accounts

Same as web — use the demo accounts after database seeding.

---

## Troubleshooting

### Database Issues

**Error: "Connection refused"**
```bash
# PostgreSQL is not running
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

**Error: "Database does not exist"**
```bash
# Create database
createdb -U postgres uninexusgenz
npm run db:push
```

**Error: "Column does not exist"**
```bash
# Schema is out of sync
npm run db:push
```

### Backend Issues

**Error: "Port 5000 already in use"**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows (find PID)
taskkill /PID <PID> /F
```

**Error: "Cannot find module"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error: "Firebase not initialized"**
```bash
# Ensure serviceAccountKey.json exists in project root
# And VITE_FIREBASE_API_KEY is set in .env
```

### Frontend Issues

**Error: "VITE_API_URL not found"**
```bash
# Make sure .env is in project root (not client/)
# Vite should auto-load it
```

**Error: "Cannot login with demo account"**
```bash
# Check DEV_AUTH_ENABLED=true in .env
# Restart backend server: npm run dev
```

**Blank page after login**
```bash
# Clear browser cache and localStorage
# Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
# Refresh page
```

### Mobile Issues

**Error: "Cannot connect to backend"**
```bash
# Update VITE_API_URL to your machine IP
# Instead of localhost, use: http://192.168.x.x:5000
ipconfig getifaddr en0  # Get your IP
```

**Error: "Expo Go won't scan QR code"**
```bash
# Make sure phone and computer are on same WiFi
# Restart: npm start (press 'r' to reload)
```

---

## Deployment Guide

### Option 1: Self-Hosted Linux Server

#### Prerequisites
- Ubuntu 20.04+ server (e.g., DigitalOcean droplet, AWS EC2)
- Domain name with DNS pointing to server
- SSH access to server

#### Step 1: Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

#### Step 2: Set Up PostgreSQL

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE uninexusgenz;
CREATE USER appuser WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE uninexusgenz TO appuser;
\q
EOF
```

#### Step 3: Clone and Build

```bash
cd /opt
git clone https://github.com/yourusername/UniNexusGenZ.git
cd UniNexusGenZ

# Install dependencies
npm install

# Build frontend and backend
npm run build
```

#### Step 4: Configure Environment

```bash
# Create production .env
cat > .env.production << 'EOF'
DATABASE_URL="postgresql://appuser:strong-password@localhost:5432/uninexusgenz"
NODE_ENV="production"
DEV_AUTH_ENABLED=false
VITE_FIREBASE_API_KEY="your-firebase-key"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="xxxxx"
VITE_FIREBASE_APP_ID="xxxxx"
OPENAI_API_KEY="sk-xxxxx"
EOF

# Copy serviceAccountKey.json
scp serviceAccountKey.json root@your-server-ip:/opt/UniNexusGenZ/
```

#### Step 5: Run with PM2

```bash
# Push migrations
npm run db:push

# Seed database
npm run db:seed -- standard

# Start with PM2
pm2 start dist/index.js --name "uninexus-api"
pm2 save
pm2 startup
```

#### Step 6: Configure Nginx Reverse Proxy

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/default
```

Add:
```nginx
upstream uninexus_api {
    server localhost:5000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # API proxy
    location /api {
        proxy_pass http://uninexus_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location / {
        root /opt/UniNexusGenZ/dist/public;
        try_files $uri /index.html;
    }
}
```

Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: Enable HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Docker Containerization

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build
COPY . .
RUN npm run build

# Expose ports
EXPOSE 5000

# Start
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t uninexus .
docker run -p 5000:5000 \
  -e DATABASE_URL="..." \
  -e VITE_FIREBASE_API_KEY="..." \
  uninexus
```

### Option 3: Cloud Deployment (AWS)

#### Using AWS App Runner (simplest)

1. **Build Docker image:**
   ```bash
   docker build -t uninexus .
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com
   docker tag uninexus:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/uninexus:latest
   docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/uninexus:latest
   ```

2. **In AWS Console:**
   - Go to App Runner
   - Create service
   - Select ECR image
   - Configure environment variables
   - Deploy

#### Using AWS EC2 + RDS

1. **Launch EC2 instance** (Ubuntu 20.04, t3.medium minimum)
2. **Create RDS PostgreSQL** database
3. **Follow "Self-Hosted Linux Server" steps above**, but use RDS endpoint for `DATABASE_URL`

### Option 4: Vercel + Cloud Database

**Frontend only** (Vercel):

```bash
npm install -g vercel
vercel
# Follow prompts
```

**Backend** (Railway, Render, Fly.io):

```bash
# Using Railway.app
railway login
railway init
railway up
```

### Environment Separation

```bash
# Development
NODE_ENV=development
DEV_AUTH_ENABLED=true
DATABASE_URL=postgresql://localhost:5432/uninexusgenz_dev

# Staging
NODE_ENV=staging
DEV_AUTH_ENABLED=false
DATABASE_URL=postgresql://staging-server/uninexusgenz_staging

# Production
NODE_ENV=production
DEV_AUTH_ENABLED=false
DATABASE_URL=postgresql://prod-server/uninexusgenz_prod
```

### Database Backups

```bash
# Daily backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump postgresql://user:pass@host/uninexusgenz > backup_$TIMESTAMP.sql

# Cron job (runs daily at 2 AM)
0 2 * * * /home/ubuntu/backup.sh
```

### Monitoring

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs uninexus-api

# Monitor resources
pm2 monit
```

---

## Summary

You should now have:

✅ Development environment set up locally
✅ Database running with schema and seed data
✅ Firebase authentication configured
✅ Backend API running on port 5000
✅ Frontend running on port 5173
✅ Demo accounts ready for testing
✅ Understanding of deployment options

**Next Steps:**
1. Read the [Architecture Guide](./ARCHITECTURE.md) to understand system design
2. Explore the codebase: `client/src`, `server/routes`, `shared/schema.ts`
3. Run tests: `npm test`
4. Join development discussions in your team chat

**Questions?** Check the troubleshooting section or ask your team lead.

Happy coding! 🚀
