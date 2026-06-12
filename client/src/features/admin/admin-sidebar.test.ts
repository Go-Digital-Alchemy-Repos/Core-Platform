import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";
import type { AdminPermission } from "@shared/types";
import type { User } from "@shared/schema";
import type { PublicDirectorySettings } from "@shared/types/directory-settings";
import { buildNavGroups } from "@/features/admin/admin-sidebar";

const adminUser = {
  id: "user-1",
  username: "admin",
  email: "admin@example.com",
  role: "admin",
} as User;

const directorySettings = {
  directoryLabelSingular: "Provider Directory",
  directoryLabelPlural: "Providers",
  listingLabelPlural: "Listings",
  specialtyLabelPlural: "Specialties",
  directoryRequiresApplicationProcess: true,
} as PublicDirectorySettings;

describe("buildNavGroups", () => {
  it("places Event Settings under Event Management after Create Event", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, eventsEnabled: true },
      adminUser,
      (permission: AdminPermission) => permission === "content",
      directorySettings,
    );

    const eventGroup = groups.find((group) => group.label === "Event Management");
    const eventChildren = eventGroup?.items.find((item) => item.title === "Events")?.children ?? [];

    expect(eventChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Create Event", href: "/admin/events/new" },
      { title: "Settings", href: "/admin/events/settings" },
    ]);
  });
});
