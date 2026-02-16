import { apiFetch } from "../../api/config";
import type { KioskMenuListResponse, KioskMenuItemDto } from "../../api/types";

export type V2CategoryDto = { categoryId: string; name: string };

export async function fetchKioskCategories(): Promise<V2CategoryDto[]> {
  const res = await apiFetch<{ success: boolean; data?: { categories?: V2CategoryDto[] } }>("/kiosk/categories");
  if (!res?.success) return [];
  return res.data?.categories ?? [];
}

export type V2MenuListItem = KioskMenuItemDto;

let kfcCatalogMode = false;

function normalizeCategoryId(categoryKeyOrId?: string): string | undefined {
  if (!categoryKeyOrId) return undefined;
  // Backend uses cat_* ids. v2 UI uses short keys (set/side/drink/chicken/single).
  if (categoryKeyOrId.startsWith("cat_")) return categoryKeyOrId;
  switch (categoryKeyOrId) {
    case "set":
      return "cat_set";
    case "single":
      return "cat_burger";
    case "chicken":
      return "cat_chicken";
    case "side":
      return "cat_side";
    case "drink":
      return "cat_drink";
    default:
      return categoryKeyOrId;
  }
}

export async function fetchKioskMenuItems(categoryId?: string): Promise<V2MenuListItem[]> {
  const normalized = normalizeCategoryId(categoryId);
  const endpoint = normalized ? `/kiosk/menu-items?categoryId=${encodeURIComponent(normalized)}` : "/kiosk/menu-items";
  const res = await apiFetch<KioskMenuListResponse>(endpoint);
  if (!res?.success || !res.data?.items) return [];

  // If KFC seeded items exist, keep v2 kiosk consistent by showing only that catalog.
  // This prevents old seed data (e.g. fries R/L) from leaking into the set picker.
  const items = res.data.items;
  const hasKfcNow = items.some((it) => it.menuItemId?.startsWith("kfc_"));
  if (hasKfcNow) kfcCatalogMode = true;
  return kfcCatalogMode ? items.filter((it) => it.menuItemId?.startsWith("kfc_")) : items;
}

export type V2RecommendationItem = { menuItemId: string; name: string; reason?: string };

export async function fetchKioskRecommendations(sessionId: string): Promise<V2RecommendationItem[]> {
  const res = await apiFetch<{
    success: boolean;
    data?: { items?: Array<{ menuItemId: string; name: string; reason?: string }> };
  }>(`/kiosk/recommendations?sessionId=${encodeURIComponent(sessionId)}`);

  if (!res?.success) return [];
  return res.data?.items ?? [];
}
