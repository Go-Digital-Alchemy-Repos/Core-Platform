ALTER TABLE IF EXISTS "saved_counselors" RENAME TO "saved_professionals";
ALTER TABLE IF EXISTS "conversations" RENAME COLUMN "counselor_id" TO "professional_id";
ALTER TABLE IF EXISTS "guest_messages" RENAME COLUMN "counselor_id" TO "professional_id";
UPDATE seo_settings SET default_meta_description = 'TCK Wellness connects Third Culture Kids with culturally informed mental health professionals worldwide.' WHERE default_meta_description LIKE '%counselors worldwide%';
