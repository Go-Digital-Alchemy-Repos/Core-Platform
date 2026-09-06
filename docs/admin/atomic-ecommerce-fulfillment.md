# Atomic manual shipping

The order drawer now saves shipment, fulfillment items, shipping status and a queued shipment notification through one transaction. Partial shipment keeps the existing order status until all ordered units have been fulfilled; the individual shipment is shipped. Notification creation is not proof of delivery.

## Contract

`POST /api/admin/ecommerce/orders/:orderId/ship-and-fulfill`, under the existing authenticated ecommerce permission and feature gates, requires a UUID `Idempotency-Key` header. Body fields are `carrier`, `trackingNumber`, `trackingUrl`, `locationId`, `serviceLevel` (nullable), and a nonempty `items` array of `{orderItemId,quantity}`. The strict bounded schema rejects server-owned fields. Status, actor, timestamps, IDs and receipt hashes are server-owned.

The server returns `{shipment,fulfillment,replayed}` with 201 for creation or 200 for replay. A changed normalized body with the same order/key returns 409. The same accepted request returns its original IDs even after a later refund, delivery, or risk-state change. A missing original shipment fails closed instead of recreating effects. Error responses follow existing API validation/status handling.

The canonical hash includes a version, normalized nullable text and sorted/aggregated item quantities. The drawer retains key and payload after a failed response, defaults to remaining quantities, permits partial quantities, and generates a new key only when the submitted body changes or a prior request succeeds. Reloading the page loses its in-memory retry key; operators should inspect saved shipment history before starting a new action after an interrupted session.

## Transaction boundary

All new and legacy fulfillment inserts lock the order and recheck current payment, fraud, cancellation/delivery state, item ownership and remaining quantities inside the transaction. Explicit blocked/rejected risk states prohibit shipping. Referenced shipment IDs must belong to the same order, and fulfillment locations must exist. Quantities from failed/cancelled fulfillments do not consume remaining units.

For the new endpoint, receipt replay precedes mutable-state validation after acquiring the order lock. A new request inserts the shipment, linked fulfillment and items, durable receipt, order status when complete, and existing `shipment_confirmation` job together. Any failure rolls back all of them. No provider or email call occurs inside this transaction.

The existing shipment and fulfillment endpoints retain their payloads/response shapes and standalone behavior, including legacy empty fulfillment headers. Their authoritative checks now run under the order lock. They do not acquire a new idempotency guarantee; clients needing coupled shipping should adopt the atomic endpoint. The shipment-only legacy endpoint continues marking the order shipped as before.

Order detail responses now include `fulfillments[].items`, fetched in a batch. New shipment emails list only matching shipment-linked fulfillment items and use shipment wording; standalone legacy shipments without item linkage retain the prior fallback. All shipment-email text/attributes are escaped and tracking hyperlinks require HTTP(S).

## Migration and downgrade

`0063_atomic_ecommerce_fulfillment.sql` adds nullable `request_key` and `request_hash` to existing fulfillments plus a partial unique `(order_id,request_key)` index. It is explicitly registered in the startup reconciliation runner. Historical rows remain null, and generic insert schemas/storage cannot set receipt fields. No existing migration was edited.

Old binaries can read the additive schema, but do not implement atomic replay or the corrected lock validation. Rolling back code therefore loses those behavioral guarantees. Keep the new columns/index and accepted receipts; dropping them would destroy replay identity. Drain writers and pending browser requests before a code rollback and reconcile saved shipments/notifications before resuming old workflows. This change does not authorize a production migration or rollback.

## Verification

- Disposable PostgreSQL tests cover concurrent same-key replay, competing quantities, legacy/new contention, receipt preservation across migration reruns, rollback after notification failure, changed-body conflict, replay after mutable state changes, invalid inputs/cross-order linkage, fraud/payment guards and payment revalidation after waiting for a competing update.
- Real app browser tests on desktop and mobile abort a response only after the server commits, then retry the retained form: identical IDs, one shipment/fulfillment/notification, followed by shipping the remainder and reload showing zero remaining. Endpoint authentication/editor denial are also tested.
- Focused existing ecommerce service, admin component, migration and shipment-email tests cover prior behavior and hostile HTML/URL escaping. Test data and credentials are synthetic, local and disposable; no payment/shipping/email provider acceptance is claimed.
