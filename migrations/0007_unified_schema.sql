-- ============================================================================
-- UNIFIED DATABASE SCHEMA
-- ============================================================================
-- 
-- This is the comprehensive unified schema that consolidates all previous
-- migrations (0000-0006) into a single source of truth.
--
-- Organization:
-- 1. Authentication & Sessions
-- 2. Core User Tables
-- 3. Academic & Educational Tables
-- 4. Social & Networking Tables
-- 5. Gamification Tables
-- 6. Content & Learning Tables
-- 7. AI & Tutoring Tables
-- 8. Messaging Tables
-- 9. Notification Tables
-- 10. Administrative Tables
-- ============================================================================

-- ============================================================================
-- 1. AUTHENTICATION & SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");

-- ============================================================================
-- 2. CORE USER TABLES
-- ============================================================================

-- Main users table with all user information
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firebase_uid" varchar NOT NULL UNIQUE,
  "email" varchar UNIQUE,
  "first_name" varchar,
  "last_name" varchar,
  "display_name" varchar,
  "profile_image_url" varchar,
  "role" varchar(50) DEFAULT 'student' NOT NULL,
  "bio" text,
  -- University and Major (structured references)
  "university_id" varchar,
  "major_id" varchar,
  -- Legacy fields (deprecated but kept for backward compatibility)
  "university" varchar,
  "major" varchar,
  "graduation_year" integer,
  "institution" varchar,
  "company" varchar,
  "position" varchar,
  "interests" text[] DEFAULT ARRAY[]::text[],
  -- Verification and scoring
  "is_verified" boolean DEFAULT false NOT NULL,
  "verified_at" timestamp,
  "engagement_score" integer DEFAULT 0 NOT NULL,
  "problem_solver_score" integer DEFAULT 0 NOT NULL,
  "endorsement_score" integer DEFAULT 0 NOT NULL,
  "challenge_points" integer DEFAULT 0 NOT NULL,
  "total_points" integer DEFAULT 0 NOT NULL,
  "rank_tier" varchar(20) DEFAULT 'bronze' NOT NULL,
  "streak" integer DEFAULT 0 NOT NULL,
  "last_streak_increment_date" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_firebase_uid" ON "users" ("firebase_uid");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_university_id" ON "users" ("university_id");
CREATE INDEX IF NOT EXISTS "idx_users_major_id" ON "users" ("major_id");
CREATE INDEX IF NOT EXISTS "idx_users_last_streak_increment_date" ON "users" ("last_streak_increment_date");

-- User profiles with role-specific information
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "programme" varchar,
  "modules" text[] DEFAULT ARRAY[]::text[],
  "year_of_study" integer,
  "academic_goals" text,
  "career_goals" text,
  "teaching_subjects" text[] DEFAULT ARRAY[]::text[],
  "specializations" text[] DEFAULT ARRAY[]::text[],
  "professional_bio" text,
  "department" varchar,
  "office_hours" varchar,
  "university_mission" text,
  "focus_areas" text[] DEFAULT ARRAY[]::text[],
  "opportunities_offered" text,
  "contact_email" varchar,
  "contact_phone" varchar,
  "website" varchar,
  "company_mission" text,
  "industry_focus" text[] DEFAULT ARRAY[]::text[],
  "partnership_opportunities" text,
  "hiring_opportunities" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles" ("user_id");

-- Education history
CREATE TABLE IF NOT EXISTS "education_records" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "institution" varchar(200) NOT NULL,
  "degree" varchar(100),
  "field_of_study" varchar(100),
  "start_date" varchar,
  "end_date" varchar,
  "grade" varchar,
  "description" text,
  "is_current" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_education_records_user_id" ON "education_records" ("user_id");

-- Job experience
CREATE TABLE IF NOT EXISTS "job_experience" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "position" varchar(200) NOT NULL,
  "organization" varchar(200) NOT NULL,
  "start_date" varchar NOT NULL,
  "end_date" varchar,
  "description" text,
  "is_current" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_job_experience_user_id" ON "job_experience" ("user_id");

