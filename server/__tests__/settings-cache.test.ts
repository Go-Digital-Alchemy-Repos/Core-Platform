import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { mockDb };
});

vi.mock("../db", () => ({
  db: mockDb,
}));

vi.mock("../utils/logger", () => ({
  logger: {
    db: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  },
}));

vi.mock("@shared/schema", () => ({
  systemSettings: {
    key: "key",
    category: "category",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
}));

import { SettingsStorage } from "../storage/settings.storage";

function setupMockDb() {
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const values = vi.fn(() => ({ returning }));
  const from = vi.fn(() => ({ where }));

  mockDb.select.mockReturnValue({ from });
  mockDb.insert.mockReturnValue({ values });
  mockDb.update.mockReturnValue({ set });
  mockDb.delete.mockReturnValue({ where: vi.fn() });

  return { from, where, returning, values };
}

describe("SettingsStorage caching", () => {
  let storage: SettingsStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new SettingsStorage(100);
  });

  it("caches getSetting results and avoids repeat DB calls", async () => {
    const { from, where } = setupMockDb();
    where.mockResolvedValue([{ key: "test_key", value: "test_val", isSecret: false, category: "general" }]);

    const result1 = await storage.getSetting("test_key");
    const result2 = await storage.getSetting("test_key");

    expect(result1).toBe("test_val");
    expect(result2).toBe("test_val");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("caches getDecryptedCategory results", async () => {
    const { from } = setupMockDb();
    from.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { key: "k1", value: "v1", isSecret: false },
        { key: "k2", value: "v2", isSecret: false },
      ]),
    });

    const result1 = await storage.getDecryptedCategory("test_cat");
    const result2 = await storage.getDecryptedCategory("test_cat");

    expect(result1).toEqual({ k1: "v1", k2: "v2" });
    expect(result2).toEqual({ k1: "v1", k2: "v2" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("invalidates category cache when invalidateCategory is called", async () => {
    const { from } = setupMockDb();
    from.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { key: "k1", value: "v1", isSecret: false },
      ]),
    });

    await storage.getDecryptedCategory("test_cat");
    storage.invalidateCategory("test_cat");
    await storage.getDecryptedCategory("test_cat");

    expect(from).toHaveBeenCalledTimes(2);
  });

  it("expires cache entries after TTL", async () => {
    const { from, where } = setupMockDb();
    where.mockResolvedValue([{ key: "ttl_key", value: "val", isSecret: false, category: "general" }]);

    await storage.getSetting("ttl_key");
    expect(from).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 150));

    await storage.getSetting("ttl_key");
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("handles concurrent access to the same category", async () => {
    const { from } = setupMockDb();
    from.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { key: "c1", value: "cv1", isSecret: false },
      ]),
    });

    const [r1, r2, r3] = await Promise.all([
      storage.getDecryptedCategory("concurrent"),
      storage.getDecryptedCategory("concurrent"),
      storage.getDecryptedCategory("concurrent"),
    ]);

    expect(r1).toEqual({ c1: "cv1" });
    expect(r2).toEqual({ c1: "cv1" });
    expect(r3).toEqual({ c1: "cv1" });
  });

  it("getSetting returns fresh value after upsert of previously-missing key", async () => {
    const { from, where, returning } = setupMockDb();
    where.mockResolvedValue([]);

    const val1 = await storage.getSetting("new_key");
    expect(val1).toBeNull();

    where.mockResolvedValue([]);
    returning.mockResolvedValue([{ key: "new_key", value: "new_val", category: "cat", isSecret: false }]);

    await storage.upsertSetting("new_key", "new_val", "cat", false);

    where.mockResolvedValue([{ key: "new_key", value: "new_val", isSecret: false, category: "cat" }]);
    const val2 = await storage.getSetting("new_key");
    expect(val2).toBe("new_val");
  });

  it("invalidateAll clears all caches", async () => {
    const { from, where } = setupMockDb();
    where.mockResolvedValue([{ key: "k", value: "v", isSecret: false, category: "cat" }]);

    await storage.getSetting("k");
    expect(from).toHaveBeenCalledTimes(1);

    storage.invalidateAll();

    where.mockResolvedValue([{ key: "k", value: "v_new", isSecret: false, category: "cat" }]);

    const val = await storage.getSetting("k");
    expect(val).toBe("v_new");
    expect(from).toHaveBeenCalledTimes(2);
  });
});
