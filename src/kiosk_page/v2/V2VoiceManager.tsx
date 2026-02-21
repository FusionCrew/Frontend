import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicStreamer } from "../../hook/useMicStreamer";
import { useAudioDevices } from "../../hook/useAudioDevices";
import { AI_BASE_URL } from "../../api/config";
import MediaPipeDebugPanel from "../../components/MediaPipeDebugPanel";
import { recordSessionEvent } from "../../api/services";

type PageHint = { selectedCategory: string; showOrderView: boolean; paymentStep: string };

export type VoiceMenuCatalogItem = {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
};

export type VoiceCartSnapshotItem = {
  menuItemId: string;
  name: string;
  quantity: number;
};

type VoiceAction =
  | { type: "NAVIGATE"; page: "menu" | "main" | "order" | "recommended" | "all" | "burger" | "side" | "drink" }
  | { type: "SET_DINING"; diningType: "DINE_IN" | "TAKE_OUT" }
  | { type: "NAVIGATE_CATEGORY"; categoryKey: string }
  | { type: "ADD_MENU"; menuItemId: string; quantity: number }
  | { type: "ASK_SET_OR_SINGLE"; singleMenuItemId: string; setMenuItemId: string; quantity: number }
  | { type: "CHANGE_QTY"; menuItemId: string; quantity: number }
  | { type: "REMOVE_MENU"; menuItemId: string }
  | { type: "CHANGE_QTY_AT"; cartIndex: number; quantity: number }
  | { type: "REMOVE_MENU_AT"; cartIndex: number }
  | { type: "REPLACE_LAST"; menuItemId: string; quantity: number }
  | { type: "START_REPLACE_LAST" }
  | { type: "ASK_REMOVE_TARGET" }
  | { type: "ASK_SLOT_CLARIFY"; kind: "REMOVE_MENU" | "CHANGE_QTY"; menuItemId: string; quantity?: number; candidateIndexes: number[] }
  | { type: "ACCEPT_SUGGESTION" }
  | { type: "ACCEPT_SUGGESTION_ITEM"; menuItemId: string }
  | { type: "ASK_SUGGESTION_CLARIFY" }
  | { type: "CONTINUE_ORDER" }
  | { type: "CHECK_CART" }
  | { type: "CHECKOUT" }
  | { type: "SELECT_PAYMENT"; method: "CARD" | "POINT" | "SIMPLE" }
  | { type: "CALL_STAFF" }
  | { type: "NONE" };

type Msg = { role: "user" | "assistant"; content: string };
type MotionCode =
  | "idle"
  | "m01" | "m02" | "m03" | "m04" | "m05" | "m06" | "m07" | "m08" | "m09" | "m10"
  | "m11" | "m12" | "m13" | "m14" | "m15" | "m16" | "m17" | "m18" | "m19" | "m20"
  | "m21" | "m22" | "m23" | "m24" | "m25" | "m26";

const NOISE_TRANSCRIPT_PATTERNS = [
  // Common filler/noise that should not trigger ordering logic.
  "구독",
  "좋아요",
  "구독과 좋아요",
  "구독 좋아요",
  "mbc 뉴스",
  "뉴스",
];

const CONTROL_TRANSCRIPT_TOKENS = [
  // High-signal tokens that indicate this utterance is about kiosk ordering.
  "메뉴",
  "뭐 있어",
  "뭐가 있어",
  "추천",
  "세트",
  "단품",
  "장바구니",
  "결제",
  "카드",
  "포인트",
  "간편",
  "매장",
  "매장 식사",
  "드시고",
  "포장",
  "직원",
  "도움",
  "취소",
  "뒤로",
];

const LIVE2D_MOTION_CATALOG: Array<{ id: MotionCode; description: string }> = [
  { id: "idle", description: "기본 대기 모션." },
  { id: "m01", description: "가볍게 끄덕거림." },
  { id: "m02", description: "손을 모으며 강하게 끄덕거림." },
  { id: "m03", description: "팔짱끼며 마지못하게 못마땅하며 끄덕거림." },
  { id: "m04", description: "살짝 놀라지만 이내 인정하고 끄덕거림." },
  { id: "m05", description: "양팔을 벌리며 조금 놀라며 가볍게 끄덕거림." },
  { id: "m06", description: "양손을 접어 오른쪽(사용자 기준)으로 옮기며 설명함." },
  { id: "m07", description: "양손을 접어 왼쪽(사용자 기준)으로 옮기며 설명함." },
  { id: "m08", description: "팔을 벌렸다 모으며 공손하게 고개 숙여 인사하고 미소." },
  { id: "m09", description: "중간 정도로 고개 숙여 인사." },
  { id: "m10", description: "앞으로 나왔다가 뒤로 가며 당황, 홍조 후 복귀." },
  { id: "m11", description: "팔짱을 끼고 고개를 좌우로 저어 부정 표현." },
  { id: "m12", description: "기겁하며 두 손을 들고 놀람, 고개를 저어 부정 표현." },
  { id: "m13", description: "팔을 뒤로 벌리고 다가와 의심하는 표정." },
  { id: "m14", description: "팔을 뒤로 벌리고 다가와 황당/한심한 표정." },
  { id: "m15", description: "눈을 게슴츠레 뜨고 고개를 좌우로 살짝 움직임." },
  { id: "m16", description: "손을 모았다 벌리며 홍조, 슬픈 표정과 눈물." },
  { id: "m17", description: "홍조를 띄우고 다가와 옆으로 바라보며 게슴츠레한 표정." },
  { id: "m18", description: "홍조를 띄우고 눈 감고 웃으며 고개를 젖혔다 복귀." },
  { id: "m19", description: "홍조와 수줍음, 고개 숙여 좌우로 비틀다 게슴츠레한 눈." },
  { id: "m20", description: "팔짱, 얼굴에 손을 대고 고민하는 표정." },
  { id: "m21", description: "홍조를 살짝 띄우고 좌우로 살짝 뛰며 기뻐함." },
  { id: "m22", description: "다가오며 홍조, 눈 감고 기쁜 표정으로 웃음." },
  { id: "m23", description: "고개를 왼쪽으로 기울이며 살짝 놀랐다 평온해짐." },
  { id: "m24", description: "살짝 놀라며 홍조, 귀엽게 화난 표정." },
  { id: "m25", description: "살짝 놀라는 표정 후 자연스러운 표정으로 복귀." },
  { id: "m26", description: "조금 크게 놀라는 표정 후 자연스러운 포즈로 복귀." },
];

