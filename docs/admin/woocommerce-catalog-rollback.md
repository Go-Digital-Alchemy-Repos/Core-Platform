# WooCommerce catalog rollback and merchant edits

Catalog rollback removes only unchanged records created by that run. If the run
updated records owned by an earlier import, rollback requires manual review and
the documented backup/restore procedure. It does not claim those updates were
restored. Mixed create/update runs stop before deleting any created records.

Apply and rollback hold mapping, target and relevant child-row locks through the
transaction. Merchant changes detected after waiting for an existing write cause
manual review instead of overwriting or deleting those changes. Phase 1 expects
exactly one default variant; additional merchant variants are preserved and block
apply or rollback. Rollback also preserves categories assigned to unrelated
products or referenced by merchant-created child categories.

Category `parent_id` currently has no foreign key. When rollback includes created
categories, it therefore takes a transaction-scoped `SHARE ROW EXCLUSIVE` lock on
`ecommerce_categories` before checking child references and deleting records.
This temporarily blocks category writes; ordinary reads remain available. Parent
row locks alone cannot fence inserts into a plain-text parent reference.

This guard protects the rollback transaction. The existing category API can still
accept an invalid parent reference after rollback commits. Validating future
category writes or introducing a foreign key is a separate follow-up, not a
capability provided by this rollback change.

These safeguards do not establish catalog reconciliation, restore readiness or
production import approval. The frozen WooCommerce contract and release gates
continue to apply.
