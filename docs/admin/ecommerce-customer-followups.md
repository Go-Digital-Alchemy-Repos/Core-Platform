# Customer checkout and order-status recovery

Candidate scope: two customer pages, with no API, schema, notification, tracking, or payment-provider changes.

Checkout applies an eligible saved default once after successful initial settings and address hydration. Choosing a custom address or editing any field it would replace explicitly ends automatic address selection for that checkout identity. Clearing the street and refetching saved addresses therefore preserves the custom choice. Existing account identity remounts and checkout draft protections remain in place.

Order status captures the submitted order ID, email, and token for each request. Editing any input immediately clears prior details/messages and relinquishes ownership of an in-flight response. Only the current request can update details, errors, or pending state. Lookup and secure-link failures now present neutral accessible errors, retain the entered fields, and permit retry. Pending labels identify which operation is running.

## Verification

- Focused customer recovery, order-status, and checkout tests: 28 passed. Cases include saved-address refetch after deliberate custom selection, delayed initial address responses after non-street edits including country/state controls, failure and retry, older lookup responses, and older link responses.
- Actual isolated app browser acceptance: four cases passed across desktop and mobile. Real customer/address APIs and synthetic local order records verify default hydration, custom street clearing/refetch, delayed initial address hydration after editing the name, initial URL lookup, transport failure/retry, and a held older real lookup response arriving after a newer result.
- The secure-link success path uses an intentionally nonexistent synthetic order. It verifies the real neutral response without sending email; the suite does not claim email delivery acceptance. Payment-intent requests are blocked and asserted absent.
- Direct logs, source hashes, exit codes, labeled container/anonymous-volume ownership, and verified cleanup are retained privately in `Core Platform Operations/ecommerce-customer-followups-20260906T230156Z-00dc4592/receipt.json`. The reviewed process-group cleanup helper confirms owned descendants absent before and after Docker cleanup; port 5201 is released.

This is a scoped customer recovery candidate based on `8a6cdcc6dd008198840c6eee1482d3cf7c0eafa6`. Integration and deployment remain separate review decisions.
