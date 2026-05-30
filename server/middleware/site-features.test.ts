import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";

const mockIsSiteFeatureEnabled = vi.fn();

vi.mock("../services/site-features.service", () => ({
  isSiteFeatureEnabled: mockIsSiteFeatureEnabled,
}));

function mockReqRes() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("requireSiteFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues when the requested feature is enabled", async () => {
    mockIsSiteFeatureEnabled.mockResolvedValue(true);
    const { req, res, next } = mockReqRes();
    const { requireEcommerceEnabled } = await import("./site-features");

    await requireEcommerceEnabled(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 404 when the requested feature is disabled", async () => {
    mockIsSiteFeatureEnabled.mockResolvedValue(false);
    const { req, res, next } = mockReqRes();
    const { requireEcommerceEnabled } = await import("./site-features");

    await requireEcommerceEnabled(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Ecommerce is not available" });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards feature lookup errors to the error handler", async () => {
    const error = new Error("settings unavailable");
    mockIsSiteFeatureEnabled.mockRejectedValue(error);
    const { req, res, next } = mockReqRes();
    const { requireEcommerceEnabled } = await import("./site-features");

    await requireEcommerceEnabled(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
