# UniNexus Database Seeding

## Overview

The database seeding system populates the UniNexus platform with realistic, diverse, and internally consistent mock data across 30+ database tables.

## Architecture

### Modular Structure (Refactored)

The seed system is organized into modular files for maintainability:

```
server/
├── seed.ts                    # Main entry point (re-exports from seed/index.ts)
├── seed/
│   ├── index.ts               # Orchestrator - coordinates all seed functions
│   └── data/
│       ├── users.ts           # User accounts (students, teachers, admins, etc.)
│       ├── badges.ts          # Badges and user badge assignments
│       ├── skills.ts          # Skills and user skill assignments
│       ├── education.ts       # Education records and user profiles
│       ├── posts.ts           # Posts, comments, and reactions
│       ├── courses.ts         # Courses, enrollments, discussions, teacher content
│       ├── social.ts          # Connections, followers, endorsements, messages
│       ├── gamification.ts    # Challenges, groups, notifications, certifications
│       └── admin.ts           # AI events, moderation, recruiter feedback, job experience
└── comprehensive-seed.ts      # Alternative comprehensive seeder with larger dataset
```

### Execution Order

The seeding follows a dependency-aware order:

1. **Users** - Foundation for all other data
2. **Badges & Skills** - Lookup tables and user assignments
3. **Education & Profiles** - User educational background
4. **Posts & Engagement** - Social feed content
5. **Courses & Enrollments** - Academic data
6. **Social Connections** - User relationships
7. **Gamification** - Challenges, groups, achievements
8. **Admin Data** - AI events, moderation, feedback

## Usage

### Running the Seed

**For development seed:**
```bash
npm run db:seed
```

**For comprehensive seed (larger dataset):**
```bash
npm run db:seed:full
```

**For a fresh start (recommended):**
```bash
# Reset database schema first (wipes existing data)
npm run db:push -- --force

# Run seed
npm run db:seed
```

## Data Volume (Standard Seed)

- **12 users** across all roles (students, teachers, admins, industry professionals)
- **7 badges** with user assignments
- **10 skills** with proficiency levels
- **Posts** with realistic content
- **Courses** with enrollments and discussions
- **Social connections, messages, and groups**
- **Challenges and certifications**

## Data Volume (Comprehensive Seed)

Approximately **9,500+ rows** across all tables:

- **142 users** across all roles
- **392 posts** with realistic content
- **4,866 reactions** across different types
- **925 comments** on posts
- **20 courses** across 5 universities
- And much more...

## Features

### Realistic Data Generation

- Uses `@faker-js/faker` for generating realistic names, emails, content
- Deterministic seeding ensures reproducible data
- Diverse demographics and backgrounds

### Internal Consistency

- Comments reference actual posts
- Course enrollments match student universities
- Discussion replies belong to enrolled students
- Challenge participants are verified students
- Recruiter feedback ties to actual industry professionals

### Multi-Role Support

- **Students**: With majors, graduation years, interests, scores, and ranks
- **Teachers**: With universities and positions
- **Industry Professionals**: With companies and positions
- **University Admins**: With universities
- **Master Admin**: Platform administrator

### Data Safety

- Uses `onConflictDoNothing()` for rerun safety
- All inserts are batched for performance
- Returns inserted IDs for downstream references
- No destructive operations on existing data

## Adding New Seed Data

1. Create or modify the appropriate file in `server/seed/data/`
2. Export your seed function
3. Import and call it in `server/seed/index.ts` at the correct position
4. Ensure proper dependency ordering

## Support

For issues:
- Check LSP errors: `npx tsc --noEmit`
- Verify database connection
- Check console logs for specific error messages
