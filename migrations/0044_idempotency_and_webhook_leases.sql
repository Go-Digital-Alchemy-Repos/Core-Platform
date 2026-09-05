ALTER TABLE membership_processed_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamp NOT NULL DEFAULT now();

ALTER TABLE ecommerce_processed_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamp NOT NULL DEFAULT now(),
  ALTER COLUMN processed_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_webhook_claim
  ON membership_processed_webhook_events (status, claimed_at);

CREATE INDEX IF NOT EXISTS idx_ecommerce_webhook_claim
  ON ecommerce_processed_webhook_events (status, claimed_at);

ALTER TABLE cms_form_submissions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_form_submissions_idempotency
  ON cms_form_submissions (form_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS email_dedupe_key text,
  ADD COLUMN IF NOT EXISTS phone_dedupe_key text;

WITH ranked_email_keys AS (
  SELECT
    id,
    lower(trim(email)) AS dedupe_key,
    row_number() OVER (
      PARTITION BY lower(trim(email))
      ORDER BY created_at NULLS LAST, id
    ) AS key_rank
  FROM crm_leads
  WHERE NULLIF(lower(trim(email)), '') IS NOT NULL
)
UPDATE crm_leads AS lead
SET email_dedupe_key = ranked.dedupe_key
FROM ranked_email_keys AS ranked
WHERE lead.id = ranked.id
  AND ranked.key_rank = 1;

WITH ranked_phone_keys AS (
  SELECT
    id,
    trim(phone) AS dedupe_key,
    row_number() OVER (
      PARTITION BY trim(phone)
      ORDER BY created_at NULLS LAST, id
    ) AS key_rank
  FROM crm_leads
  WHERE NULLIF(trim(phone), '') IS NOT NULL
)
UPDATE crm_leads AS lead
SET phone_dedupe_key = ranked.dedupe_key
FROM ranked_phone_keys AS ranked
WHERE lead.id = ranked.id
  AND ranked.key_rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_email_dedupe_key
  ON crm_leads (email_dedupe_key)
  WHERE email_dedupe_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_phone_dedupe_key
  ON crm_leads (phone_dedupe_key)
  WHERE phone_dedupe_key IS NOT NULL;
