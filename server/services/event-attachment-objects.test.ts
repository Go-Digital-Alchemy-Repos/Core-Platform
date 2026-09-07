import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn(), settings: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getDecryptedCategory: mocks.settings } } }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = mocks.send;
    destroy = mocks.destroy;
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));
import {
  readBoundedAttachmentBody,
  getAttachmentObject,
  putAttachmentObject,
} from "./event-attachment-objects";
import { Readable } from "node:stream";
describe("private event attachment objects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("EVENT_ATTACHMENTS_R2_ACCOUNT_ID", "synthetic-account");
    vi.stubEnv("EVENT_ATTACHMENTS_R2_ACCESS_KEY_ID", "synthetic-key");
    vi.stubEnv("EVENT_ATTACHMENTS_R2_SECRET_ACCESS_KEY", "synthetic-secret");
    vi.stubEnv("EVENT_ATTACHMENTS_R2_BUCKET_NAME", "private-materials");
    mocks.settings.mockResolvedValue({
      r2_bucket_name: "public-images",
      r2_account_id: "synthetic-account",
    });
  });
  it("fails closed without dedicated private configuration", async () => {
    vi.stubEnv("EVENT_ATTACHMENTS_R2_BUCKET_NAME", "");
    await expect(getAttachmentObject("test/id")).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects the public uploads bucket", async () => {
    vi.stubEnv("EVENT_ATTACHMENTS_R2_BUCKET_NAME", "public-images");
    await expect(getAttachmentObject("test/id")).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("preserves bytes under the limit and rejects stream overflow", async () => {
    expect(
      await readBoundedAttachmentBody(Readable.from([Buffer.from("abc"), Buffer.from("de")]), 5),
    ).toEqual(Buffer.from("abcde"));
    await expect(
      readBoundedAttachmentBody(Readable.from([Buffer.from("abc"), Buffer.from("def")]), 5),
    ).rejects.toMatchObject({ statusCode: 503 });
  });
  it("rejects oversized declared bodies before consuming them", async () => {
    const body = Readable.from([Buffer.from("tiny")]);
    mocks.send.mockResolvedValue({ ContentLength: 26 * 1024 * 1024, Body: body });
    await expect(getAttachmentObject("test/id")).rejects.toMatchObject({ statusCode: 503 });
    expect(body.destroyed).toBe(true);
  });
  it("uses private cache policy and an abort deadline for uploads", async () => {
    await putAttachmentObject("test/id", Buffer.from("abc"), "text/plain");
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "private-materials",
      CacheControl: "private, no-store",
      Body: Buffer.from("abc"),
    });
    expect(mocks.send.mock.calls[0][1].abortSignal).toBeInstanceOf(AbortSignal);
  });
});
