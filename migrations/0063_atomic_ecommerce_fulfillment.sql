ALTER TABLE ecommerce_fulfillments ADD COLUMN IF NOT EXISTS request_key varchar(128);
ALTER TABLE ecommerce_fulfillments ADD COLUMN IF NOT EXISTS request_hash varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_request
  ON ecommerce_fulfillments(order_id, request_key) WHERE request_key IS NOT NULL;
