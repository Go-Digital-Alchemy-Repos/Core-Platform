# Core maintenance release gates — 2026-09-06

Broad integration release remains held. Production is `a006f36`, with the upload guard deployed
but disabled. Better Farms site launch is a separate decision; no live checkout or DNS cutover
is authorized for that pilot. This record updates the earlier historical readiness review.

| Gate | Current evidence | Remaining work |
| --- | --- | --- |
| Reviewed baseline | Deployed main merged into remediation; exact candidate `1d9cd8c` received independent bounded 310-file review | Review subsequent fixes and exact release diff; reviewer did not claim exhaustive line-by-line audit |
| Hosted validation | `533dc3d` Verify passed; `530b431` Verify also passed | Required Verify for final immutable release head |
| Production runtime | Compiled Linux/TLS/start/shutdown evidence and CI gate exist | Final artifact gate and actual post-deploy start/drain configuration adoption |
| Populated upgrade | Actual-main `a006f36` rehearsal preserved synthetic records and rejected duplicate paid history; added two restarts preserving every value of all four notification job types after fixing historical constraint replay | Recheck final migration hashes and current duplicate predicate before deployment |
| Real recovery | Actual production backup restore preserved 94 tables/391 rows, including ciphertext | Retain/recheck accessible backup and recovery configuration at cutover; ciphertext preservation does not recover the encryption secret |
| Source media | Actual deployment-bound dry run verified one CMS object and returned would-copy | Final inventory after writer barrier; retain missing local asset as an explicit unresolved record, without guessing replacement |
| Conditional copy primitive | Actual R2 probe rejected second conditional write with 412, preserved first bytes and was removed | Approved exact-plan execution and destination hash/read verification |
| Writer barrier | Admission guard deployed, flag absent | Freeze, replace/drain old writers, resolve ambiguous writes, refresh inventory; flag alone is insufficient |
| Namespace cutover | Target direction is clients/core-platform/uploads; explicit legacy backup prefix system-backups | Apply/reconcile approved copies and verify application URLs/deletion targeting while frozen |
| Media rollback | Isolated candidate `704cabf` ports exact namespace algorithms onto deployed-main code; 403 tests passed, root independently passed 23 focused checks | Hosted check passed; populated migration rollback/roll-forward preserved original and queue values. Remaining: recovery-only candidate f9036a3 blocks business admission/worker startup with compiled local evidence; final hosted checks and actual frozen read/deployment/drain acceptance; no full rollback readiness claim |
| Missing provider configuration | Reviewed correction resolves the same validated client before mutations; root passed 72 service and 12 neighboring regressions | Exact-candidate hosted checks and manual workflow browser acceptance; remote provider acceptance remains separate |
| Manual ecommerce acceptance | Desktop/mobile offline wizard, concurrent paid retries, inventory/outbox, refund UI feedback and cancellation/fulfillment guards passed against disposable PostgreSQL | Final hosted browser run for immutable candidate; provider-backed acceptance remains separate |
| New provider transactions | Candidate defaults new Stripe transactions off unless ECOMMERCE_PROVIDER_TRANSACTIONS_ENABLED is exactly true; settings show credentials and activation separately, and historical recovery remains available | Final candidate validation and sandbox/provider acceptance before an explicit operator activation decision; no provider activation performed |
| Better Farms integration | 22 actual pilot cases pass: seven-route desktop/mobile sweep plus Core image decoding, CMS publish, response-loss retries and corrected mobile focus containment | Final site build/runtime/manifest origin agreement; content/assets/domains and whole-site launch acceptance separately |

Configuration-before-write and manual commerce browser corrections are implemented and locally
verified. Next work includes final hosted acceptance and rollback compatibility preparation. Do not freeze production uploads merely to
wait for unrelated development. Storage copying remains gated and no historical orders are
assumed to be demos. Historical webhook reconciliation/recovery must be considered separately
from allowing new provider transactions.

Evidence sources are linked from the canonical execution ledger and `docs/release-evidence/`.
No checkbox here substitutes for the underlying artifact, runtime result or final review.