const MOTION_ID_SET = new Set<string>(LIVE2D_MOTION_CATALOG.map((m) => m.id));
const ACTION_DEFAULT_MOTION: Partial<Record<VoiceAction["type"], MotionCode>> = {
  SET_DINING: "m01",
  NAVIGATE: "m06",
  NAVIGATE_CATEGORY: "m06",
  CONTINUE_ORDER: "m01",
  ADD_MENU: "m01",
  CHANGE_QTY: "m01",
  CHANGE_QTY_AT: "m01",
  REMOVE_MENU: "m11",
  REMOVE_MENU_AT: "m11",
  CHECK_CART: "m06",
  CHECKOUT: "m08",
  SELECT_PAYMENT: "m08",
  CALL_STAFF: "m09",
  ACCEPT_SUGGESTION: "m21",
  ACCEPT_SUGGESTION_ITEM: "m21",
  ASK_SET_OR_SINGLE: "m06",
  ASK_REMOVE_TARGET: "m06",
  ASK_SLOT_CLARIFY: "m06",
  ASK_SUGGESTION_CLARIFY: "m06",
  START_REPLACE_LAST: "m20",
  REPLACE_LAST: "m06",
};

function normalizeMotionId(input: unknown): MotionCode | null {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;
  if ((raw === "idle" || raw.startsWith("idle_")) && MOTION_ID_SET.has("idle")) return "idle";
  const compact = raw.replace(/\s+/g, "");
  const m = compact.match(/^m0?([1-9]|1\d|2[0-6])(?:_.+)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const id = `m${String(n).padStart(2, "0")}`;
  return MOTION_ID_SET.has(id) ? (id as MotionCode) : null;
}

function parseInlineMotionTaggedText(
  text: string
): Array<{ text: string; motion: MotionCode | null }> {
  const out: Array<{ text: string; motion: MotionCode | null }> = [];
  const src = String(text || "");
  const tagRe = /\((idle|m0?[1-9]|m1\d|m2[0-6])(?:_[^)]+)?\)/gi;
  let last = 0;
  let pendingMotion: MotionCode | null = null;

  for (let m = tagRe.exec(src); m; m = tagRe.exec(src)) {
    const chunk = src.slice(last, m.index).trim();
    if (chunk) out.push({ text: chunk, motion: pendingMotion });
    pendingMotion = normalizeMotionId(m[1]);
    last = m.index + m[0].length;
  }

  const tail = src.slice(last).trim();
  if (tail) out.push({ text: tail, motion: pendingMotion });
  if (out.length === 0 && src.trim()) out.push({ text: src.trim(), motion: null });
  return out;
}

