import { z } from "zod";

export const EVENT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const EVENT_ATTACHMENT_MAX_COUNT = 20;
export const EVENT_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "pages",
  "numbers",
  "key",
  "csv",
  "txt",
  "rtf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "zip",
] as const;
export const eventAttachmentSelectionSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        displayName: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .refine(
            (value) =>
              !Array.from(value).some(
                (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
              ),
            "Control characters are not allowed",
          ),
      })
      .strict(),
  )
  .max(EVENT_ATTACHMENT_MAX_COUNT)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Duplicate attachments",
  );
export type EventAttachmentSelection = z.infer<typeof eventAttachmentSelectionSchema>;
export interface EventAttachmentMetadata {
  id: string;
  displayName: string;
  originalName: string;
  mimeType: string;
  size: number;
}
