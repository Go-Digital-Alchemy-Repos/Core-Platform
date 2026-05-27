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

function patchLegalItemUrls(items: MenuItem[]): { items: MenuItem[]; changed: boolean } {
  let changed = false;

  const nextItems = items.map((entry) => {
    const nextChildren = entry.children?.length
      ? patchLegalItemUrls(entry.children)
      : { items: entry.children ?? [], changed: false };

    const normalizedLabel = entry.label.trim().toLowerCase();
    let nextUrl = entry.url;

    if (
      normalizedLabel === "privacy policy" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/privacy-policy";
      changed = true;
    }

    if (
      normalizedLabel === "terms of service" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/terms-of-service";
      changed = true;
    }

    if (
      normalizedLabel === "disclaimer" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/disclaimer";
      changed = true;
    }

    if (nextChildren.changed) {
      changed = true;
    }

    return {
      ...entry,
      url: nextUrl,
      children: nextChildren.items,
    };
  });

  const hasDisclaimer = nextItems.some((entry) => entry.label.trim().toLowerCase() === "disclaimer");
  if (!hasDisclaimer) {
    nextItems.push(item("Disclaimer", "/disclaimer"));
    changed = true;
  }

  return { items: nextItems, changed };
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
      item("About Core Platforms", "/about"),
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
      item("Privacy Policy", "/privacy-policy"),
      item("Terms of Service", "/terms-of-service"),
      item("Disclaimer", "/disclaimer"),
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

  const legalMenu = await storage.cmsMenus.getByLocation("footer_legal");
  if (legalMenu?.items) {
    const patched = patchLegalItemUrls((legalMenu.items as MenuItem[]) || []);
    if (patched.changed) {
      await storage.cmsMenus.update(legalMenu.id, {
        items: patched.items,
      });
    }
  }
}
