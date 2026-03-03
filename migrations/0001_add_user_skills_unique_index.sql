CREATE UNIQUE INDEX "idx_user_skill_unique" ON "user_skills" USING btree ("user_id","skill_id");
