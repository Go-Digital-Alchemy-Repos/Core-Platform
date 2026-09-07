-- Additive shipping-label persistence foundation; runtime remains unwired.
-- The migration runner supplies one transaction; keep historical migrations unchanged.
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_quote_order_support ON ecommerce_shipping_quote_attempts(id,order_id);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_item_order_support ON ecommerce_order_items(id,order_id);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_fulfillment_order_support ON ecommerce_fulfillments(id,order_id);

CREATE TABLE IF NOT EXISTS ecommerce_shipping_label_purchases (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id varchar NOT NULL,
 quote_attempt_id varchar NOT NULL,
 location_id varchar NOT NULL,
 request_key varchar(36) NOT NULL,
 contract_version integer NOT NULL DEFAULT 1,
 request_hash varchar(64) NOT NULL,
 accepted_quote_hash varchar(64) NOT NULL,
 accepted_snapshot_hash varchar(64) NOT NULL,
 accepted_snapshot jsonb,
 provider text NOT NULL DEFAULT 'easypost',
 expected_mode text NOT NULL DEFAULT 'test',
 observed_mode text,
 observation_source text,
 provider_shipment_id varchar(128) NOT NULL,
 selected_rate_id varchar(128) NOT NULL,
 carrier_account_id varchar(128) NOT NULL,
 credential_generation_id varchar(36) NOT NULL,
 confirmed_rate_amount integer NOT NULL,
 currency text NOT NULL DEFAULT 'USD',
 state text NOT NULL DEFAULT 'claimed',
 claim_fence varchar(36) NOT NULL,
 claim_deadline_at timestamptz NOT NULL,
 dispatch_intent_at timestamptz,
 observed_postage_label_id varchar(128),
 observed_selected_rate jsonb,
 fees jsonb,
 fees_complete boolean NOT NULL DEFAULT false,
 final_total_known boolean NOT NULL DEFAULT false,
 tracking_code text,
 selection_assessment text NOT NULL DEFAULT 'unverifiable',
 input_assessment text NOT NULL DEFAULT 'unverifiable',
 price_assessment text NOT NULL DEFAULT 'unverifiable',
 review_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
 asset_status text NOT NULL DEFAULT 'disabled_pending_origin_policy',
 fulfillment_id varchar,
 initiating_actor_id varchar,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 purchase_completed_at timestamptz,
 operational_resolved_at timestamptz,
 redacted_at timestamptz,
 CONSTRAINT shipping_label_version CHECK (contract_version=1),
 CONSTRAINT shipping_label_modes CHECK (provider='easypost' AND expected_mode='test' AND (observed_mode IS NULL OR observed_mode='test') AND currency='USD'),
 CONSTRAINT shipping_label_identifiers CHECK (request_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND claim_fence ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND credential_generation_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND request_hash ~ '^[0-9a-f]{64}$' AND accepted_quote_hash ~ '^[0-9a-f]{64}$' AND accepted_snapshot_hash ~ '^[0-9a-f]{64}$' AND provider_shipment_id ~ '^shp_[A-Za-z0-9]{1,100}$' AND selected_rate_id ~ '^rate_[A-Za-z0-9]{1,100}$' AND carrier_account_id ~ '^ca_[A-Za-z0-9]{1,100}$' AND (observed_postage_label_id IS NULL OR observed_postage_label_id ~ '^pl_[A-Za-z0-9]{1,100}$')),
 CONSTRAINT shipping_label_state CHECK (state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch')),
 CONSTRAINT shipping_label_intent CHECK ((state IN ('claimed','cancelled_before_dispatch') AND dispatch_intent_at IS NULL) OR (state IN ('dispatching','unknown','rejected') AND dispatch_intent_at IS NOT NULL) OR (state='purchased' AND observation_source IS NOT NULL AND ((observation_source='preflight' AND dispatch_intent_at IS NULL) OR (observation_source IN ('buy','reconciliation') AND dispatch_intent_at IS NOT NULL)))),
 CONSTRAINT shipping_label_clock CHECK (claim_deadline_at>created_at AND updated_at>=created_at AND (dispatch_intent_at IS NULL OR dispatch_intent_at>=created_at) AND (purchase_completed_at IS NULL OR purchase_completed_at>=created_at) AND (operational_resolved_at IS NULL OR operational_resolved_at>=created_at)),
 CONSTRAINT shipping_label_terminal CHECK ((state IN ('claimed','dispatching','unknown') AND purchase_completed_at IS NULL AND operational_resolved_at IS NULL AND redacted_at IS NULL) OR (state IN ('purchased','rejected','cancelled_before_dispatch') AND purchase_completed_at IS NOT NULL)),
 CONSTRAINT shipping_label_purchase_evidence CHECK (state<>'purchased' OR (observed_mode IS NOT NULL AND observed_mode='test' AND (observed_postage_label_id IS NOT NULL OR observed_selected_rate IS NOT NULL))),
 CONSTRAINT shipping_label_observation_source CHECK ((state='purchased' AND observation_source IS NOT NULL AND observation_source IN ('preflight','buy','reconciliation')) OR (state<>'purchased' AND observation_source IS NULL)),
 CONSTRAINT shipping_label_fees CHECK (final_total_known=false AND ((fees_complete=false AND fees IS NULL) OR (fees_complete=true AND fees IS NOT NULL AND jsonb_typeof(fees)='array' AND jsonb_array_length(fees)<=100 AND octet_length(fees::text)<=65536))),
 CONSTRAINT shipping_label_operational_resolution CHECK (operational_resolved_at IS NULL OR state IN ('rejected','cancelled_before_dispatch') OR (state='purchased' AND fulfillment_id IS NOT NULL)),
 CONSTRAINT shipping_label_money CHECK (confirmed_rate_amount>=0),
 CONSTRAINT shipping_label_assessments CHECK (selection_assessment IN ('matches','mismatch','unverifiable') AND input_assessment IN ('matches','mismatch','unverifiable') AND price_assessment IN ('matches','mismatch','unverifiable')),
 CONSTRAINT shipping_label_asset CHECK (asset_status IN ('missing','disabled_pending_origin_policy') AND (tracking_code IS NULL OR (length(tracking_code) BETWEEN 1 AND 200 AND tracking_code !~ '[[:cntrl:]]'))),
 CONSTRAINT shipping_label_review_codes CHECK (jsonb_typeof(review_codes)='array' AND jsonb_array_length(review_codes)<=9 AND review_codes <@ '["selected_rate_missing","selected_rate_invalid","selection_mismatch","input_mismatch","input_unverifiable","price_mismatch","fees_unverifiable","tracking_unavailable","label_metadata_unavailable"]'::jsonb),
 CONSTRAINT shipping_label_snapshot CHECK (((redacted_at IS NULL AND accepted_snapshot IS NOT NULL AND jsonb_typeof(accepted_snapshot)='object' AND octet_length(accepted_snapshot::text)<=65536) OR (redacted_at IS NOT NULL AND accepted_snapshot IS NULL AND operational_resolved_at IS NOT NULL AND redacted_at>=operational_resolved_at+interval '30 days'))),
 CONSTRAINT shipping_label_observed_rate CHECK (observed_selected_rate IS NULL OR (jsonb_typeof(observed_selected_rate)='object' AND octet_length(observed_selected_rate::text)<=4096)),
 CONSTRAINT shipping_label_dispatch_link CHECK (fulfillment_id IS NULL OR (state='purchased' AND selection_assessment='matches' AND input_assessment='matches' AND price_assessment='matches' AND review_codes='[]'::jsonb AND operational_resolved_at IS NOT NULL)),
 CONSTRAINT shipping_label_order_fk FOREIGN KEY (order_id) REFERENCES ecommerce_orders(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_quote_order_fk FOREIGN KEY (quote_attempt_id,order_id) REFERENCES ecommerce_shipping_quote_attempts(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_location_fk FOREIGN KEY (location_id) REFERENCES ecommerce_fulfillment_locations(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_fulfillment_order_fk FOREIGN KEY (fulfillment_id,order_id) REFERENCES ecommerce_fulfillments(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_purchase_order_identity ON ecommerce_shipping_label_purchases(id,order_id);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_purchase_request ON ecommerce_shipping_label_purchases(order_id,request_key);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_shipment_identity ON ecommerce_shipping_label_purchases(provider,expected_mode,provider_shipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_fulfillment_once ON ecommerce_shipping_label_purchases(fulfillment_id);

CREATE TABLE IF NOT EXISTS ecommerce_shipping_label_allocations (
 purchase_id varchar NOT NULL,
 order_id varchar NOT NULL,
 order_item_id varchar NOT NULL,
 quantity integer NOT NULL,
 state text NOT NULL DEFAULT 'held',
 fulfillment_id varchar,
 created_at timestamptz NOT NULL DEFAULT now(),
 transitioned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (purchase_id,order_item_id),
 CONSTRAINT shipping_label_allocation_quantity CHECK (quantity BETWEEN 1 AND 1000000),
 CONSTRAINT shipping_label_allocation_state CHECK (state IN ('held','consumed','released')),
 CONSTRAINT shipping_label_allocation_consumption CHECK ((state='consumed' AND fulfillment_id IS NOT NULL) OR (state IN ('held','released') AND fulfillment_id IS NULL)),
 CONSTRAINT shipping_label_allocation_clock CHECK (transitioned_at>=created_at),
 CONSTRAINT shipping_label_allocation_purchase_fk FOREIGN KEY (purchase_id,order_id) REFERENCES ecommerce_shipping_label_purchases(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_allocation_item_fk FOREIGN KEY (order_item_id,order_id) REFERENCES ecommerce_order_items(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_allocation_fulfillment_fk FOREIGN KEY (fulfillment_id,order_id) REFERENCES ecommerce_fulfillments(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS ecommerce_shipping_label_operations (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
 purchase_id varchar NOT NULL,
 order_id varchar NOT NULL,
 operation_key varchar(36) NOT NULL,
 kind text NOT NULL,
 request_hash varchar(64) NOT NULL,
 fencing_token varchar(36) NOT NULL,
 lease_deadline_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'claimed',
 actor_id varchar,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT shipping_label_operation_kind CHECK (kind IN ('reconcile','rebind','dispatch')),
 CONSTRAINT shipping_label_operation_identifiers CHECK (operation_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND fencing_token ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND request_hash ~ '^[0-9a-f]{64}$'),
 CONSTRAINT shipping_label_operation_clock CHECK (lease_deadline_at>created_at AND (completed_at IS NULL OR completed_at>=created_at)),
 CONSTRAINT shipping_label_operation_status CHECK ((status IN ('claimed','unknown') AND completed_at IS NULL) OR (status='completed' AND completed_at IS NOT NULL)),
 CONSTRAINT shipping_label_operation_purchase_fk FOREIGN KEY (purchase_id,order_id) REFERENCES ecommerce_shipping_label_purchases(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_operation_request ON ecommerce_shipping_label_operations(purchase_id,kind,operation_key);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_operation_identity ON ecommerce_shipping_label_operations(id,purchase_id,order_id);

CREATE TABLE IF NOT EXISTS ecommerce_shipping_label_events (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
 purchase_id varchar NOT NULL,
 order_id varchar NOT NULL,
 operation_id varchar,
 event_key varchar(36) NOT NULL,
 action text NOT NULL,
 actor_id varchar,
 happened_at timestamptz NOT NULL DEFAULT now(),
 from_state text,
 to_state text,
 credential_generation_id varchar(36),
 evidence_reference text,
 CONSTRAINT shipping_label_event_action CHECK (action IN ('confirmation','claim','dispatch_intent','purchase_observed','unknown_observed','rejection','cancelled_before_dispatch','reconciliation','credential_rebind','dispatch','asset_access','redaction')),
 CONSTRAINT shipping_label_event_identifiers CHECK (event_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND (credential_generation_id IS NULL OR credential_generation_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')),
 CONSTRAINT shipping_label_event_states CHECK ((from_state IS NULL OR from_state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch')) AND (to_state IS NULL OR to_state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch'))),
 CONSTRAINT shipping_label_event_reference CHECK (evidence_reference IS NULL OR (length(evidence_reference) BETWEEN 1 AND 256 AND evidence_reference !~ '[[:cntrl:]]')),
 CONSTRAINT shipping_label_event_purchase_fk FOREIGN KEY (purchase_id,order_id) REFERENCES ecommerce_shipping_label_purchases(id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT shipping_label_event_operation_fk FOREIGN KEY (operation_id,purchase_id,order_id) REFERENCES ecommerce_shipping_label_operations(id,purchase_id,order_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_event_once ON ecommerce_shipping_label_events(purchase_id,event_key);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_label_operation_single_claim ON ecommerce_shipping_label_operations(purchase_id,kind) WHERE status='claimed';
CREATE INDEX IF NOT EXISTS shipping_label_pending_deadline ON ecommerce_shipping_label_purchases(state,claim_deadline_at);
CREATE INDEX IF NOT EXISTS shipping_label_retention ON ecommerce_shipping_label_purchases(operational_resolved_at,redacted_at);
CREATE INDEX IF NOT EXISTS shipping_label_allocation_capacity ON ecommerce_shipping_label_allocations(order_id,state,order_item_id);
CREATE INDEX IF NOT EXISTS shipping_label_operation_expiry ON ecommerce_shipping_label_operations(status,lease_deadline_at);
CREATE INDEX IF NOT EXISTS shipping_label_event_history ON ecommerce_shipping_label_events(purchase_id,happened_at,id);