export default function V2VoiceManager({
  uiScale = 1,
  sessionId,
  diningType,
  selectedCategory,
  categories,
  pageHint,
  uiMode,
  menuCatalog,
  cartSnapshot,
  onSetDining,
  onSelectCategory,
  onAddMenu,
  onChangeQty,
  onRemoveMenu,
  onChangeQtyAt,
  onRemoveAt,
  onReplaceLast,
  onContinueOrder,
  onCheckCart,
  onCheckout,
  onSelectPayment,
  onCallStaff,
  tracking,
  onSpeakingChange,
  onPlayMotion,
}: {
  uiScale?: number;
  sessionId: string | null;
  diningType: "DINE_IN" | "TAKE_OUT" | null;
  selectedCategory: string;
  categories: Array<{ key: string; label: string }>;
  pageHint: PageHint;
  uiMode?: { setPickerActive: boolean; setPickerStep: "side" | "drink" };
  menuCatalog: VoiceMenuCatalogItem[];
  cartSnapshot: VoiceCartSnapshotItem[];
  onSetDining: (t: "DINE_IN" | "TAKE_OUT") => void;
  onSelectCategory: (k: string) => void;
  onAddMenu: (menuItemId: string, quantity: number) => Promise<boolean>;
  onChangeQty: (menuItemId: string, quantity: number) => Promise<boolean>;
  onRemoveMenu: (menuItemId: string) => Promise<boolean>;
  onChangeQtyAt: (cartIndex: number, quantity: number) => Promise<boolean>;
  onRemoveAt: (cartIndex: number) => Promise<boolean>;
  onReplaceLast: (menuItemId: string, quantity: number) => Promise<boolean>;
  onContinueOrder: () => void;
  onCheckCart: () => void;
  onCheckout: () => void;
  onSelectPayment: (m: "CARD" | "POINT" | "SIMPLE") => void;
  onCallStaff: () => Promise<void>;
  tracking: {
    videoElement?: HTMLVideoElement | null;
    hesitationScore?: number;
    isHesitating?: boolean;
    faceScore?: number;
    poseScore?: number;
    poseFeatures?: Record<string, number> | null;
    isDetecting?: boolean;
    error?: string | null;
  };
  onSpeakingChange?: (speaking: boolean) => void;
  onPlayMotion?: (motion: MotionCode) => void;
}) {
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [sttEnabled, setSttEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState<string>("");

  useEffect(() => {
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange, speaking]);

  const { devices: micDevices } = useAudioDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  const shouldListenAfterSpeechRef = useRef(true);
  const autoVoiceStartedRef = useRef(false);
  const prevListeningRef = useRef(false);
  const currentActionTypeRef = useRef<VoiceAction["type"] | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Msg[]>([]);
  const [hesitationAssistConsumed, setHesitationAssistConsumed] = useState(false);
  const hesitationTimerRef = useRef<number | null>(null);
  const lastAssistAtRef = useRef(0);

  const [awaitingCheckoutConfirm, setAwaitingCheckoutConfirm] = useState(false);
  const [awaitingReplaceLast, setAwaitingReplaceLast] = useState(false);
  const [awaitingRemoveTarget, setAwaitingRemoveTarget] = useState(false);
  const [awaitingSuggestionAccept, setAwaitingSuggestionAccept] = useState(false);
  const [suggestedMenu, setSuggestedMenu] = useState<{ menuItemId: string; name: string } | null>(null);
  const [suggestedMenuCandidates, setSuggestedMenuCandidates] = useState<Array<{ menuItemId: string; name: string }>>([]);
  const [pendingSlotClarify, setPendingSlotClarify] = useState<{
    kind: "REMOVE_MENU" | "CHANGE_QTY";
    menuItemId: string;
    quantity?: number;
    candidateIndexes: number[];
  } | null>(null);
  const [pendingActionAfterDining, setPendingActionAfterDining] = useState<VoiceAction | null>(null);
  const [pendingSetChoice, setPendingSetChoice] = useState<{
    singleMenuItemId: string;
    setMenuItemId: string;
    quantity: number;
  } | null>(null);

  const addVoiceLog = useCallback((line: string) => {
    setVoiceLogs((prev) => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const pingAiServer = useCallback(async (): Promise<boolean> => {
  try {
    const ac = new AbortController();
    const t = window.setTimeout(() => ac.abort(), 1500);
    try {
      await fetch(`${AI_BASE_URL}/meta/health`, { method: "GET", signal: ac.signal });
      // If the request reached the server (even 404), treat it as reachable.
      return true;
    } finally {
      window.clearTimeout(t);
    }
  } catch {
    return false;
  }
}, []);

  useEffect(() => {
    if (micDevices.length > 0 && !selectedDeviceId) {
      const def = micDevices.find((d) => d.deviceId === "default") || micDevices[0];
      setSelectedDeviceId(def.deviceId);
    }
  }, [micDevices, selectedDeviceId]);

    const normalizeTranscript = useCallback((raw: string): string => {
  let t = String(raw || "").trim();
  if (!t) return t;
  // Normalize punctuation/spaces to improve matching.
  t = t.replace(/[.,!?~，。、！？]+/g, " ");
  return t.replace(/\s+/g, " ").trim();
}, []);

  const shouldIgnoreTranscript = useCallback((t: string) => {
    if (!t) return true;
    const lower = t.toLowerCase();
    for (const p of NOISE_TRANSCRIPT_PATTERNS) {
      if (lower.includes(p.toLowerCase())) return true;
    }
    return false;
  }, []);

  const findCategoryKeyByToken = useCallback(
    (token: string): string | null => {
      const lower = token.toLowerCase();
      const candidates = categories.map((c) => ({ key: c.key, label: c.label }));
      for (const c of candidates) {
        const hay = `${c.key} ${c.label}`.toLowerCase();
        if (hay.includes(lower)) return c.key;
      }
      return null;
    },
    [categories]
  );

  const inferQty = (t: string): number => {
  const tt = normalizeTranscript(t);
  const m = tt.match(/(\d+)\s*(개|개요|개만|개씩|개\s*주세요|개\s*줘|개\s*부탁|개\s*부탁해)?/);
  if (!m) return 1;
  const n = Math.max(1, Number(m[1] || 1));
  return Number.isFinite(n) ? n : 1;
};

  const parseFastAction = useCallback(
  (t: string): VoiceAction => {
    const tt = normalizeTranscript(t);
    const lower = tt.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    const qty = inferQty(tt);

    // Resolve single-vs-set clarification.
    if (pendingSetChoice) {
      if (compact.includes("세트")) {
        return {
          type: "ADD_MENU",
          menuItemId: pendingSetChoice.setMenuItemId,
          quantity: pendingSetChoice.quantity,
        };
      }
      if (compact.includes("단품") || compact.includes("버거만") || compact.includes("단품으로")) {
        return {
          type: "ADD_MENU",
          menuItemId: pendingSetChoice.singleMenuItemId,
          quantity: pendingSetChoice.quantity,
        };
      }
      return { type: "ASK_SET_OR_SINGLE", ...pendingSetChoice };
    }

    // Dining type.
    if (compact.includes("포장")) return { type: "SET_DINING", diningType: "TAKE_OUT" };
    if (compact.includes("매장") || compact.includes("매장식사") || compact.includes("여기서") || compact.includes("먹고")) {
      return { type: "SET_DINING", diningType: "DINE_IN" };
    }

    // Global intents.
    if (compact.includes("결제")) return { type: "CHECKOUT" };
    if (compact.includes("장바구니")) return { type: "CHECK_CART" };
    if (compact.includes("직원") || compact.includes("도움")) return { type: "CALL_STAFF" };

    // Menu browsing queries.
    if (
      compact.includes("뭐있") ||
      compact.includes("뭐가있") ||
      compact.includes("추천") ||
      (compact.includes("메뉴") && (compact.includes("보여") || compact.includes("알려") || compact.includes("뭐")))
    ) {
      return { type: "CONTINUE_ORDER" };
    }

    // Category navigation.
    if (compact.includes("세트") && (compact.includes("보여") || compact.includes("메뉴"))) {
      const k = findCategoryKeyByToken("set") ?? findCategoryKeyByToken("세트") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if (compact.includes("버거") && (compact.includes("보여") || compact.includes("메뉴"))) {
      const k = findCategoryKeyByToken("burger") ?? findCategoryKeyByToken("버거") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if ((compact.includes("사이드") || compact.includes("감자") || compact.includes("치킨")) && compact.includes("보여")) {
      const k = findCategoryKeyByToken("side") ?? findCategoryKeyByToken("사이드") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if ((compact.includes("음료") || compact.includes("콜라") || compact.includes("커피")) && compact.includes("보여")) {
      const k = findCategoryKeyByToken("drink") ?? findCategoryKeyByToken("음료") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }

    // Try menu matching.
    const norm = (s: string) => normalizeTranscript(s).toLowerCase().replace(/\s+/g, "");
    const q = norm(tt);

    // Simple Levenshtein (small inputs; fine for catalog sizes here).
    const levenshtein = (a: string, b: string) => {
      if (a === b) return 0;
      const m = a.length;
      const n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[m][n];
    };

    let best: { item: VoiceMenuCatalogItem; d: number } | null = null;
    for (const it of menuCatalog) {
      const name = norm(it.name);
      if (!name) continue;
      let d = 9999;
      if (q.includes(name) || name.includes(q)) d = 0;
      else d = levenshtein(q.slice(0, Math.min(q.length, 40)), name.slice(0, Math.min(name.length, 40)));
      if (!best || d < best.d) best = { item: it, d };
    }

    if (best && best.d <= 2) {
      return { type: "ADD_MENU", menuItemId: best.item.menuItemId, quantity: qty };
    }

    return { type: "NONE" };
  },
  [findCategoryKeyByToken, inferQty, menuCatalog, normalizeTranscript, pendingSetChoice]
);

const isOrderDomainUtterance = useCallback(
  (t: string) => {
    const tt = normalizeTranscript(t);
    const lower = tt.toLowerCase();
    const compact = lower.replace(/\s+/g, "");

    // Filter obvious noise.
    if (NOISE_TRANSCRIPT_PATTERNS.some((x) => compact.includes(x.replace(/\s+/g, "")))) return false;

    // Control / intent tokens.
    if (CONTROL_TRANSCRIPT_TOKENS.some((x) => compact.includes(x.toLowerCase().replace(/\s+/g, "")))) return true;

    // Menu Q&A tokens.
    const infoTokens = [
      "알레르기",
      "알러지",
      "재료",
      "원재료",
      "칼로리",
      "kcal",
      "영양",
      "성분",
      "포함",
      "들어가",
      "안들어가",
      "없는",
      "있는",
      "빼줘",
      "빼",
    ];
    if (infoTokens.some((x) => compact.includes(x))) return true;

    // Direct menu mention.
    const norm = (s: string) => normalizeTranscript(s).toLowerCase().replace(/\s+/g, "");
    const q = norm(tt);
    if (q.length >= 2) {
      for (const m of menuCatalog) {
        const name = norm(m.name || "");
        if (!name) continue;
        if (q.includes(name) || name.includes(q)) return true;
      }
    }

    return false;
  },
  [menuCatalog, normalizeTranscript]
);

const say = useCallback(
    async (
      text: string,
      motion?: MotionCode | null,
      segments?: Array<{ text: string; motion?: string | null }>
    ) => {
      const baseMotion =
        motion ??
        (currentActionTypeRef.current ? ACTION_DEFAULT_MOTION[currentActionTypeRef.current] ?? null : null);

      const normalizedSegments = Array.isArray(segments)
        ? segments
            .map((s) => ({
              text: String(s?.text || "").trim(),
              motion: normalizeMotionId(s?.motion) ?? baseMotion,
            }))
            .filter((s) => s.text.length > 0)
        : [];

      const inlineSegments =
        normalizedSegments.length > 0
          ? normalizedSegments
          : parseInlineMotionTaggedText(text).map((s) => ({
              text: s.text,
              motion: s.motion ?? baseMotion,
            }));

      if (inlineSegments.length === 0) return;

      if (!ttsEnabled) {
        const firstMotion = inlineSegments[0]?.motion;
        if (firstMotion) {
          onPlayMotion?.(firstMotion);
          addVoiceLog(`MOTION: ${firstMotion}`);
        }
        return;
      }

      setSpeaking(true);
      prevListeningRef.current = listeningEnabled;
      setListeningEnabled(false);

      try {
        for (const seg of inlineSegments) {
          setSubtitle(seg.text);
          addVoiceLog(`TTS OUT: ${seg.text}`);
          if (seg.motion) {
            onPlayMotion?.(seg.motion);
            addVoiceLog(`MOTION: ${seg.motion}`);
          }
          if (sessionId) {
            try {
              recordSessionEvent(sessionId, "SYSTEM_NOTICE", {
                type: "TTS_PLAYED",
                text: seg.text,
                motion: seg.motion,
              });
            } catch {
              // ignore
            }
          }

          const ac = new AbortController();
          const t = window.setTimeout(() => ac.abort(), 8000);
          try {
            const res = await fetch(`${AI_BASE_URL}/tts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: seg.text, language: "ko", voice: "nova", speed: 1.0 }),
              signal: ac.signal,
            });
            if (!res.ok) {
              addVoiceLog(`TTS ERROR: ${res.status} ${res.statusText}`);
              continue;
            }
            const json = await res.json();
            const audioB64 = json.data?.audioBase64;
            if (!audioB64) {
              addVoiceLog("TTS ERROR: empty audio");
              continue;
            }
            const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
            await new Promise<void>((resolve) => {
              audio.onended = () => resolve();
              audio.onerror = () => resolve();
              void audio.play().catch(() => resolve());
            });
          } catch (e: any) {
            addVoiceLog(`TTS ERROR: ${e?.message || String(e)}`);
          } finally {
            window.clearTimeout(t);
          }
        }
      } finally {
        setSpeaking(false);
        setListeningEnabled(shouldListenAfterSpeechRef.current);
      }
    },
    [addVoiceLog, listeningEnabled, onPlayMotion, sessionId, ttsEnabled]
  );

  const applyVoiceAction = useCallback(
    async (action: VoiceAction): Promise<boolean> => {
      if (!action || action.type === "NONE") return false;
      addVoiceLog(`ACTION: ${action.type}`);
      currentActionTypeRef.current = action.type;
      try {

      // If dining type isn't chosen yet, gate ordering/navigation and ask first.
      if (
        !diningType &&
        action.type !== "SET_DINING" &&
        (action.type === "ADD_MENU" ||
          action.type === "NAVIGATE_CATEGORY" ||
          action.type === "NAVIGATE" ||
          action.type === "CHECKOUT" ||
          action.type === "SELECT_PAYMENT" ||
          action.type === "ASK_SET_OR_SINGLE")
      ) {
        setPendingActionAfterDining(action);
        // Show the menu UI even before dining is chosen (user asked for menu-first flow).
        onContinueOrder();
        await say("드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.");
        return true;
      }

      if (action.type === "CONTINUE_ORDER") {
        setAwaitingCheckoutConfirm(false);
        setAwaitingRemoveTarget(false);
        setAwaitingReplaceLast(false);
        setAwaitingSuggestionAccept(false);
        setSuggestedMenu(null);
        setSuggestedMenuCandidates([]);
        setPendingSlotClarify(null);
        onContinueOrder();
        await say("드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.");
        return true;
      }

      if (action.type === "SET_DINING") {
        onSetDining(action.diningType);
        await say(action.diningType === "DINE_IN" ? "매장 식사로 설정했습니다." : "포장으로 설정했습니다.");
        return true;
      }
      if (action.type === "ASK_SET_OR_SINGLE") {
        setPendingSetChoice({
          singleMenuItemId: action.singleMenuItemId,
          setMenuItemId: action.setMenuItemId,
          quantity: Math.max(1, action.quantity || 1),
        });
        await say("세트로 드릴까요, 단품으로 드릴까요? 세트 또는 단품이라고 말씀해 주세요.");
        return true;
      }
      if (action.type === "NAVIGATE") {
        if (action.page === "main") {
          onContinueOrder();
          await say("드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.");
          return true;
        }
        if (action.page === "order") {
          onCheckout();
          return true;
        }
        if (action.page === "recommended") {
          const k = findCategoryKeyByToken("best") ?? "best";
          onSelectCategory(k);
          await say("추천 메뉴로 이동합니다.");
          return true;
        }
        if (action.page === "burger") {
          const k = findCategoryKeyByToken("burger") || findCategoryKeyByToken("버거");
          if (k) onSelectCategory(k);
          await say("버거 메뉴로 이동합니다.");
          return true;
        }
        if (action.page === "side") {
          const k = findCategoryKeyByToken("side") || findCategoryKeyByToken("사이드");
          if (k) onSelectCategory(k);
          await say("사이드 메뉴로 이동합니다.");
          return true;
        }
        if (action.page === "drink") {
          const k = findCategoryKeyByToken("drink") || findCategoryKeyByToken("음료");
          if (k) onSelectCategory(k);
          await say("음료 메뉴로 이동합니다.");
          return true;
        }
      }
      if (action.type === "NAVIGATE_CATEGORY") {
        onSelectCategory(action.categoryKey);
        await say("해당 카테고리로 이동합니다.");
        return true;
      }
      if (action.type === "CHECK_CART") {
        onCheckCart();
        await say("장바구니를 확인합니다.");
        return true;
      }
      if (action.type === "CHECKOUT") {
        onCheckout();
        setAwaitingCheckoutConfirm(false);
        await say("결제 화면으로 이동합니다.");
        return true;
      }
      if (action.type === "SELECT_PAYMENT") {
        onSelectPayment(action.method);
        await say("결제 수단을 선택했습니다.");
        return true;
      }
      if (action.type === "CALL_STAFF") {
        await onCallStaff();
        await say("직원을 호출했습니다. 잠시만 기다려 주세요.");
        return true;
      }
      if (action.type === "ASK_REMOVE_TARGET") {
        setAwaitingRemoveTarget(true);
        setAwaitingReplaceLast(false);
        setPendingSlotClarify(null);
        const names = cartSnapshot.slice(0, 4).map((c) => c.name).filter(Boolean).join(", ");
        await say(`어떤 메뉴를 빼드릴까요? ${names ? `예: ${names}` : ""}`);
        return true;
      }
      if (action.type === "START_REPLACE_LAST") {
        setAwaitingReplaceLast(true);
        setAwaitingRemoveTarget(false);
        setPendingSlotClarify(null);
        await say("바꾸실 메뉴 이름을 말씀해 주세요.");
        return true;
      }
      if (action.type === "ASK_SLOT_CLARIFY") {
  setPendingSlotClarify({
    kind: action.kind,
    menuItemId: action.menuItemId,
    quantity: action.quantity,
    candidateIndexes: action.candidateIndexes,
  });
  const options = action.candidateIndexes
    .slice(0, 4)
    .map((idx, i) => `${i + 1}번 ${cartSnapshot[idx]?.name || "메뉴"}`)
    .join(", ");
  const verb = action.kind === "REMOVE_MENU" ? "삭제" : "수량 변경";
  await say(`${verb}할 메뉴 번호를 말해 주세요. ${options}`);
  return true;
}
      if (action.type === "ASK_SUGGESTION_CLARIFY") {
        const options = suggestedMenuCandidates
          .slice(0, 3)
          .map((c, i) => `${i + 1}??${c.name}`)
          .join(", ");
        await say(`어느 메뉴로 할까요? 번호로 말해 주세요. ${options}`);
        return true;
      }
      if (action.type === "ACCEPT_SUGGESTION" && suggestedMenu?.menuItemId) {
        const ok = await onAddMenu(suggestedMenu.menuItemId, 1);
        setAwaitingSuggestionAccept(false);
        if (ok) {
          await say(`${suggestedMenu.name}을(를) 장바구니에 담았습니다. 결제하시겠어요?`);
          setAwaitingCheckoutConfirm(true);
        } else {
          await say("장바구니에 담지 못했어요. 다른 메뉴를 말씀해 주세요.");
        }
        return true;
      }
      if (action.type === "ACCEPT_SUGGESTION_ITEM") {
  const cand = suggestedMenuCandidates.find((c) => c.menuItemId === action.menuItemId);
  const ok = await onAddMenu(action.menuItemId, 1);
  setAwaitingSuggestionAccept(false);
  if (ok) {
    await say(`${cand?.name || "해당 메뉴"}을(를) 장바구니에 담았습니다. 결제하시겠어요?`);
    setAwaitingCheckoutConfirm(true);
  } else {
    await say("장바구니에 담지 못했어요. 다른 메뉴를 말씀해 주세요.");
  }
  return true;
}
      if (action.type === "REMOVE_MENU_AT") {
        setPendingSlotClarify(null);
        setAwaitingRemoveTarget(false);
        const ok = await onRemoveAt(action.cartIndex);
        if (ok) await say("장바구니에서 삭제했습니다.");
        else await say("삭제하지 못했어요. 다시 말씀해 주세요.");
        return true;
      }
      if (action.type === "CHANGE_QTY_AT") {
        setPendingSlotClarify(null);
        setAwaitingRemoveTarget(false);
        const ok = await onChangeQtyAt(action.cartIndex, action.quantity);
        if (ok) await say("수량을 변경했습니다.");
        else await say("수량을 변경하지 못했어요. 다시 말씀해 주세요.");
        return true;
      }
      if (action.type === "REPLACE_LAST") {
        const ok = await onReplaceLast(action.menuItemId, action.quantity);
        setAwaitingReplaceLast(false);
        setPendingSlotClarify(null);
        if (ok) {
          await say("메뉴를 변경했습니다. 결제하시겠어요?");
          setAwaitingCheckoutConfirm(true);
        } else {
          await say("메뉴 변경에 실패했어요. 다시 말씀해 주세요.");
        }
        return true;
      }
      if (action.type === "ADD_MENU") {
        const meta = menuCatalog.find((m) => m.menuItemId === action.menuItemId);
        const isSetLike = !!meta && (String(meta.name || "").includes("세트") || String(meta.category || "").toLowerCase().includes("set"));
        const ok = await onAddMenu(action.menuItemId, action.quantity);
        if (ok) {
          setPendingSetChoice(null);
          setAwaitingRemoveTarget(false);
          setAwaitingReplaceLast(false);
          if (uiMode?.setPickerActive) {
            setAwaitingCheckoutConfirm(false);
            const picked = menuCatalog.find((m) => m.menuItemId === action.menuItemId);
            const name = picked?.name || "선택한 메뉴";
            if (uiMode.setPickerStep === "side") {
              await say(`${name} 사이드로 선택했어요. 음료를 선택해 주세요.`);
            } else {
              await say(`${name} 음료로 선택했어요. 장바구니에 담았습니다.`);
            }
            return true;
          }
          if (isSetLike) {
            setAwaitingCheckoutConfirm(false);
            await say("사이드 선택 화면으로 이동합니다. 사이드와 음료를 선택해 주세요.");
            return true;
          }
          await say("장바구니에 담았습니다. 결제하시겠어요?");
          setAwaitingCheckoutConfirm(true);
        }
        else await say("장바구니에 담지 못했어요. 다시 말씀해 주세요.");
        return true;
      }
      if (action.type === "CHANGE_QTY") {
        const ok = await onChangeQty(action.menuItemId, action.quantity);
        if (ok) await say("수량을 변경했습니다.");
        else await say("수량을 변경하지 못했어요. 다시 말씀해 주세요.");
        return true;
      }
      if (action.type === "REMOVE_MENU") {
        setAwaitingRemoveTarget(false);
        const ok = await onRemoveMenu(action.menuItemId);
        if (ok) await say("장바구니에서 삭제했습니다.");
        else await say("삭제하지 못했어요. 다시 말씀해 주세요.");
        return true;
      }
      return false;
      } finally {
        currentActionTypeRef.current = null;
      }
    },
    [
      addVoiceLog,
      cartSnapshot,
      diningType,
      findCategoryKeyByToken,
      menuCatalog,
      onAddMenu,
      onCallStaff,
      onChangeQty,
      onChangeQtyAt,
      onCheckCart,
      onCheckout,
      onContinueOrder,
      onRemoveAt,
      onRemoveMenu,
      onReplaceLast,
      onSelectCategory,
      onSelectPayment,
      onSetDining,
      pendingSetChoice,
      say,
      suggestedMenu,
      suggestedMenuCandidates,
      uiMode,
    ]
  );

  const applyLlmAction = useCallback(
    async (structuredAction: string, actionData: any): Promise<boolean> => {
      const a = String(structuredAction || "NONE").toUpperCase();
      if (a === "NONE") return false;

      if (a === "CALL_STAFF") return applyVoiceAction({ type: "CALL_STAFF" });
      if (a === "CHECK_CART") return applyVoiceAction({ type: "CHECK_CART" });
      if (a === "CHECKOUT") return applyVoiceAction({ type: "CHECKOUT" });
      if (a === "CONTINUE_ORDER") return applyVoiceAction({ type: "CONTINUE_ORDER" });
      if (a === "SET_DINING") {
        const t = String(actionData?.diningType || "").toUpperCase();
        if (t === "DINE_IN" || t === "TAKE_OUT") return applyVoiceAction({ type: "SET_DINING", diningType: t });
      }
      if (a === "NAVIGATE" || a === "NAVIGATE_CATEGORY") {
        const key = String(actionData?.categoryKey || actionData?.categoryId || "");
        if (key) return applyVoiceAction({ type: "NAVIGATE_CATEGORY", categoryKey: key });
      }
      if (a === "ADD_MENU" || a === "ADD_TO_CART") {
        const menuItemId = String(actionData?.menuItemId || "");
        const quantity = Math.max(1, Number(actionData?.quantity || 1));
        if (!menuItemId) return false;
        return applyVoiceAction({ type: "ADD_MENU", menuItemId, quantity });
      }
      if (a === "REMOVE_MENU" || a === "REMOVE_FROM_CART") {
        const menuItemId = String(actionData?.menuItemId || "");
        if (!menuItemId) return false;
        return applyVoiceAction({ type: "REMOVE_MENU", menuItemId });
      }
      if (a === "CHANGE_QTY") {
        const menuItemId = String(actionData?.menuItemId || "");
        const quantity = Math.max(1, Number(actionData?.quantity || 1));
        if (!menuItemId) return false;
        const matches = cartSnapshot
          .map((c, idx) => ({ idx, id: c.menuItemId }))
          .filter((x) => x.id === menuItemId)
          .map((x) => x.idx);
        if (matches.length > 1) {
          return applyVoiceAction({
            type: "ASK_SLOT_CLARIFY",
            kind: "CHANGE_QTY",
            menuItemId,
            quantity,
            candidateIndexes: matches,
          });
        }
        return applyVoiceAction({ type: "CHANGE_QTY", menuItemId, quantity });
      }
      if (a === "SELECT_PAYMENT") {
        const method = String(actionData?.method || "").toUpperCase();
        if (method === "CARD" || method === "POINT" || method === "SIMPLE") {
          return applyVoiceAction({ type: "SELECT_PAYMENT", method });
        }
      }
      return false;
    },
    [applyVoiceAction, cartSnapshot]
  );

  const doLLM = useCallback(
    async (text: string) => {
      const normalizedText = normalizeTranscript(text);
      if (shouldIgnoreTranscript(normalizedText)) {
        addVoiceLog(`STT IGNORED: ${normalizedText || "(empty)"}`);
        return;
      }

      if (sessionId) {
        try {
          recordSessionEvent(sessionId, "SYSTEM_NOTICE", { type: "USER_SPEECH", text: normalizedText });
        } catch {
          // ignore
        }
      }
      addVoiceLog(`STT IN: ${normalizedText}`);

      const fastAction = parseFastAction(normalizedText);
      const handled = await applyVoiceAction(fastAction);
      if (handled) return;

      if (!isOrderDomainUtterance(normalizedText)) {
        addVoiceLog(`STT IGNORED: out-of-domain (${normalizedText})`);
        await say("메뉴 이름이나 '결제', '장바구니'처럼 주문 관련 표현으로 말씀해 주세요.");
        return;
      }
      if (!llmEnabled) {
        await say("지금은 AI 응답 기능이 꺼져 있어요. 메뉴 이름이나 '결제'라고 말씀해 주세요.");
        return;
      }

      try {
        const userMsg: Msg = { role: "user", content: normalizedText };
        const messages = [...conversationHistory, userMsg].slice(-10);
        addVoiceLog(`LLM REQ: ${messages.length} messages`);

        const stateForLlm = {
          diningType,
          selectedCategory,
          pageHint,
          cartItems: cartSnapshot,
          menuCatalog: menuCatalog.slice(0, 160),
          live2dMotionCatalog: LIVE2D_MOTION_CATALOG,
          llmInstruction:
            "Return spoken reply text in data.text. Choose one motion id from live2dMotionCatalog and return in data.motion (idle or m01~m26). If you need mid-sentence motion changes, return data.segments as [{text, motion}] and do not include motion tags inside text.",
        };

        const res = await fetch(`${AI_BASE_URL}/llm/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            sessionId,
            orderType: diningType,
            context: {
              sessionId,
              kioskState: selectedCategory,
              state: stateForLlm,
            },
          }),
        });
        const json = await res.json();
        const reply = json.data?.text || json.data?.reply || "";
        const structuredAction = String(json.data?.action || "NONE");
        const structuredActionData = json.data?.actionData || {};
        const llmMotion = normalizeMotionId(json.data?.motion);
        const llmSegments = Array.isArray(json.data?.segments)
          ? (json.data.segments as any[])
              .map((s) => ({
                text: String(s?.text || "").trim(),
                motion: normalizeMotionId(s?.motion),
              }))
              .filter((s) => s.text.length > 0)
          : [];

        addVoiceLog(`LLM OUT: ${reply || "(empty)"}`);
        if (sessionId) {
          try {
            recordSessionEvent(sessionId, "SYSTEM_NOTICE", {
              type: "AI_REPLY",
              text: reply,
              action: structuredAction,
              actionData: structuredActionData,
              motion: llmMotion,
              segments: llmSegments,
            });
          } catch {
            // ignore
          }
        }
        setConversationHistory([...messages, { role: "assistant", content: reply }]);

        const actionHandled = await applyLlmAction(structuredAction, structuredActionData);
        if (!actionHandled) {
          if (llmSegments.length > 0) {
            await say(reply || llmSegments.map((s) => s.text).join(" "), llmMotion, llmSegments);
          } else if (reply) {
            await say(reply, llmMotion);
          }
        }
      } catch (e) {
        console.error(e);
        addVoiceLog("LLM ERROR: request failed");
      }
    },
    [
      addVoiceLog,
      applyLlmAction,
      applyVoiceAction,
      cartSnapshot,
      conversationHistory,
      diningType,
      isOrderDomainUtterance,
      llmEnabled,
      menuCatalog,
      normalizeTranscript,
      pageHint,
      parseFastAction,
      say,
      selectedCategory,
      sessionId,
      shouldIgnoreTranscript,
    ]
  );

  useMicStreamer({
    enabled: listeningEnabled && sttEnabled,
    deviceId: selectedDeviceId,
    inputLang: "ko",
    outputs: [],
    onResult: (res) => {
      addVoiceLog(`STT RAW: ${res.original}`);
      void doLLM(res.original);
    },
    sttModel: "whisper-1",
    llmModel: "gpt-4o",
    vadGateHigh: 0.006,
    vadGateLow: 0.002,
    minSpeechMs: 700,
    padMs: 260,
    onDebug: (msg) => addVoiceLog(`MIC DEBUG: ${msg}`),
    onError: (msg) => {
      addVoiceLog(`MIC ERROR: ${msg}`);
      const lower = String(msg || "").toLowerCase();
      if (lower.includes("failed to fetch") || lower.includes("timeout") || lower.includes("timed out")) {
        // STT transport error (logged only).
      }
    },
  });

  const handleVoiceStart = useCallback(async () => {
    addVoiceLog(`VOICE START: mic=${selectedDeviceId || "default"}`);
    shouldListenAfterSpeechRef.current = true;
    // Prevent the "auto voice start on diningType set" effect from firing again after a manual start.
    autoVoiceStartedRef.current = true;

    const ok = await pingAiServer();
    if (!ok) {
      addVoiceLog(`VOICE ERROR: AI server unreachable (${AI_BASE_URL})`);
      // Don't hard-fail: STT/TTS/LLM may still be temporarily reachable even if health ping times out.
    }

    setListeningEnabled(true);
    if (!diningType) {
      await say("음성 주문을 시작합니다. 드시고 가시나요, 포장인가요?");
    } else {
      await say("음성 주문을 시작합니다. 원하시는 메뉴를 말씀해 주세요.");
    }
    setListeningEnabled(true);
  }, [addVoiceLog, diningType, pingAiServer, say, selectedDeviceId]);

  const handleVoiceStop = useCallback(() => {
    addVoiceLog("VOICE STOP");
    shouldListenAfterSpeechRef.current = false;
    setListeningEnabled(false);
  }, [addVoiceLog]);

  useEffect(() => {
    if (!sessionId) return;
    if (!diningType) return;
    if (autoVoiceStartedRef.current) return;
    autoVoiceStartedRef.current = true;
    void handleVoiceStart();
  }, [diningType, handleVoiceStart, sessionId]);

  // After dining type is chosen, resume a pending action (e.g., user already said a menu name).
  useEffect(() => {
    if (!diningType) return;
    if (!pendingActionAfterDining) return;
    const act = pendingActionAfterDining;
    setPendingActionAfterDining(null);
    void applyVoiceAction(act);
  }, [applyVoiceAction, diningType, pendingActionAfterDining]);

  useEffect(() => {
    if (hesitationAssistConsumed) return;
    const score = Number(tracking.hesitationScore || 0);
    const shouldWatch = Boolean(tracking.isHesitating) || score >= 0.6;
    if (!shouldWatch) {
      if (hesitationTimerRef.current != null) {
        window.clearTimeout(hesitationTimerRef.current);
        hesitationTimerRef.current = null;
      }
      return;
    }
    if (hesitationTimerRef.current != null) return;

    const now = Date.now();
    if (now - lastAssistAtRef.current < 12_000) return;
    lastAssistAtRef.current = now;

    hesitationTimerRef.current = window.setTimeout(() => {
      hesitationTimerRef.current = null;
      if (hesitationAssistConsumed) return;
      setHesitationAssistConsumed(true);

      const pickMenus = menuCatalog.slice(0, 3).filter((m) => m.menuItemId && m.name);
      const picks = pickMenus.map((m) => m.name).filter(Boolean);
      const list = picks.join(", ") || "추천 메뉴";
      const msg = `추천 메뉴로 ${list} 어때요?`;
      addVoiceLog(`HESITATION: assist fired (score=${Math.round(score * 100)}%)`);
      setSuggestedMenuCandidates(pickMenus.map((m) => ({ menuItemId: m.menuItemId, name: m.name })));
      if (pickMenus[0]) {
        setSuggestedMenu({ menuItemId: pickMenus[0].menuItemId, name: pickMenus[0].name });
        setAwaitingSuggestionAccept(true);
        setAwaitingCheckoutConfirm(false);
      }
      if (sessionId) {
        try {
          recordSessionEvent(sessionId, "SYSTEM_NOTICE", { type: "HESITATION_ASSIST_TRIGGERED", score });
        } catch {
          // ignore
        }
      }
      void say(msg, "m25");
    }, 2500);

    return () => {
      if (hesitationTimerRef.current != null) {
        window.clearTimeout(hesitationTimerRef.current);
        hesitationTimerRef.current = null;
      }
    };
  }, [addVoiceLog, hesitationAssistConsumed, menuCatalog, say, sessionId, tracking.hesitationScore, tracking.isHesitating]);

  const trimmedSubtitle = useMemo(() => subtitle.trim(), [subtitle]);

  return (
    <>
      {trimmedSubtitle ? (
        // Place the TTS subtitle slightly above the menu panel for better context.
        <div
          className="fixed z-[4500] left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ bottom: `${Math.max(24, Math.round(610 * uiScale))}px` }}
        >
          <div className="px-6 py-3 rounded-2xl bg-black/70 text-white text-lg font-semibold shadow-lg max-w-[960px] truncate">
            {trimmedSubtitle}
          </div>
        </div>
      ) : null}

      <MediaPipeDebugPanel
        videoElement={tracking.videoElement ?? null}
        hesitationScore={tracking.hesitationScore ?? 0}
        isHesitating={tracking.isHesitating ?? false}
        faceScore={tracking.faceScore ?? 0}
        poseScore={tracking.poseScore ?? 0}
        poseFeatures={tracking.poseFeatures ?? null}
        isDetecting={tracking.isDetecting ?? false}
        error={tracking.error ?? null}
        isOpen={isDevPanelOpen}
        onToggle={() => setIsDevPanelOpen((v) => !v)}
        sttEnabled={sttEnabled}
        ttsEnabled={ttsEnabled}
        llmEnabled={llmEnabled}
        listeningEnabled={listeningEnabled}
        onToggleStt={setSttEnabled}
        onToggleTts={setTtsEnabled}
        onToggleLlm={setLlmEnabled}
        onStartVoice={handleVoiceStart}
        onStopVoice={handleVoiceStop}
        micDevices={micDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id || undefined)}
        voiceLogs={voiceLogs}
      />
    </>
  );
}









