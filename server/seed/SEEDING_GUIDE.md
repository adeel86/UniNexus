# UniNexus Database Seeding Guide

## Overview

UniNexus now supports **three configurable seed profiles** to match different development and testing needs:

- **minimal** — Quick setup for demo-only testing
- **standard** — Realistic development dataset (default)
- **comprehensive** — Large dataset for stress testing and performance analysis

## Quick Start

### Default Seeding (Standard Profile)
```bash
npm run db:seed
```

### With Profile Selection
```bash
# Minimal (5 demo users + essential data)
npm run db:seed -- minimal

# Standard (50 users + realistic relationships) - DEFAULT
npm run db:seed -- standard

# Comprehensive (200 users + rich data) - Full stress test
npm run db:seed -- comprehensive
```

## Profile Comparison

| Aspect | Minimal | Standard | Comprehensive |
|--------|---------|----------|---------------|
| **Users** | 5 demo only | 55 (5 demo + 50 generated) | 205 (5 demo + 200 generated) |
| **Posts** | 5 total | 150+ | 500+ |
| **Courses** | 2 | 8 | 20 |
| **Groups** | 1 | 5 | 15 |
| **Challenges** | 0 | 2 | 5 |
| **Connections** | 10% | 30% | 60% |
| **Follow Rate** | 10% | 40% | 70% |
| **Setup Time** | <1s | 5-10s | 30-60s |
| **Use Case** | Quick testing | Development | Load testing |

## What Each Profile Generates

### Minimal Profile
Perfect for **quick feature testing** and **demo accounts**:
- ✅ 5 demo user accounts (student, teacher, admin, industry, master_admin)
- ✅ 2 courses with basic enrollments
- ✅ 5 posts with minimal engagement
- ✅ 1 group
- ❌ No bulk user generation
- ❌ No challenges
- ❌ Minimal social connections

### Standard Profile (Default)
Ideal for **daily development** with realistic data:
- ✅ 5 demo accounts + 50 generated realistic users
- ✅ 8 diverse courses across different universities
- ✅ 100-150 posts from various users
- ✅ 5 active groups
- ✅ 2 challenges with participation
- ✅ 30% of users connected
- ✅ 40% follow relationships
- ✅ 50+ comments per post on average
- ✅ AI interaction events and recruiter feedback

### Comprehensive Profile
For **stress testing**, **performance analysis**, and **realistic scenarios**:
- ✅ 5 demo accounts + 200 generated users (diverse roles)
- ✅ 20 courses with 80% enrollment rate
- ✅ 500+ posts with rich engagement
- ✅ 15 groups with 70% membership
- ✅ 5 challenges with 60% participation
- ✅ 60% network connections
- ✅ 70% follow relationships
- ✅ 1000+ total comments and reactions
- ✅ Extensive AI event logs
- ✅ Comprehensive recruiter feedback

## Configuration Details

All profiles are defined in `server/seed/config.ts`. Each profile specifies:

```typescript
{
  profile: 'minimal' | 'standard' | 'comprehensive',
  users: {
    demoAccountsOnly: boolean,  // Always include 5 demo accounts
    bulkUserCount: number,      // Additional generated users
  },
  posts: {
    perUser: number,            // Average posts per user
    totalMin: number,           // Minimum total posts
  },
  courses: {
    count: number,              // Total courses to create
    enrollmentRate: number,     // % of users enrolling (0.0-1.0)
  },
  groups: {
    count: number,              // Total groups
    membershipRate: number,     // % users joining groups
  },
  challenges: {
    count: number,              // Challenges
    participationRate: number,  // % participation
  },
  connections: {
    connectionRate: number,     // % users connecting
    followRate: number,         // % follow relationships
  },
  social: {
    commentsPerPost: number,    // Average comments
    reactionsPerPost: number,   // Average reactions
    endorsementsPerUser: number,// Skill endorsements
    messagesPerConversation: number,
  },
  education: {
    recordsPerUser: number,     // Education history entries
  },
  aiData: {
    aiEventsPerUser: number,    // AI interaction events
    chatSessionsPerUser: number,// AI chat sessions
    chatMessagesPerSession: number,
  },
  gamification: {
    badgesPerUser: number,      // Badges awarded
    certificatesPerUser: number,// Certificates
    notificationsPerUser: number,// Notifications sent
  }
}
```

## Customizing Profiles

To create a custom profile:

1. **Edit** `server/seed/config.ts`
2. **Add** a new profile to `seedProfiles`:
```typescript
export const seedProfiles: Record<SeedProfile, SeedConfig> = {
  minimal: { /* ... */ },
  standard: { /* ... */ },
  comprehensive: { /* ... */ },
  custom: {  // Your custom profile
    profile: 'custom',
    users: { demoAccountsOnly: false, bulkUserCount: 100 },
    posts: { perUser: 5, totalMin: 200 },
    // ... rest of config
  }
};
```

