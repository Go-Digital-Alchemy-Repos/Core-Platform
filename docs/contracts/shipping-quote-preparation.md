# Shipping quote preparation

`prepareShippingQuoteInputs` builds the accepted snapshot from the persisted order,
active fulfillment location and current item/fulfillment rows. The caller must
read these rows under the claim transaction locks; the pure helper does not
provide locking or independently authorize an HTTP request. Same-key replay must
be resolved before calling preparation, so later address edits cannot rewrite a
previous attempt.

Existing fulfillment rules govern payment, fraud and remaining quantity. Pickup
orders, non-shipping items and inactive/mismatched locations reject. Address
normalization accepts US state codes or full names and DC, with ZIP syntax,
required recipient/company and bounded non-control text. It excludes unsupported
country/territory/military region codes. It does not verify address deliverability
or ZIP-to-state geography. Phone/email are omitted from this minimal snapshot.

Parcel conversion reuses the reviewed EasyPost normalizer: ounces/inches, one
decimal, all-or-none dimensions and rejection of zero after rounding. Currency
follows the existing USD order/payment behavior. No provider requests, fulfillment
writes or notifications occur. Persistence, request replay, transport and admin
wiring remain separate acceptance requirements.

Validation: seven focused preparation tests and 38 parcel regression cases passed;
types passed. Initial lint found a control-character regex; equivalent character
code validation replaced it and focused lint then passed. Dependency reuse for
these focused checks is not a fresh locked-install claim.
