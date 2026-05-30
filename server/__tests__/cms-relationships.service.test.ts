import { describe, expect, it, vi } from "vitest";
import type { CmsPage, MenuItem } from "@shared/schema";

vi.mock("../storage", () => ({
  storage: {
    cmsMenus: {
      getAll: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { syncMenuItemsWithPage } from "../services/cms-relationships.service";

function page(overrides: Partial<CmsPage>): CmsPage {
  return {
    id: "page-1",
    title: "About",
    slug: "about",
    status: "published",
    pageType: "custom",
    template: "full-width",
    sidebarId: null,
    content: {},
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    ogImageUrl: null,
    canonicalUrl: null,
    noindex: false,
    createdBy: null,
    updatedBy: null,
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function item(overrides: Partial<MenuItem>): MenuItem {
  return {
    id: "item-1",
    label: "About",
    url: "/about",
    openInNewTab: false,
    children: [],
    ...overrides,
  };
}

describe("cms relationship sync", () => {
  it("updates linked page-sourced menu labels", () => {
    const result = syncMenuItemsWithPage(
      [item({ pageId: "page-1", labelSource: "page" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about" }),
    );

    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({
      label: "About Us",
      url: "/about",
      pageId: "page-1",
      labelSource: "page",
    });
  });

  it("preserves custom labels on linked menu items", () => {
    const result = syncMenuItemsWithPage(
      [item({ label: "Our Story", pageId: "page-1", labelSource: "custom" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about" }),
    );

    expect(result.items[0]).toMatchObject({
      label: "Our Story",
      pageId: "page-1",
      labelSource: "custom",
    });
  });

  it("backfills legacy URL-only items and updates matching labels", () => {
    const result = syncMenuItemsWithPage(
      [item({ label: "About", pageId: undefined, labelSource: undefined })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about-us" }),
    );

    expect(result.items[0]).toMatchObject({
      label: "About Us",
      url: "/about-us",
      pageId: "page-1",
      labelSource: "page",
    });
  });

  it("updates linked menu URLs when the page slug changes", () => {
    const result = syncMenuItemsWithPage(
      [item({ pageId: "page-1", labelSource: "page" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About", slug: "about-us" }),
    );

    expect(result.items[0]?.url).toBe("/about-us");
  });

  it("updates nested children recursively", () => {
    const result = syncMenuItemsWithPage(
      [
        item({
          id: "parent",
          label: "Resources",
          url: "#",
          children: [item({ id: "child", pageId: "page-1", labelSource: "page" })],
        }),
      ],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about-us" }),
    );

    expect(result.items[0]?.children[0]).toMatchObject({
      label: "About Us",
      url: "/about-us",
      pageId: "page-1",
      labelSource: "page",
    });
  });
});
