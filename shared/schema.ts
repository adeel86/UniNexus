/**
 * Schema Re-export
 * 
 * This file re-exports all schemas from the domain-based modules for backward compatibility.
 * All imports from '@shared/schema' will continue to work.
 * 
 * For new code, prefer importing from specific domains:
 * - @shared/schema/users
 * - @shared/schema/feed
 * - @shared/schema/courses
 * - @shared/schema/groups
 * - @shared/schema/messaging
 * - @shared/schema/notifications
 * - @shared/schema/gamification
 * - @shared/schema/certifications
 * - @shared/schema/ai
 * - @shared/schema/auth
 */
export * from './schema/index';