3. **Update type definition**:
```typescript
export type SeedProfile = 'minimal' | 'standard' | 'comprehensive' | 'custom';
```

4. **Run**:
```bash
npm run db:seed -- custom
```

## Data Distribution

### User Roles (in generated users)
- 60% Students
- 20% Teachers
- 15% Industry Professionals
- 5% University Admins

### Universities (across generated data)
- Tech University
- State University
- Demo University
- Innovation Institute
- Digital Academy

### Post Categories
- 30% Project/Achievement
- 25% Academic/Announcements
- 25% Social/Discussion
- 20% Career-related

### Skills (10 core + role-specific)
- Technical: JavaScript, Python, React, Machine Learning, Data Analysis, etc.
- Soft Skills: Communication, Teamwork, Problem Solving
- Creative: UI/UX Design, Figma, Content Creation

## Seed Flow Diagram

```
seedDatabase(profileName?)
    ↓
getSeedProfile() → returns SeedConfig
    ↓
seedUsers(config)  ← Only function using config currently
    ↓
seedBadges()
seedSkills()
seedEducation()
seedPosts()
seedCourses()
seedConnections()
seedFollowers()
seedEndorsements()
seedConversations()
seedMessages()
seedChallenges()
seedGroups()
seedNotifications()
seedAnnouncements()
seedCertifications()
seedAIEvents()
seedModerationActions()
seedRecruiterFeedback()
seedJobExperience()
seedPostSharesAndBoosts()
    ↓
✅ Complete database
```

## Troubleshooting

### Seed runs very slowly
**Solution**: Use `minimal` profile first to test, then scale up:
```bash
npm run db:seed -- minimal  # <1 second
npm run db:seed -- standard # 5-10 seconds
```

### Out of memory errors
**Solution**: Clear existing data and run minimal profile:
```bash
npm run db:reset
npm run db:seed -- minimal
```

### Duplicate user errors
**Solution**: Users are deterministically generated using email + SHA256 hash:
```typescript
firebaseUid = crypto.createHash('sha256').update(email).digest('hex').slice(0, 28);
```
Running the same profile twice is idempotent (no duplicates added).

### Want to reset and reseed?
```bash
# Drop all tables and reseed with minimal
npm run db:reset && npm run db:seed -- minimal

# Or reset and use standard
npm run db:reset && npm run db:seed -- standard
```

## Architecture Notes

### Modular Design
Each entity type (users, posts, badges, etc.) has its own module in `server/seed/data/`:
- `users.ts` — User generation (supports SeedConfig)
- `badges.ts` — Badge system
- `skills.ts` — Skills and endorsements
- `posts.ts` — Social posts
- `courses.ts` — Learning content
- `social.ts` — Connections, followers, messages
- `gamification.ts` — Challenges, groups, notifications
- `admin.ts` — Admin features, AI events

### Configuration Priority
The main `index.ts` orchestrator:
1. ✅ Accepts seed profile parameter
2. ✅ Logs configuration to user
3. ✅ Calls `seedUsers(config)` with configuration
4. ⏳ Other functions called with default behavior (can be enhanced)

### Future Enhancements
To fully leverage profiles, enhance each seed function:
```typescript
// Currently
export async function seedPosts(insertedUsers: User[]): Promise<Post[]>

// Could become
export async function seedPosts(insertedUsers: User[], config?: SeedConfig): Promise<Post[]> {
  const postsPerUser = config?.posts.perUser ?? 3;
  // Generate posts based on config
}
```

## Advanced Usage

### Programmatic Seeding
```typescript
import { seedDatabase, getSeedProfile } from './server/seed';

// In your setup script
await seedDatabase('comprehensive');

// Or get profile for inspection
const config = getSeedProfile('standard');
console.log(config.users.bulkUserCount); // 50
```

### Profile for CI/CD
```bash
# In GitHub Actions or similar
npm run db:seed -- minimal  # Fast, for CI tests
```

### Profile for Staging
```bash
# On staging environment
npm run db:seed -- comprehensive  # Realistic data
```

## Summary

The seed system provides flexibility:
| Need | Profile | Command |
|------|---------|---------|
| Unit testing | minimal | `npm run db:seed -- minimal` |
| Development | standard | `npm run db:seed` (default) |
| Load testing | comprehensive | `npm run db:seed -- comprehensive` |
| Custom | custom | Edit `config.ts` and run |

Choose the profile that matches your use case, and enjoy consistent, realistic test data! 🌱
