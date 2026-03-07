-- Create user_preferences table for storing user notification and privacy settings
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" varchar PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL UNIQUE,
  "email_notifications" boolean NOT NULL DEFAULT true,
  "push_notifications" boolean NOT NULL DEFAULT true,
  "comment_notifications" boolean NOT NULL DEFAULT true,
  "endorsement_notifications" boolean NOT NULL DEFAULT true,
  "public_profile" boolean NOT NULL DEFAULT true,
  "show_email" boolean NOT NULL DEFAULT false,
  "show_activity" boolean NOT NULL DEFAULT true,
  "two_factor_enabled" boolean NOT NULL DEFAULT false,
  "two_factor_secret" varchar,
  "backup_codes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create index for efficient user_id lookups
CREATE INDEX "idx_user_preferences_user_id" ON "user_preferences" ("user_id");
