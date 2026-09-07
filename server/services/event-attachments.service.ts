import { assertUploadMutationsAllowed } from "./upload-mutation-policy";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { eventAttachments, events, type InsertEvent } from "@shared/schema";
import {
  eventAttachmentSelectionSchema,
  type EventAttachmentMetadata,
} from "@shared/event-attachments";
import { db } from "../db";
import { AppError } from "../middleware/error-handler";
import { validateEventAttachment } from "./event-attachment-validation";
import {
  attachmentObjectKey,
  putAttachmentObject,
  getAttachmentObject,
  deleteAttachmentObject,
} from "./event-attachment-objects";
import { startStoppableWorker } from "../utils/runtime-lifecycle";
import { logger } from "../utils/logger";

type Attachment = typeof eventAttachments.$inferSelect;
function metadata(row: Attachment): EventAttachmentMetadata {
  return {
    id: row.id,
    displayName: row.displayName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
  };
}
export async function listEventAttachmentsForEvents(
  eventIds: string[],
): Promise<Map<string, EventAttachmentMetadata[]>> {
  const grouped = new Map<string, EventAttachmentMetadata[]>();
  if (!eventIds.length) return grouped;
  const rows = await db
    .select()
    .from(eventAttachments)
    .where(and(inArray(eventAttachments.eventId, eventIds), eq(eventAttachments.state, "ready")))
    .orderBy(asc(eventAttachments.position));
  for (const row of rows) {
    if (!row.eventId) continue;
    const list = grouped.get(row.eventId) ?? [];
    list.push(metadata(row));
    grouped.set(row.eventId, list);
  }
  return grouped;
}
export async function listEventAttachments(eventId: string): Promise<EventAttachmentMetadata[]> {
  return (await listEventAttachmentsForEvents([eventId])).get(eventId) ?? [];
}
export async function stageEventAttachment(ownerId: string, file: Express.Multer.File) {
  assertUploadMutationsAllowed();
  const details = validateEventAttachment(file.originalname, file.mimetype, file.buffer);
  const id = randomUUID();
  const objectKey = attachmentObjectKey(id);
  const [row] = await db
    .insert(eventAttachments)
    .values({ id, ownerId, objectKey, ...details, displayName: details.originalName })
    .returning();
  // Metadata precedes the object, so uncertain/failed PUTs remain discoverable by cleanup.
  await putAttachmentObject(objectKey, file.buffer, details.mimeType);
  const [ready] = await db
    .update(eventAttachments)
    .set({ state: "ready" })
    .where(and(eq(eventAttachments.id, row.id), eq(eventAttachments.state, "uploading")))
    .returning();
  if (!ready) throw new AppError("Upload expired; upload the file again", 409);
  return metadata(ready);
}

// The event and its ordered attachment association are committed together.
export async function saveEventWithAttachments(
  ownerId: string,
  id: string | undefined,
  data: Partial<InsertEvent>,
  selection: unknown,
) {
  const selected =
    selection === undefined ? undefined : eventAttachmentSelectionSchema.parse(selection);
  return db.transaction(async (tx) => {
    if (id) {
      const [existing] = await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, id))
        .for("update");
      if (!existing) throw new AppError("Event not found", 404);
    }
    const [event] = id
      ? await tx
          .update(events)
          .set({ ...data, id } as Partial<typeof events.$inferInsert>)
          .where(eq(events.id, id))
          .returning()
      : await tx
          .insert(events)
          .values(data as typeof events.$inferInsert)
          .returning();
    if (selected !== undefined) {
      // Deterministic locks serialize cleanup and two admins selecting the same staged file.
      const selectionIds = selected.map((item) => item.id);
      const rows = await tx
        .select()
        .from(eventAttachments)
        .where(
          or(
            eq(eventAttachments.eventId, event.id),
            ...(selectionIds.length ? [inArray(eventAttachments.id, selectionIds)] : []),
          ),
        )
        .orderBy(asc(eventAttachments.id))
        .for("update");
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const item of selected) {
        const row = rows.find((candidate) => candidate.id === item.id);
        if (
          !row ||
          row.state !== "ready" ||
          (row.eventId !== event.id &&
            (row.eventId !== null || row.ownerId !== ownerId || row.detachedAt.getTime() <= cutoff))
        )
          throw new AppError(
            "An attachment is unavailable, expired, or belongs to another event",
            409,
          );
      }
      await tx
        .update(eventAttachments)
        .set({ eventId: null, detachedAt: new Date() })
        .where(eq(eventAttachments.eventId, event.id));
      for (const [position, item] of selected.entries()) {
        await tx
          .update(eventAttachments)
          .set({ eventId: event.id, displayName: item.displayName, position })
          .where(eq(eventAttachments.id, item.id));
      }
    }
    return event;
  });
}
export async function readEventAttachment(eventId: string, attachmentId: string) {
  const [row] = await db
    .select()
    .from(eventAttachments)
    .where(
      and(
        eq(eventAttachments.id, attachmentId),
        eq(eventAttachments.eventId, eventId),
        eq(eventAttachments.state, "ready"),
      ),
    );
  if (!row) throw new AppError("Attachment not found", 404);
  const bytes = await getAttachmentObject(row.objectKey);
  if (bytes.length !== row.size) throw new AppError("Attachment temporarily unavailable", 503);
  return { ...metadata(row), bytes };
}
export async function cleanupEventAttachments(isStopping: () => boolean = () => false) {
  assertUploadMutationsAllowed();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(eventAttachments)
      .where(and(isNull(eventAttachments.eventId), lt(eventAttachments.detachedAt, cutoff)))
      .orderBy(asc(eventAttachments.id))
      .limit(50)
      .for("update", { skipLocked: true });
    if (rows.length)
      await tx
        .update(eventAttachments)
        .set({ state: "deleting" })
        .where(
          inArray(
            eventAttachments.id,
            rows.map((row) => row.id),
          ),
        );
    return rows;
  });
  for (const row of claimed) {
    if (isStopping()) break;
    await deleteAttachmentObject(row.objectKey);
    await db
      .delete(eventAttachments)
      .where(
        and(
          eq(eventAttachments.id, row.id),
          eq(eventAttachments.state, "deleting"),
          isNull(eventAttachments.eventId),
        ),
      );
  }
}
export function startEventAttachmentCleanup() {
  return startStoppableWorker({
    intervalMs: 60 * 60 * 1000,
    run: cleanupEventAttachments,
    onError: (error) => logger.app.error("Event attachment cleanup failed", error),
  });
}
