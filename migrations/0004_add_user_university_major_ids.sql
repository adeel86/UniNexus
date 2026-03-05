-- Add university_id and major_id columns to users table
ALTER TABLE "users" ADD COLUMN "university_id" varchar;
ALTER TABLE "users" ADD COLUMN "major_id" varchar;

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fk" 
  FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_major_id_fk" 
  FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE SET NULL;
