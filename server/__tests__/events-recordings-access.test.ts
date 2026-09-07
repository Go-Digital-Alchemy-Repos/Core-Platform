import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@shared/schema/events";

const mocks = vi.hoisted(() => ({
  getRecordingEvents: vi.fn(),
  getEvent: vi.fn(),
  readEventAttachment: vi.fn(),
  getByUser: vi.fn(),
  normalizePublicUrl: vi.fn(),
  user: null as { id: string; role: string } | null,
}));

vi.mock("../storage/index", () => ({
  storage: {
    events: { getRecordingEvents: mocks.getRecordingEvents, getEvent: mocks.getEvent },
    recordingPurchases: { getByUser: mocks.getByUser },
  },
}));

vi.mock("../services/event-configuration.service", () => ({
  readEventConfiguration: vi.fn().mockResolvedValue({ revision: 0 }),
}));

vi.mock("../services/event-attachments.service", () => ({
  listEventAttachments: vi.fn().mockResolvedValue([]),
  readEventAttachment: mocks.readEventAttachment,
}));

vi.mock("../services/r2.service", () => ({
  normalizePublicUrl: mocks.normalizePublicUrl,
}));

vi.mock("../middleware/auth", () => ({
  optionalAuth: (req: { user?: { id: string; role: string } }, _res: unknown, next: () => void) => {
    if (mocks.user) req.user = mocks.user;
    next();
  },
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const sensitiveEvent = (overrides: Partial<Event> = {}) =>
  ({
    id: "event-1",
    title: "Archived webinar",
    imageUrl: null,
    visibility: "public",
    recordingAccess: "paid",
    recordingPrice: 1200,
    virtualJoinUrl: "https://meeting.example.test/join",
    zoomLink: "https://zoom.example.test/join",
    virtualDialInInfo: "555-0100",
    recordingUrl: "https://media.example.test/recording",
    ...overrides,
  }) as Event;

describe("recording archive access", () => {
  let server: Server | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getByUser.mockResolvedValue([]);
    mocks.user = null;
    mocks.normalizePublicUrl.mockImplementation(async (value: string | null) => value);
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) return resolve();
      server.close((error) => (error ? reject(error) : resolve()));
      server = undefined;
    });
  });

  async function getRecordings(path = "/recordings") {
    const { default: eventRoutes } = await import("../routes/events.routes");
    const app = express();
    app.use(eventRoutes);
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP listener");
    return fetch(`http://127.0.0.1:${address.port}${path}`);
  }

  it("never returns virtual meeting credentials from archive responses", async () => {
    mocks.getRecordingEvents.mockResolvedValue([sensitiveEvent()]);

    const response = await getRecordings();
    const [event] = (await response.json()) as Event[];

    expect(response.status).toBe(200);
    expect(event).toMatchObject({
      recordingUrl: null,
      virtualJoinUrl: null,
      zoomLink: null,
      virtualDialInInfo: null,
    });
  });

  it("keeps a purchased recording accessible without exposing virtual meeting credentials", async () => {
    mocks.user = { id: "user-1", role: "therapist" };
    mocks.getRecordingEvents.mockResolvedValue([sensitiveEvent()]);
    mocks.getByUser.mockResolvedValue([{ eventId: "event-1", stripePaymentIntentId: "pi_1" }]);

    const response = await getRecordings();
    const [event] = (await response.json()) as Event[];

    expect(response.status).toBe(200);
    expect(event).toMatchObject({
      recordingUrl: "https://media.example.test/recording",
      virtualJoinUrl: null,
      zoomLink: null,
      virtualDialInInfo: null,
    });
  });

  it("keeps free recording access while removing virtual meeting credentials", async () => {
    mocks.getRecordingEvents.mockResolvedValue([
      sensitiveEvent({ recordingAccess: "free", recordingPrice: null }),
    ]);

    const response = await getRecordings();
    const [event] = (await response.json()) as Event[];

    expect(response.status).toBe(200);
    expect(event).toMatchObject({
      recordingUrl: "https://media.example.test/recording",
      virtualJoinUrl: null,
      zoomLink: null,
      virtualDialInInfo: null,
    });
  });
  it.each([
    ["draft", "public", null],
    ["archived", "public", "admin"],
    ["published", "members_only", null],
    ["published", "admins_only", "client"],
    ["published", "counselors_only", "client"],
  ])(
    "denies attachment downloads for %s/%s/%s before object access",
    async (status, visibility, role) => {
      mocks.user = role ? { id: "user-1", role } : null;
      mocks.getEvent.mockResolvedValue(sensitiveEvent({ status, visibility } as Partial<Event>));
      const response = await getRecordings("/event-1/attachments/file-1");
      expect(response.status).toBe(404);
      expect(mocks.readEventAttachment).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["public", null],
    ["members_only", "client"],
    ["counselors_only", "therapist"],
    ["admins_only", "admin"],
  ])("downloads for authorized %s/%s with private safe headers", async (visibility, role) => {
    mocks.user = role ? { id: "user-1", role } : null;
    mocks.getEvent.mockResolvedValue(sensitiveEvent({ status: "published", visibility }));
    mocks.readEventAttachment.mockResolvedValue({
      originalName: "notes é.txt",
      mimeType: "text/plain",
      size: 5,
      bytes: Buffer.from("hello"),
    });
    const response = await getRecordings("/event-1/attachments/file-1");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toContain(
      "filename*=UTF-8''notes%20%C3%A9.txt",
    );
    expect(mocks.readEventAttachment).toHaveBeenCalledWith("event-1", "file-1");
  });
});
