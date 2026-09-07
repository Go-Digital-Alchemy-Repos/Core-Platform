-- Additive migration. Roll back application first; retain metadata/objects for recovery.
ALTER TABLE events ADD COLUMN IF NOT EXISTS delivery_option_id text;
CREATE TABLE IF NOT EXISTS event_attachments (
 id varchar(36) PRIMARY KEY,
 event_id varchar REFERENCES events(id) ON DELETE SET NULL,
 owner_id varchar NOT NULL,
 object_key text NOT NULL UNIQUE,
 original_name text NOT NULL,
 display_name text NOT NULL,
 mime_type text NOT NULL,
 size integer NOT NULL CHECK (size > 0 AND size <= 26214400),
 position integer NOT NULL DEFAULT 0 CHECK (position >= 0 AND position < 20),
 state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','ready','deleting')),
 created_at timestamp NOT NULL DEFAULT now(),
 detached_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_attachments_event ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_cleanup ON event_attachments(detached_at);
