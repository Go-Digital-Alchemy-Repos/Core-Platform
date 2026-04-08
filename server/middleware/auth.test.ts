import { describe, it, expect, vi } from "vitest";
import { hashPassword, comparePassword, generateToken, requireRole } from "./auth";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "usr_1",
    email: "test@example.com",
    password: "hashed",
    firstName: "Test",
    lastName: "User",
    role: "therapist",
    profileImageUrl: null,
    isSuspended: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("hashPassword / comparePassword", () => {
  it("round-trips a password correctly", async () => {
    const plain = "SuperSecret123!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await comparePassword(plain, hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});

describe("generateToken", () => {
  it("returns a JWT string with three dot-separated parts", () => {
    const user = makeUser();
    const token = generateToken(user);
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("encodes the correct payload (userId, email, role)", () => {
    const user = makeUser({ id: "u42", email: "a@b.com", role: "admin" });
    const token = generateToken(user);
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.userId).toBe("u42");
    expect(payload.email).toBe("a@b.com");
    expect(payload.role).toBe("admin");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("requireRole", () => {
  function mockReqRes(user?: User) {
    const req = { user } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it("returns 401 when no user is attached", () => {
    const { req, res, next } = mockReqRes();
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not allowed", () => {
    const { req, res, next } = mockReqRes(makeUser({ role: "therapist" }));
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user role matches", () => {
    const { req, res, next } = mockReqRes(makeUser({ role: "admin" }));
    requireRole("admin", "therapist")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
