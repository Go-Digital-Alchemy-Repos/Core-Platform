# Forms And Entries

The Forms area now handles both reusable form building and long-term submission storage.

## Form Builder

Use `Admin > Forms > Form Builder` to manage the form itself.

- Build forms with standard and advanced fields.
- Use the right sidebar to add fields when nothing is selected.
- Select a field on the canvas to edit its settings.
- Active forms can be embedded into pages, widgets, and modal CTA buttons.
- Each form can control its own Mailchimp tag routing when Mailchimp sync is enabled.

## Form Entries

Use `Admin > Forms > Form Entries` to review stored submissions.

- Select an active form from the left panel.
- Entries first appear as a compact list with the submitter name, email, and message preview.
- Click an entry to open the full detail view.
- Use `Back to Form Entries` to return to the list without changing forms.
- Export the selected form's entries as CSV when needed.
- Delete entries only when there is a clear retention reason.

## Standalone Form Links

Every active form can expose a shareable public link.

- The standalone form page shows only the logo and the form on a plain white page.
- Use this for campaigns, text-message outreach, email sharing, or QR-code destinations.
- Inactive forms should not be shared publicly.

## Submission Notifications

Forms can notify more than one system user.

- Notification recipients are managed in `Admin > System Users`.
- Users can be assigned to one form, many forms, or all active forms.
- Email delivery is a notification channel, not the system of record. Entries still remain stored in the CMS.

## Editing Safety

Forms participate in the editor lock system.

- One admin or editor can actively edit a form at a time.
- A second user may still open the form in read-only mode.
- Admins can take over a lock if necessary.
