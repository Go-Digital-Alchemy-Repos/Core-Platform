# Shipping quote recovery regression

`server/services/shipping-quote-recovery.database.test.ts` exercises actual
PostgreSQL migrations, application backup capture/compression and application
restore with a synthetic in-memory object transport. No real backup provider,
production payload or shipping provider participates.

The fixture creates pending, unknown and quoted attempts. It checks that capture
includes all three, deletes them, restores the captured gzip content through the
application snapshot restore, and compares every stored quote column. A full
migration replay preserves the rows. Restored replay retains the original token;
expiry does not permit a different owner to complete; a late original owner can
complete; already finished results cannot be replaced.

Opt in only with SHIPPING_QUOTE_RECOVERY_TEST_DATABASE_URL pointing to PostgreSQL
at 127.0.0.1 and database core_shipping_quote_recovery_test, without query/hash.
This test requires a fresh disposable database and never uses DATABASE_URL.
Run through the owned fixture wrapper; ordinary runs skip this database case.

Development execution on 2026-09-07 passed the case with zero skips, types and
focused lint. The private Operations/shipping-quote-recovery-304c55ccc4 receipt
binds the source and test log, and confirms owned container, volume and captured
process groups removed. The source hash inventory was unchanged. This is evidence
for the new quote table's recovery semantics; it does not replace the later full
candidate release/recovery/browser gates or establish real provider acceptance.
