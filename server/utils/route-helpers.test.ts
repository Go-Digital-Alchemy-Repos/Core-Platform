import { describe, it, expect, vi } from "vitest";
import { notFound, conflict } from "./route-helpers";
import type { Response } from "express";

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("notFound", () => {
  it("responds with 404 and entity name in message", () => {
    const res = mockRes();
    notFound(res, "User");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});

describe("conflict", () => {
  it("responds with 409 and provided message", () => {
    const res = mockRes();
    conflict(res, "Email already exists");
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Email already exists" });
  });
});
