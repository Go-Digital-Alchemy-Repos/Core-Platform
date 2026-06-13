import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";
import type { AdminPermission } from "@shared/types";
import type { User } from "@shared/schema";
import type { PublicDirectorySettings } from "@shared/types/directory-settings";
import { buildNavGroups } from "@/features/admin/admin-sidebar";
import { buildAdminCommandItems } from "@/features/admin/admin-command-palette";

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

  it("shows membership navigation only when the membership app is enabled", () => {
    const enabledGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, membershipEnabled: true },
      adminUser,
      () => true,
      directorySettings,
    );
    const disabledGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, membershipEnabled: false },
      adminUser,
      () => true,
      directorySettings,
    );

    expect(enabledGroups.some((group) => group.label === "Membership")).toBe(true);
    expect(disabledGroups.some((group) => group.label === "Membership")).toBe(false);
  });

  it("places Membership Settings under Members", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, membershipEnabled: true },
      adminUser,
      () => true,
      directorySettings,
    );

    const membershipGroup = groups.find((group) => group.label === "Membership");
    const membershipChildren = membershipGroup?.items.find((item) => item.title === "Membership")?.children ?? [];

    expect(membershipChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Plans", href: "/admin/membership" },
      { title: "Members", href: "/admin/membership/members" },
      { title: "Settings", href: "/admin/membership/settings" },
    ]);
  });

  it("places Portfolio Add New and Settings under Portfolio", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, portfolioEnabled: true },
      adminUser,
      (permission: AdminPermission) => permission === "content",
      directorySettings,
    );

    const portfolioGroup = groups.find((group) => group.label === "Portfolio");
    const portfolioChildren = portfolioGroup?.items.find((item) => item.title === "Portfolio")?.children ?? [];

    expect(portfolioChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Add New", href: "/admin/portfolio/new" },
      { title: "Settings", href: "/admin/portfolio/settings" },
    ]);
  });

  it("places Career Center Add New and Settings under Careers", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, careersEnabled: true },
      adminUser,
      (permission: AdminPermission) => permission === "content",
      directorySettings,
    );

    const careersGroup = groups.find((group) => group.label === "Career Center");
    const careersChildren = careersGroup?.items.find((item) => item.title === "Careers")?.children ?? [];

    expect(careersChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Add New", href: "/admin/careers/new" },
      { title: "Settings", href: "/admin/careers/settings" },
    ]);
  });

  it("builds command palette items from gated navigation and known sub-routes", () => {
    const navGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, ecommerceEnabled: true, eventsEnabled: true },
      adminUser,
      () => true,
      directorySettings,
    );

    const commands = buildAdminCommandItems(navGroups);
    const hrefs = commands.map((item) => item.href);

    expect(hrefs).toContain("/admin/events/new");
    expect(hrefs).toContain("/admin/events/settings");
    expect(hrefs).toContain("/admin/ecommerce/refunds");
    expect(hrefs).toContain("/admin/settings/email-templates");
  });

  it("omits app command items when the feature gate removes the nav group", () => {
    const navGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, ecommerceEnabled: false },
      adminUser,
      () => true,
      directorySettings,
    );

    const commands = buildAdminCommandItems(navGroups);

    expect(commands.some((item) => item.href.startsWith("/admin/ecommerce"))).toBe(false);
  });
});
