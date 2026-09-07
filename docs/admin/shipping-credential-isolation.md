# Shipping credential isolation

System setting keys are globally unique. Shipping providers now persist each
credential as `ecommerce_shipping_provider_<provider>__<field>` in the existing
provider category. Public setup field names such as `apiKey` remain unchanged.
Only registry-defined fields are written, with their existing encrypted-secret
policy. Nonblank supplied fields commit in one `upsertSettings` batch; blank,
whitespace-only and omitted fields retain the stored values.

All shipping provider list, readiness, activation and credential-save handlers
read through `readShippingProviderCredentials`. The helper maps namespaced keys
back to public field names internally. API responses contain only presence flags
and field metadata, never credential values. Storage failures are sanitized before
reaching response/log handling. Existing admin/module gates and private no-store
responses remain in place.

A legacy generic key is read only from its currently stored matching provider
category. An explicitly present namespaced key takes precedence even when empty.
No key is looked up globally, moved, copied, or assigned to another provider.
Already-overwritten legacy credentials cannot be reconstructed: the affected
operator must supply that provider's credential explicitly. There is no schema
migration or automatic credential migration.

Retire old credential-writing and credential-reading application instances before
claiming isolation across the deployment. Old versions still write generic keys
and cannot use the new namespaced configuration. Do not infer that a rollback
restores missing or overwritten credentials.

The carrier client factory currently accepts a credential argument; it does not
load settings itself. Future transport consumers must use the same helper before
passing credentials to that factory. Credential presence is not proof of live
provider connectivity or operational quoting/label capabilities. This change
makes no provider request and grants no production migration/import approval.

Validation includes mounted auth/role/module/readiness/save routes and a guarded
`SHIPPING_CREDENTIAL_TEST_DATABASE_URL` PostgreSQL suite restricted to loopback
`core_shipping_credentials_test`: independent concurrent providers, encrypted
storage, scoped legacy reads, explicit empty precedence, rotation/blank retention,
atomic rollback with warm caches, and response non-exposure.
