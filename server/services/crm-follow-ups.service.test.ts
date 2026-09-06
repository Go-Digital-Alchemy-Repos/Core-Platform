import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({ list: vi.fn(), assignees: vi.fn() }));
vi.mock("../storage/crm-follow-ups.storage", () => ({
  followUpError: (message: string, statusCode = 400) =>
    Object.assign(new Error(message), { statusCode }),
  CrmFollowUpsStorage: class {
    list = state.list;
    assignees = state.assignees;
  },
}));
import { listCrmFollowUps, listCrmAssignees } from "./crm-follow-ups.service";
describe("follow-up cursor navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.list.mockResolvedValue([
      { kind: "lead", taskId: "one", dueAt: "2026-09-01T00:00:00.123456Z" },
      { kind: "client", taskId: "two", dueAt: null },
    ]);
    state.assignees.mockResolvedValue([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });
  it("pins the original clock and exact microsecond tuple", async () => {
    const first = await listCrmFollowUps({ limit: 1 }, "admin", new Date("2026-09-06T00:00:00Z"));
    expect(first.items).toHaveLength(1);
    const second = await listCrmFollowUps(
      { limit: 1, cursor: first.nextCursor },
      "admin",
      new Date("2026-09-07T00:00:00Z"),
    );
    expect(second.asOf).toBe(first.asOf);
    expect(state.list.mock.calls[1][4]).toMatchObject({
      taskId: "one",
      dueAt: "2026-09-01T00:00:00.123456Z",
    });
  });
  it("rejects changed filters/actor and malformed or oversized cursor", async () => {
    const first = await listCrmFollowUps({ limit: 1 }, "admin");
    await expect(
      listCrmFollowUps({ limit: 1, cursor: first.nextCursor, due: "undated" }, "admin"),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      listCrmFollowUps({ limit: 1, cursor: first.nextCursor }, "editor"),
    ).rejects.toMatchObject({ statusCode: 400 });
    for (const cursor of ["not-json", "x".repeat(4097)])
      await expect(listCrmFollowUps({ cursor }, "admin")).rejects.toThrow();
  });
  it("bounds assignee result and rejects cursor search mismatch", async () => {
    const first = await listCrmAssignees({ limit: 1, query: "A" });
    expect(first.items).toHaveLength(1);
    await expect(
      listCrmAssignees({ limit: 1, query: "B", cursor: first.nextCursor }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
