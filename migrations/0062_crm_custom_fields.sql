-- Additive CRM-2 persistence. Historical JSON, submissions and jobs are untouched.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS custom_values_revision integer NOT NULL DEFAULT 0 CHECK (custom_values_revision >= 0);
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS custom_values_revision integer NOT NULL DEFAULT 0 CHECK (custom_values_revision >= 0);
ALTER TABLE cms_forms ADD COLUMN IF NOT EXISTS crm_mapping jsonb CHECK (crm_mapping IS NULL OR ((jsonb_typeof(crm_mapping) = 'object' AND crm_mapping->'version' = '1'::jsonb) IS TRUE));
ALTER TABLE cms_forms ADD COLUMN IF NOT EXISTS crm_mapping_revision integer NOT NULL DEFAULT 0 CHECK (crm_mapping_revision >= 0);
CREATE TABLE IF NOT EXISTS crm_custom_field_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE CONSTRAINT crm_custom_field_key_check CHECK (key ~ '^[a-z][a-z0-9_]{1,47}$'),
 entity_scope text NOT NULL CONSTRAINT crm_custom_field_scope_check CHECK (entity_scope IN ('lead','client','both')),
 type text NOT NULL CONSTRAINT crm_custom_field_type_check CHECK (type IN ('text','number','date','choice','boolean')),
 revision integer NOT NULL DEFAULT 1 CONSTRAINT crm_custom_field_revision_check CHECK (revision > 0), archived_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS crm_custom_field_revisions (
 definition_id uuid NOT NULL REFERENCES crm_custom_field_definitions(id) ON DELETE RESTRICT,
 revision integer NOT NULL CONSTRAINT crm_custom_field_history_revision_check CHECK (revision > 0),
 config jsonb NOT NULL CONSTRAINT crm_custom_field_config_check CHECK ((jsonb_typeof(config) = 'object' AND config->'version' = '1'::jsonb) IS TRUE),
 created_by_id varchar REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(definition_id,revision)
);
CREATE TABLE IF NOT EXISTS crm_lead_custom_field_values (
 lead_id varchar NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
 definition_id uuid NOT NULL, definition_revision integer NOT NULL,
 value jsonb NOT NULL CONSTRAINT crm_lead_custom_field_scalar_check CHECK (jsonb_typeof(value) IN ('string','number','boolean','null')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(lead_id,definition_id), FOREIGN KEY(definition_id,definition_revision) REFERENCES crm_custom_field_revisions(definition_id,revision) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS crm_client_custom_field_values (
 client_id varchar NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
 definition_id uuid NOT NULL, definition_revision integer NOT NULL,
 value jsonb NOT NULL CONSTRAINT crm_client_custom_field_scalar_check CHECK (jsonb_typeof(value) IN ('string','number','boolean','null')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(client_id,definition_id), FOREIGN KEY(definition_id,definition_revision) REFERENCES crm_custom_field_revisions(definition_id,revision) ON DELETE RESTRICT
);
