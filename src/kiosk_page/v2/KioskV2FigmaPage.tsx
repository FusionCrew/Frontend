import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home, Volume2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Minus, Plus, Info, Bell } from "lucide-react";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import type { MenuItem } from "../../types/kiosk";
import { useCart } from "../../hooks/useCart";
import { FIGMA_CATEGORIES, FIGMA_MENU_ITEMS } from "./figmaMenuData";
import { getKfcAllergensForMenuName } from "./kfcAllergenData";
import { KioskCharacter } from "../../components/KioskComponents";
import {
  confirmOrder,
  createCart,
  createKioskSession,
  createOrder,
  getMenuDetail,
  processPayment,
  requestTicket,
  callStaff,
} from "../../api/services";
import { fetchKioskCategories, fetchKioskMenuItems } from "./v2KioskApi";
import dineInIcon from "../../assets/dinein_icon.png";
import takeOutIcon from "../../assets/takeout_icon.png";
import paymentCard from "../../assets/payment_card.png";
import paymentPoint from "../../assets/payment_point.png";
import paymentSimple from "../../assets/payment_simple.png";
import StaffCallModal from "../../components/StaffCallModal";
import { useFaceTracking } from "../../hook/useFaceTracking";
import V2VoiceManager from "./V2VoiceManager";

type CategoryKey = string;

function formatKRW(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
}

function calcMenuNameFontPx(name: string, basePx: number) {
  const len = Array.from(String(name || "")).length;
  if (len >= 18) return Math.max(11, basePx - 5);
  if (len >= 15) return Math.max(11, basePx - 4);
  if (len >= 12) return Math.max(11, basePx - 3);
  return basePx;
}

type DiningType = "DINE_IN" | "TAKE_OUT";

type PaymentPhase = "idle" | "processing" | "complete";

type PaymentStep = "idle" | "select" | "point" | "processing" | "complete";
type PaymentMethod = "CARD" | "POINT" | "SIMPLE";

type V2MenuItem = {
  id: number;
  menuItemId?: string;
  name: string;
  price: number;
  image: string;
  categoryKey: CategoryKey;
  badge?: string;
  calories?: number;
  description?: string;
  ingredients?: string[];
  optionGroups?: any[];
};

type MenuDetailData = {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryLabel?: string;
  badge?: string;
  calories?: number;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
};

