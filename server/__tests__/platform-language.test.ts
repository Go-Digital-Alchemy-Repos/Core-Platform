import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_LABELS } from "@/lib/constants";

const rootDir = process.cwd();

function source(path: string) {
  return readFileSync(join(rootDir, path), "utf8");
}

describe("platform language guardrails", () => {
  it("uses neutral role labels for compatibility role keys", () => {
    expect(ROLE_LABELS).toMatchObject({
      therapist: "Provider",
      client: "Member",
    });
  });

  it("keeps visible provider onboarding copy neutral", () => {
    const files = [
      "client/src/features/therapist/application-page.tsx",
      "client/src/features/therapist/application-status-page.tsx",
      "client/src/features/therapist/therapist-sidebar.tsx",
      "server/routes/contact-professional.routes.ts",
      "server/scripts/seed-directory-demo-presets.ts",
    ];

    const combined = files.map(source).join("\n");

    expect(combined).not.toContain("Core Platform counselor");
    expect(combined).not.toContain("Licensed Professional Counselor");
    expect(combined).not.toContain("Crossroads Counseling Center");
    expect(combined).not.toContain("Demo therapist profile");
    expect(combined).not.toContain("Demo counselor profile");
    expect(combined).not.toContain("Global Therapy Suite");
    expect(combined).toContain("Core Platform directory profile");
  });
});
