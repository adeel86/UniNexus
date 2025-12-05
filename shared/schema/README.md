# Schema Modules

This directory contains the database schema organized by domain.

## Structure

- `index.ts` - Barrel export that re-exports all schemas (maintains backward compatibility)
- `auth.ts` - Sessions and authentication-related tables
- `users.ts` - User profiles, education, work experience
- `feed.ts` - Posts, comments, reactions, shares, boosts
- `courses.ts` - Courses, enrollments, milestones, discussions
- `groups.ts` - Groups, group members, group posts
- `messaging.ts` - Conversations and messages
- `ai.ts` - AI chat sessions, teacher content, content chunks
- `gamification.ts` - Badges, skills, endorsements, challenges
- `notifications.ts` - Notifications and announcements
- `certifications.ts` - Certifications and recruiter feedback

## Usage

Import from the barrel for convenience:
```typescript
import { users, posts, courses } from "@shared/schema";
```

Or import specific domains for clarity:
```typescript
import { users, usersRelations } from "@shared/schema/users";
```

## Guidelines

- Keep related tables together in the same file
- Define relations alongside their primary tables
- Export insert schemas and types from each module
- Use consistent naming: `insert[Table]Schema`, `[Table]` for select types