export default function KioskV2FigmaPage() {
  const PAYMENT_MS = 5000;
  const SET_SIDE_OPTION_GROUP_ID = "SET_SIDE";
  const SET_SIDE_OPTION_GROUP_NAME = "사이드";
  const DEFAULT_SET_SIDE_NAME = "케이준후라이(M)";
  const SET_DRINK_OPTION_GROUP_ID = "SET_DRINK";
  const SET_DRINK_OPTION_GROUP_NAME = "음료";
  const DEFAULT_SET_DRINK_NAME = "콜라(M)";

  const tracking = useFaceTracking(true, false, undefined, true, true);

  const [diningType, setDiningType] = useState<DiningType | null>(null);
  // Allow browsing menu before dining type is chosen (voice-first flow).
  const [browseWithoutDining, setBrowseWithoutDining] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("set");
  const [showOrderView, setShowOrderView] = useState(false);
  const [detailTarget, setDetailTarget] = useState<V2MenuItem | null>(null);
  const [setSideTarget, setSetSideTarget] = useState<V2MenuItem | null>(null);
  const [setPickerStep, setSetPickerStep] = useState<"side" | "drink">("side");
  const [setPickerSide, setSetPickerSide] = useState<V2MenuItem | null>(null);
  const [setPickerDrink, setSetPickerDrink] = useState<V2MenuItem | null>(null);
  const [setPickerQty, setSetPickerQty] = useState<number>(1);
  const setPickerScrollRef = useRef<HTMLDivElement>(null);
  const [setPickerCanScrollUp, setSetPickerCanScrollUp] = useState(false);
  const [setPickerCanScrollDown, setSetPickerCanScrollDown] = useState(false);
  const setPickerBurgerThumbRef = useRef<HTMLDivElement>(null);
  const setPickerSideThumbRef = useRef<HTMLDivElement>(null);
  const setPickerDrinkThumbRef = useRef<HTMLDivElement>(null);
  const [detailData, setDetailData] = useState<MenuDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const [menuPageCount, setMenuPageCount] = useState(1);
  const [menuActivePage, setMenuActivePage] = useState(0);
  const orderScrollRef = useRef<HTMLDivElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const cartBadgeRef = useRef<HTMLSpanElement>(null);
  const detailThumbRef = useRef<HTMLDivElement>(null);
  const lastMenuClickRef = useRef<HTMLElement | null>(null);
  const paymentTimerRef = useRef<number | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [paidOrderNumber, setPaidOrderNumber] = useState<number | null>(null);
  const [paymentAnimNonce, setPaymentAnimNonce] = useState(0);
  const [kioskSessionId, setKioskSessionId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [usedPoints, setUsedPoints] = useState(0);
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);
  const [staffCallBusy, setStaffCallBusy] = useState(false);
  const [staffCallToast, setStaffCallToast] = useState<string | null>(null);
  const [pointPhone, setPointPhone] = useState("");
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [useAllPoints, setUseAllPoints] = useState(true);
  const [categories, setCategories] = useState<Array<{ key: CategoryKey; label: string }>>(() => {
    // Keep a consistent order for v2.
    const preferred: Array<{ key: CategoryKey; label: string }> = [
      { key: "set", label: "세트 메뉴" },
      { key: "single", label: "단품" },
      { key: "chicken", label: "치킨" },
      { key: "side", label: "사이드 메뉴" },
      { key: "drink", label: "음료" },
    ];
    // Merge with figma categories as fallback for any extra.
    const byKey = new Map<string, string>();
    for (const c of FIGMA_CATEGORIES) byKey.set(c.key, c.label);
    for (const c of preferred) byKey.set(c.key, c.label);
    return Array.from(byKey.entries()).map(([key, label]) => ({ key, label }));
  });

  const [apiMenuItemsByCategory, setApiMenuItemsByCategory] = useState<Map<CategoryKey, V2MenuItem[]>>(() => {
    const m = new Map<CategoryKey, V2MenuItem[]>();

    // Keep FIGMA data only as a visual fallback until DB data arrives.
    for (const it of FIGMA_MENU_ITEMS) {
      if (it.categoryKey === "best") continue;
      const v2: V2MenuItem = {
        id: it.id,
        name: it.name,
        price: it.price,
        image: it.image,
        categoryKey: it.categoryKey,
        badge: it.badge,
        calories: it.calories,
      };
      const arr = m.get(it.categoryKey) ?? [];
      arr.push(v2);
      m.set(it.categoryKey, arr);
    }

    return m;
  });
  const [menuLoading, setMenuLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCategoryKey, setPendingCategoryKey] = useState<CategoryKey | null>(null);

  const { cartItems, addToCart, removeFromCart, setCartQuantity, clearCart, calculateCartTotal } = useCart(cartId);

  const filteredItems = useMemo((): V2MenuItem[] => {
    return apiMenuItemsByCategory.get(selectedCategory) ?? [];
  }, [apiMenuItemsByCategory, selectedCategory]);

  const sideItemsForSet = useMemo((): V2MenuItem[] => {
    const side = apiMenuItemsByCategory.get("side") ?? [];
    // Curated initial rule: exclude desserts and any "음료" mislabeled as side.
    return side.filter((s) => {
      const nm = (s.name || "").trim();
      if (!nm) return false;
      if (nm.startsWith("파이 ")) return false;
      if (nm.startsWith("아이스크림")) return false;
      if (nm.startsWith("음료")) return false;
      return true;
    });
  }, [apiMenuItemsByCategory]);

  const drinkItemsForSet = useMemo((): V2MenuItem[] => {
    return (apiMenuItemsByCategory.get("drink") ?? []).filter((d) => (d.name || "").trim().length > 0);
  }, [apiMenuItemsByCategory]);

  const defaultSetSide = useMemo(() => {
    return sideItemsForSet.find((s) => s.name === DEFAULT_SET_SIDE_NAME) ?? sideItemsForSet[0] ?? null;
  }, [sideItemsForSet]);

  const defaultSetDrink = useMemo(() => {
    return drinkItemsForSet.find((d) => d.name === DEFAULT_SET_DRINK_NAME) ?? drinkItemsForSet[0] ?? null;
  }, [drinkItemsForSet]);

  const sideImageByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sideItemsForSet) m.set(s.name, s.image || "");
    return m;
  }, [sideItemsForSet]);

  const drinkImageByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drinkItemsForSet) m.set(d.name, d.image || "");
    return m;
  }, [drinkItemsForSet]);

  const isSetLikeCategory = (key: CategoryKey) => key === "set" || key === "best";

  const labelOfCategory = useMemo(() => {
    const m = new Map<CategoryKey, string>();
    for (const c of categories) m.set(c.key, c.label);
    return (key: CategoryKey) => m.get(key) ?? key;
  }, [categories]);

  const toCartMenuItem = (item: V2MenuItem): MenuItem => {
    const categoryLabel = labelOfCategory(item.categoryKey);
    return {
      id: item.id,
      menuItemId: item.menuItemId ?? `FIGMA_${item.id}`,
      name: item.name,
      price: item.price,
      categoryId: item.categoryKey,
      category: categoryLabel,
      image: item.image,
      isAvailable: true,
      ingredients: item.ingredients,
      optionGroups: item.optionGroups,
    };
  };

  const cartLinePrice = useCallback((menuPrice: number, opts: any[] | undefined) => {
    const optionsPrice = (opts || []).reduce((sum, o) => sum + (typeof o?.extraPrice === "number" ? o.extraPrice : 0), 0);
    return menuPrice + optionsPrice;
  }, []);

  const openSetSidePicker = (item: V2MenuItem, sourceEl: HTMLElement | null, quantity: number = 1) => {
    lastMenuClickRef.current = sourceEl;
    setSetSideTarget(item);
    setSetPickerStep("side");
    setSetPickerSide(defaultSetSide);
    setSetPickerDrink(defaultSetDrink);
    setSetPickerQty(Math.max(1, quantity));
    setDetailTarget(null);
    setDetailData(null);
    setDetailLoading(false);
  };

  const addSetWithOptionsToCart = useCallback(
    async (setItem: V2MenuItem, sideItem: V2MenuItem, drinkItem: V2MenuItem, quantity: number = 1) => {
      // DB-aligned pricing model:
      // - setItem.price = base set price (default side + default drink included).
      // - option extraPrice = delta from default selection.
      const baseSidePrice = defaultSetSide?.price ?? 0;
      const baseDrinkPrice = defaultSetDrink?.price ?? 0;
      const cartMenu: MenuItem = toCartMenuItem(setItem);

      const selectedOptions = [
        {
          optionGroupId: SET_SIDE_OPTION_GROUP_ID,
          optionGroupName: SET_SIDE_OPTION_GROUP_NAME,
          optionItemId: sideItem.menuItemId ?? `FIGMA_${sideItem.id}`,
          name: sideItem.name,
          extraPrice: Math.max(0, sideItem.price - baseSidePrice),
        },
        {
          optionGroupId: SET_DRINK_OPTION_GROUP_ID,
          optionGroupName: SET_DRINK_OPTION_GROUP_NAME,
          optionItemId: drinkItem.menuItemId ?? `FIGMA_${drinkItem.id}`,
          name: drinkItem.name,
          extraPrice: Math.max(0, drinkItem.price - baseDrinkPrice),
        },
      ];

      const burgerEl = setPickerBurgerThumbRef.current;
      const sideEl = setPickerSideThumbRef.current;
      const drinkEl = setPickerDrinkThumbRef.current;
      if (burgerEl && sideEl && drinkEl) {
        animateFlyToCartFromSources([
          { el: burgerEl, src: setItem.image || "", alt: setItem.name, shape: "rect" },
          { el: sideEl, src: sideItem.image || "", alt: sideItem.name, shape: "circle" },
          { el: drinkEl, src: drinkItem.image || "", alt: drinkItem.name, shape: "circle" },
        ]);
      } else {
        const src = lastMenuClickRef.current ?? detailThumbRef.current;
        if (src) {
          animateFlyToCartImages(src, [
            { src: setItem.image || "", alt: setItem.name },
            { src: sideItem.image || "", alt: sideItem.name },
            { src: drinkItem.image || "", alt: drinkItem.name },
          ]);
        }
      }

      await addToCart(cartMenu, Math.max(1, quantity), sideItem.name, drinkItem.name, "", [], false, selectedOptions as any);
    },
    [
      SET_DRINK_OPTION_GROUP_ID,
      SET_DRINK_OPTION_GROUP_NAME,
      SET_SIDE_OPTION_GROUP_ID,
      SET_SIDE_OPTION_GROUP_NAME,
      addToCart,
      defaultSetDrink,
      defaultSetSide,
      toCartMenuItem,
    ]
  );

  const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  const resetPaymentUi = () => {
    setPaymentPhase("idle");
    setPaidOrderNumber(null);
    setPaymentStep("idle");
    setPaymentMethod("CARD");
    setUsedPoints(0);
    setPointPhone("");
    setAvailablePoints(null);
    setUseAllPoints(true);
  };

  const updateSetPickerScrollButtons = useCallback(() => {
    const el = setPickerScrollRef.current;
    if (!el) {
      setSetPickerCanScrollUp(false);
      setSetPickerCanScrollDown(false);
      return;
    }
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const y = el.scrollTop;
    const eps = 2;
    setSetPickerCanScrollUp(y > eps);
    setSetPickerCanScrollDown(y < max - eps);
  }, []);

  const openPayment = () => {
    if (cartItems.length === 0) return;
    setPaymentStep("select");
  };

  const requestCategoryChange = (nextKey: CategoryKey) => {
    if (paymentStep !== "idle") return;
    if (nextKey === selectedCategory) return;
    // Category navigation should NOT cancel an existing cart.
    // Only guard against accidentally discarding the current in-progress view (detail/set picker).
    if (detailTarget || setSideTarget) {
      setPendingCategoryKey(nextKey);
      setShowCancelConfirm(true);
      return;
    }
    setSelectedCategory(nextKey);
  };

  const confirmCancelAndChangeCategory = async () => {
    const next = pendingCategoryKey;
    setShowCancelConfirm(false);
    setPendingCategoryKey(null);
    if (!next) return;

    // Cancel current in-progress view only. Keep the cart.
    setSetSideTarget(null);
    setDetailTarget(null);
    setDetailData(null);
    setDetailLoading(false);
    setSelectedCategory(next);
  };

  const stableIdFromMenuItemId = (menuItemId: string): number => {
    const parts = menuItemId.split("_");
    const maybeNum = parts.length > 1 ? Number(parts[1]) : Number.NaN;
    if (Number.isFinite(maybeNum)) return maybeNum;
    // Fallback stable hash (positive int).
    let h = 0;
    for (let i = 0; i < menuItemId.length; i++) h = ((h << 5) - h + menuItemId.charCodeAt(i)) | 0;
    return Math.abs(h) % 1_000_000;
  };

  const categoryLabelMap: Record<string, string> = {
    set: "세트 메뉴",
    single: "단품",
    chicken: "치킨",
    side: "사이드 메뉴",
    drink: "음료",
  };

  const mapCategoryKey = (cid: string): CategoryKey => {
    switch (cid) {
      case "cat_set":
        return "set";
      case "cat_burger":
        return "single";
      case "cat_chicken":
        return "chicken";
      case "cat_side":
        return "side";
      case "cat_drink":
        return "drink";
      default:
        return cid;
    }
  };

  const mapApiMenuItem = (dto: { menuItemId: string; name: string; price: number; categoryId: string; thumbnailUrl?: string; imageUrl?: string; hidden?: boolean; description?: string; ingredients?: string[]; optionGroups?: any[]; }): V2MenuItem => {
    return {
      id: stableIdFromMenuItemId(dto.menuItemId),
      menuItemId: dto.menuItemId,
      name: dto.name,
      price: dto.price,
      image: dto.imageUrl || dto.thumbnailUrl || "",
      categoryKey: mapCategoryKey(dto.categoryId),
      description: dto.description,
      ingredients: dto.ingredients || [],
      optionGroups: dto.optionGroups || [],
      badge: dto.hidden ? "숨김" : undefined,
    };
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const sessionRes = await createKioskSession({
          language: "ko",
          accessibility: { largeText: false, highContrast: false, voiceGuidance: false },
          inputMode: "TOUCH",
          device: { kioskId: "KIOSK_001", appVersion: "2.0.0" },
        });
        const sid = sessionRes?.data?.sessionId;
        if (!sid) return;
        if (cancelled) return;
        setKioskSessionId(sid);

        const newCart = await createCart(sid);
        if (cancelled) return;
        if (newCart?.cartId) setCartId(newCart.cartId);

        const cats = await fetchKioskCategories();
        if (cancelled) return;
        if (cats.length > 0) {
          const preferredOrder: CategoryKey[] = ["set", "single", "chicken", "side", "drink"];
          const byKey = new Map<string, string>();
          for (const c of cats) {
            const key = mapCategoryKey(c.categoryId);
            const label = key === c.categoryId ? c.name : (categoryLabelMap[key] ?? c.name);
            if (!byKey.has(key)) byKey.set(key, label);
          }

          const ordered: Array<{ key: CategoryKey; label: string }> = [];
          for (const key of preferredOrder) {
            const label = byKey.get(key);
            if (label) ordered.push({ key, label });
          }
          for (const [key, label] of byKey.entries()) {
            if (!preferredOrder.includes(key)) ordered.push({ key, label });
          }

          if (ordered.length > 0) {
            setCategories(ordered);
            setSelectedCategory((prev) => (ordered.some((c) => c.key === prev) ? prev : ordered[0].key));
          }
        }
      } catch {
        // Keep FIGMA fallback.
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selectedCategory) return;
      // FIGMA fallback is already preloaded in state.
      const primaryFetchKey: CategoryKey = selectedCategory;
      const fetchKeys: CategoryKey[] = [primaryFetchKey];
      // Set flow needs side + drink even if user never visits those categories.
      if (primaryFetchKey === "set") fetchKeys.push("side", "drink");
      if (primaryFetchKey === "side") fetchKeys.push("drink");

      const uniqueFetchKeys = Array.from(new Set(fetchKeys));

      try {
        setMenuLoading(true);
        const results = await Promise.all(
          uniqueFetchKeys.map(async (key) => {
            const items = await fetchKioskMenuItems(key);
            return { key, items };
          })
        );
        if (cancelled) return;

        const anyNonEmpty = results.some((r) => (r.items || []).length > 0);
        if (!anyNonEmpty) return;

        setApiMenuItemsByCategory((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (!r.items || r.items.length === 0) continue;
            next.set(r.key, r.items.map(mapApiMenuItem));
          }
          return next;
        });
      } catch {
        // ignore (keep fallback)
      } finally {
        setMenuLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [kioskSessionId, selectedCategory]);

  const handleStaffCall = async () => {
    if (!kioskSessionId || staffCallBusy) {
      setShowStaffCallModal(true);
      return;
    }
    setStaffCallBusy(true);
    setShowStaffCallModal(true);
    try {
      await callStaff(kioskSessionId);
      setStaffCallToast("직원을 호출했습니다.");
      window.setTimeout(() => setStaffCallToast(null), 2000);
    } catch {
      setStaffCallToast("직원 호출에 실패했습니다.");
      window.setTimeout(() => setStaffCallToast(null), 2000);
    } finally {
      setStaffCallBusy(false);
    }
  };

  useEffect(() => {
    // When step changes or the list changes, refresh arrow visibility.
    const t = window.setTimeout(() => updateSetPickerScrollButtons(), 0);
    return () => window.clearTimeout(t);
  }, [drinkItemsForSet, setPickerStep, sideItemsForSet, updateSetPickerScrollButtons]);

  useEffect(() => {
    const el = setPickerScrollRef.current;
    if (!el) return;

    updateSetPickerScrollButtons();

    // Images/layout changes can change scrollHeight; keep arrows in sync.
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateSetPickerScrollButtons());
    ro.observe(el);
    const child = el.firstElementChild as Element | null;
    if (child) ro.observe(child);
    return () => ro.disconnect();
  }, [setPickerStep, sideItemsForSet.length, drinkItemsForSet.length, updateSetPickerScrollButtons]);

  const startPaymentProcessing = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentStep("processing");
    setPaymentPhase("processing");
    setPaymentAnimNonce((n) => n + 1);

    void (async () => {
      const minDelay = sleep(PAYMENT_MS);

        let orderNo: number | null = null;
        try {
        let sid = kioskSessionId;
        if (!sid) {
          const sessionRes = await createKioskSession({
            language: "ko",
            accessibility: { largeText: false, highContrast: false, voiceGuidance: false },
            inputMode: "TOUCH",
            device: { kioskId: "KIOSK_001", appVersion: "2.0.0" },
          });
          sid = sessionRes?.data?.sessionId ?? null;
          if (sid) setKioskSessionId(sid);
        }

        let cid = cartId;
        if (!cid && sid) {
          const newCart = await createCart(sid);
          cid = newCart?.cartId ?? null;
          if (cid) setCartId(cid);
        }

        if (!sid || !cid || !diningType) throw new Error("Missing session/cart/diningType");

        const orderRes = await createOrder({ cartId: cid, sessionId: sid, orderType: diningType });
        const orderId = orderRes?.orderId;
        if (!orderId) throw new Error("Order create failed");
        orderNo = typeof orderRes?.orderNumber === "number" ? orderRes.orderNumber : null;

        const totalAmount = orderRes?.amount?.totalPrice ?? calculateCartTotal();
        const finalAmount = Math.max(0, totalAmount - usedPoints);

        const payRes = await processPayment({
          orderId: String(orderId),
          amount: finalAmount,
          method: "CARD",
        });
        if (!payRes?.success) throw new Error("Payment failed");

        await confirmOrder(String(orderId));

        // Backward-compatible fallback: if backend hasn't started returning orderNumber yet,
        // try to use the ticket number (daily) as the displayed order number.
        if (orderNo == null) {
          const ticketRes = await requestTicket(String(orderId));
          const maybe =
            (typeof ticketRes?.number === "number" ? ticketRes.number : null) ??
            (typeof ticketRes?.ticketNumber === "string" ? parseInt(ticketRes.ticketNumber.replace(/\\D/g, ""), 10) : NaN);
          orderNo = Number.isFinite(maybe as number) ? (maybe as number) : null;
        } else {
          void requestTicket(String(orderId));
        }
      } catch {
        orderNo = Math.floor(Math.random() * 900) + 100;
      }

      await minDelay;
      setPaidOrderNumber(orderNo);
      setPaymentPhase("complete");
      setPaymentStep("complete");
    })();
  };

  const inferDetail = (item: V2MenuItem): MenuDetailData => {
    const categoryLabel = labelOfCategory(item.categoryKey);
    const name = item.name;

    // v2 demo fallback.
    // Accuracy policy: do not infer allergens from names.
    const ingredients: string[] = item.ingredients && item.ingredients.length ? item.ingredients : ["정보 준비중"];

    const mapped = getKfcAllergensForMenuName(name);
    const allergens: string[] = mapped && mapped.length ? mapped : ["정보 준비중"];

    return {
      id: item.menuItemId ?? `FIGMA_${item.id}`,
      name: item.name,
      price: item.price,
      image: item.image,
      categoryLabel,
      badge: item.badge,
      calories: item.calories,
      description: "상세 정보는 추후 DB 연동으로 제공됩니다. (현재는 샘플 데이터)",
      ingredients,
      allergens,
    };
  };
