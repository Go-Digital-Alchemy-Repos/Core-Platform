-- Additive, replay-safe storage; no existing ecommerce rows are rewritten.
CREATE TABLE IF NOT EXISTS ecommerce_shipping_quote_attempts (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id varchar NOT NULL REFERENCES ecommerce_orders(id),
 request_key varchar(36) NOT NULL,
 contract_version text NOT NULL CONSTRAINT shipping_quote_version CHECK (contract_version = '1.0.0'),
 request_hash varchar(64) NOT NULL,
 accepted_snapshot_hash varchar(64) NOT NULL,
 accepted_snapshot jsonb,
 location_id varchar NOT NULL,
 items jsonb NOT NULL,
 provider text NOT NULL,
 credential_generation_id varchar(128) NOT NULL,
 expected_mode text NOT NULL,
 observed_mode text,
 status text NOT NULL DEFAULT 'pending',
 provider_shipment_id varchar(128),
 rates jsonb NOT NULL DEFAULT '[]'::jsonb,
 error_code text,
 fencing_token varchar(36) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deadline_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 completed_at timestamptz,
 redacted_at timestamptz,
 CONSTRAINT shipping_quote_state CHECK (status IN ('pending','quoted','unavailable','unknown')),
 CONSTRAINT shipping_quote_mode CHECK (expected_mode = 'test' AND (observed_mode IS NULL OR observed_mode = 'test')),
 CONSTRAINT shipping_quote_lifecycle CHECK (
 ((status IN ('pending','unknown') AND completed_at IS NULL AND redacted_at IS NULL)
 OR (status IN ('quoted','unavailable') AND completed_at IS NOT NULL))
 AND (redacted_at IS NULL OR accepted_snapshot IS NULL)
 AND (redacted_at IS NOT NULL OR accepted_snapshot IS NOT NULL)
 AND (status <> 'quoted' OR (provider_shipment_id IS NOT NULL AND observed_mode IS NOT NULL AND observed_mode = 'test' AND jsonb_array_length(rates) > 0))
 AND (provider_shipment_id IS NULL OR (observed_mode IS NOT NULL AND observed_mode = 'test'))
 )
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_quote_order_request ON ecommerce_shipping_quote_attempts(order_id, request_key);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_quote_provider_identity ON ecommerce_shipping_quote_attempts(provider, credential_generation_id, provider_shipment_id);
CREATE INDEX IF NOT EXISTS shipping_quote_pending_deadline ON ecommerce_shipping_quote_attempts(status, deadline_at);
CREATE INDEX IF NOT EXISTS shipping_quote_retention ON ecommerce_shipping_quote_attempts(status, completed_at);
