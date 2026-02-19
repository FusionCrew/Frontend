import { apiFetch } from "../../api/config";
import type { KioskMenuListResponse, KioskMenuItemDto } from "../../api/types";

export type V2CategoryDto = { categoryId: string; name: string };

export async function fetchKioskCategories(): Promise<V2CategoryDto[]> {
  const res = await apiFetch<{ success: boolean; data?: { categories?: V2CategoryDto[] } }>("/kiosk/categories");
  if (!res?.success) return [];
  return res.data?.categories ?? [];
}

export type V2MenuListItem = KioskMenuItemDto;

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
  const all: V2MenuListItem[] = [];
  let cursor: string | undefined;
  const size = 200;

  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams();
    if (normalized) params.set("categoryId", normalized);
    params.set("size", String(size));
    if (cursor) params.set("cursor", cursor);

    const endpoint = `/kiosk/menu-items?${params.toString()}`;
    const res = await apiFetch<KioskMenuListResponse>(endpoint);
    if (!res?.success || !res.data?.items) break;

    const items = res.data.items;
    all.push(...items);

    const next = res.data.page?.nextCursor;
    if (!next || items.length === 0) break;
    cursor = next;
  }

  const dedup = new Map<string, V2MenuListItem>();
  for (const it of all) {
    if (!it?.menuItemId) continue;
    if (!dedup.has(it.menuItemId)) dedup.set(it.menuItemId, it);
  }
  return Array.from(dedup.values());
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
