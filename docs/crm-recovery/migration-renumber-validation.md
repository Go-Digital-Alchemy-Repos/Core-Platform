# Targeted CRM migration renumber validation

The refreshed `populated-upgrade-result.json` and `rehearsal-result.json` receipts validate the working-tree rename from `0061_crm_custom_fields.sql` to `0062_crm_custom_fields.sql`.

Their `candidate` value, `2884093fe28f566dad7a9c10511703d2bef9da59`, is the **pre-test Git HEAD**, not a commit containing the rename. During execution, the renamed migration and updated runner were uncommitted. The receipts' source hashes identify that tested working tree:

- Updated `server/migrate.ts`: `966290c76095f38af8d118967ca0c1f53ca885ad616c10ae69d4c7d9c177f8a8`.
- Renamed SQL contents (unchanged): `6bac113801da39fd126fc1f659564daa87a1c2a1f405f473acda9cddcd5ad95f`.
- Ordered migration filename/content aggregate in the populated upgrade receipt: `5db53c97a587b22fb4afc608d9af4ffb0168b1b0a21a3d337a5f6cd10fc08bc4`.

Both local rehearsals passed and verified fixture removal. These are targeted rename checks; they are **not immutable final-release HEAD receipts**. Final release validation must record the final committed candidate separately. No workflow dispatch or production operation occurred.
