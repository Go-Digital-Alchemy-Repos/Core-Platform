# Events And Registrations

Open this area under **Content** in the admin navigation.
The events system powers upcoming event cards, event archive views, registrations, and public event detail content.

## Event Creation Checklist

Before publishing an event, confirm:

- title
- start date and time
- end date and time
- location or virtual event details
- event image if applicable
- description and registration information

## Event Editor Notes

- The event description now uses the rich text editor instead of plain text.
- Cover images support image focus-point selection, just like other CMS image workflows.
- If an event spans multiple days, confirm both the start and end date/time display correctly in the public list view.

## Date And Time Handling

Be especially careful when editing dates and times. Always review the saved event after publishing to confirm the final date and time are correct.

## Public Display

Events can appear in:

- the main event archive
- CMS event preview blocks
- event cards on marketing pages

If an event image exists, preview blocks and cards should display it on the left side of the event card.

Single-day events now show one date with a time range in list view, while multi-day events show separate `Starts` and `Ends` lines.

## Registration

Event registration availability and open dates should be reviewed on the frontend after changes. This is especially important for member-only or time-sensitive events.

## Editing Safety

The event editor uses the shared live lock system.

- Only one admin or editor can actively edit an event at a time.
- A second user may still review the event in read-only mode.

## Event materials and reusable settings

In an event's Details tab, **Attachments** appears immediately below Description. Drop files or browse, edit display names, reorder, and remove materials before saving the event. Up to 20 files of 25 MiB each are supported. Pending/failed uploads are excluded from saves; retry failed uploads or remove them. Successful staged uploads expire after 24 hours if unused. Saved materials appear below the public event description and downloads follow the event's visibility permissions. Changes to attachments take effect when the event is saved.

Events > Settings includes **Speakers** alongside Saved Venues. Add a name, biography, image, and optional contact information. Select a Saved Speaker in the event editor to prefill its speaker fields. You can customize those fields per event; editing or deleting the reusable speaker does not rewrite existing event details.

**Options, presets & tags** manages the choices shown in event forms. Add, rename, reorder, archive, or restore choices. Existing events retain archived selections. Replace active preset references before archiving an option. Configure default presets and optional tag suggestions; authors can still enter free-form tags. Concurrent settings edits return a conflict instead of silently overwriting another administrator's work.

Deployment and private-storage requirements are documented in `docs/contracts/event-attachments-v1.md` and `docs/contracts/event-configuration-v1.md`.
