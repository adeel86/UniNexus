# UniNexus — Gen‑Z Social Learning & Engagement Platform

UniNexus is a modern social-learning and engagement platform aimed at Gen‑Z students. It combines community features (posts, profiles, feeds), learning tools (courses, micro-lessons, quizzes), and career/mentorship services into a single mobile‑friendly web app.

This README describes the project's purpose, main features, architecture, development setup, and other technical details to help contributors get started quickly.

## Key goals
- Provide a social feed where students can post, react, and discuss learning materials.
- Offer compact learning experiences (micro-lessons, flashcards, quizzes).
- Connect students with career resources, bots/AI helpers, and industry dashboards.
- Prioritize mobile-first experiences and Gen‑Z friendly UI and UX.

## Features
- User authentication (Firebase auth on client; Firebase Admin on server).
- Rich social feed: posts, likes, comments, images/media.
- Role-based UI and access control (student, mentor, industry, admin).
- Career tools: dashboards, bot helpers, and resources.
- Small learning modules: posts-as-lessons, quizzes, badges/achievements.
- Realtime-ish features: notifications, toasts, and lightweight websocket support (where applicable).
- Admin/dev tools: seed data, database migrations with Drizzle, and simple server routes.

## Tech stack
- Frontend: React (TypeScript), Vite, Tailwind CSS
- Backend: Node (ESM), Express + lightweight routes
- Database: Postgres (via DATABASE_URL); Drizzle ORM and drizzle-kit for migrations
- Authentication: Firebase (client) + Firebase Admin (server)
- Storage: Firebase Storage (used for media/uploads)
- Dev tooling: tsx for running TypeScript entrypoints, esbuild for bundling server artifact, vite for frontend build/dev
- Optional AI: OpenAI integration (OPENAI_API_KEY) for assistant features

Dependencies and devDependencies are declared in `package.json` — key scripts used by contributors are listed below.

## Repo layout (important folders)
- `client/` — React app (entries: `main.tsx`, `App.tsx`, `pages/`, `components/`).
- `server/` — Server entry and backend logic (`index.ts`, `routes.ts`, `firebaseAuth.ts`, `seed.ts`, `storage.ts`, etc.).
- `shared/` — Shared types and DB schema (`schema.ts`).
- `migrations/` and `drizzle.config.ts` — DB migrations and Drizzle configuration.
- `attached_assets/` — design / spec documents and notes.

## Environment variables
Use `.env` (or a dev `.env.local`) based on `.env.example`. Do NOT commit real secrets or service account keys.

From `.env.example`:

- VITE_FIREBASE_API_KEY — Firebase web API key (client)
- VITE_FIREBASE_AUTH_DOMAIN — Firebase auth domain
- VITE_FIREBASE_PROJECT_ID — Firebase project id
- VITE_FIREBASE_STORAGE_BUCKET — Firebase storage bucket
- VITE_FIREBASE_MESSAGING_SENDER_ID — Firebase messaging id
- VITE_FIREBASE_APP_ID — Firebase app id
- (Backend) serviceAccountKey.json — Firebase Admin SDK JSON file (place in project root, DO NOT commit)
- OPENAI_API_KEY — (optional) OpenAI API key for AI assistant features
- DATABASE_URL — Postgres connection string used by Drizzle and server

Add any additional variables your environment requires (for example, session secrets or third‑party API keys).

## Scripts
Key scripts from `package.json` (run from project root):

- npm run dev — Runs the server in development mode (uses `tsx server/index.ts`) and starts the Vite frontend dev server.
- npm run build — Builds the frontend with Vite and bundles the server using esbuild into `dist/`.
- npm run start — Runs the production server from `dist/index.js`.
- npm run check — Runs TypeScript type checks (tsc).
- npm run db:push — Push schemas/migrations using `drizzle-kit`.
- npm run db:seed — Run `server/seed.ts` via `tsx` to seed dev data.

Example: to start locally (see prerequisites below):

```bash
# install deps
npm install

# start dev server (frontend + backend dev)
npm run dev
```

## Local development — quickstart
Prerequisites:
- Node.js (LTS recommended; Node 18+ preferred)
- npm (or pnpm/yarn) — examples below use npm
- Postgres instance (or use a dev container) and export `DATABASE_URL`
- Firebase project and client keys (populate env vars listed above)

Steps:
1. Clone the repo and cd into it.
2. Copy `.env.example` to `.env` and fill in your Firebase and DB values.
3. Place `serviceAccountKey.json` (Firebase Admin) in the project root for server use. Keep this secret.
4. Install dependencies:

```bash
npm install
```

5. (Optional) Prepare the database and push Drizzle migrations:

```bash
npm run db:push
npm run db:seed
```

6. Start development mode:

```bash
npm run dev
```

Open the frontend at the URL printed by the Vite dev server (usually http://localhost:5173) and the backend routes as printed on server start.

## Architecture notes
- The project uses a single repository with a separate `client/` and `server/` entry but shared types/schemas in `shared/`.
- The server is written in TypeScript (ESM) and is designed to be bundled for production with esbuild.
- Database models are defined using Drizzle's schema in `shared/schema.ts` and migrations are stored under `migrations/`.
- Authentication flow:
  - Client authenticates with Firebase (web SDK) — tokens returned to client.
  - Backend validates tokens using the Firebase Admin SDK (service account JSON) on protected routes.
- Optional AI features use the OpenAI SDK; guard usage behind environment checks and rate limiting for production.

## API & routes
- Server routes live in `server/routes.ts` and the main server entry is `server/index.ts`.
- Typical patterns: JSON REST endpoints, express middleware for sessions/auth, and static/frontend proxying in dev.

## Tests, linting & typechecking
- The repo includes `tsc` for type checks (`npm run check`). Add linting (ESLint) if desired. There are no test scripts in `package.json` by default — consider adding unit/integration tests in `client/` and `server/` with a framework like Vitest or Jest.

## Deployment
- Build for production with `npm run build` (bundles frontend and server). Deploy static frontend to your hosting provider and start the bundled server (`npm run start`).
- For server deployment, ensure `serviceAccountKey.json` or equivalent secret is available securely (use env-based secrets in cloud providers).
- For Postgres, provide a managed instance and set `DATABASE_URL` accordingly.

## Contributing
- Fork & open PRs. Keep changes focused.
- Add tests for new functionality.
- Keep secrets out of the repository. Use `.gitignore` to exclude `serviceAccountKey.json` and `.env`.

## Next steps & low-risk improvements (suggested)
- Add automated tests (Vitest) and a CI pipeline for typechecking and linting.
- Add ESLint and a prettier configuration to enforce consistent style.
- Add GitHub Actions for build + deploy and DB migration verification.
- Add a simple Postgres Docker Compose file for local development.

## Contact / maintainers
See repository owner and contributors for maintenance and access. For architecture discussions, open an issue or PR with the `proposal` label.

---
*This README was generated to reflect the repository structure and scripts. If something here is inaccurate or you prefer a different workflow, update this file or open a PR.*
