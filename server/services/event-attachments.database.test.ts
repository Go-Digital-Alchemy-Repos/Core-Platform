import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
const testUrl = process.env.EVENT_ATTACHMENTS_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_event_attachments_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local event attachment fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.EVENT_ATTACHMENTS_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("./event-attachment-objects", () => ({
  attachmentObjectKey: (id: string) => `test/${id}`,
  putAttachmentObject: vi.fn(),
  getAttachmentObject: vi.fn(),
  deleteAttachmentObject: vi.fn(),
}));
import { pool } from "../db";
import { runMigrations } from "../migrate";
import {
  stageEventAttachment,
  saveEventWithAttachments,
  listEventAttachments,
  listEventAttachmentsForEvents,
  cleanupEventAttachments,
} from "./event-attachments.service";
import { putAttachmentObject, deleteAttachmentObject } from "./event-attachment-objects";
const file = {
  originalname: "materials.txt",
  mimetype: "text/plain",
  buffer: Buffer.from("Synthetic event materials"),
} as Express.Multer.File;
const eventData = {
  title: "Synthetic",
  slug: "synthetic",
  date: new Date("2026-10-01"),
  status: "published",
};
const pick = (id: string, displayName = "Materials") => ({ id, displayName });
describe.skipIf(!testUrl)("event attachment transaction and lifecycle", () => {
  beforeAll(async () => {
    await runMigrations();
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(putAttachmentObject).mockResolvedValue(undefined);
    await pool.query("TRUNCATE event_attachments, events CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });
  it("stages, saves, renames, reorders and reopens metadata without storage keys", async () => {
    const a = await stageEventAttachment("owner", file);
    const b = await stageEventAttachment("owner", file);
    const event = await saveEventWithAttachments("owner", undefined, eventData, [
      pick(b.id, "Second"),
      pick(a.id, "First"),
    ]);
    expect((await listEventAttachments(event.id)).map((x) => x.displayName)).toEqual([
      "Second",
      "First",
    ]);
    expect(await listEventAttachments(event.id)).not.toHaveProperty("0.objectKey");
    await saveEventWithAttachments("other-admin", event.id, { title: "Updated" }, [
      pick(a.id, "Renamed"),
      pick(b.id),
    ]);
    expect((await listEventAttachments(event.id))[0].displayName).toBe("Renamed");
  });
  it("rejects another owner's stages and rolls back event creation", async () => {
    const a = await stageEventAttachment("owner", file);
    await expect(
      saveEventWithAttachments("other", undefined, eventData, [pick(a.id)]),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await pool.query("SELECT * FROM events")).rows).toHaveLength(0);
  });
  it("rolls back event edits and associations if any selected upload is invalid", async () => {
    const a = await stageEventAttachment("owner", file);
    const event = await saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]);
    await expect(
      saveEventWithAttachments("owner", event.id, { title: "Must not save" }, [
        pick(a.id),
        pick("11111111-1111-4111-8111-111111111111"),
      ]),
    ).rejects.toThrow();
    expect(
      (await pool.query("SELECT title FROM events WHERE id=$1", [event.id])).rows[0].title,
    ).toBe("Synthetic");
    expect(await listEventAttachments(event.id)).toHaveLength(1);
  });
  it("does not remove attachments when an older client omits the field", async () => {
    const a = await stageEventAttachment("owner", file);
    const event = await saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]);
    await saveEventWithAttachments("owner", event.id, { title: "Old client" }, undefined);
    expect(await listEventAttachments(event.id)).toHaveLength(1);
  });
  it("removes only on save and waits 24 hours before physical deletion", async () => {
    const a = await stageEventAttachment("owner", file);
    const event = await saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]);
    await saveEventWithAttachments("owner", event.id, {}, []);
    expect(await listEventAttachments(event.id)).toHaveLength(0);
    await cleanupEventAttachments();
    expect(deleteAttachmentObject).not.toHaveBeenCalled();
    await pool.query("UPDATE event_attachments SET detached_at=now()-interval '25 hours'");
    await cleanupEventAttachments();
    expect(deleteAttachmentObject).toHaveBeenCalledTimes(1);
    expect((await pool.query("SELECT * FROM event_attachments")).rows).toHaveLength(0);
  });
  it("retains failed PUT metadata for cleanup and never attaches pending uploads", async () => {
    vi.mocked(putAttachmentObject).mockRejectedValueOnce(new Error("Synthetic storage failure"));
    await expect(stageEventAttachment("owner", file)).rejects.toThrow("Synthetic storage failure");
    const row = (await pool.query("SELECT * FROM event_attachments")).rows[0];
    expect(row.state).toBe("uploading");
    await expect(
      saveEventWithAttachments("owner", undefined, eventData, [pick(row.id)]),
    ).rejects.toThrow();
  });
  it("serializes concurrent claims of one staged file to different events", async () => {
    const a = await stageEventAttachment("owner", file);
    const results = await Promise.allSettled([
      saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]),
      saveEventWithAttachments("owner", undefined, { ...eventData, slug: "synthetic-two" }, [
        pick(a.id),
      ]),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await pool.query("SELECT * FROM events")).rows).toHaveLength(1);
  });
  it("cannot revive expired or deleting stages, and cleanup preserves attached files", async () => {
    const a = await stageEventAttachment("owner", file);
    await pool.query("UPDATE event_attachments SET detached_at=now()-interval '25 hours'");
    await expect(
      saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]),
    ).rejects.toThrow();
    await pool.query("UPDATE event_attachments SET detached_at=now(),state='deleting'");
    await expect(
      saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]),
    ).rejects.toThrow();
    const b = await stageEventAttachment("owner", file);
    const event = await saveEventWithAttachments("owner", undefined, eventData, [pick(b.id)]);
    await pool.query("UPDATE event_attachments SET detached_at=now()-interval '25 hours'");
    await cleanupEventAttachments();
    expect(await listEventAttachments(event.id)).toHaveLength(1);
  });
  it("batches metadata without mixing events or exposing staged files", async () => {
    const a = await stageEventAttachment("owner", file);
    const b = await stageEventAttachment("owner", file);
    await stageEventAttachment("owner", file);
    const first = await saveEventWithAttachments("owner", undefined, eventData, [pick(a.id)]);
    const second = await saveEventWithAttachments(
      "owner",
      undefined,
      { ...eventData, slug: "second" },
      [pick(b.id)],
    );
    const grouped = await listEventAttachmentsForEvents([first.id, second.id]);
    expect(grouped.get(first.id)?.map((row) => row.id)).toEqual([a.id]);
    expect(grouped.get(second.id)?.map((row) => row.id)).toEqual([b.id]);
    expect(await listEventAttachmentsForEvents([])).toEqual(new Map());
  });
  it("retains deleting metadata on object failure and retries cleanup", async () => {
    await stageEventAttachment("owner", file);
    await pool.query("UPDATE event_attachments SET detached_at=now()-interval '25 hours'");
    vi.mocked(deleteAttachmentObject).mockRejectedValueOnce(new Error("Synthetic unavailable"));
    await expect(cleanupEventAttachments()).rejects.toThrow("Synthetic unavailable");
    expect((await pool.query("SELECT state FROM event_attachments")).rows[0].state).toBe(
      "deleting",
    );
    await cleanupEventAttachments();
    expect((await pool.query("SELECT * FROM event_attachments")).rows).toHaveLength(0);
  });
});
