import { describe, expect, it } from "vitest";
import {
  defaultEventConfiguration,
  eventConfigurationSchema,
  validateConfigurationTransition,
  validateConfiguredEventChoices,
} from "./event-configuration";
describe("event configuration", () => {
  it("seeds compatible presets and delivery identities", () => {
    const c = defaultEventConfiguration();
    expect(eventConfigurationSchema.parse(c)).toEqual(c);
    expect(c.presets.training.deliveryOptionId).toBe("virtual");
  });
  it("accepts custom choices with stable IDs and preset references", () => {
    const c = defaultEventConfiguration();
    c.types.push({ id: "custom", label: "Custom", archived: false });
    c.presets.custom = { ...c.presets.training };
    expect(eventConfigurationSchema.safeParse(c).success).toBe(true);
  });
  it("requires archived preset references to be replaced", () => {
    const c = defaultEventConfiguration();
    c.categories.find((o) => o.id === "education")!.archived = true;
    expect(eventConfigurationSchema.safeParse(c).success).toBe(false);
  });
  it("rejects duplicate IDs and inactive default presets", () => {
    const c = defaultEventConfiguration();
    c.types.push({ ...c.types[0] });
    expect(eventConfigurationSchema.safeParse(c).success).toBe(false);
    c.types.pop();
    c.types[0].archived = true;
    expect(eventConfigurationSchema.safeParse(c).success).toBe(false);
  });
  it("preserves existing identities and delivery meaning", () => {
    const old = defaultEventConfiguration();
    const next = defaultEventConfiguration();
    next.types.pop();
    expect(validateConfigurationTransition(old, next)).toMatch(/Archive/);
    next.types = old.types;
    next.delivery[0].behavior = "virtual";
    expect(validateConfigurationTransition(old, next)).toMatch(/behavior/);
  });
  it("allows labels, order, and archive changes without rewriting IDs", () => {
    const old = defaultEventConfiguration();
    const next = defaultEventConfiguration();
    next.types.reverse();
    next.types[0].label = "Renamed";
    next.tags.push({ id: "tag", label: "Materials", archived: false });
    expect(validateConfigurationTransition(old, next)).toBeNull();
  });
  it("rejects malformed configuration and missing canonical delivery mapping", () => {
    const c = defaultEventConfiguration();
    delete c.delivery[0].behavior;
    expect(eventConfigurationSchema.safeParse(c).success).toBe(false);
    expect(
      eventConfigurationSchema.safeParse({ ...defaultEventConfiguration(), revision: -1 }).success,
    ).toBe(false);
  });
});

describe("configured event choices", () => {
  it("accepts active custom choices and rejects unknown values", () => {
    const c = defaultEventConfiguration();
    c.types.push({ id: "custom", label: "Custom", archived: false });
    expect(validateConfiguredEventChoices(c, { eventType: "custom" })).toBeNull();
    expect(validateConfiguredEventChoices(c, { eventType: "missing" })).toMatch(/Invalid/);
  });
  it("preserves archived existing values but rejects selecting them on another event", () => {
    const c = defaultEventConfiguration();
    c.types[0].archived = true;
    expect(
      validateConfiguredEventChoices(c, { eventType: "training" }, { eventType: "training" }),
    ).toBeNull();
    expect(
      validateConfiguredEventChoices(c, { eventType: "training" }, { eventType: "webinar" }),
    ).toMatch(/archived/);
  });
  it("requires the custom delivery selection to match canonical behavior", () => {
    const c = defaultEventConfiguration();
    c.delivery.push({ id: "stream", label: "Livestream", archived: false, behavior: "virtual" });
    expect(
      validateConfiguredEventChoices(c, { deliveryOptionId: "stream", deliveryMode: "virtual" }),
    ).toBeNull();
    expect(
      validateConfiguredEventChoices(c, { deliveryOptionId: "stream", deliveryMode: "in_person" }),
    ).toMatch(/does not match/);
    c.delivery[3].archived = true;
    expect(
      validateConfiguredEventChoices(c, { deliveryOptionId: "stream", deliveryMode: "virtual" }),
    ).toMatch(/archived/);
    expect(
      validateConfiguredEventChoices(
        c,
        { deliveryOptionId: "stream", deliveryMode: "virtual" },
        { deliveryOptionId: "stream", deliveryMode: "virtual" },
      ),
    ).toBeNull();
  });
});