-- User preferences and settings
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  -- Notification preferences
  "email_notifications" boolean DEFAULT true NOT NULL,
  "push_notifications" boolean DEFAULT true NOT NULL,
  "comment_notifications" boolean DEFAULT true NOT NULL,
  "endorsement_notifications" boolean DEFAULT true NOT NULL,
  -- Privacy settings
  "public_profile" boolean DEFAULT true NOT NULL,
  "show_email" boolean DEFAULT false NOT NULL,
  "show_activity" boolean DEFAULT true NOT NULL,
  -- Two-factor authentication
  "two_factor_enabled" boolean DEFAULT false NOT NULL,
  "two_factor_secret" varchar,
  "backup_codes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "user_preferences" ("user_id");

-- User connections and networking
CREATE TABLE IF NOT EXISTS "user_connections" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "receiver_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "responded_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_user_connections_requester_id" ON "user_connections" ("requester_id");
CREATE INDEX IF NOT EXISTS "idx_user_connections_receiver_id" ON "user_connections" ("receiver_id");
CREATE INDEX IF NOT EXISTS "idx_user_connections_status" ON "user_connections" ("status");

-- User followers
CREATE TABLE IF NOT EXISTS "followers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "follower_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "following_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_followers_follower_id" ON "followers" ("follower_id");
CREATE INDEX IF NOT EXISTS "idx_followers_following_id" ON "followers" ("following_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_follower_relationship" ON "followers" ("follower_id", "following_id");

-- ============================================================================
-- 3. ACADEMIC & EDUCATIONAL TABLES
-- ============================================================================

-- Universities
CREATE TABLE IF NOT EXISTS "universities" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL UNIQUE,
  "location" varchar(200),
  "created_at" timestamp DEFAULT now()
);

-- Majors/Fields of Study
CREATE TABLE IF NOT EXISTS "majors" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL UNIQUE,
  "category" varchar(100),
  "is_verified" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS "courses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "code" varchar(50) NOT NULL,
  "description" text,
  "university" varchar,
  "instructor_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "semester" varchar,
  "university_validation_status" varchar(20) DEFAULT 'pending' NOT NULL,
  "is_university_validated" boolean DEFAULT false NOT NULL,
  "validated_by_university_admin_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "university_validated_at" timestamp,
  "university_validation_note" text,
  "validation_requested_at" timestamp,
  "enrollment_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_courses_instructor_id" ON "courses" ("instructor_id");
CREATE INDEX IF NOT EXISTS "idx_courses_university" ON "courses" ("university");
CREATE INDEX IF NOT EXISTS "idx_courses_validation_status" ON "courses" ("university_validation_status");

