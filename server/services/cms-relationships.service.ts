import type { CmsPage, MenuItem } from "@shared/schema";
import { storage } from "../storage";

export interface CmsPageRelationshipSyncResult {
  menusUpdated: number;
  itemsUpdated: number;
}

function pagePath(slug: string | null | undefined): string {
  const cleanSlug = String(slug ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return cleanSlug ? `/${cleanSlug}` : "/";
}

function normalizeUrlForMatch(url: string | null | undefined): string {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return "";

  try {
    const parsed = new URL(value, "https://example.test");
    return parsed.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const [withoutHash] = value.split("#");
    const [withoutQuery] = withoutHash.split("?");
    const normalized = withoutQuery.trim().replace(/\/+$/, "");
    return normalized || "/";
  }
}

function syncMenuItemsForPage(items: MenuItem[], oldPage: CmsPage, newPage: CmsPage) {
  let changed = false;
  let itemsUpdated = 0;
  const oldPath = pagePath(oldPage.slug);
  const newPath = pagePath(newPage.slug);

  const nextItems = items.map((item) => {
    const childResult = syncMenuItemsForPage(item.children ?? [], oldPage, newPage);
    const normalizedUrl = normalizeUrlForMatch(item.url);
    const isLinkedById = item.pageId === newPage.id || item.pageId === oldPage.id;
    const isLegacyPageUrl = !item.pageId && (normalizedUrl === oldPath || normalizedUrl === newPath);
    const shouldSyncLabel =
      item.labelSource === "page" ||
      (isLegacyPageUrl && (!item.label.trim() || item.label.trim() === oldPage.title.trim()));

    let nextItem: MenuItem = childResult.changed ? { ...item, children: childResult.items } : item;

    if (isLinkedById || isLegacyPageUrl) {
      const nextUrl = isLinkedById || item.url === oldPath || normalizedUrl === oldPath ? newPath : item.url;
      const nextLabel = shouldSyncLabel ? newPage.title : item.label;
      const nextLabelSource = shouldSyncLabel ? "page" : item.labelSource ?? "custom";

      if (
        nextItem.pageId !== newPage.id ||
        nextItem.url !== nextUrl ||
        nextItem.label !== nextLabel ||
        nextItem.labelSource !== nextLabelSource
      ) {
        nextItem = {
          ...nextItem,
          pageId: newPage.id,
          url: nextUrl,
          label: nextLabel,
          labelSource: nextLabelSource,
        };
        changed = true;
        itemsUpdated += 1;
      }
    }

    if (childResult.changed) {
      changed = true;
      itemsUpdated += childResult.itemsUpdated;
    }

    return nextItem;
  });

  return { items: nextItems, changed, itemsUpdated };
}

export function syncMenuItemsWithPage(items: MenuItem[], oldPage: CmsPage, newPage: CmsPage) {
  return syncMenuItemsForPage(items, oldPage, newPage);
}

export async function syncCmsPageRelationships(
  oldPage: CmsPage,
  newPage: CmsPage,
): Promise<CmsPageRelationshipSyncResult> {
  const menus = await storage.cmsMenus.getAll();
  let menusUpdated = 0;
  let itemsUpdated = 0;

  for (const menu of menus) {
    const result = syncMenuItemsWithPage((menu.items as MenuItem[]) || [], oldPage, newPage);
    if (!result.changed) continue;

    await storage.cmsMenus.update(menu.id, { items: result.items });
    menusUpdated += 1;
    itemsUpdated += result.itemsUpdated;
  }

  return { menusUpdated, itemsUpdated };
}
