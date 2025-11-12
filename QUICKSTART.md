# 🚀 UniNexus Quick Start (One-Liner)

## Start Development (after first setup)
```bash
PORT=3000 DATABASE_URL="postgres://postgres:postgres@localhost:5432/uninexusgenz" npm run dev
```

## Access Points
- **App:** http://localhost:3000
- **API:** http://localhost:3000/api/
- **Database:** postgres://postgres:postgres@localhost:5432/uninexusgenz

## Demo Login Accounts
| Role | Email | Password |
|------|-------|----------|
| Student | demo.student@uninexus.app | (Firebase) |
| Teacher | demo.teacher@uninexus.app | (Firebase) |
| University Admin | demo.university@uninexus.app | (Firebase) |
| Industry Partner | demo.industry@uninexus.app | (Firebase) |

## Seed Data Includes
✅ 12 Users  
✅ 7 Badges  
✅ 10 Skills  
✅ 5 Posts + 5 Comments + 6 Reactions  
✅ 3 Courses + 5 Enrollments  
✅ 2 Challenges + 4 Participants  
✅ 3 Notifications + 2 Announcements  

## Docker Postgres Status
```bash
docker ps | grep postgres  # Check if running
docker restart uninexus-db  # Restart if needed
```

## Useful Commands
```bash
npm run check                                              # Type check
npm run db:push                                            # Run migrations
DATABASE_URL="postgres://postgres:postgres@localhost:5432/uninexusgenz" npm run db:seed  # Reseed DB
npm run build                                              # Build production
```

## Files You Edited
- `server/db.ts` — Changed from Neon serverless to standard PostgreSQL driver
- `server/index.ts` — Removed `reusePort: true` (macOS incompatibility)

## Troubleshooting
- **Port in use?** → Use `PORT=4000 ...` instead
- **DB connection error?** → Check Docker: `docker ps`
- **Build error?** → Run `npm run check` for TypeScript issues

---

📖 Full guide: See `SETUP_GUIDE.md`