-- Course enrollments (students enrolling in courses)
CREATE TABLE IF NOT EXISTS "course_enrollments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
  "student_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "enrolled_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_course_enrollments_course_id" ON "course_enrollments" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_course_enrollments_student_id" ON "course_enrollments" ("student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_course_enrollment" ON "course_enrollments" ("course_id", "student_id");

-- Student courses (personal course records)
CREATE TABLE IF NOT EXISTS "student_courses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "course_id" varchar REFERENCES "courses"("id") ON DELETE set null,
  "course_name" varchar(200) NOT NULL,
  "course_code" varchar(50),
  "description" text,
  "institution" varchar(200),
  "instructor" varchar(200),
  "semester" varchar(50),
  "year" varchar(20),
  "grade" varchar(20),
  "credits" varchar(20),
  "validation_status" varchar(20) DEFAULT 'pending' NOT NULL,
  "is_enrolled" boolean DEFAULT false NOT NULL,
  "enrolled_at" timestamp,
  "is_validated" boolean DEFAULT false NOT NULL,
  "validated_by" varchar REFERENCES "users"("id") ON DELETE set null,
  "validated_at" timestamp,
  "validation_note" text,
  "assigned_teacher_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_student_courses_user_id" ON "student_courses" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_student_courses_course_id" ON "student_courses" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_student_courses_validation_status" ON "student_courses" ("validation_status");

-- Course discussions/Q&A
CREATE TABLE IF NOT EXISTS "course_discussions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" varchar REFERENCES "courses"("id") ON DELETE cascade,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "is_question" boolean DEFAULT true NOT NULL,
  "is_resolved" boolean DEFAULT false NOT NULL,
  "reply_count" integer DEFAULT 0 NOT NULL,
  "upvote_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_course_discussions_course_id" ON "course_discussions" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_course_discussions_author_id" ON "course_discussions" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_course_discussions_is_question" ON "course_discussions" ("is_question");

-- Discussion replies
CREATE TABLE IF NOT EXISTS "discussion_replies" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discussion_id" varchar NOT NULL REFERENCES "course_discussions"("id") ON DELETE cascade,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "upvote_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_discussion_replies_discussion_id" ON "discussion_replies" ("discussion_id");
CREATE INDEX IF NOT EXISTS "idx_discussion_replies_author_id" ON "discussion_replies" ("author_id");

-- Discussion upvotes
CREATE TABLE IF NOT EXISTS "discussion_upvotes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discussion_id" varchar REFERENCES "course_discussions"("id") ON DELETE cascade,
  "reply_id" varchar REFERENCES "discussion_replies"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_upvote_user_discussion" ON "discussion_upvotes" ("user_id", "discussion_id") WHERE "discussion_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "unique_upvote_user_reply" ON "discussion_upvotes" ("user_id", "reply_id") WHERE "reply_id" IS NOT NULL;

-- Course milestones
CREATE TABLE IF NOT EXISTS "course_milestones" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
  "student_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "milestone_type" varchar(100) NOT NULL,
  "achieved_at" timestamp DEFAULT now(),
  "metadata" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_student_course_milestone" ON "course_milestones" ("student_id", "course_id", "milestone_type");

-- ============================================================================
-- 4. SOCIAL & NETWORKING TABLES
-- ============================================================================

-- Posts/Feed
CREATE TABLE IF NOT EXISTS "posts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "image_url" varchar,
  "category" varchar,
  "tags" text[] DEFAULT ARRAY[]::text[],
  "view_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_posts_author_id" ON "posts" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_posts_category" ON "posts" ("category");

-- Comments on posts
CREATE TABLE IF NOT EXISTS "comments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" varchar NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_comments_post_id" ON "comments" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_comments_author_id" ON "comments" ("author_id");

-- Reactions (likes, etc.)
CREATE TABLE IF NOT EXISTS "reactions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" varchar NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" varchar(20) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_reactions_post_id" ON "reactions" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_reactions_user_id" ON "reactions" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_reaction" ON "reactions" ("post_id", "user_id", "type");

-- Post shares
CREATE TABLE IF NOT EXISTS "post_shares" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" varchar NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_post_shares_post_id" ON "post_shares" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_shares_user_id" ON "post_shares" ("user_id");

-- Post boosts (amplification)
CREATE TABLE IF NOT EXISTS "post_boosts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" varchar NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "boost_strength" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_post_boosts_post_id" ON "post_boosts" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_boosts_user_id" ON "post_boosts" ("user_id");

-- Groups
CREATE TABLE IF NOT EXISTS "groups" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "creator_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "image_url" varchar,
  "is_public" boolean DEFAULT true NOT NULL,
  "member_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_groups_creator_id" ON "groups" ("creator_id");
CREATE INDEX IF NOT EXISTS "idx_groups_is_public" ON "groups" ("is_public");

-- Group members
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL REFERENCES "groups"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" varchar(50) DEFAULT 'member' NOT NULL,
  "joined_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_group_members_group_id" ON "group_members" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_group_members_user_id" ON "group_members" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_group_member" ON "group_members" ("group_id", "user_id");

-- Group posts
CREATE TABLE IF NOT EXISTS "group_posts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL REFERENCES "groups"("id") ON DELETE cascade,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "image_url" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_group_posts_group_id" ON "group_posts" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_group_posts_author_id" ON "group_posts" ("author_id");

-- ============================================================================
-- 5. GAMIFICATION TABLES
-- ============================================================================

-- Skills
CREATE TABLE IF NOT EXISTS "skills" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "category" varchar,
  "created_at" timestamp DEFAULT now()
);

