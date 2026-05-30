import { describe, expect, it } from "vitest";
import {
  EVENT_DELIVERY_MODES,
  EVENT_PRESET_DEFAULTS,
  EVENT_REGISTRATION_APPROVAL_MODES,
  EVENT_TYPES,
  insertEventOrganizerSchema,
  insertEventVenueSchema,
} from "./events";

describe("event flexibility constants", () => {
  it("defines the guided services and education presets", () => {
    expect(EVENT_TYPES).toEqual([
      "training",
      "workshop",
      "webinar",
      "class",
      "consultation",
      "appointment",
      "community_event",
    ]);
  });

  it("keeps every preset mapped to supported taxonomy and registration defaults", () => {
    for (const eventType of EVENT_TYPES) {
      const defaults = EVENT_PRESET_DEFAULTS[eventType];
      expect(defaults).toBeTruthy();
      expect(EVENT_DELIVERY_MODES).toContain(defaults.deliveryMode);
      expect(EVENT_REGISTRATION_APPROVAL_MODES).toContain(defaults.registrationApprovalMode);
      expect(typeof defaults.registrationEnabled).toBe("boolean");
    }
  });

  it("validates reusable venues and organizers for event reuse", () => {
    expect(
      insertEventVenueSchema.parse({
        name: "Main Training Room",
        slug: "main-training-room",
        isVirtual: false,
      })
    ).toMatchObject({
      name: "Main Training Room",
      slug: "main-training-room",
    });

    expect(
      insertEventOrganizerSchema.parse({
        name: "Education Team",
        slug: "education-team",
        email: "events@example.com",
      })
    ).toMatchObject({
      name: "Education Team",
      slug: "education-team",
    });
  });
});
