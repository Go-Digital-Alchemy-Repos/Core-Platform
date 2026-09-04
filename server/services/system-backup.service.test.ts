import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ pool: {} }));
vi.mock("../utils/logger", () => ({
  logger: { backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } },
}));
vi.mock("./backup-storage.service", () => ({
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));

import { serializeRestoreValue } from "./system-backup.service";

describe("serializeRestoreValue", () => {
  it("preserves JSON arrays and objects as JSON parameters during restore", () => {
    const jsonColumns = new Set(["items", "metadata"]);

    expect(serializeRestoreValue([{ id: "home" }], jsonColumns, "items")).toBe('[{"id":"home"}]');
    expect(serializeRestoreValue({ enabled: true }, jsonColumns, "metadata")).toBe(
      '{"enabled":true}',
    );
  });

  it("leaves ordinary values and JSON nulls unchanged", () => {
    const jsonColumns = new Set(["items"]);

    expect(serializeRestoreValue("navigation", jsonColumns, "name")).toBe("navigation");
    expect(serializeRestoreValue(null, jsonColumns, "items")).toBeNull();
  });
});
