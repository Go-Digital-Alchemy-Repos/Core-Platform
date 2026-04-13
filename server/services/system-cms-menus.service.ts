import { randomUUID } from "crypto";
import { storage } from "../storage";
import type { InsertCmsMenu, MenuItem, StandardMenuLocation } from "@shared/schema";

function id() {
  return randomUUID();
}

function item(label: string, url: string, children: MenuItem[] = [], openInNewTab = false): MenuItem {
  return {
    id: id(),
    label,
    url,
    openInNewTab,
    children,
  };
}

const defaultMenus: Array<InsertCmsMenu & { location: StandardMenuLocation }> = [
  {
    name: "Main Navigation",
    location: "main_navigation",
    items: [
      item("About", "/about"),
      item("Find a Mental Health Professional", "/directory"),
      item("Join the Network", "/join"),
      item("Resources", "#", [
        item("Events", "/events"),
        item("Insights & Articles", "/insights"),
      ]),
      item("Contact", "/contact"),
    ],
  },
  {
    name: "Platform",
    location: "footer_platform",
    items: [
      item("Find a Mental Health Professional", "/directory"),
      item("Events & Workshops", "/events"),
      item("How It Works", "/about"),
    ],
  },
  {
    name: "For Mental Health Professionals",
    location: "footer_professionals",
    items: [
      item("Applications open in June", "/join"),
      item("Mental Health Professional Login", "/auth/login"),
      item("Membership Plans", "/therapist/subscription"),
    ],
  },
  {
    name: "Resources",
    location: "footer_resources",
    items: [
      item("About TCKs", "/about"),
      item("Upcoming Events", "/events"),
      item("Browse Specializations", "/directory"),
    ],
  },
  {
    name: "Company",
    location: "footer_company",
    items: [
      item("About Us", "/about"),
      item("Contact", "/contact"),
      item("Support", "/contact"),
    ],
  },
  {
    name: "Legal",
    location: "footer_legal",
    items: [
      item("Privacy Policy", "/contact"),
      item("Terms of Service", "/contact"),
    ],
  },
];

export async function ensureSystemCmsMenus() {
  const menus = await storage.cmsMenus.getAll();
  const assignedLocations = new Set(menus.map((menu) => menu.location));

  const hasAnyHeaderMenu =
    assignedLocations.has("main_navigation") || assignedLocations.has("header");
  const hasAnyThemeMenu = menus.some((menu) => menu.location !== "unassigned");
  if (!hasAnyHeaderMenu && !hasAnyThemeMenu) {
    const mainNavigation = defaultMenus.find((menu) => menu.location === "main_navigation");
    if (mainNavigation) {
      await storage.cmsMenus.create(mainNavigation);
    }
  }

  const hasAnyFooterMenus =
    assignedLocations.has("footer") ||
    defaultMenus
      .filter((entry) => entry.location !== "main_navigation")
      .some((entry) => assignedLocations.has(entry.location));
  if (!hasAnyFooterMenus) {
    for (const menu of defaultMenus.filter((entry) => entry.location !== "main_navigation")) {
      await storage.cmsMenus.create(menu);
    }
  }
}
