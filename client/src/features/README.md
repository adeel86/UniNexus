# Frontend Features

This directory organizes frontend code by business domain/feature.

## Structure

Each feature folder contains:
- `components/` - UI components specific to this feature
- `hooks/` - Custom hooks for data fetching and state
- `api/` - API service functions and query keys

## Features

- `auth/` - Login, registration, auth flows
- `feed/` - Social feed, posts, comments
- `courses/` - Course browsing, enrollment, progress
- `groups/` - Group discovery and management
- `chat/` - Direct messaging
- `ai/` - AI assistant, career bot
- `notifications/` - Notification center
- `challenges/` - Gamification, leaderboards
- `profile/` - User profiles, settings
- `admin/` - Admin dashboards

## Shared Components

The `components/ui/` folder contains shared design system components.
These are framework-level primitives (Button, Card, Dialog, etc.)
that should NOT be moved into feature folders.

## Guidelines

- Components should be focused and single-purpose
- Use hooks for data fetching with React Query
- Keep API functions in `api/` for easy mocking/testing
- Import shared UI from `@/components/ui`