-- User skills
CREATE TABLE IF NOT EXISTS "user_skills" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "skill_id" varchar NOT NULL REFERENCES "skills"("id") ON DELETE cascade,
  "level" varchar(20) DEFAULT 'beginner' NOT NULL,
  "added_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_skills_user_id" ON "user_skills" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_skills_skill_id" ON "user_skills" ("skill_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_skill_unique" ON "user_skills" ("user_id", "skill_id");

-- Badges
CREATE TABLE IF NOT EXISTS "badges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text NOT NULL,
  "icon" varchar(50) NOT NULL,
  "category" varchar(50) NOT NULL,
  "tier" varchar(20) NOT NULL,
  "criteria" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "badge_id" varchar NOT NULL REFERENCES "badges"("id") ON DELETE cascade,
  "earned_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_badges_user_id" ON "user_badges" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_badges_badge_id" ON "user_badges" ("badge_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_badge" ON "user_badges" ("user_id", "badge_id");

-- Endorsements (skill endorsements)
CREATE TABLE IF NOT EXISTS "endorsements" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "endorser_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "endorsed_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "skill_id" varchar REFERENCES "skills"("id") ON DELETE set null,
  "comment" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_endorsements_endorser_id" ON "endorsements" ("endorser_id");
CREATE INDEX IF NOT EXISTS "idx_endorsements_endorsed_user_id" ON "endorsements" ("endorsed_user_id");
CREATE INDEX IF NOT EXISTS "idx_endorsements_skill_id" ON "endorsements" ("skill_id");

-- Challenges
CREATE TABLE IF NOT EXISTS "challenges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "organizer_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "category" varchar,
  "difficulty" varchar(20) DEFAULT 'intermediate' NOT NULL,
  "prizes" text,
  "start_date" timestamp,
  "end_date" timestamp,
  "participant_count" integer DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'upcoming' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_challenges_organizer_id" ON "challenges" ("organizer_id");
CREATE INDEX IF NOT EXISTS "idx_challenges_status" ON "challenges" ("status");
CREATE INDEX IF NOT EXISTS "idx_challenges_category" ON "challenges" ("category");

-- Challenge participants
CREATE TABLE IF NOT EXISTS "challenge_participants" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" varchar NOT NULL REFERENCES "challenges"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "submission_url" varchar,
  "submitted_at" timestamp,
  "rank" integer,
  "joined_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_challenge_participants_challenge_id" ON "challenge_participants" ("challenge_id");
CREATE INDEX IF NOT EXISTS "idx_challenge_participants_user_id" ON "challenge_participants" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_challenge_participant" ON "challenge_participants" ("challenge_id", "user_id");

-- ============================================================================
-- 6. MESSAGING TABLES
-- ============================================================================

-- Conversations
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_ids" text[] NOT NULL,
  "is_group" boolean DEFAULT false NOT NULL,
  "name" varchar(200),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_conversations_created_at" ON "conversations" ("created_at");

-- Messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" varchar NOT NULL REFERENCES "conversations"("id") ON DELETE cascade,
  "sender_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "is_edited" boolean DEFAULT false NOT NULL,
  "edited_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON "messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages" ("created_at");

-- ============================================================================
-- 7. NOTIFICATION TABLES
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" varchar(50) NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "link" varchar,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");

-- Announcements
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "university" varchar,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_announcements_author_id" ON "announcements" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_is_pinned" ON "announcements" ("is_pinned");
CREATE INDEX IF NOT EXISTS "idx_announcements_university" ON "announcements" ("university");

-- ============================================================================
-- 8. CERTIFICATION & RECRUITER TABLES
-- ============================================================================

-- Certifications
CREATE TABLE IF NOT EXISTS "certifications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" varchar(200) NOT NULL,
  "issuer" varchar(200) NOT NULL,
  "issue_date" varchar,
  "expiration_date" varchar,
  "credential_url" varchar,
  "credential_id" varchar,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_certifications_user_id" ON "certifications" ("user_id");

