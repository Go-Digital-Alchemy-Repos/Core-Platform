import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute, mockMigrate, mockReadFile } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockMigrate: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("./db", () => ({
  db: { execute: mockExecute },
}));

vi.mock("drizzle-orm/node-postgres/migrator", () => ({
  migrate: mockMigrate,
}));

vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
}));

describe("runMigrations", () => {
  beforeEach(() => {
    vi.resetModules();
    mockExecute.mockReset();
    mockMigrate.mockReset().mockResolvedValue(undefined);
    mockReadFile.mockReset().mockResolvedValue("SELECT 1");
  });

  it("runs Drizzle and the complete reconciliation path for a fresh database", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ exists: false }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValue({ rows: [{ exists: false }] });

    const { runMigrations } = await import("./migrate");
    await runMigrations();

    expect(mockMigrate).toHaveBeenCalledOnce();
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining("0024_ecommerce.sql"),
      "utf8",
    );
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining("0042_career_directory_locations.sql"),
      "utf8",
    );
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining("0044_client_site_content.sql"),
      "utf8",
    );
  });

  it("recognizes the default Drizzle journal schema on an existing database", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValue({ rows: [{ exists: true }] });

    const { runMigrations } = await import("./migrate");
    await runMigrations();

    expect(mockMigrate).toHaveBeenCalledOnce();
    const journalQuery = mockExecute.mock.calls[0][0];
    expect(JSON.stringify(journalQuery)).toContain("drizzle");
  });
});
