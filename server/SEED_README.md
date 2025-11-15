# UniNexus Comprehensive Mock Data Generator

## Overview

The comprehensive seed script (`comprehensive-seed.ts`) populates the entire UniNexus platform with realistic, diverse, and internally consistent mock data across 30+ database tables.

## Data Volume

The seed generates approximately **5,000 rows** across all tables:

- **50-60 users** across all roles (students, teachers, industry professionals, university admins, master admin)
- **200+ posts** with realistic content and metadata
- **400+ reactions** across different types (like, celebrate, insightful, support)
- **150+ comments** on posts
- **20+ courses** across multiple universities
- **80+ course discussions** with replies and upvotes
- **10+ challenges** with participants
- **15+ certifications** with NFT-style verification hashes
- **50+ endorsements** between users
- **100+ follower** relationships
- **6+ groups** with 150+ memberships
- AI interaction events, moderation actions, announcements, and more

## Usage

### Running the Seed

```bash
npm run db:seed:full
```

This will populate your database with comprehensive mock data following a multi-phase pipeline:

1. **Phase 1**: Canonical lookup data (skills, badges)
2. **Phase 2**: Primary actors (users across all roles)
3. **Phase 3**: Academic artifacts (courses, enrollments, discussions)
4. **Phase 4**: Engagement surfaces (posts, reactions, comments, groups)
5. **Phase 5**: Ancillary systems (certifications, recruiter feedback, AI events)
6. **Additional**: User skills, badges, endorsements, notifications

### Configuration

You can modify data volume by editing the `CONFIG` object in `comprehensive-seed.ts`:

```typescript
const CONFIG = {
  STUDENTS_PER_UNIVERSITY: 10,  // Students per university
  TEACHERS_PER_UNIVERSITY: 2,    // Teachers per university
  UNIVERSITIES: ["MIT", "Stanford", "UC Berkeley", "Carnegie Mellon", "Georgia Tech"],
  INDUSTRY_PROFESSIONALS: 8,      // Total industry professionals
  UNIVERSITY_ADMINS: 3,           // Total university admins
  COURSES_PER_UNIVERSITY: 4,      // Courses per university
  POSTS_PER_STUDENT: 5,           // Posts per student
  CHALLENGES: 5,                  // Total challenges
  GROUPS: 6,                      // Total groups
};
```

## Features

### Realistic Data Generation

- Uses `@faker-js/faker` for generating realistic names, emails, content
- Deterministic seeding (seed=42) ensures reproducible data
- Diverse demographics and backgrounds across all user roles

### Internal Consistency

- Comments reference actual posts
- Course enrollments match student universities
- Discussion replies belong to enrolled students
- Challenge participants are verified students
- Recruiter feedback ties to actual industry professionals
- NFT-style certifications include verification hashes

### Multi-Role Support

- **Students**: With majors, graduation years, interests, scores, and ranks
- **Teachers**: With universities and positions
- **Industry Professionals**: With companies and positions
- **University Admins**: With universities
- **Master Admin**: Platform administrator

### Gamification Data

- Badges with multiple tiers (bronze, silver, gold, platinum)
- User skills with proficiency levels (beginner, intermediate, advanced, expert)
- Endorsements between users
- Challenge participation and rankings
- Points calculation and rank tiers

### Advanced Features

- **NFT-Style Certifications**: SHA-256 verification hashes for authenticity
- **Recruiter Feedback**: Industry professionals providing student feedback
- **AI Interaction Events**: Logs of AI chatbot interactions
- **Moderation Actions**: Content moderation tracking
- **Social Network**: Followers, connections, groups, messages
- **Academic**: Courses, discussions, replies, upvotes, milestones

## Factory Helpers

The seed script includes factory functions for generating consistent data:

- `makeUser(options)`: Create users with different roles
- `makePost(authorId, interests)`: Generate posts with relevant tags
- `makeCourse(university, instructorId)`: Create course data

## Data Safety

- Uses `onConflictDoNothing()` for rerun safety
- All inserts are batched for performance
- Returns inserted IDs for downstream references
- No destructive operations on existing data

## Cleanup

To clear the database and reseed:

```bash
# Push fresh schema (wipes data)
npm run db:push --force

# Run comprehensive seed
npm run db:seed:full
```

## Technical Notes

- Total execution time: ~30-60 seconds
- Memory usage: Moderate (batched inserts)
- Database size: ~50-100MB with indexes
- Uses transactions where possible for data integrity

## Customization

To add more data types:

1. Add new factory helpers
2. Create a new phase function
3. Call it in `comprehensiveSeed()` main function
4. Update CONFIG constants as needed

## Support

For issues or questions about the seed script:
- Check LSP errors with `npx tsc --noEmit server/comprehensive-seed.ts`
- Verify database connection
- Check logs for specific error messages