-- Recruiter feedback
CREATE TABLE IF NOT EXISTS "recruiter_feedback" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recruiter_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "candidate_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "position" varchar(200),
  "company" varchar(200),
  "rating" integer,
  "feedback" text,
  "is_positive" boolean,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_recruiter_feedback_recruiter_id" ON "recruiter_feedback" ("recruiter_id");
CREATE INDEX IF NOT EXISTS "idx_recruiter_feedback_candidate_id" ON "recruiter_feedback" ("candidate_id");

-- ============================================================================
-- 9. AI & TUTORING TABLES
-- ============================================================================

-- Teacher content (materials uploaded by instructors)
CREATE TABLE IF NOT EXISTS "teacher_content" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" varchar(200) NOT NULL,
  "description" text,
  "content_type" varchar(50) NOT NULL,
  "file_url" varchar,
  "course_id" varchar REFERENCES "courses"("id") ON DELETE set null,
  "is_published" boolean DEFAULT false NOT NULL,
  "view_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_teacher_content_teacher_id" ON "teacher_content" ("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_content_course_id" ON "teacher_content" ("course_id");

-- Teacher content chunks (for AI processing)
CREATE TABLE IF NOT EXISTS "teacher_content_chunks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_id" varchar NOT NULL REFERENCES "teacher_content"("id") ON DELETE cascade,
  "chunk_index" integer NOT NULL,
  "text" text NOT NULL,
  "embedding" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_teacher_content_chunks_content_id" ON "teacher_content_chunks" ("content_id");

-- AI chat sessions
CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" varchar(50) NOT NULL,
  "topic" varchar(200),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_chat_sessions_user_id" ON "ai_chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_chat_sessions_type" ON "ai_chat_sessions" ("type");

-- AI chat messages
CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" varchar NOT NULL REFERENCES "ai_chat_sessions"("id") ON DELETE cascade,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "tokens_used" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_chat_messages_session_id" ON "ai_chat_messages" ("session_id");

-- AI interaction events (for analytics)
CREATE TABLE IF NOT EXISTS "ai_interaction_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "event_type" varchar(100) NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_interaction_events_user_id" ON "ai_interaction_events" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_interaction_events_event_type" ON "ai_interaction_events" ("event_type");

-- Moderation actions
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "moderator_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "target_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "action_type" varchar(100) NOT NULL,
  "reason" text,
  "status" varchar(50) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_moderation_actions_moderator_id" ON "moderation_actions" ("moderator_id");
CREATE INDEX IF NOT EXISTS "idx_moderation_actions_target_id" ON "moderation_actions" ("target_id");

-- Student personal tutor materials
CREATE TABLE IF NOT EXISTS "student_personal_tutor_materials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "topic" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "resource_links" text[] DEFAULT ARRAY[]::text[],
  "difficulty_level" varchar(50),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_student_personal_tutor_materials_student_id" ON "student_personal_tutor_materials" ("student_id");

-- Student personal tutor sessions
CREATE TABLE IF NOT EXISTS "student_personal_tutor_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "topic" varchar(200),
  "started_at" timestamp DEFAULT now(),
  "ended_at" timestamp,
  "duration_minutes" integer,
  "summary" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_student_personal_tutor_sessions_student_id" ON "student_personal_tutor_sessions" ("student_id");

-- Student personal tutor messages
CREATE TABLE IF NOT EXISTS "student_personal_tutor_messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" varchar NOT NULL REFERENCES "student_personal_tutor_sessions"("id") ON DELETE cascade,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_student_personal_tutor_messages_session_id" ON "student_personal_tutor_messages" ("session_id");

-- ============================================================================
-- 10. FOREIGN KEY CONSTRAINTS FOR ACADEMIC TABLES
-- ============================================================================

ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fk"
  FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE set null;

ALTER TABLE "users" ADD CONSTRAINT "users_major_id_fk"
  FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE set null;

-- ============================================================================
-- END OF UNIFIED SCHEMA
-- ============================================================================