const loadMenuDetail = async (item: V2MenuItem): Promise<MenuDetailData> => {
    // DB/API first (v1 integration), then fall back to inferred demo data.
    if (item.menuItemId && !item.menuItemId.startsWith("FIGMA_")) {
      try {
        const d: any = await getMenuDetail(item.menuItemId);
        if (d) {
          const singleNameFallback =
            item.categoryKey === "single" &&
            typeof item.name === "string" &&
            item.name.trim().length > 0 &&
            !item.name.trim().endsWith("세트");
          const resolvedName = singleNameFallback ? item.name : (d.name ?? item.name);
          return {
            id: item.menuItemId,
            name: resolvedName,
            price: d.price ?? item.price,
            image: item.image,
            categoryLabel: labelOfCategory(item.categoryKey),
            badge: item.badge,
            calories: d.nutrition?.kcal ?? item.calories,
            description: d.description ?? item.description,
            ingredients:
              d.ingredients && Array.isArray(d.ingredients) && d.ingredients.length
                ? d.ingredients
                : item.ingredients && item.ingredients.length
                  ? item.ingredients
                  : ["정보 준비중"],
            allergens: d.allergies && d.allergies.length ? d.allergies : ["정보 준비중"],
          };
        }
      } catch {
        // ignore, fallback
      }
    }

    return inferDetail(item);
  };

  const openMenuDetail = (item: V2MenuItem) => {
    setDetailTarget(item);
    setDetailData(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const data = await loadMenuDetail(item);
        setDetailData(data);
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const scrollMenu = (direction: "left" | "right") => {
    const el = menuScrollRef.current;
    if (!el) return;
    const scrollAmount = 600;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const updateMenuPagination = useCallback(() => {
    const el = menuScrollRef.current;
    if (!el) {
      setMenuPageCount(1);
      setMenuActivePage(0);
      return;
    }
    const pageWidth = Math.max(1, el.clientWidth);
    const pageCount = Math.max(1, Math.ceil(el.scrollWidth / pageWidth));
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    let pageIndex = 0;
    if (pageCount > 1 && maxScrollLeft > 0) {
      // Map [0..maxScrollLeft] -> [0..pageCount-1] so right-end always lands on the last dot.
      const ratio = el.scrollLeft / maxScrollLeft;
      pageIndex = Math.round(ratio * (pageCount - 1));
      pageIndex = Math.min(pageCount - 1, Math.max(0, pageIndex));
    }
    setMenuPageCount(pageCount);
    setMenuActivePage(pageIndex);
  }, []);

  useEffect(() => {
    const isMenuListVisible = (diningType != null || browseWithoutDining) && !showOrderView && !setSideTarget && !detailTarget;
    if (!isMenuListVisible) {
      setMenuPageCount(1);
      setMenuActivePage(0);
      return;
    }

    const el = menuScrollRef.current;
    if (!el) return;

    const onScroll = () => updateMenuPagination();
    el.addEventListener("scroll", onScroll, { passive: true });
    updateMenuPagination();
    const raf1 = window.requestAnimationFrame(() => updateMenuPagination());
    const raf2 = window.requestAnimationFrame(() => updateMenuPagination());
    const t = window.setTimeout(() => updateMenuPagination(), 120);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => updateMenuPagination());
      ro.observe(el);
      const child = el.firstElementChild as Element | null;
      if (child) ro.observe(child);
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
        window.clearTimeout(t);
        el.removeEventListener("scroll", onScroll);
        ro.disconnect();
      };
    }

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, [updateMenuPagination, filteredItems.length, detailTarget, diningType, browseWithoutDining, showOrderView, setSideTarget]);

  const scrollOrder = (direction: "left" | "right") => {
    const el = orderScrollRef.current;
    if (!el) return;
    const scrollAmount = 400;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = calculateCartTotal();

  const menuIndexByMenuItemId = useMemo(() => {
    const m = new Map<string, V2MenuItem>();
    for (const items of apiMenuItemsByCategory.values()) {
      for (const it of items) {
        const id = it.menuItemId ?? `FIGMA_${it.id}`;
        m.set(id, it);
      }
    }
    return m;
  }, [apiMenuItemsByCategory]);

  const voiceMenuCatalog = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ menuItemId: string; name: string; category: string; price: number }> = [];
    for (const items of apiMenuItemsByCategory.values()) {
      for (const it of items) {
        const menuItemId = it.menuItemId ?? `FIGMA_${it.id}`;
        if (seen.has(menuItemId)) continue;
        seen.add(menuItemId);
        out.push({
          menuItemId,
          name: it.name,
          category: `${it.categoryKey} ${labelOfCategory(it.categoryKey)}`,
          price: it.price,
        });
      }
    }
    return out;
  }, [apiMenuItemsByCategory, labelOfCategory]);

  const voiceCartSnapshot = useMemo(() => {
    return cartItems.map((c) => ({
      menuItemId: c.menu.menuItemId || String(c.menu.id),
      name: c.menu.name,
      quantity: c.quantity,
    }));
  }, [cartItems]);

  const voiceAddMenu = useCallback(
    async (menuItemId: string, quantity: number) => {
      const it = menuIndexByMenuItemId.get(menuItemId);
      if (!it) return false;

      // If the set picker is open, interpret "ADD_MENU" as selecting side/drink.
      if (setSideTarget) {
        if (setPickerStep === "side") {
          const sidePicked = sideItemsForSet.find((s) => (s.menuItemId ?? `FIGMA_${s.id}`) === menuItemId) ?? null;
          if (!sidePicked) return false;
          setSetPickerSide(sidePicked);
          setSetPickerStep("drink");
          return true;
        }
        if (setPickerStep === "drink") {
          const drinkPicked = drinkItemsForSet.find((d) => (d.menuItemId ?? `FIGMA_${d.id}`) === menuItemId) ?? null;
          if (!drinkPicked) return false;
          const side = setPickerSide ?? defaultSetSide ?? sideItemsForSet[0] ?? null;
          if (!side) return false;
          setSetPickerDrink(drinkPicked);
          await addSetWithOptionsToCart(setSideTarget, side, drinkPicked, setPickerQty);
          setSetSideTarget(null);
          setSetPickerStep("side");
          setSetPickerQty(1);
          return true;
        }
      }

      const isSetLike =
        String(it.name || "").trim().includes("세트") || String(it.categoryKey || "").toLowerCase().includes("set");
      if (isSetLike) {
        // For sets, open the side/drink picker instead of auto-adding defaults.
        openSetSidePicker(it, null, quantity);
        return true;
      }
      await addToCart(toCartMenuItem(it), Math.max(1, quantity), "", "", "", [], false, []);
      return true;
    },
    [
      addToCart,
      addSetWithOptionsToCart,
      defaultSetSide,
      drinkItemsForSet,
      menuIndexByMenuItemId,
      openSetSidePicker,
      setPickerQty,
      setPickerSide,
      setPickerStep,
      setSideTarget,
      sideItemsForSet,
      toCartMenuItem,
    ]
  );

  const voiceFindLastCartIndexByMenuItemId = useCallback(
    (menuItemId: string) => {
      for (let i = cartItems.length - 1; i >= 0; i--) {
        const id = cartItems[i]?.menu?.menuItemId || String(cartItems[i]?.menu?.id || "");
        if (id === menuItemId) return i;
      }
      return -1;
    },
    [cartItems]
  );

  const voiceChangeQty = useCallback(
    async (menuItemId: string, quantity: number) => {
      const idx = voiceFindLastCartIndexByMenuItemId(menuItemId);
      if (idx < 0) return false;
      await setCartQuantity(idx, Math.max(1, quantity));
      return true;
    },
    [setCartQuantity, voiceFindLastCartIndexByMenuItemId]
  );

  const voiceChangeQtyAt = useCallback(
    async (cartIndex: number, quantity: number) => {
      if (!cartItems[cartIndex]) return false;
      await setCartQuantity(cartIndex, Math.max(1, quantity));
      return true;
    },
    [cartItems, setCartQuantity]
  );

  const voiceRemoveMenu = useCallback(
    async (menuItemId: string) => {
      const idx = voiceFindLastCartIndexByMenuItemId(menuItemId);
      if (idx < 0) return false;
      await removeFromCart(idx);
      return true;
    },
    [removeFromCart, voiceFindLastCartIndexByMenuItemId]
  );

  const voiceRemoveAt = useCallback(
    async (cartIndex: number) => {
      if (!cartItems[cartIndex]) return false;
      await removeFromCart(cartIndex);
      return true;
    },
    [cartItems, removeFromCart]
  );

  const voiceReplaceLast = useCallback(
    async (menuItemId: string, quantity: number) => {
      if (cartItems.length > 0) {
        await removeFromCart(cartItems.length - 1);
      }
      const it = menuIndexByMenuItemId.get(menuItemId);
      if (!it) return false;
      await addToCart(toCartMenuItem(it), Math.max(1, quantity), "", "", "", [], false, []);
      return true;
    },
    [addToCart, cartItems, menuIndexByMenuItemId, removeFromCart]
  );

  useEffect(() => {
    return () => {
      if (paymentTimerRef.current != null) {
        window.clearTimeout(paymentTimerRef.current);
        paymentTimerRef.current = null;
      }
    };
  }, []);

  const startCardPayment = () => {
    if (paymentPhase !== "idle") return;
    startPaymentProcessing("CARD");
  };

  const closePaymentOverlay = () => {
    if (paymentTimerRef.current != null) {
      window.clearTimeout(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }
    resetPaymentUi();
    setShowOrderView(false);
    void clearCart();
  };

  const animateFlyToCart = (sourceEl: HTMLElement, item: V2MenuItem) => {
    const dest = (cartBadgeRef.current ?? cartButtonRef.current) as HTMLElement | null;
    if (!dest) return;

    const thumb =
      (sourceEl.querySelector("[data-menu-thumb]") as HTMLElement | null) ??
      (sourceEl.querySelector("img") as HTMLImageElement | null) ??
      sourceEl;

    const fromRect = thumb.getBoundingClientRect();
    const toRect = dest.getBoundingClientRect();

    if (fromRect.width <= 0 || fromRect.height <= 0) return;

    const flyer = document.createElement("div");
    flyer.style.position = "fixed";
    flyer.style.left = `${fromRect.left}px`;
    flyer.style.top = `${fromRect.top}px`;
    flyer.style.width = `${fromRect.width}px`;
    flyer.style.height = `${fromRect.height}px`;
    flyer.style.borderRadius = "14px";
    flyer.style.overflow = "hidden";
    flyer.style.pointerEvents = "none";
    flyer.style.zIndex = "99999";
    flyer.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
    flyer.style.background = "rgba(255,255,255,0.9)";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    flyer.appendChild(img);

    document.body.appendChild(flyer);

    const fromCx = fromRect.left + fromRect.width / 2;
    const fromCy = fromRect.top + fromRect.height / 2;
    const toCx = toRect.left + toRect.width / 2;
    const toCy = toRect.top + toRect.height / 2;
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    // True parabola-ish arc: y(t) = dy*t - lift*4*t*(1-t)
    // (Browser Y axis grows downward, so going "up" means negative Y.)
    const arcLift = Math.min(190, Math.max(120, Math.abs(dx) * 0.18 + Math.abs(dy) * 0.12));

    const steps = 28;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const arcY = -arcLift * 4 * t * (1 - t);
      const x = dx * t;
      const y = dy * t + arcY;

      // Shrink a bit faster near the end, keep motion smooth.
      const tt = Math.pow(t, 0.9);
      const scale = 1 + (0.22 - 1) * tt;
      const opacity = 1 - Math.pow(t, 1.6);

      keyframes.push({ transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity });
    }
    if (keyframes.length > 0) keyframes[keyframes.length - 1].opacity = 0;

    // 50% faster than before (1150ms -> ~770ms)
    const anim = flyer.animate(keyframes, { duration: 770, easing: "linear" });

    anim.onfinish = () => flyer.remove();
    anim.oncancel = () => flyer.remove();

    // Subtle "pop" on the cart indicator.
    try {
      dest.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
        duration: 260,
        easing: "ease-out",
      });
    } catch {
      // ignore
    }
  };

  const animateFlyToCartImages = (sourceEl: HTMLElement, images: Array<{ src: string; alt: string }>) => {
    const dest = (cartBadgeRef.current ?? cartButtonRef.current) as HTMLElement | null;
    if (!dest) return;

    const thumb =
      (sourceEl.querySelector("[data-menu-thumb]") as HTMLElement | null) ??
      (sourceEl.querySelector("img") as HTMLImageElement | null) ??
      sourceEl;

    const fromRect0 = thumb.getBoundingClientRect();
    const toRect = dest.getBoundingClientRect();
    if (fromRect0.width <= 0 || fromRect0.height <= 0) return;

    const fromCx = fromRect0.left + fromRect0.width / 2;
    const fromCy = fromRect0.top + fromRect0.height / 2;
    const toCx = toRect.left + toRect.width / 2;
    const toCy = toRect.top + toRect.height / 2;
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    const arcLift = Math.min(190, Math.max(120, Math.abs(dx) * 0.18 + Math.abs(dy) * 0.12));
    const steps = 28;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const arcY = -arcLift * 4 * t * (1 - t);
      const x = dx * t;
      const y = dy * t + arcY;
      const tt = Math.pow(t, 0.9);
      const scale = 1 + (0.22 - 1) * tt;
      const opacity = 1 - Math.pow(t, 1.6);
      keyframes.push({ transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity });
    }
    if (keyframes.length > 0) keyframes[keyframes.length - 1].opacity = 0;

    images.slice(0, 3).forEach((im, idx) => {
      const fromRect = {
        ...fromRect0,
        left: fromRect0.left + idx * 14,
        top: fromRect0.top + idx * 10,
      };
      const flyer = document.createElement("div");
      flyer.style.position = "fixed";
      flyer.style.left = `${fromRect.left}px`;
      flyer.style.top = `${fromRect.top}px`;
      flyer.style.width = `${fromRect.width}px`;
      flyer.style.height = `${fromRect.height}px`;
      flyer.style.borderRadius = idx === 0 ? "14px" : "999px";
      flyer.style.overflow = "hidden";
      flyer.style.pointerEvents = "none";
      flyer.style.zIndex = "99999";
      flyer.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
      flyer.style.background = "rgba(255,255,255,0.9)";

      const img = document.createElement("img");
      img.src = im.src;
      img.alt = im.alt;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      flyer.appendChild(img);
      document.body.appendChild(flyer);

      const anim = flyer.animate(keyframes, { duration: 770, easing: "linear", delay: idx * 60 });
      anim.onfinish = () => flyer.remove();
      anim.oncancel = () => flyer.remove();
    });

    try {
      dest.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
        duration: 260,
        easing: "ease-out",
      });
    } catch {
      // ignore
    }
  };

  const animateFlyToCartFromSources = (sources: Array<{ el: HTMLElement; src: string; alt: string; shape: "rect" | "circle" }>) => {
    const dest = (cartBadgeRef.current ?? cartButtonRef.current) as HTMLElement | null;
    if (!dest) return;

    const toRect = dest.getBoundingClientRect();
    const toCx = toRect.left + toRect.width / 2;
    const toCy = toRect.top + toRect.height / 2;

    const buildKeyframes = (fromRect: DOMRect) => {
      const fromCx = fromRect.left + fromRect.width / 2;
      const fromCy = fromRect.top + fromRect.height / 2;
      const dx = toCx - fromCx;
      const dy = toCy - fromCy;
      const arcLift = Math.min(190, Math.max(120, Math.abs(dx) * 0.18 + Math.abs(dy) * 0.12));
      const steps = 28;
      const keyframes: Keyframe[] = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const arcY = -arcLift * 4 * t * (1 - t);
        const x = dx * t;
        const y = dy * t + arcY;
        const tt = Math.pow(t, 0.9);
        const scale = 1 + (0.22 - 1) * tt;
        const opacity = 1 - Math.pow(t, 1.6);
        keyframes.push({ transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity });
      }
      if (keyframes.length > 0) keyframes[keyframes.length - 1].opacity = 0;
      return keyframes;
    };

    sources
      .filter((s) => s.el && s.src)
      .slice(0, 3)
      .forEach((s, idx) => {
        const fromRect = s.el.getBoundingClientRect();
        if (fromRect.width <= 0 || fromRect.height <= 0) return;
        const keyframes = buildKeyframes(fromRect);

        const flyer = document.createElement("div");
        flyer.style.position = "fixed";
        flyer.style.left = `${fromRect.left}px`;
        flyer.style.top = `${fromRect.top}px`;
        flyer.style.width = `${fromRect.width}px`;
        flyer.style.height = `${fromRect.height}px`;
        flyer.style.borderRadius = s.shape === "circle" ? "999px" : "14px";
        flyer.style.overflow = "hidden";
        flyer.style.pointerEvents = "none";
        flyer.style.zIndex = "99999";
        flyer.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
        flyer.style.background = "rgba(255,255,255,0.9)";

        const img = document.createElement("img");
        img.src = s.src;
        img.alt = s.alt;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        flyer.appendChild(img);
        document.body.appendChild(flyer);

        const anim = flyer.animate(keyframes, { duration: 770, easing: "linear", delay: idx * 60 });
        anim.onfinish = () => flyer.remove();
        anim.oncancel = () => flyer.remove();
      });

    try {
      dest.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
        duration: 260,
        easing: "ease-out",
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex justify-center items-end">
      <div className="bg-black flex flex-col overflow-hidden" style={{ width: "1080px", height: "1920px" }}>
        <div className="bg-black relative overflow-hidden" style={{ height: "1344px" }}>
          {/* Live2D character (ported from v1) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[920px] h-[1100px]">
              <KioskCharacter tracking={tracking} />
            </div>
          </div>
        </div>

        <div
          className="bg-gradient-to-br from-sky-100 to-sky-200 flex flex-col relative rounded-t-xl"
          style={{ height: "576px" }}
        >
          {showCancelConfirm ? (
            <div className="absolute inset-0 z-40">
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px]">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl px-10 py-8 text-center">
                  <div className="text-2xl font-semibold text-gray-900">지금 화면을 닫고 카테고리로 이동할까요?</div>
                  <div className="mt-3 text-sm text-gray-600">현재 선택 중인 내용은 사라질 수 있어요.</div>
                  <div className="mt-7 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setPendingCategoryKey(null);
                      }}
                      className="px-8 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-base font-semibold"
                    >
                      아니오
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmCancelAndChangeCategory()}
                      className="px-8 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-base font-semibold shadow-md"
                    >
                      예
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {paymentStep !== "idle" ? (
            <div className="absolute inset-0 z-50">
              {/* Dim */}
              <div className="absolute inset-0 bg-black/45" />

              {/* Dialog (slightly below center) */}
              <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[720px]">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl px-10 py-8 text-center">
                  {paymentStep === "select" ? (
                    <>
                      <div className="text-2xl font-semibold text-gray-900">결제 방법을 선택해 주세요</div>
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <button
                          type="button"
                          onClick={() => startPaymentProcessing("CARD")}
                          className="rounded-2xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 p-4 text-center transition-colors"
                        >
                          <div className="text-base font-semibold text-gray-900">카드 결제</div>
                          <img src={paymentCard} alt="카드 결제" className="mt-3 mx-auto w-28 h-28 object-contain" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentStep("point")}
                          className="rounded-2xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 p-4 text-center transition-colors"
                        >
                          <div className="text-base font-semibold text-gray-900">포인트 사용</div>
                          <img src={paymentPoint} alt="포인트 사용" className="mt-3 mx-auto w-28 h-28 object-contain" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startPaymentProcessing("SIMPLE")}
                          className="rounded-2xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 p-4 text-center transition-colors"
                        >
                          <div className="text-base font-semibold text-gray-900">간편 결제</div>
                          <img src={paymentSimple} alt="간편 결제" className="mt-3 mx-auto w-28 h-28 object-contain" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={resetPaymentUi}
                        className="mt-6 w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium"
                      >
                        닫기
                      </button>
                    </>
                  ) : paymentStep === "point" ? (
                    <>
                      <div className="text-2xl font-semibold text-gray-900">포인트 사용</div>
                      <div className="mt-2 text-sm text-gray-600">전화번호를 입력하고 포인트를 조회해 주세요. (현재는 샘플)</div>

                      <div className="mt-5 flex gap-3">
                        <input
                          value={pointPhone}
                          onChange={(e) => setPointPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                          placeholder="01012345678"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // v1과 동일하게: 현재는 샘플 포인트
                            if (pointPhone.length < 10) {
                              setAvailablePoints(null);
                              return;
                            }
                            setAvailablePoints(5000);
                          }}
                          className="px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium"
                        >
                          조회
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
                        <div className="text-sm text-gray-600">사용 가능한 포인트</div>
                        <div className="mt-1 text-2xl font-extrabold text-gray-900">
                          {availablePoints == null ? "-" : `${availablePoints.toLocaleString()}P`}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUseAllPoints((v) => !v)}
                          className={`mt-3 w-full py-3 rounded-xl border text-sm font-medium transition-colors ${
                            useAllPoints ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-900"
                          }`}
                          disabled={availablePoints == null}
                        >
                          전액 사용 {availablePoints != null ? `(${Math.min(availablePoints, totalPrice).toLocaleString()}P)` : ""}
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentStep("select")}
                          className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium"
                        >
                          뒤로
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const pts = availablePoints == null ? 0 : Math.min(availablePoints, totalPrice);
                            const finalPts = useAllPoints ? pts : 0;
                            setUsedPoints(finalPts);
                            startPaymentProcessing("POINT");
                          }}
                          disabled={availablePoints == null}
                          className={`py-3 rounded-xl font-medium ${
                            availablePoints == null ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"
                          }`}
                        >
                          적용 후 결제
                        </button>
                      </div>
                    </>
                  ) : paymentPhase === "processing" ? (
                    <>
                      <div className="text-2xl font-semibold text-gray-900">결제 중입니다</div>
                      <div className="mt-2 text-sm text-gray-600">잠시만 기다려 주세요</div>
                      <div className="mt-6 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          key={paymentAnimNonce}
                          className="h-full w-full bg-red-500 origin-left"
                          style={{ transform: "scaleX(0)", animation: `kioskPayFill ${PAYMENT_MS}ms linear forwards` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-semibold text-gray-900">결제가 완료되었습니다</div>
                      <div className="mt-4 text-lg text-gray-700 font-semibold">주문번호:</div>
                      <div className="mt-2 text-6xl font-extrabold tracking-wider text-gray-900">
                        {paidOrderNumber ?? "-"}
                      </div>
                      <button
                        onClick={closePaymentOverlay}
                        className="mt-6 w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium"
                      >
                        확인
                      </button>
                    </>
                  )}
                </div>
              </div>

              <style>{`
                @keyframes kioskPayFill {
                  from { transform: scaleX(0); }
                  to { transform: scaleX(1); }
                }
              `}</style>
            </div>
          ) : null}

          <StaffCallModal isOpen={showStaffCallModal} onClose={() => setShowStaffCallModal(false)} />
          {staffCallToast ? (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 z-40">
              <div className="px-4 py-2 rounded-full bg-black/70 text-white text-sm shadow-lg">{staffCallToast}</div>
            </div>
          ) : null}

          <div className="flex items-center justify-between px-4 py-1 bg-white/80 backdrop-blur-sm border-b border-gray-200 rounded-t-xl">
            <button
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="홈"
              disabled={diningType == null}
              onClick={() => {
                if (diningType == null) return;
                setDiningType(null);
                setBrowseWithoutDining(false);
                setShowOrderView(false);
                void clearCart();
              }}
            >
              <Home className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-lg text-red-600 text-center">
              {diningType == null
                ? browseWithoutDining
                  ? "메뉴 보기 (식사 방법 미선택)"
                  : "식사 방법 선택"
                : `PREMIUM BURGER 키오스크 (${diningType === "DINE_IN" ? "매장" : "포장"})`}
            </h1>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="직원 호출" onClick={handleStaffCall}>
                <Bell className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="음성">
                <Volume2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {diningType == null && !browseWithoutDining ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
              <div className="w-full grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setDiningType("DINE_IN");
                    setBrowseWithoutDining(false);
                  }}
                  className="h-[420px] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-10 text-left shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-full flex flex-col">
                    <div>
                      <div className="text-4xl font-bold text-gray-900">매장 식사</div>
                      <div className="mt-3 text-xl text-gray-600">매장에서 바로 먹을게요</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <img src={dineInIcon} alt="매장 식사" className="w-44 h-44 object-contain" />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDiningType("TAKE_OUT");
                    setBrowseWithoutDining(false);
                  }}
                  className="h-[420px] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-10 text-left shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-full flex flex-col">
                    <div>
                      <div className="text-4xl font-bold text-gray-900">포장</div>
                      <div className="mt-3 text-xl text-gray-600">가져가서 먹을게요</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <img src={takeOutIcon} alt="포장" className="w-44 h-44 object-contain" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {!showOrderView && (
                <div className="w-48 bg-white/90 backdrop-blur-sm border-r border-gray-200 overflow-y-auto flex-shrink-0">
                  <div className="py-2">
                    {categories.map((category) => (
                      <button
                        key={category.key}
                        onClick={() => requestCategoryChange(category.key)}
                        className={`w-full px-3 py-3 text-left transition-all ${
                          selectedCategory === category.key
                            ? "bg-red-500 text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {/* Keep all category buttons the same height by preventing label wrapping */}
                        <div className="text-2xl leading-tight truncate">{category.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col p-3 overflow-hidden bg-gray-100">
                {!showOrderView ? (
                  <div className="flex-1 flex flex-col">
                    {setSideTarget ? (
                      <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => {
                              setSetSideTarget(null);
                              setSetPickerStep("side");
                              setSetPickerSide(null);
                              setSetPickerDrink(null);
                              setSetPickerQty(1);
                            }}
                            className="px-3 py-2 bg-white/80 hover:bg-white rounded-lg border border-gray-200 text-sm text-gray-800"
                          >
                            메뉴로
                          </button>
                          <div className="text-sm text-gray-600">사이드 선택</div>
                          <div className="w-[72px]" />
                        </div>

                          <div className="h-[420px] overflow-hidden bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 flex gap-4">
                          <div className="w-56 flex-shrink-0">
                            <div
                              ref={setPickerBurgerThumbRef}
                              className="w-56 h-56 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200"
                            >
                              <ImageWithFallback
                                src={setSideTarget.image || ""}
                                alt={setSideTarget.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="mt-3">
                              <div className="text-sm font-semibold text-gray-900 truncate">{setSideTarget.name}</div>
                              <div className="mt-1 text-xs text-gray-700">
                                사이드 선택 후 가격이 확정됩니다. (세트 = 단품 + 사이드 + 음료)
                              </div>
                            </div>

                            {/* Buttons should match the big thumbnail width (w-56). */}
                            <div className="mt-3 w-full flex items-stretch gap-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (setPickerStep === "drink") {
                                    setSetPickerStep("side");
                                    return;
                                  }
                                  setSetSideTarget(null);
                                  setSetPickerStep("side");
                                  setSetPickerSide(null);
                                  setSetPickerDrink(null);
                                  setSetPickerQty(1);
                                }}
                                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-base font-semibold"
                              >
                                이전
                              </button>
                              <div className="w-3 flex items-center justify-center select-none">
                                <div className="w-px h-10 bg-gray-300" />
                              </div>
                              <button
                                type="button"
                                disabled={!setPickerSide || !setPickerDrink}
                                onClick={() => {
                                  if (!setPickerSide || !setPickerDrink) return;
                                  void addSetWithOptionsToCart(setSideTarget, setPickerSide, setPickerDrink, setPickerQty);
                                  setSetSideTarget(null);
                                  setSetPickerQty(1);
                                }}
                                className={`flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${
                                  !setPickerSide || !setPickerDrink
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-red-500 hover:bg-red-600 text-white shadow-md"
                                }`}
                              >
                                <span className="block leading-tight text-center">
                                  장바구니
                                  <br />
                                  담기
                                </span>
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                              <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">
                                {setPickerStep === "side" ? "사이드를 선택해 주세요" : "음료를 선택해 주세요"}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              기본 구성: {DEFAULT_SET_SIDE_NAME} + {DEFAULT_SET_DRINK_NAME}
                            </div>

                            <div className="mt-3 bg-white rounded-xl border border-gray-200 px-3 py-2">
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                                <div className="flex items-center gap-2 min-w-0 justify-start">
                                  <div
                                    ref={setPickerSideThumbRef}
                                    className={`w-10 h-10 rounded-full overflow-hidden border-2 ${
                                      setPickerSide ? "border-red-500" : "border-gray-200"
                                    } bg-gray-50 flex-shrink-0`}
                                  >
                                    <ImageWithFallback
                                      src={setPickerSide?.image || ""}
                                      alt={setPickerSide?.name || "사이드 선택"}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] leading-tight text-gray-600">사이드</div>
                                    <div className="text-xs font-semibold leading-tight text-gray-900 truncate">
                                      {setPickerSide?.name || "선택해 주세요"}
                                    </div>
                                  </div>
                                </div>

                                <div className="px-3 text-gray-300 font-semibold select-none text-center">|</div>

                                <div className="flex items-center gap-2 min-w-0 justify-end">
                                  <div
                                    ref={setPickerDrinkThumbRef}
                                    className={`w-10 h-10 rounded-full overflow-hidden border-2 ${
                                      setPickerDrink ? "border-red-500" : "border-gray-200"
                                    } bg-gray-50 flex-shrink-0`}
                                  >
                                    <ImageWithFallback
                                      src={setPickerDrink?.image || ""}
                                      alt={setPickerDrink?.name || "음료 선택"}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1 flex items-center gap-2 justify-between">
                                    <div className="min-w-0">
                                      <div className="text-[11px] leading-tight text-gray-600">음료</div>
                                      <div className="text-xs font-semibold leading-tight text-gray-900 truncate">
                                        {setPickerDrink?.name || "선택해 주세요"}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <button
                                        type="button"
                                        disabled={setPickerStep === "side"}
                                        onClick={() => setSetPickerStep("side")}
                                        className={`w-14 h-12 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center ${
                                          setPickerStep === "side"
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-800"
                                        }`}
                                      >
                                        이전
                                      </button>
                                      <button
                                        type="button"
                                        disabled={setPickerStep === "drink" || !setPickerSide}
                                        onClick={() => setSetPickerStep("drink")}
                                        className={`w-14 h-12 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center ${
                                          setPickerStep === "drink" || !setPickerSide
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            : "bg-red-500 hover:bg-red-600 text-white"
                                        }`}
                                      >
                                        다음
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex-1 min-h-0 relative">
                              <div
                                ref={(el) => {
                                  setPickerScrollRef.current = el;
                                  // Initial compute after mount.
                                  if (el) window.requestAnimationFrame(() => updateSetPickerScrollButtons());
                                }}
                                onScroll={updateSetPickerScrollButtons}
                                className="absolute inset-0 overflow-y-auto pr-1 scroll-smooth"
                              >
                                <div className="grid grid-cols-3 gap-3">
                                {(setPickerStep === "side" ? sideItemsForSet : drinkItemsForSet).map((s) => {
                                  const selected =
                                    setPickerStep === "side" ? setPickerSide?.id === s.id : setPickerDrink?.id === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        if (setPickerStep === "side") {
                                          setSetPickerSide(s);
                                        } else {
                                          setSetPickerDrink(s);
                                        }
                                      }}
                                      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-2 text-left ${
                                        selected ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-gray-300"
                                      }`}
                                      aria-pressed={selected}
                                    >
                                      <div className="w-full h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 relative">
                                        <ImageWithFallback
                                          src={s.image || ""}
                                          alt={s.name}
                                          className="w-full h-full object-cover"
                                        />
                                        {selected ? (
                                          <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                                            선택됨
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="mt-2 text-xs font-semibold text-gray-900 truncate">{s.name}</div>
                                      <div className="mt-0.5 text-xs text-gray-700">{formatKRW(s.price)}</div>
                                    </button>
                                  );
                                })}
                                </div>
                              </div>

                              {setPickerCanScrollUp ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = setPickerScrollRef.current;
                                    if (!el) return;
                                    el.scrollBy({ top: -260, behavior: "smooth" });
                                  }}
                                  className="absolute left-1/2 top-2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-500/75 hover:bg-red-500/90 border border-red-600/20 shadow-lg flex items-center justify-center backdrop-blur-sm"
                                  aria-label="위로 스크롤"
                                >
                                  <ChevronUp className="w-7 h-7 text-white" />
                                </button>
                              ) : null}

                              {setPickerCanScrollDown ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = setPickerScrollRef.current;
                                    if (!el) return;
                                    el.scrollBy({ top: 260, behavior: "smooth" });
                                  }}
                                  className="absolute left-1/2 bottom-2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-500/75 hover:bg-red-500/90 border border-red-600/20 shadow-lg flex items-center justify-center backdrop-blur-sm"
                                  aria-label="아래로 스크롤"
                                >
                                  <ChevronDown className="w-7 h-7 text-white" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : detailTarget ? (
                      <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => {
                              setDetailTarget(null);
                              setDetailData(null);
                              setDetailLoading(false);
                            }}
                            className="px-3 py-2 bg-white/80 hover:bg-white rounded-lg border border-gray-200 text-sm text-gray-800"
                          >
                            메뉴로
                          </button>
                          <div className="text-sm text-gray-600">상세 정보</div>
                          <div className="w-[72px]" />
                        </div>

                        <div className="h-[420px] overflow-y-auto bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
                          {detailLoading || !detailData ? (
                            <div className="text-gray-700 text-sm">불러오는 중..</div>
                          ) : (
                            <div className="flex gap-4">
                              <div className="w-56 flex-shrink-0">
                                <div
                                  ref={detailThumbRef}
                                  className="w-56 h-56 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200"
                                  data-menu-thumb
                                >
                                  <ImageWithFallback
                                    src={detailData.image}
                                    alt={detailData.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    // Add with the same behavior as the grid.
                                    const item = detailTarget;
                                    if (!item) return;
                                    if (isSetLikeCategory(item.categoryKey) || item.name.endsWith("세트")) {
                                      openSetSidePicker(item, detailThumbRef.current, 1);
                                      return;
                                    }
                                    if (detailThumbRef.current) animateFlyToCart(detailThumbRef.current, item);
                                    void addToCart(toCartMenuItem(item), 1, "", "", "", [], false, []);
                                  }}
                                  className="mt-3 w-full py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
                                >
                                  {isSetLikeCategory(detailTarget.categoryKey) || detailTarget.name.endsWith("세트")
                                    ? "사이드 선택"
                                    : "장바구니 담기"}
                                </button>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-lg font-semibold text-gray-900 truncate">{detailData.name}</div>
                                    <div className="mt-1 text-sm text-gray-700">{formatKRW(detailData.price)}</div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      {detailData.categoryLabel ? `카테고리: ${detailData.categoryLabel}` : null}
                                      {detailData.badge ? ` | 배지: ${detailData.badge}` : null}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-700 bg-gray-100 rounded-full px-3 py-1">
                                    {detailData.calories != null ? `${detailData.calories} kcal` : "칼로리 정보 없음"}
                                  </div>
                                </div>

                                {detailData.description ? (
                                  <div className="mt-3 text-sm text-gray-700">{detailData.description}</div>
                                ) : null}

                                <div className="mt-4">
                                  <div className="text-sm font-semibold text-gray-900">재료</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(detailData.ingredients && detailData.ingredients.length > 0
                                      ? detailData.ingredients
                                      : ["정보 준비중"]
                                    ).map((x) => (
                                      <span
                                        key={x}
                                        className="text-xs text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1"
                                      >
                                        {x}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="text-sm font-semibold text-gray-900">알레르기</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(detailData.allergens && detailData.allergens.length > 0
                                      ? detailData.allergens
                                      : ["정보 준비중"]
                                    ).map((x) => (
                                      <span
                                        key={x}
                                        className="text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1"
                                      >
                                        {x}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        <button
                          onClick={() => scrollMenu("left")}
                          className="flex-shrink-0 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-10"
                          aria-label="이전"
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </button>

                        <div ref={menuScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                          <div
                            className="grid grid-rows-2 grid-flow-col gap-3 h-full"
                            style={{ gridAutoColumns: "150px", gridTemplateRows: "1fr 1fr" }}
                          >
                            {menuLoading ? (
                              <div className="text-gray-600 text-sm p-2">불러오는 중..</div>
                            ) : filteredItems.length === 0 ? (
                              <div className="text-gray-600 text-sm p-2">표시할 메뉴가 없습니다.</div>
                            ) : (
                              filteredItems.map((item) => (
                                <div
                                  key={item.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    if (isSetLikeCategory(selectedCategory)) {
                                      openSetSidePicker(item, e.currentTarget, 1);
                                      return;
                                    }
                                    animateFlyToCart(e.currentTarget, item);
                                    void addToCart(toCartMenuItem(item), 1, "", "", "", [], false, []);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      (e.currentTarget as HTMLElement).click();
                                    }
                                  }}
                                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-transform hover:scale-105 active:scale-[0.98] flex flex-col items-center justify-end relative p-2 gap-1 pb-3 h-full"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMenuDetail(item);
                                    }}
                                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 border border-gray-200 shadow-sm hover:bg-white flex items-center justify-center z-20"
                                    aria-label="상세 보기"
                                  >
                                    <Info className="w-4 h-4 text-gray-700" />
                                  </button>

                                  {item.badge ? (
                                    <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                                      {item.badge}
                                    </div>
                                  ) : null}
                                  <div
                                    className="w-28 h-28 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 mt-2"
                                    data-menu-thumb
                                  >
                                    <ImageWithFallback
                                      src={item.image || ""}
                                      alt={item.name}
                                      className="w-full h-full object-cover m-[0px]"
                                    />
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5 flex-1 justify-center">
                                    {/* Force single-line names (truncate instead of wrapping) */}
                                    <h3
                                      className="text-gray-800 text-center truncate w-full leading-tight"
                                      style={{ fontSize: `${calcMenuNameFontPx(item.name, 14)}px` }}
                                    >
                                      {item.name}
                                    </h3>
                                    <p className="text-sm text-gray-900 font-medium">{formatKRW(item.price)}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                          <button
                            onClick={() => scrollMenu("right")}
                            className="flex-shrink-0 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-10"
                            aria-label="다음"
                          >
                            <ChevronRight className="w-8 h-8" />
                          </button>
                      </div>
                    )}

                    {!detailTarget ? (
                      <div className="flex justify-center pb-2">
                        <div className="flex gap-1.5">
                          {Array.from({ length: menuPageCount }, (_, dot) => (
                            <button
                              type="button"
                              key={dot}
                              onClick={() => {
                                const el = menuScrollRef.current;
                                if (!el) return;
                                const pageWidth = Math.max(1, el.clientWidth);
                                el.scrollTo({ left: dot * pageWidth, behavior: "smooth" });
                              }}
                              className={`w-2 h-2 rounded-full transition-colors ${dot === menuActivePage ? "bg-red-500" : "bg-gray-300"}`}
                              aria-label={`메뉴 ${dot + 1}페이지`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="text-center mb-4">
                      <h2 className="text-2xl text-gray-800 mb-1">장바구니</h2>
                      <p className="text-xs text-gray-600">상품을 추가하거나 수량을 조절, 삭제할 수 있어요.</p>
                    </div>

                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                      <button
                        onClick={() => scrollOrder("left")}
                        className="flex-shrink-0 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-10"
                        aria-label="이전"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </button>

                      <div ref={orderScrollRef} className="flex-1 overflow-x-auto pb-2">
                        <div className="flex gap-3">
                          {cartItems.map((ci, idx) => (
                          <div
                            key={`${ci.menu.menuItemId || ci.menu.id}-${idx}`}
                            data-cart-item
                            className="bg-white rounded-xl shadow-sm flex flex-col items-center relative p-6 gap-4 flex-shrink-0 w-64"
                          >
                            <button
                              onClick={(e) => {
                                const btn = e.currentTarget as HTMLButtonElement;
                                btn.disabled = true;

                                const card = btn.closest("[data-cart-item]") as HTMLElement | null;
                                if (!card) {
                                  void removeFromCart(idx);
                                  return;
                                }

                                card.style.transformOrigin = "50% 30%";
                                const anim = card.animate(
                                  [
                                    { transform: "scale(1)", opacity: 1, filter: "blur(0px)" },
                                    { transform: "scale(0.92) translateY(8px)", opacity: 0, filter: "blur(1px)" },
                                  ],
                                  { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
                                );

                                anim.onfinish = () => void removeFromCart(idx);
                                anim.oncancel = () => void removeFromCart(idx);
                              }}
                              className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full transition-colors shadow-md"
                              aria-label="삭제"
                            >
                              <X className="w-6 h-6 text-gray-600" />
                            </button>

                              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 relative">
                                <ImageWithFallback
                                  src={ci.menu.image || ""}
                                  alt={ci.menu.name}
                                  className="w-full h-full object-cover"
                                />
                                {ci.side ? (
                                  <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-50">
                                    <ImageWithFallback
                                      src={sideImageByName.get(ci.side) || ""}
                                      alt={ci.side}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : null}
                                {ci.drink ? (
                                  <div className="absolute -top-1 -right-1 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-50">
                                    <ImageWithFallback
                                      src={drinkImageByName.get(ci.drink) || ""}
                                      alt={ci.drink}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex flex-col items-center gap-2 flex-1">
                                {/* Force single-line names (truncate instead of wrapping) */}
                                <h3
                                  className="text-gray-800 text-center truncate w-full leading-tight"
                                  style={{ fontSize: `${calcMenuNameFontPx(ci.menu.name, 16)}px` }}
                                >
                                  {ci.menu.name}
                                </h3>
                                {ci.side ? (
                                  <div className="text-xs text-gray-600 truncate w-full text-center">사이드: {ci.side}</div>
                                ) : null}
                                {ci.drink ? (
                                  <div className="text-xs text-gray-600 truncate w-full text-center">음료: {ci.drink}</div>
                                ) : null}
                                <p className="text-lg text-gray-900 font-medium">
                                  {formatKRW(cartLinePrice(ci.menu.price, ci.selectedOptions as any))}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 bg-gray-100 rounded-lg px-4 py-2">
                                <button
                                  onClick={() => setCartQuantity(idx, ci.quantity - 1)}
                                  className="p-1 hover:bg-white rounded transition-colors"
                                  aria-label="수량 감소"
                                >
                                  <Minus className="w-6 h-6 text-gray-600" />
                                </button>
                                <span className="text-lg font-medium min-w-[40px] text-center">{ci.quantity}</span>
                                <button
                                  onClick={() => setCartQuantity(idx, ci.quantity + 1)}
                                  className="p-1 hover:bg-white rounded transition-colors"
                                  aria-label="수량 증가"
                                >
                                  <Plus className="w-6 h-6 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => scrollOrder("right")}
                        className="flex-shrink-0 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-10"
                        aria-label="다음"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {diningType == null ? (
            <div className="bg-white border-t border-gray-200 px-6 py-3 flex-shrink-0 text-center text-sm text-gray-600">
              매장 식사 또는 포장을 선택해 주세요.
            </div>
          ) : (
            <div className="bg-white border-t border-gray-200 px-4 py-1.5 flex-shrink-0">
              {!showOrderView ? (
                <div className="flex items-center justify-between gap-4">
                <button
                  ref={cartButtonRef}
                  onClick={() => setShowOrderView(true)}
                  className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs"
                >
                  <span className="text-gray-700">장바구니</span>
                  <span
                    ref={cartBadgeRef}
                    className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px]"
                  >
                    {totalItems}
                  </span>
                </button>

                <button
                  onClick={clearCart}
                  className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  전체삭제
                </button>

                <div className="flex items-center gap-2 text-xs flex-1 justify-end">
                  <div className="text-gray-900 font-medium">{formatKRW(totalPrice)}</div>
                  <div className="text-gray-600">|</div>
                  <div className="text-gray-600">
                    {totalItems}개
                  </div>
                </div>

                <button
                  onClick={() => setShowOrderView(true)}
                  disabled={cartItems.length === 0}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    cartItems.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600 shadow-md"
                  }`}
                >
                  카드 결제
                </button>
              </div>
              ) : (
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowOrderView(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs"
                  aria-label="뒤로"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>

                <div className="flex-1">
                   <div className="grid grid-cols-3 gap-2 text-xs">
                     <div className="text-gray-600 text-center">개수</div>
                     <div className="text-gray-600 text-center">주문금액</div>
                     <div className="text-gray-600 text-center">할인금액</div>
                     <div className="font-medium text-gray-900 text-center">{totalItems}</div>
                     <div className="font-medium text-gray-900 text-center">{formatKRW(totalPrice)}</div>
                     <div className="font-medium text-gray-900 text-center">{formatKRW(usedPoints)}</div>
                   </div>
                 </div>
 
                 <button
                   onClick={openPayment}
                   disabled={cartItems.length === 0}
                   className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                     cartItems.length === 0
                       ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                       : "bg-red-500 text-white hover:bg-red-600 shadow-md"
                   }`}
                  >
                    결제하기
                  </button>
                </div>
               )}
             </div>
           )}
        </div>
      </div>

      <V2VoiceManager
        sessionId={kioskSessionId}
        diningType={diningType}
        selectedCategory={selectedCategory}
        categories={categories}
        pageHint={{ selectedCategory, showOrderView, paymentStep }}
        uiMode={{ setPickerActive: !!setSideTarget, setPickerStep }}
        menuCatalog={voiceMenuCatalog}
        cartSnapshot={voiceCartSnapshot}
        onSetDining={(t) => {
          setDiningType(t);
          setBrowseWithoutDining(false);
        }}
        onSelectCategory={setSelectedCategory}
        onAddMenu={voiceAddMenu}
        onChangeQty={voiceChangeQty}
        onRemoveMenu={voiceRemoveMenu}
        onChangeQtyAt={voiceChangeQtyAt}
        onRemoveAt={voiceRemoveAt}
        onReplaceLast={voiceReplaceLast}
        onContinueOrder={() => {
          // Close payment-related UI and return to menu browsing.
          setPaymentStep("idle");
          setPaymentPhase("idle");
          setShowOrderView(false);
          if (diningType == null) setBrowseWithoutDining(true);
        }}
        onCheckCart={() => setShowOrderView(true)}
        onCheckout={() => {
          setShowOrderView(true);
          openPayment();
        }}
        onSelectPayment={(m) => {
          setShowOrderView(true);
          openPayment();
          if (m === "POINT") {
            setPaymentStep("point");
            return;
          }
          startPaymentProcessing(m === "SIMPLE" ? "SIMPLE" : "CARD");
        }}
        onCallStaff={handleStaffCall}
        tracking={{
          videoElement: tracking.videoElement,
          hesitationScore: tracking.hesitationScore,
          isHesitating: tracking.isHesitating,
          faceScore: tracking.faceScore,
          poseScore: tracking.poseScore,
          poseFeatures: tracking.poseFeatures,
          isDetecting: tracking.isDetecting,
          error: tracking.error,
        }}
      />
    </div>
  );
}
