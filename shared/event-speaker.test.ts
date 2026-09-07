import { describe, expect, it } from "vitest";
import { eventSpeakerInputSchema } from "./event-speaker";
describe("saved speaker input", () => {
  it("accepts editable profile fields and trims names", () => {
    expect(
      eventSpeakerInputSchema.parse({
        name: " Speaker ",
        description: "Bio",
        email: "",
        websiteUrl: "https://example.com",
      }).name,
    ).toBe("Speaker");
  });
  it("rejects invalid contacts, blank names and protected fields", () => {
    for (const input of [
      { name: " " },
      { name: "A", email: "broken" },
      { name: "A", websiteUrl: "javascript:alert(1)" },
      { name: "A", id: "injected" },
    ])
      expect(eventSpeakerInputSchema.safeParse(input).success).toBe(false);
  });
  it("supports partial edits without changing identity", () => {
    expect(eventSpeakerInputSchema.partial().parse({ description: "Updated" })).toEqual({
      description: "Updated",
    });
  });
});
