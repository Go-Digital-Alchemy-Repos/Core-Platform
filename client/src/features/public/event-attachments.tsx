import { Download } from "lucide-react";

import type { EventAttachmentMetadata as Attachment } from "@shared/event-attachments";
export function EventAttachments({ event }: { event: { id: string; attachments?: Attachment[] } }) {
  if (!event.attachments?.length) return null;
  return (
    <section className="border-t pt-5" aria-labelledby="event-attachments-heading">
      <h2 id="event-attachments-heading" className="font-heading text-lg font-semibold mb-3">
        Attachments
      </h2>
      <ul className="space-y-2">
        {event.attachments.map((file) => (
          <li key={file.id}>
            <a
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted focus-visible:outline focus-visible:outline-2"
              href={`/api/events/${encodeURIComponent(event.id)}/attachments/${encodeURIComponent(file.id)}`}
            >
              <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block break-words font-medium">{file.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {file.originalName.split(".").pop()?.toUpperCase()} ·{" "}
                  {file.size < 1048576
                    ? `${Math.max(1, Math.ceil(file.size / 1024))} KB`
                    : `${(file.size / 1048576).toFixed(1)} MB`}{" "}
                  · Download
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
