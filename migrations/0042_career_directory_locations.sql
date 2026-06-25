ALTER TABLE "career_jobs"
  ADD COLUMN IF NOT EXISTS "directory_profile_id" varchar REFERENCES "therapist_profiles"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_career_jobs_directory_profile"
  ON "career_jobs" ("directory_profile_id");
