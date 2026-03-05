CREATE TABLE IF NOT EXISTS "majors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) UNIQUE NOT NULL,
	"category" varchar(100),
	"is_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
