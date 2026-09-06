import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();
const MockS3Client = vi.fn(() => ({ send: mockSend }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
  GetObjectCommand: vi.fn((params: unknown) => ({ type: "GetObject", ...(params as object) })),
  PutObjectCommand: vi.fn((params: unknown) => ({ type: "PutObject", ...(params as object) })),
  DeleteObjectCommand: vi.fn((params: unknown) => ({
    type: "DeleteObject",
    ...(params as object),
  })),
  HeadBucketCommand: vi.fn((params: unknown) => ({ type: "HeadBucket", ...(params as object) })),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    r2: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn() },
  },
}));

vi.mock("../utils/retry", () => ({
  retryOnce: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const mockGetDecryptedCategory = vi.fn();
vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
    },
  },
}));

vi.mock("../storage", () => ({ storage: {} }));
vi.mock("../services/email.service", () => ({ sendEmail: vi.fn() }));

describe("R2 service", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("freeze throws before configuration/SDK work instead of returning fallback sentinels", async () => {
    vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "true");
    const mod = await import("../services/r2.service");
    await expect(
      mod.uploadFile("test.png", Buffer.from("data"), "image/png"),
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(mod.deleteFile("test.png")).rejects.toMatchObject({ statusCode: 503 });
    expect(mockGetDecryptedCategory).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    MockS3Client.mockClear();
    delete process.env.CLIENT_STACK_ID;
    delete process.env.PUBLIC_SITE_ORIGIN;
    const mod = await import("../services/r2.service");
    mod.resetClient();
  });

  it("skips DB config fetch when client is already cached", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://cdn.example.com",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    await mod.uploadFile("test.png", Buffer.from("data"), "image/png");
    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(1);

    await mod.uploadFile("test2.png", Buffer.from("data2"), "image/png");
    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(1);
  });

  it("re-fetches config after resetClient is called", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    await mod.uploadFile("a.png", Buffer.from("a"), "image/png");
    mod.resetClient();
    await mod.uploadFile("b.png", Buffer.from("b"), "image/png");

    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(2);
  });

  it("uses an app-served URL when no public URL is configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("/r2/images/photo.jpg");
  });

  it("uses an app-served URL when the configured public URL is the private R2 API host", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://acct.r2.cloudflarestorage.com/bucket",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("/r2/images/photo.jpg");
  });

  it("returns null when R2 is not configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const result = await mod.uploadFile("test.png", Buffer.from("data"), "image/png");
    expect(result).toBeNull();
  });

  it("returns correct public URL on upload", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://cdn.example.com/",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("https://cdn.example.com/system-backups/uploads/images/photo.jpg");
  });

  it("stores uploads under the activated client domain namespace", async () => {
    process.env.CLIENT_STACK_ID = "better-farms-foundation";
    process.env.PUBLIC_SITE_ORIGIN = "https://www.better-farms.org";
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "core-platform-website-backups",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("cms/media/photo.jpg", Buffer.from("data"), "image/jpeg");

    expect(url).toBe("/r2/cms/media/photo.jpg");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "clients/better-farms.org/uploads/cms/media/photo.jpg" }),
    );
  });
  function configure(publicUrl = "") {
    vi.stubEnv("CLIENT_STACK_ID", "core-platform");
    vi.stubEnv("PUBLIC_SITE_ORIGIN", "");
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: publicUrl,
    });
    mockSend.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from("candidate bytes") },
      ContentType: "image/webp",
    });
  }
  it("targets namespaced GET and DELETE using stored logical keys", async () => {
    configure();
    const mod = await import("../services/r2.service");
    expect((await mod.downloadFile("cms/images/candidate.webp"))?.buffer.toString()).toBe(
      "candidate bytes",
    );
    expect(mockSend).toHaveBeenLastCalledWith({
      type: "GetObject",
      Bucket: "bucket",
      Key: "clients/core-platform/uploads/cms/images/candidate.webp",
    });
    expect(await mod.deleteFile("cms/images/candidate.webp")).toBe(true);
    expect(mockSend).toHaveBeenLastCalledWith({
      type: "DeleteObject",
      Bucket: "bucket",
      Key: "clients/core-platform/uploads/cms/images/candidate.webp",
    });
  });
  it("does not fall back to the root key when namespaced GET fails", async () => {
    configure();
    mockSend.mockRejectedValue(new Error("NoSuchKey"));
    const mod = await import("../services/r2.service");
    expect(await mod.downloadFile("cms/images/missing.webp")).toBeNull();
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].Key).toBe(
      "clients/core-platform/uploads/cms/images/missing.webp",
    );
  });
  it("normalizes a candidate-qualified public URL to a logical app URL without double prefix", async () => {
    configure();
    const mod = await import("../services/r2.service");
    expect(
      await mod.normalizePublicUrl(
        "https://pub.example.r2.dev/clients/core-platform/uploads/cms/images/candidate.webp",
      ),
    ).toBe("/r2/cms/images/candidate.webp");
    expect(await mod.normalizePublicUrl("/r2/cms/images/candidate.webp")).toBe(
      "/r2/cms/images/candidate.webp",
    );
    mod.resetClient();
    configure("https://cdn.example.com");
    expect(
      await mod.normalizePublicUrl(
        "https://pub.example.r2.dev/clients/core-platform/uploads/cms/images/candidate.webp",
      ),
    ).toBe("https://cdn.example.com/clients/core-platform/uploads/cms/images/candidate.webp");
  });
  it("reads candidate career resume r2:logical references through the unchanged career loader while frozen", async () => {
    configure();
    vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "true");
    const { loadCareerResume } = await import("../services/careers.service");
    expect((await loadCareerResume("r2:career-resumes/candidate.pdf"))?.buffer.toString()).toBe(
      "candidate bytes",
    );
    expect(mockSend).toHaveBeenLastCalledWith({
      type: "GetObject",
      Bucket: "bucket",
      Key: "clients/core-platform/uploads/career-resumes/candidate.pdf",
    });
  });
  it("serves a candidate logical app URL through the real frozen public route", async () => {
    configure();
    vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "true");
    const { default: express } = await import("express");
    const { default: route } = await import("../routes/r2-public.routes");
    const app = express();
    app.use("/r2", route);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const address = server.address() as import("node:net").AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/r2/cms/images/candidate.webp`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("candidate bytes");
      expect(mockSend).toHaveBeenLastCalledWith({
        type: "GetObject",
        Bucket: "bucket",
        Key: "clients/core-platform/uploads/cms/images/candidate.webp",
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
