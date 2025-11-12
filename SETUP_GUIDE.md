# UniNexus Local Development Setup Guide

## ✅ Setup Complete!

You now have a fully configured local development environment for UniNexus with all seed data populated.

---

## 📋 What Was Done

### 1. **Environment Setup** ✓
- ✅ Node.js v24.11.0 verified
- ✅ npm 11.6.1 verified
- ✅ `.env` file created with Firebase and database configuration
- ✅ Firebase service account JSON file located at `./secrets/firebase-service-account.json`

### 2. **Dependencies Installation** ✓
- ✅ npm install completed (784 packages)
- ✅ All project dependencies resolved
- ✅ PostgreSQL driver (`pg`) available via `connect-pg-simple`

### 3. **Database Setup** ✓
- ✅ PostgreSQL container running (`uninexus-db` via Docker)
- ✅ Database `uninexusgenz` created and accessible
- ✅ Drizzle migrations applied to `localhost:5432`

### 4. **Database Seeding** ✓
The following seed data was populated:
- ✅ **12 Users** (demo accounts with different roles):
  - Demo Student
  - Demo Teacher
  - Demo University Admin
  - Demo Industry Partner
  - Demo Master Admin
  - + 7 additional test users
- ✅ **7 Badges** (gamification rewards)
- ✅ **10 Skills** (user skills)
- ✅ **5 Posts** (social feed content)
- ✅ **5 Comments**
- ✅ **6 Reactions** (likes, etc.)
- ✅ **3 Courses** (learning modules)
- ✅ **5 Course Enrollments**
- ✅ **2 Course Discussions**
- ✅ **2 Discussion Replies**
- ✅ **2 Challenges**
- ✅ **4 Challenge Participants**
- ✅ **3 Notifications**
- ✅ **2 Announcements**

### 5. **Development Server Running** ✓
- ✅ Backend server started on **port 3000**
- ✅ Frontend (Vite) dev server initialized
- ✅ Firebase authentication middleware ready
- ✅ Express API routes configured

---

## 🚀 How to Access UniNexus

### Frontend
```
http://localhost:3000
```

### API Endpoints
```
http://localhost:3000/api/...
```

### Vite Dev Server (Frontend only, if needed)
Vite is running within the Express server for development. Access the full app via port 3000.

---

## 📚 Demo Accounts

You can log in with these demo accounts to test different roles:

### Student Account
- **Email:** demo.student@uninexus.app
- **Role:** Student
- **Features:** Social feed, gamification, badges, career bot

### Teacher Account
- **Email:** demo.teacher@uninexus.app
- **Role:** Teacher
- **Features:** Student analytics, endorsement tools

### University Admin Account
- **Email:** demo.university@uninexus.app
- **Role:** University Admin
- **Features:** Retention metrics, institutional insights

### Industry Partner Account
- **Email:** demo.industry@uninexus.app
- **Role:** Industry Professional
- **Features:** Talent discovery, challenge posting

---

## 🛠️ Useful Commands

### Development
```bash
# Start dev server (backend + frontend)
PORT=3000 DATABASE_URL="postgres://postgres:postgres@localhost:5432/uninexusgenz" npm run dev

# Type checking
npm run check

# View database migrations
npm run db:push
```

### Database Operations
```bash
# Push schema changes
npm run db:push

# Reseed the database (clears and repopulates)
DATABASE_URL="postgres://postgres:postgres@localhost:5432/uninexusgenz" npm run db:seed
```

### Docker (Postgres)
```bash
# View running containers
docker ps

# Check Postgres container logs
docker logs uninexus-db

# Stop Postgres
docker stop uninexus-db

# Start Postgres
docker start uninexus-db
```

### Build & Production
```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## 📦 Database Connection

**Connection String:**
```
postgres://postgres:postgres@localhost:5432/uninexusgenz
```

**Details:**
- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `uninexusgenz`

**Access via pgAdmin:** http://localhost:80 (if running)

---

## 🔧 Configuration Files

### Environment Variables (`.env`)
Located at project root. Key variables:

```bash
# Server
PORT=3000
VITE_WS_URL=ws://localhost:3000

# Firebase (Client-side)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# etc.

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/uninexusgenz

# OpenAI (optional)
OPENAI_API_KEY=...

# Dev Auth
DEV_AUTH_ENABLED=true
DEV_JWT_SECRET=...
```

### Key Configuration Files
- `drizzle.config.ts` — Database migrations
- `vite.config.ts` — Frontend build config
- `tailwind.config.ts` — Styling
- `tsconfig.json` — TypeScript config
- `package.json` — Dependencies & scripts

---

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is in use:
```bash
PORT=4000 DATABASE_URL="postgres://postgres:postgres@localhost:5432/uninexusgenz" npm run dev
```

### Database Connection Error
1. Verify Postgres container is running:
   ```bash
   docker ps | grep postgres
   ```

2. Restart if needed:
   ```bash
   docker restart uninexus-db
   ```

3. Check connection string in `.env`

### Build Issues
```bash
npm run check  # TypeScript check
npm audit fix  # Fix vulnerabilities
```

### Vite/Frontend Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Next Steps

1. **Explore the code:**
   - Frontend: `client/src/`
   - Backend: `server/`
   - Shared types: `shared/schema.ts`

2. **Make changes & test:**
   - Edit files in `client/src/` for frontend changes
   - Edit files in `server/` for backend changes
   - Hot reload enabled in dev mode

3. **Add new features:**
   - Update schema in `shared/schema.ts`
   - Run `npm run db:push` to apply migrations
   - Implement endpoints in `server/routes.ts`
   - Build UI components in `client/src/components/`

4. **Run tests:**
   - Consider adding Vitest or Jest tests
   - Run TypeScript checks with `npm run check`

---

## 📚 Documentation

- **README.md** — Project overview, tech stack, and architecture
- **design_guidelines.md** — UI/UX design patterns
- **components.json** — Component library config

---

## ✨ Features You Can Test

- 👥 **Social Feed** — View posts, comments, reactions
- 🎓 **Learning** — Enroll in courses, take quizzes
- 🏆 **Gamification** — Badges, achievements, streaks
- 💼 **Career Tools** — Industry dashboards, CareerBot
- 🔐 **Authentication** — Firebase auth flow
- 📱 **Responsive Design** — Mobile-first UI

---

## 📞 Support

If you encounter issues:
1. Check `.env` configuration
2. Verify Postgres is running: `docker ps`
3. Review server logs from the terminal
4. Run TypeScript check: `npm run check`

---

**Happy coding! 🚀**
