-- Add last_streak_increment_date column to users table for tracking daily streak increments
ALTER TABLE "users" ADD COLUMN "last_streak_increment_date" timestamp;

-- Create index for efficient query performance
CREATE INDEX "idx_users_last_streak_increment_date" ON "users" ("last_streak_increment_date");
