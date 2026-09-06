import { describe, it, expect } from "vitest";
import {
  crmFollowUpFiltersSchema,
  crmFollowUpQuerySchema,
  crmFollowUpCursorSchema,
} from "./crm-follow-ups";
describe("bounded follow-up contracts", () => {
  it("defaults existing task collections to open/all and bounds pages", () => {
    expect(crmFollowUpFiltersSchema.parse({})).toEqual({
      kind: "all",
      completion: "open",
      due: "all",
      owner: "all",
    });
    expect(crmFollowUpQuerySchema.parse({}).limit).toBe(25);
    for (const limit of [0, 101, -1, 1.2, "NaN"])
      expect(crmFollowUpQuerySchema.safeParse({ limit }).success).toBe(false);
  });
  it("rejects ambiguous owner and unknown fields", () => {
    for (const input of [
      { owner: "user" },
      { assigneeId: "id" },
      { owner: "mine", assigneeId: "id" },
      { extra: true },
    ])
      expect(crmFollowUpFiltersSchema.safeParse(input).success).toBe(false);
  });
  it("bounds and strictly validates every cursor field", () => {
    const valid = {
      version: 1,
      asOf: "2026-09-06T00:00:00.000Z",
      filters: {},
      actorId: "actor",
      dueAt: null,
      kind: "lead",
      taskId: "task",
    };
    expect(crmFollowUpCursorSchema.safeParse(valid).success).toBe(true);
    for (const change of [
      { version: 2 },
      { asOf: "tomorrow" },
      { kind: "unknown" },
      { taskId: "x".repeat(129) },
      { actorId: "" },
      { dueAt: "2026-02-30T00:00:00Z" },
      { other: true },
    ])
      expect(crmFollowUpCursorSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});
