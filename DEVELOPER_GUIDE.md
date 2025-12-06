# UniNexus Developer Guide

## Quick Navigation

### Finding Features

| Feature | Frontend Location | Backend Location |
|---------|------------------|------------------|
| **Authentication** | `client/src/pages/Login.tsx`, `Register.tsx` | `server/routes/auth.ts` |
| **Social Feed** | `client/src/components/PostCard.tsx`, `UniversalFeed.tsx` | `server/routes/feed.ts` |
| **Messaging** | `client/src/pages/Messages.tsx` | `server/routes/messaging.ts` |
| **Courses** | `client/src/pages/Courses.tsx`, `CourseDetail.tsx` | `server/routes/courses.ts` |
| **Teacher Content** | `client/src/components/TeacherContentUpload.tsx` | `server/routes/teacher-content.ts` |
| **Groups** | `client/src/pages/GroupPage.tsx`, `GroupsDiscovery.tsx` | `server/routes/groups.ts` |
| **Challenges** | `client/src/pages/Challenges.tsx` | `server/routes/challenges.ts` |
| **AI/CareerBot** | `client/src/components/CareerBot.tsx`, `StudentAITutor.tsx` | `server/routes/ai.ts` |
| **User Profiles** | `client/src/pages/Profile.tsx` | `server/routes/users.ts` |
| **Connections** | `client/src/pages/Network.tsx` | `server/routes/connections.ts` |
| **Notifications** | `client/src/pages/Notifications.tsx` | `server/routes/notifications.ts` |
| **Admin** | `client/src/pages/MasterAdminDashboard.tsx` | `server/routes/admin.ts` |

### Role-Specific Dashboards

| Role | Dashboard Page |
|------|---------------|
| Student | `client/src/pages/StudentHome.tsx` |
| Teacher | `client/src/pages/TeacherDashboard.tsx` |
| University Admin | `client/src/pages/UniversityDashboard.tsx` |
| Industry Professional | `client/src/pages/IndustryDashboard.tsx` |
| Master Admin | `client/src/pages/MasterAdminDashboard.tsx` |

## Project Structure

```
client/src/
├── components/         # Reusable UI components
│   ├── ui/            # Shadcn base components (do not modify)
│   └── *.tsx          # Feature-specific components
├── pages/             # Route pages (one per route)
├── hooks/             # Custom React hooks
│   ├── useAuth.ts     # Authentication hook
│   └── use-toast.ts   # Toast notifications
├── lib/               # Utilities
│   ├── AuthContext.tsx # Auth state provider
│   ├── firebase.ts    # Firebase config
│   └── queryClient.ts # TanStack Query setup
└── App.tsx            # Main app with routing

server/
├── routes/            # API route modules
│   ├── index.ts       # Route exports
│   ├── auth.ts        # Authentication endpoints
│   ├── feed.ts        # Posts, reactions, comments
│   ├── users.ts       # User profiles, skills
│   ├── courses.ts     # Course management
│   ├── messaging.ts   # Conversations, messages
│   ├── groups.ts      # Group management
│   ├── challenges.ts  # Industry challenges
│   ├── connections.ts # Follow/connect
│   ├── ai.ts          # AI chat endpoints
│   └── admin.ts       # Admin operations
├── routes.ts          # Main router setup
├── storage.ts         # Data access layer
├── db.ts              # Database connection
└── firebaseAuth.ts    # Auth middleware

shared/
└── schema.ts          # Drizzle ORM schema and types
```

## Common Development Tasks

### Adding a New API Endpoint

1. Open the appropriate route file in `server/routes/`
2. Add your route handler with authentication:
```typescript
router.get("/your-endpoint", isAuthenticated, async (req: AuthRequest, res) => {
  const userId = req.userId;
  // Your logic here
  res.json({ data });
});
```
3. Routes are automatically registered via `server/routes/index.ts`

### Adding a New Page

1. Create page component in `client/src/pages/YourPage.tsx`
2. Register route in `client/src/App.tsx`:
```typescript
<Route path="/your-path" component={YourPage} />
```

### Using the Database

1. Define schema in `shared/schema.ts`
2. Run `npm run db:push` to sync schema
3. Use `db` from `server/db.ts` for queries:
```typescript
import { db } from "../db";
import { yourTable } from "@shared/schema";

const results = await db.select().from(yourTable).where(eq(yourTable.id, id));
```

### Making API Calls (Frontend)

Use TanStack Query with typed queries:
```typescript
const { data, isLoading } = useQuery<YourType[]>({
  queryKey: ["/api/your-endpoint"],
});
```

For mutations:
```typescript
const mutation = useMutation({
  mutationFn: async (data) => apiRequest("POST", "/api/endpoint", data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] }),
});
```

## Demo Accounts

All use password: `demo123`

| Email | Role |
|-------|------|
| demo.student@uninexus.app | Student |
| demo.teacher@uninexus.app | Teacher |
| demo.university@uninexus.app | University Admin |
| demo.industry@uninexus.app | Industry Professional |
| demo.admin@uninexus.app | Master Admin |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DEV_AUTH_ENABLED` | Enable dev authentication (true/false) |
| `DEV_JWT_SECRET` | JWT secret for dev auth |
| `OPENAI_API_KEY` | OpenAI API key for CareerBot |
| `VITE_FIREBASE_*` | Firebase configuration (frontend) |

## Troubleshooting

### Database Issues
- Run `npm run db:push` to sync schema
- Run `npm run seed` to populate test data

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run check`

### Auth Issues
- Dev mode: Set `DEV_AUTH_ENABLED=true`
- Check browser console for Firebase errors
