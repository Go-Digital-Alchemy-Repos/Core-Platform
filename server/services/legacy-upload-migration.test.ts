import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "./legacy-upload-migration-plan";
import { executeLegacyUploadMigration, type LegacyUploadStorage } from "./legacy-upload-migration";

function fixture() {
  const body = Buffer.from("legacy image bytes");
  const hash = createHash("sha256").update(body).digest("hex");
  const plan = buildLegacyUploadMigrationPlan({
    stackId: "core-test",
    bucketName: "synthetic-media",
    sourcePrefix: "",
    destinationPrefix: "clients/core-test/uploads",
    ownership: {
      reference: "approved dedicated bucket evidence",
      scope: "dedicated-stack-bucket",
      stackId: "core-test",
      sourcePrefix: "",
    },
    entries: ["cms/a.jpg", "cms/b.jpg"].map((sourceKey) => ({
      sourceKey,
      sha256: hash,
      byteLength: body.length,
      etag: "original",
    })),
  });
  const objects = new Map(
    plan.entries.map((e) => [
      e.sourceKey,
      { body: Buffer.from(body), etag: "original", contentType: "image/jpeg" },
    ]),
  );
  const storage: LegacyUploadStorage = {
    bucketName: plan.bucketName,
    read: vi.fn(async (key) => {
      const o = objects.get(key);
      return o ? { ...o, body: Buffer.from(o.body) } : null;
    }),
    createOnly: vi.fn(async (key, object) => {
      if (objects.has(key)) return "already-exists";
      objects.set(key, {
        ...object,
        body: Buffer.from(object.body),
        etag: "copied",
        contentType: object.contentType ?? "application/octet-stream",
      });
      return "created";
    }),
  };
  const options = {
    plan,
    storage,
    target: {
      stackId: plan.stackId,
      bucketName: plan.bucketName,
      uploadPrefix: plan.destinationPrefix,
    },
    verifyOwnership: vi.fn(async () => {}),
    record: vi.fn(async () => {}),
  };
  return { options, objects, plan, storage };
}
describe("legacy upload migration execution", () => {
  it("defaults to read-only planning and requires independent ownership verification", async () => {
    const { options, storage } = fixture();
    const result = await executeLegacyUploadMigration(options);
    expect(result.mode).toBe("dry-run");
    expect(result.results.map((r) => r.status)).toEqual(["would-copy", "would-copy"]);
    expect(options.verifyOwnership).toHaveBeenCalledOnce();
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("rejects apply without exact approval, wrong active target, and wrong adapter before storage access", async () => {
    for (const variant of ["approval", "target", "adapter"]) {
      const { options, storage } = fixture();
      if (variant === "target") options.target.stackId = "other";
      if (variant === "adapter") options.storage = { ...storage, bucketName: "other-bucket" };
      await expect(
        executeLegacyUploadMigration({
          ...options,
          apply: true,
          approvedPlanId: variant === "approval" ? "wrong" : options.plan.planId,
        }),
      ).rejects.toThrow();
      expect(storage.read).not.toHaveBeenCalled();
      expect(options.verifyOwnership).not.toHaveBeenCalled();
    }
  });
  it("rejects failed ownership proof before object access", async () => {
    const { options, storage } = fixture();
    options.verifyOwnership.mockRejectedValue(new Error("ownership not established"));
    await expect(executeLegacyUploadMigration(options)).rejects.toThrow(
      "ownership not established",
    );
    expect(storage.read).not.toHaveBeenCalled();
  });
  it("copies verified bytes without removing originals and revalidates on resume", async () => {
    const { options, plan, objects, storage } = fixture();
    const apply = { ...options, apply: true, approvedPlanId: plan.planId };
    expect((await executeLegacyUploadMigration(apply)).results.map((r) => r.status)).toEqual([
      "verified",
      "verified",
    ]);
    expect(objects.size).toBe(4);
    expect(objects.get(plan.entries[0].destinationKey)?.contentType).toBe("image/jpeg");
    expect((await executeLegacyUploadMigration(apply)).complete).toBe(true);
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
    objects.get(plan.entries[0].destinationKey)!.body = Buffer.from("corrupted");
    const result = await executeLegacyUploadMigration(apply);
    expect(result.complete).toBe(false);
    expect(result.results[0].status).toBe("destination-conflict");
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
  });
  it("detects source changes even when an existing destination matches", async () => {
    const { options, plan, objects, storage } = fixture();
    objects.set(plan.entries[0].destinationKey, { ...objects.get(plan.entries[0].sourceKey)! });
    objects.get(plan.entries[0].sourceKey)!.etag = "replacement";
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("source-changed");
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("does not bless a competing destination write after the absence check", async () => {
    const { options, plan, storage, objects } = fixture();
    vi.mocked(storage.createOnly).mockImplementation(async (key) => {
      objects.set(key, {
        body: Buffer.from("someone else's object"),
        etag: "racing",
        contentType: "text/plain",
      });
      return "already-exists";
    });
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("destination-conflict");
    expect(result.results).toHaveLength(1);
  });
  it("detects a source replacement during copy and stops before another object", async () => {
    const { options, plan, storage, objects } = fixture();
    const original = storage.createOnly;
    storage.createOnly = vi.fn(async (key, object) => {
      const result = await original(key, object);
      objects.get(plan.entries[0].sourceKey)!.body = Buffer.from("changed");
      return result;
    });
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("source-changed");
    expect(storage.createOnly).toHaveBeenCalledTimes(1);
  });
  it("stops after a durable evidence failure; resume can verify the completed copy", async () => {
    const { options, plan, storage } = fixture();
    options.record.mockRejectedValueOnce(new Error("ledger unavailable"));
    const apply = { ...options, apply: true, approvedPlanId: plan.planId };
    await expect(executeLegacyUploadMigration(apply)).rejects.toThrow("ledger unavailable");
    expect(storage.createOnly).toHaveBeenCalledTimes(1);
    expect((await executeLegacyUploadMigration(apply)).complete).toBe(true);
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
  });
});
