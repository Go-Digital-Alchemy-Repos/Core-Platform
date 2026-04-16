# Integrations, Email, And Storage

System integrations in the admin control key production services. Changes should be made carefully and verified immediately.

## Cloudflare R2

Cloudflare R2 is used for media storage. Confirm the following when troubleshooting media:

- bucket credentials are valid
- public URL points to the public asset domain, not the S3 API endpoint
- uploaded images are visible in the media library
- rendered pages can resolve the published asset URL

## Mailgun

Mailgun is used for transactional email and test-connection workflows. Unauthorized errors usually point to:

- incorrect API key
- wrong domain
- mismatched region/domain pairing

## Mailchimp

Mailchimp is configured as a shared audience integration.

- Store the API key, audience ID, and server prefix in Integrations.
- Form-specific Mailchimp tags are controlled in the Forms system rather than in global settings.
- The directory application flow can tag applicants separately from newsletter or inquiry forms.

## Analytics And Consent Readiness

The public consent system now stores essential, preferences, analytics, and marketing choices for 60 days.

- Essential cookies stay on.
- Non-essential scripts should only load after the relevant consent has been granted.
- The integration area now has a clean home for future direct GA4 configuration, but public tracking should remain gated by consent.

## Operational Advice

- Update credentials in admin settings carefully and verify them immediately.
- Keep a record of which account owns the live credentials.
- If an integration appears configured but does not work on the frontend, verify both storage and rendering layers instead of assuming the upload failed.
