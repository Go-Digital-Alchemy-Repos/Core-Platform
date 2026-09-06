import { describe, expect, it } from "vitest";
import {
  validateClientSiteComponentContent,
  type ClientSiteEditableComponent,
} from "./client-site-content-contract";

describe("editable URL boundaries", () => {
  for (const type of ["image", "ctaTarget"] as const) {
    const component = {
      fields: [{ path: "target", label: "Target", type, required: true }],
    } as ClientSiteEditableComponent;
    it(`${type} rejects paths browsers can interpret as external hosts`, () => {
      for (const target of [
        String.raw`/\example.test/image`,
        String.raw`/\user:pass@example.test/image`,
        "/image\u0000.png",
        "/image\u007f.png",
        "//example.test/image",
      ]) {
        expect(() => validateClientSiteComponentContent(component, { target })).toThrow();
      }
    });
    it(`${type} retains ordinary site paths and explicit HTTPS URLs`, () => {
      for (const target of [
        "/image.png",
        "/contact?from=hero#form",
        "https://media.example.test/image.png",
      ]) {
        expect(validateClientSiteComponentContent(component, { target })).toEqual({ target });
      }
    });
  }
});
