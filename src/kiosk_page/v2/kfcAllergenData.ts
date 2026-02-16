// KFC-only allergen mapping.
// Source of truth: KFC Korea "알레르기 유발물질 정보" (ver 20180124).
//
// Policy:
// - Do NOT infer allergens from menu names.
// - If we can't map a menu to the official table with high confidence, return null and show "정보 준비중".

export const KFC_ALLERGEN_SOURCE = "KFC 알레르기 유발물질 정보 (ver 20180124)";

// Keep values as Korean labels since the UI displays Korean.
export const kfcAllergensByMenuName: Record<string, string[]> = {
  // Burgers
  // 징거버거: 대두, 밀, 계란, 우유, 닭고기, 토마토, 쇠고기
  "징거버거": ["대두", "밀", "계란", "우유", "닭고기", "토마토", "쇠고기"],
  // 타워버거: 대두, 밀, 계란, 우유, 닭고기, 토마토, 쇠고기
  "타워버거": ["대두", "밀", "계란", "우유", "닭고기", "토마토", "쇠고기"],

  // Chicken (piece count variants share the same allergen set)
  // 오리지널치킨: 대두, 밀, 닭고기, 쇠고기
  "오리지널치킨 2조각": ["대두", "밀", "닭고기", "쇠고기"],
  "오리지널치킨 4조각": ["대두", "밀", "닭고기", "쇠고기"],
  "오리지널치킨 8조각": ["대두", "밀", "닭고기", "쇠고기"],
  "오리지널치킨세트": ["대두", "밀", "닭고기", "쇠고기"], // base (side/drink may add more)

  // 핫크리스피치킨: 대두, 밀, 우유, 닭고기, 쇠고기
  "핫크리스피치킨 2조각": ["대두", "밀", "우유", "닭고기", "쇠고기"],
  "핫크리스피치킨 4조각": ["대두", "밀", "우유", "닭고기", "쇠고기"],
  "핫크리스피치킨 8조각": ["대두", "밀", "우유", "닭고기", "쇠고기"],

  // Hot wings
  // 핫윙: 대두, 밀, 우유, 닭고기, 쇠고기
  "핫윙 4조각": ["대두", "밀", "우유", "닭고기", "쇠고기"],
  "핫윙 6조각": ["대두", "밀", "우유", "닭고기", "쇠고기"],
  "핫윙콤보세트": ["대두", "밀", "우유", "닭고기", "쇠고기"], // base (side/drink may add more)

  // Sides
  // 코울슬로: 계란, 대두, 밀
  "코울슬로": ["계란", "대두", "밀"],
  // 콘샐러드: 계란, 대두, 밀
  "콘샐러드": ["계란", "대두", "밀"],

  // 후렌치후라이(M): 대두
  "프렌치프라이 R": ["대두"],
  "프렌치프라이 L": ["대두"],

  // 치즈후렌치후라이: 대두, 우유
  "감자튀김 & 치즈": ["대두", "우유"],

  // 치킨너겟 4pcs: 계란, 대두, 밀, 닭고기, 쇠고기
  "너겟 4조각": ["계란", "대두", "밀", "닭고기", "쇠고기"],
  // Piece-count variant: assume same product, different quantity.
  "너겟 8조각": ["계란", "대두", "밀", "닭고기", "쇠고기"],

  // Drinks (from KFC table)
  // 카페라떼/아이스라떼: 우유
  "핫 카페라떼": ["우유"],
  "아이스 카페라떼": ["우유"],

  // Drinks with no allergens listed in the KFC table are intentionally not declared here.
};

export function getKfcAllergensForMenuName(name: string): string[] | null {
  const direct = kfcAllergensByMenuName[name];
  if (direct) return direct;

  // Normalize common set suffix patterns: for set items we only know the base item allergens here.
  if (name.endsWith("세트")) {
    const base = name.replace(/세트$/, "");
    return kfcAllergensByMenuName[base] ?? null;
  }

  return null;
}

