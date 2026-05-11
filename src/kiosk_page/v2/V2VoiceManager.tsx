import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicStreamer } from "../../hook/useMicStreamer";
import { useAudioDevices } from "../../hook/useAudioDevices";
import { AI_BASE_URL, AI_V2_CHAT_URL, AI_V2_REALTIME_CONFIG_URL, AI_V2_REALTIME_SESSION_URL } from "../../api/config";
import MediaPipeDebugPanel from "../../components/MediaPipeDebugPanel";
import { recordSessionEvent } from "../../api/services";
import { getKfcAllergensForMenuName } from "./kfcAllergenData";

type PageHint = { selectedCategory: string; showOrderView: boolean; paymentStep: string; paidOrderNumber?: number | null };

export type VoiceMenuCatalogItem = {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  ingredients?: string[];
  allergies?: string[];
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
  | { type: "ADD_MENU_BULK"; items: Array<{ menuItemId: string; quantity: number }> }
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
  | { type: "RECOMMEND_MENU" }
  | { type: "CONTINUE_ORDER" }
  | { type: "CLEAR_CART" }
  | { type: "CHECK_CART" }
  | { type: "CHECKOUT" }
  | { type: "SELECT_PAYMENT"; method: "CARD" | "POINT" | "SIMPLE" }
  | { type: "CONFIRM_CHECKOUT" }
  | { type: "CANCEL_CHECKOUT" }
  | { type: "CALL_STAFF" }
  | { type: "CONFIRM_PENDING_OPTION" }
  | { type: "REJECT_PENDING_OPTION" }
  | {
      type: "ASK_CONFIRM_BOTH_OPTIONS";
      sideMenuItemId: string;
      sideName: string;
      drinkMenuItemId: string;
      drinkName: string;
      quantity: number;
    }
  | { type: "NONE" };

type Msg = { role: "user" | "assistant"; content: string };
type VoiceActionExecOptions = { skipSpeech?: boolean };
type MotionCode =
  | "idle"
  | "m01" | "m02" | "m03" | "m04" | "m05" | "m06" | "m07" | "m08" | "m09" | "m10"
  | "m11" | "m12" | "m13" | "m14" | "m15" | "m16" | "m17" | "m18" | "m19" | "m20"
  | "m21" | "m22" | "m23" | "m24" | "m25" | "m26";

declare global {
  interface Window {
    __AIKIOSK_RT_AUTO_CONNECT_SESSION__?: string;
  }
}

const NOISE_TRANSCRIPT_PATTERNS = [
  // Common filler/noise that should not trigger ordering logic.
  "구독",
  "좋아요",
  "구독과 좋아요",
  "구독 좋아요",
  "시청해주셔서 감사합니다",
  "시청해 주셔서 감사합니다",
  "댓글 부탁드려요",
  "댓글 부탁드립니다",
  "알림 설정",
  "참고로 주문하기",
  "주문하기 이전 뒤로",
  "mbc 뉴스",
  "뉴스",
  "워싱턴에서",
  "통합뉴스룸",
  "전해드렸습니다",
  "이덕영입니다",
  "김지경입니다",
  "시청자 여러분",
  "지금까지",
  "유료광고를 포함하고 있습니다",
  "유료 광고를 포함하고 있습니다",
];

const LISTEN_RESUME_DELAY_MS = 450;

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
  { id: "m02", description: "손을 모으며 강하게 끄덕거림." },
];

const MOTION_ID_SET = new Set<string>(LIVE2D_MOTION_CATALOG.map((m) => m.id));
const UNIFIED_MOTION_ID: MotionCode = "m02";
const ACTION_DEFAULT_MOTION: Partial<Record<VoiceAction["type"], MotionCode>> = {
  SET_DINING: UNIFIED_MOTION_ID,
  CONTINUE_ORDER: UNIFIED_MOTION_ID,
  CLEAR_CART: UNIFIED_MOTION_ID,
  ADD_MENU: UNIFIED_MOTION_ID,
  ADD_MENU_BULK: UNIFIED_MOTION_ID,
  CHANGE_QTY: UNIFIED_MOTION_ID,
  CHANGE_QTY_AT: UNIFIED_MOTION_ID,
  REMOVE_MENU: UNIFIED_MOTION_ID,
  REMOVE_MENU_AT: UNIFIED_MOTION_ID,
  CHECK_CART: UNIFIED_MOTION_ID,
  CHECKOUT: UNIFIED_MOTION_ID,
  SELECT_PAYMENT: UNIFIED_MOTION_ID,
  CALL_STAFF: UNIFIED_MOTION_ID,
  ACCEPT_SUGGESTION: UNIFIED_MOTION_ID,
  ACCEPT_SUGGESTION_ITEM: UNIFIED_MOTION_ID,
  RECOMMEND_MENU: UNIFIED_MOTION_ID,
  ASK_SET_OR_SINGLE: UNIFIED_MOTION_ID,
  ASK_CONFIRM_BOTH_OPTIONS: UNIFIED_MOTION_ID,
  CONFIRM_PENDING_OPTION: UNIFIED_MOTION_ID,
  REJECT_PENDING_OPTION: UNIFIED_MOTION_ID,
  ASK_REMOVE_TARGET: UNIFIED_MOTION_ID,
  ASK_SLOT_CLARIFY: UNIFIED_MOTION_ID,
  ASK_SUGGESTION_CLARIFY: UNIFIED_MOTION_ID,
  START_REPLACE_LAST: UNIFIED_MOTION_ID,
  REPLACE_LAST: UNIFIED_MOTION_ID,
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

function formatMenuNameForTts(raw: string): string {
  const src = String(raw || "").trim();
  if (!src) return src;
  let t = src;
  // Normalize common spoken-friendly aliases.
  t = t.replace(/통다리구이/gi, "통다리 치킨");
  // Convert size markers to spoken Korean.
  t = t.replace(/\(\s*L\s*\)/gi, " 라지 사이즈");
  t = t.replace(/\(\s*M\s*\)/gi, " 미디엄 사이즈");
  t = t.replace(/\(\s*R\s*\)/gi, " 레귤러 사이즈");
  t = t.replace(/\s+L$/i, " 라지 사이즈");
  t = t.replace(/\s+M$/i, " 미디엄 사이즈");
  t = t.replace(/\s+R$/i, " 레귤러 사이즈");
  return t.replace(/\s+/g, " ").trim();
}

function downsampleTo16k(float32: Float32Array, inRate: number): Float32Array {
  const outRate = 24000;
  if (inRate === outRate) return float32;
  const ratio = inRate / outRate;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Float32Array(outLen);
  let pos = 0;
  let idx = 0;
  while (idx < outLen) {
    const nextPos = (idx + 1) * ratio;
    let sum = 0;
    let count = 0;
    for (; pos < nextPos && pos < float32.length; pos++) {
      sum += float32[pos];
      count += 1;
    }
    out[idx++] = count ? sum / count : 0;
  }
  return out;
}

function floatTo16BitPCM(src: Float32Array): Int16Array {
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const sample = Math.max(-1, Math.min(1, src[i]));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.byteLength);
  for (let i = 0; i < int16.length; i++) {
    const sample = int16[i];
    bytes[i * 2] = sample & 0xff;
    bytes[i * 2 + 1] = (sample >> 8) & 0xff;
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = Math.floor(bytes.length / 2);
  const out = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const lo = bytes[i * 2] ?? 0;
    const hi = bytes[i * 2 + 1] ?? 0;
    let value = (hi << 8) | lo;
    if (value >= 0x8000) value -= 0x10000;
    out[i] = value;
  }
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
  onCancelSetPicker,
  onCheckCart,
  onCheckout,
  onSelectPayment,
  onCallStaff,
  tracking,
  onSpeakingChange,
  onPlayMotion,
  onPreviewSetPickerSelection,
  onPaymentCompleteSpoken,
}: {
  uiScale?: number;
  sessionId: string | null;
  diningType: "DINE_IN" | "TAKE_OUT" | null;
  selectedCategory: string;
  categories: Array<{ key: string; label: string }>;
  pageHint: PageHint;
  uiMode?: {
    setPickerActive: boolean;
    setPickerStep: "side" | "drink";
    setMenuName?: string | null;
    setSideMenuItemId?: string | null;
    setDrinkMenuItemId?: string | null;
  };
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
  onCancelSetPicker?: () => void;
  onClearCart?: () => void | Promise<void>;
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
  onPreviewSetPickerSelection?: (selection: { sideMenuItemId?: string; drinkMenuItemId?: string }) => void;
  onPaymentCompleteSpoken?: () => void;
}) {
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [sttEnabled, setSttEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeConnecting, setRealtimeConnecting] = useState(false);
  const [realtimeStatusText, setRealtimeStatusText] = useState<string>("idle");
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState<string>("");
  const [planSubtitle, setPlanSubtitle] = useState<string>("");

  useEffect(() => {
    onSpeakingChange?.(speaking);
    (window as any).__AIKIOSK_TTS_SPEAKING = speaking;
    const lipSyncStillActive = Boolean((window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE);
    const forceMouthStillActive = Boolean((window as any).__AIKIOSK_RT_FORCE_MOUTH);
    if (!speaking && !lipSyncStillActive && !forceMouthStillActive) {
      (window as any).__AIKIOSK_TTS_MOUTH_OPEN = 0;
      (window as any).__AIKIOSK_RT_FORCE_MOUTH = false;
    }
  }, [onSpeakingChange, speaking]);

  useEffect(() => {
    realtimeConnectedRef.current = realtimeConnected;
  }, [realtimeConnected]);

  useEffect(() => {
    realtimeConnectingRef.current = realtimeConnecting;
  }, [realtimeConnecting]);

  useEffect(() => {
    return () => {
      if (listenResumeTimerRef.current != null) {
        window.clearTimeout(listenResumeTimerRef.current);
        listenResumeTimerRef.current = null;
      }
    };
  }, [menuCatalog]);

  const { micDevices, speakerDevices } = useAudioDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string | undefined>(undefined);

  const shouldListenAfterSpeechRef = useRef(true);
  const autoVoiceStartedRef = useRef(false);
  const prevListeningRef = useRef(false);
  const currentActionTypeRef = useRef<VoiceAction["type"] | null>(null);
  const llmRequestInFlightRef = useRef(false);
  const llmWaitPromptTriggeredRef = useRef(false);
  const llmWaitPromptTimerRef = useRef<number | null>(null);
  const llmWaitPromptPromiseRef = useRef<Promise<void> | null>(null);
  const listenResumeTimerRef = useRef<number | null>(null);
  const holdListeningDuringLlmRef = useRef(false);
  const suppressActionSpeechRef = useRef(false);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDcRef = useRef<RTCDataChannel | null>(null);
  const realtimeStreamRef = useRef<MediaStream | null>(null);
  const realtimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimeHandledCallIdsRef = useRef<Set<string>>(new Set());
  const realtimeWsRef = useRef<WebSocket | null>(null);
  const realtimeMicStreamRef = useRef<MediaStream | null>(null);
  const realtimeMicContextRef = useRef<AudioContext | null>(null);
  const realtimeMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const realtimeMicProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const realtimeAssistantTranscriptRef = useRef("");
  const realtimePlannedSpeechRef = useRef("");
  const realtimeSetPickerPendingRef = useRef(false);
  const realtimeEventHandlerRef = useRef<(event: Record<string, any>) => void>(() => undefined);
  const activeTtsAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePlaybackCtxRef = useRef<AudioContext | null>(null);
  const realtimePlaybackNextTimeRef = useRef(0);
  const realtimePlaybackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const realtimeLipSyncCtxRef = useRef<AudioContext | null>(null);
  const realtimeLipSyncSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const realtimeLipSyncStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const realtimeLipSyncAnalyserRef = useRef<AnalyserNode | null>(null);
  const realtimeLipSyncGainRef = useRef<GainNode | null>(null);
  const realtimeLipSyncRafRef = useRef<number | null>(null);
  const realtimeForcedMouthTimerRef = useRef<number | null>(null);
  const realtimeResponseActiveRef = useRef(false);
  const realtimeSentChunkCountRef = useRef(0);
  const realtimeConnectedRef = useRef(false);
  const realtimeConnectingRef = useRef(false);
  const realtimeConnectInFlightRef = useRef(false);
  const connectRealtimeRef = useRef<(() => Promise<void>) | null>(null);
  const lastPaymentCompleteSpokenKeyRef = useRef<string>("");
  const [conversationHistory, setConversationHistory] = useState<Msg[]>([]);
  const [hesitationAssistConsumed, setHesitationAssistConsumed] = useState(false);
  const hesitationAssistLockedRef = useRef(false);
  const hesitationTimerRef = useRef<number | null>(null);
  const hesitationAssistSessionIdRef = useRef<string | null>(null);
  const recommendationCursorRef = useRef(0);
  const recentRecommendedMenuIdsRef = useRef<string[]>([]);

  const [awaitingCheckoutConfirm, setAwaitingCheckoutConfirm] = useState(false);
  const [pendingCheckoutMethod, setPendingCheckoutMethod] = useState<"CARD" | "POINT" | "SIMPLE" | null>(null);
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
  const [pendingOptionConfirm, setPendingOptionConfirm] = useState<{
    kind: "SIDE" | "DRINK" | "BOTH";
    menuItemId: string;
    name: string;
    quantity: number;
    sideMenuItemId?: string;
    sideName?: string;
    drinkMenuItemId?: string;
    drinkName?: string;
  } | null>(null);
  const explicitSetSelectionRef = useRef<{
    menuName: string;
    sideConfirmed: boolean;
    drinkConfirmed: boolean;
  }>({
    menuName: "",
    sideConfirmed: false,
    drinkConfirmed: false,
  });

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

  useEffect(() => {
    if (speakerDevices.length > 0 && !selectedOutputDeviceId) {
      const def = speakerDevices.find((d) => d.deviceId === "default") || speakerDevices[0];
      setSelectedOutputDeviceId(def.deviceId);
    }
  }, [speakerDevices, selectedOutputDeviceId]);

  const normalizeTranscript = useCallback((raw: string): string => {
  let t = String(raw || "").trim();
  if (!t) return t;
  // Normalize punctuation/spaces to improve matching.
  t = t.replace(/[.,!?~，。、！？]+/g, " ");
  // Common STT variants/typos for menu aliases.
  t = t
    .replace(/고울슬로|홀슬로|콜슬로우|콜슬로|콜\s*슬로우|콜\s*슬로/gi, "코울슬로")
    .replace(/싱고버거|징거 버거|증거버거|증거\s*버거/gi, "징거버거")
    .replace(/클래식\s*더블\s*세트|클래식더블세트/gi, "더블치즈버거세트")
    .replace(/더블\s*세트/gi, "더블치즈버거세트")
    .replace(/다워버거|타오버거|탕후버거|타후버거|타월버거/gi, "타워버거")
    .replace(/캡셀버거|캡세버거|캡새\s*버거/gi, "캡새버거")
    .replace(/핫\s*크리스피\s*치킨\s*버거/gi, "핫크리스피버거")
    .replace(/핫\s*크리스피\s*치킨버거/gi, "핫크리스피버거")
    .replace(/총다리|퉁다리|똥다리|동다리|통다리\s*구이|동다리\s*구이/gi, "통다리")
    .replace(/한\s*조각|하나\s*조각/gi, "1조각")
    .replace(/두\s*조각/gi, "2조각")
    .replace(/세\s*조각/gi, "3조각")
    .replace(/네\s*조각/gi, "4조각")
    .replace(/라지사이트|라지사이즈|라지사이드|미디엄사이즈|스몰사이즈/gi, (m) =>
      m.includes("라지") ? "라지 사이즈" : m.includes("미디엄") ? "미디엄 사이즈" : "스몰 사이즈"
    )
    .replace(/콜라이트/gi, "콜라 라지");
  return t.replace(/\s+/g, " ").trim();
}, []);

  const shouldIgnoreTranscript = useCallback((t: string) => {
    if (!t) return true;
    const lower = t.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    for (const p of NOISE_TRANSCRIPT_PATTERNS) {
      const pattern = p.toLowerCase();
      if (lower.includes(pattern) || compact.includes(pattern.replace(/\s+/g, ""))) return true;
    }
    // Ignore known noisy meta utterances and token-dump style ASR hallucinations.
    if (lower.includes("주요 단어는")) return true;
    const commaCount = (t.match(/[,，]/g) || []).length;
    const numberCount = (t.match(/\d+/g) || []).length;
    const tokenishCount = (t.match(/\b(주문하기|이전|뒤로|버거|사이드|음료|세트|단품|결제|매장|포장)\b/g) || []).length;
    const controlTokens = ["주문하기", "이전", "뒤로", "버거", "사이드", "음료", "세트", "단품", "결제", "매장", "포장"];
    const compactTokenHits = controlTokens.filter((tok) => compact.includes(tok)).length;
    const hasTaskVerb = /(담아|추가|추천해|보여|알려|선택|결제해|주문해|취소해|삭제해)/.test(lower);
    if (t.length > 60 && commaCount >= 8 && numberCount >= 8) return true;
    if (t.length > 60 && tokenishCount >= 8) return true;
    // ASR hallucination often returns token lists like
    // "이전 뒤로 버거 세트 단품 결제 매장 포장 ...".
    if (tokenishCount >= 6 && !hasTaskVerb) return true;
    if (compactTokenHits >= 6 && !hasTaskVerb) return true;
    return false;
  }, []);

  const isAbusiveUtterance = useCallback((t: string) => {
    const compact = normalizeTranscript(t).toLowerCase().replace(/\s+/g, "");
    if (!compact) return false;
    const abuseTokens = [
      "멍청",
      "바보",
      "병신",
      "미친놈",
      "개같",
      "개새",
      "또라이",
      "한심",
      "빡대가리",
    ];
    return abuseTokens.some((x) => compact.includes(x));
  }, [normalizeTranscript]);

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

  const isMenuInfoUtterance = useCallback(
    (t: string) => {
      const compact = normalizeTranscript(t).toLowerCase().replace(/\s+/g, "");
      if (!compact) return false;
      const infoTokens = [
        "알레르기",
        "알러지",
        "알레르겐",
        "재료",
        "원재료",
        "성분",
        "칼로리",
        "kcal",
        "영양",
        "들어가",
        "들어간",
        "안들어가",
        "안들어간",
        "포함",
        "없는",
        "제외",
        "빼고",
        "정보",
      ];
      const askTokens = ["알려", "뭐", "어때", "있어", "맞아", "확인"];
      const hasInfo = infoTokens.some((x) => compact.includes(x));
      const hasAsk = askTokens.some((x) => compact.includes(x));
      return hasInfo && (hasAsk || compact.includes("추천"));
    },
    [normalizeTranscript]
  );

  const normalizeForMatch = useCallback(
    (s: string) => normalizeTranscript(s).toLowerCase().replace(/\s+/g, ""),
    [normalizeTranscript]
  );

  const simplifyForMenuMatch = useCallback(
    (s: string) =>
      normalizeForMatch(s)
        .replace(
          /(하나|한개|개|두개|세개|네개|다섯개|\d+|사이즈|라지|미디엄|레귤러|스몰|주세요|줘|담아봐|담아|추가해줘|추가해|추가|주문할게|주문해줘|먹어|더|좀|으로|은|는|이|가|을|를|요|해줘|없애줘|없애|빼줘|빼|삭제해줘|삭제|수량|변경|바꿔)+/g,
          ""
        )
        .trim(),
    [normalizeForMatch]
  );

  const levenshteinDistance = useCallback((a: string, b: string): number => {
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
  }, []);

  const findBestMenuCatalogMatch = useCallback(
    (
      query: string,
      items: VoiceMenuCatalogItem[],
      opts?: { allowLoose?: boolean; strictThreshold?: number; looseThreshold?: number }
    ): VoiceMenuCatalogItem | null => {
      const q = normalizeForMatch(query);
      const qSimple = simplifyForMenuMatch(query);
      if (!q) return null;
      const strictThreshold = opts?.strictThreshold ?? 2;
      const looseThreshold = opts?.looseThreshold ?? 3;
      const allowLoose = Boolean(opts?.allowLoose);
      const source = qSimple || q;
      const sourceLen = source.length;
      const dynamicStrictThreshold =
        sourceLen <= 2 ? 0 : sourceLen <= 4 ? Math.min(strictThreshold, 1) : strictThreshold;
      const dynamicLooseThreshold =
        sourceLen <= 2 ? 0 : sourceLen <= 4 ? Math.min(looseThreshold, 2) : looseThreshold;

      let best: { item: VoiceMenuCatalogItem; d: number; strength: number; nameLen: number } | null = null;
      for (const it of items) {
        const name = normalizeForMatch(it.name || "");
        if (!name) continue;
        let d = 9999;
        let strength = 0;
        if (q.includes(name) || name.includes(q) || (qSimple && (qSimple.includes(name) || name.includes(qSimple)))) {
          d = 0;
          if (source === name) strength = 3;
          else if (source.includes(name)) strength = 2;
          else if (name.includes(source)) strength = 1;
        } else if (sourceLen >= 2) {
          d = levenshteinDistance(
            source.slice(0, Math.min(source.length, 40)),
            name.slice(0, Math.min(name.length, 40))
          );
        }
        if (
          !best ||
          d < best.d ||
          (d === best.d && (strength > best.strength || (strength === best.strength && name.length > best.nameLen)))
        ) {
          best = { item: it, d, strength, nameLen: name.length };
        }
      }
      if (!best) return null;
      if (best.d <= dynamicStrictThreshold) return best.item;
      if (allowLoose && sourceLen >= 3 && best.d <= dynamicLooseThreshold) return best.item;
      return null;
    },
    [levenshteinDistance, normalizeForMatch, simplifyForMenuMatch]
  );

  const findBestCartMatch = useCallback(
    (
      query: string,
      items: VoiceCartSnapshotItem[],
      opts?: { allowLoose?: boolean; strictThreshold?: number; looseThreshold?: number }
    ): VoiceCartSnapshotItem | null => {
      const q = normalizeForMatch(query);
      const qSimple = simplifyForMenuMatch(query);
      if (!q) return null;
      const strictThreshold = opts?.strictThreshold ?? 2;
      const looseThreshold = opts?.looseThreshold ?? 3;
      const allowLoose = Boolean(opts?.allowLoose);
      const source = qSimple || q;
      const sourceLen = source.length;
      const dynamicStrictThreshold =
        sourceLen <= 2 ? 0 : sourceLen <= 4 ? Math.min(strictThreshold, 1) : strictThreshold;
      const dynamicLooseThreshold =
        sourceLen <= 2 ? 0 : sourceLen <= 4 ? Math.min(looseThreshold, 2) : looseThreshold;

      let best: { item: VoiceCartSnapshotItem; d: number; strength: number; nameLen: number } | null = null;
      for (const it of items) {
        const name = normalizeForMatch(it.name || "");
        if (!name) continue;
        let d = 9999;
        let strength = 0;
        if (q.includes(name) || name.includes(q) || (qSimple && (qSimple.includes(name) || name.includes(qSimple)))) {
          d = 0;
          if (source === name) strength = 3;
          else if (source.includes(name)) strength = 2;
          else if (name.includes(source)) strength = 1;
        } else if (sourceLen >= 2) {
          d = levenshteinDistance(
            source.slice(0, Math.min(source.length, 40)),
            name.slice(0, Math.min(name.length, 40))
          );
        }
        if (
          !best ||
          d < best.d ||
          (d === best.d && (strength > best.strength || (strength === best.strength && name.length > best.nameLen)))
        ) {
          best = { item: it, d, strength, nameLen: name.length };
        }
      }
      if (!best) return null;
      if (best.d <= dynamicStrictThreshold) return best.item;
      if (allowLoose && sourceLen >= 3 && best.d <= dynamicLooseThreshold) return best.item;
      return null;
    },
    [levenshteinDistance, normalizeForMatch, simplifyForMenuMatch]
  );

  const resolveCatalogMenuItemId = useCallback(
    (menuRef: string): string | null => {
      const ref = String(menuRef || "").trim();
      if (!ref) return null;
      const byId = menuCatalog.find((m) => m.menuItemId === ref);
      if (byId) return byId.menuItemId;
      const byName = findBestMenuCatalogMatch(ref, menuCatalog, { allowLoose: true });
      return byName?.menuItemId ?? null;
    },
    [findBestMenuCatalogMatch, menuCatalog]
  );

  const resolveCatalogMenuItemIdInContext = useCallback(
    (menuRef: string): string | null => {
      const ref = String(menuRef || "").trim();
      if (!ref) return null;

      const selected = String(selectedCategory || "").toLowerCase();
      const isSingleTab =
        selected.includes("single") || selected.includes("burger") || selected.includes("단품") || selected.includes("버거");
      const isSetTab = selected.includes("set") || selected.includes("세트");
      const isSideTab = selected.includes("side") || selected.includes("사이드");
      const isDrinkTab = selected.includes("drink") || selected.includes("음료");

      let contextCatalog = menuCatalog;
      if (!uiMode?.setPickerActive) {
        if (isSingleTab) {
          const singleOnly = menuCatalog.filter((it) => {
            const c = String(it.category || "").toLowerCase();
            const n = String(it.name || "").toLowerCase();
            const inSingle = c.includes("single") || c.includes("burger") || c.includes("단품") || c.includes("버거");
            const looksSet = c.includes("set") || c.includes("세트") || n.includes("세트");
            return inSingle && !looksSet;
          });
          if (singleOnly.length) contextCatalog = singleOnly;
        } else if (isSetTab) {
          const setOnly = menuCatalog.filter((it) => {
            const c = String(it.category || "").toLowerCase();
            const n = String(it.name || "").toLowerCase();
            return c.includes("set") || c.includes("세트") || n.includes("세트");
          });
          if (setOnly.length) contextCatalog = setOnly;
        } else if (isSideTab) {
          const sideOnly = menuCatalog.filter((it) => {
            const c = String(it.category || "").toLowerCase();
            return c.includes("side") || c.includes("사이드");
          });
          if (sideOnly.length) contextCatalog = sideOnly;
        } else if (isDrinkTab) {
          const drinkOnly = menuCatalog.filter((it) => {
            const c = String(it.category || "").toLowerCase();
            return c.includes("drink") || c.includes("음료");
          });
          if (drinkOnly.length) contextCatalog = drinkOnly;
        }
      }

      const directCtx = findBestMenuCatalogMatch(ref, contextCatalog, {
        allowLoose: true,
        looseThreshold: 4,
      });
      if (directCtx?.menuItemId) return directCtx.menuItemId;

      const cleanedRef = ref.replace(/\s*세트\s*/gi, " ").replace(/\s+/g, " ").trim();
      if (cleanedRef && cleanedRef !== ref) {
        const cleanedCtx = findBestMenuCatalogMatch(cleanedRef, contextCatalog, {
          allowLoose: true,
          looseThreshold: 4,
        });
        if (cleanedCtx?.menuItemId) return cleanedCtx.menuItemId;
      }

      const globalMatched = findBestMenuCatalogMatch(ref, menuCatalog, { allowLoose: true, looseThreshold: 4 });
      if (!globalMatched?.menuItemId) return null;

      if (isSingleTab) {
        const globalName = String(globalMatched.name || "");
        const singleCandidate = findBestMenuCatalogMatch(
          globalName.replace(/\s*세트\s*/gi, " ").trim(),
          contextCatalog,
          { allowLoose: true, looseThreshold: 4 }
        );
        if (singleCandidate?.menuItemId) return singleCandidate.menuItemId;
      }
      return globalMatched.menuItemId;
    },
    [findBestMenuCatalogMatch, menuCatalog, selectedCategory, uiMode?.setPickerActive]
  );

  const resolveCartIndexesByMenuRef = useCallback(
    (menuRef: string): number[] => {
      const ref = String(menuRef || "").trim();
      if (!ref) return [];

      const directIdMatches = cartSnapshot
        .map((c, idx) => ({ idx, id: c.menuItemId }))
        .filter((x) => x.id === ref)
        .map((x) => x.idx);
      if (directIdMatches.length > 0) return directIdMatches;

      const catalogId = resolveCatalogMenuItemId(ref);
      if (catalogId) {
        const catalogMatches = cartSnapshot
          .map((c, idx) => ({ idx, id: c.menuItemId }))
          .filter((x) => x.id === catalogId)
          .map((x) => x.idx);
        if (catalogMatches.length > 0) return catalogMatches;
      }

      const byName = findBestCartMatch(ref, cartSnapshot, { allowLoose: true });
      if (!byName) return [];
      return cartSnapshot
        .map((c, idx) => ({ idx, id: c.menuItemId }))
        .filter((x) => x.id === byName.menuItemId)
        .map((x) => x.idx);
    },
    [cartSnapshot, findBestCartMatch, resolveCatalogMenuItemId]
  );

  const getContextualCandidateCatalog = useCallback((): VoiceMenuCatalogItem[] => {
    if (uiMode?.setPickerActive) return menuCatalog;
    const selected = String(selectedCategory || "").toLowerCase();
    const isSingleTab =
      selected.includes("single") || selected.includes("burger") || selected.includes("단품") || selected.includes("버거");
    const isSetTab = selected.includes("set") || selected.includes("세트");
    const isSideTab = selected.includes("side") || selected.includes("사이드");
    const isDrinkTab = selected.includes("drink") || selected.includes("음료");

    if (isSingleTab) {
      const singleOnly = menuCatalog.filter((it) => {
        const c = String(it.category || "").toLowerCase();
        const n = String(it.name || "").toLowerCase();
        const inSingle = c.includes("single") || c.includes("burger") || c.includes("단품") || c.includes("버거");
        const looksSet = c.includes("set") || c.includes("세트") || n.includes("세트");
        return inSingle && !looksSet;
      });
      if (singleOnly.length) return singleOnly;
    }
    if (isSetTab) {
      const setOnly = menuCatalog.filter((it) => {
        const c = String(it.category || "").toLowerCase();
        const n = String(it.name || "").toLowerCase();
        return c.includes("set") || c.includes("세트") || n.includes("세트");
      });
      if (setOnly.length) return setOnly;
    }
    if (isSideTab) {
      const sideOnly = menuCatalog.filter((it) => {
        const c = String(it.category || "").toLowerCase();
        return c.includes("side") || c.includes("사이드");
      });
      if (sideOnly.length) return sideOnly;
    }
    if (isDrinkTab) {
      const drinkOnly = menuCatalog.filter((it) => {
        const c = String(it.category || "").toLowerCase();
        return c.includes("drink") || c.includes("음료");
      });
      if (drinkOnly.length) return drinkOnly;
    }
    return menuCatalog;
  }, [menuCatalog, selectedCategory, uiMode?.setPickerActive]);

  const isSetLikeMenu = useCallback((item?: VoiceMenuCatalogItem | null) => {
    if (!item) return false;
    const name = String(item.name || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    return name.includes("세트") || name.includes("set") || category.includes("세트") || category.includes("set");
  }, []);

  const toSetChoiceBaseName = useCallback(
    (name: string) =>
      normalizeForMatch(name)
        .replace(/세트/g, "")
        .replace(/set/g, "")
        .trim(),
    [normalizeForMatch]
  );

  const findSetSingleVariantPair = useCallback(
    (matched: VoiceMenuCatalogItem | null) => {
      if (!matched) return null;
      const baseName = toSetChoiceBaseName(String(matched.name || ""));
      if (!baseName) return null;

      const siblings = menuCatalog.filter((item) => {
        const itemBase = toSetChoiceBaseName(String(item.name || ""));
        return itemBase && itemBase === baseName;
      });
      if (siblings.length < 2) return null;

      const setVariant = siblings.find((item) => isSetLikeMenu(item)) ?? null;
      const singleVariant = siblings.find((item) => !isSetLikeMenu(item)) ?? null;
      if (!setVariant?.menuItemId || !singleVariant?.menuItemId) return null;
      if (setVariant.menuItemId === singleVariant.menuItemId) return null;

      return {
        setMenuItemId: setVariant.menuItemId,
        singleMenuItemId: singleVariant.menuItemId,
      };
    },
    [isSetLikeMenu, menuCatalog, toSetChoiceBaseName]
  );

  const parseBulkAddRequest = useCallback(
    (text: string): Array<{ menuItemId: string; quantity: number }> => {
      let tt = normalizeTranscript(text);
      // Normalize spoken counts for robust multi-item parsing.
      tt = tt
        .replace(/한\s*개씩|하나씩/gi, "1개")
        .replace(/두\s*개씩|둘씩/gi, "2개")
        .replace(/세\s*개씩|셋씩/gi, "3개")
        .replace(/네\s*개씩|넷씩/gi, "4개")
        .replace(/한\s*개|하나(?![가-힣])/gi, "1개")
        .replace(/두\s*개|둘(?![가-힣])/gi, "2개")
        .replace(/세\s*개|셋(?![가-힣])/gi, "3개")
        .replace(/네\s*개|넷(?![가-힣])/gi, "4개");
      const compact = tt.toLowerCase().replace(/\s+/g, "");
      if (!tt) return [];
      const hasAddIntent =
        compact.includes("담아") ||
        compact.includes("담아줘") ||
        compact.includes("추가") ||
        compact.includes("주문");
      if (
        compact.includes("결제") ||
        (compact.includes("장바구니") && !hasAddIntent) ||
        compact.includes("삭제") ||
        compact.includes("빼") ||
        compact.includes("취소")
      ) {
        return [];
      }

      const catalog = getContextualCandidateCatalog();
      if (!catalog.length) return [];

      const cleanBulkPhrase = (src: string) =>
        String(src || "")
          .replace(/^(그리고|하고|이랑|랑|와|과|및)\s*/g, "")
          .replace(/\s*(그리고|하고|이랑|랑|와|과|및)$/g, "")
          .replace(/(도)?\s*(추가해줘|추가해|추가|담아줘|담아|주문해줘|주문할게|주문)$/g, "")
          .replace(/^(일단|그럼|그러면)\s*/g, "")
          .replace(/\s*(좀|주세요|부탁해요|부탁해)\s*$/g, "")
          .trim();
      const splitSequentialQuantityChunks = (src: string) => {
        const qtyRegex = /(\d+)\s*(개|잔|병|캔|조각|세트)/g;
        const matches = Array.from(src.matchAll(qtyRegex));
        if (matches.length < 2) return [];
        const chunks: string[] = [];
        let start = 0;
        for (const match of matches) {
          const idx = match.index ?? -1;
          if (idx < 0) continue;
          const end = idx + match[0].length;
          const chunk = cleanBulkPhrase(src.slice(start, end).trim());
          if (chunk) chunks.push(chunk);
          start = end;
        }
        const tail = cleanBulkPhrase(src.slice(start).trim());
        if (tail && chunks.length > 0) {
          chunks[chunks.length - 1] = cleanBulkPhrase(`${chunks[chunks.length - 1]} ${tail}`);
        }
        return chunks.filter(Boolean);
      };
      let parts = tt
        .split(/\s*,\s*|\s*(?:그리고|하고|이랑|랑|와|과|및)\s*/g)
        .map((x) => cleanBulkPhrase(x))
        .filter(Boolean);
      if (parts.length < 2) {
        parts = splitSequentialQuantityChunks(tt);
      }
      if (parts.length < 2) return [];

      const byId = new Map<string, number>();
      for (const p of parts) {
        const mQty = p.match(/(\d+)\s*개/);
        const qty = mQty ? Math.max(1, Number(mQty[1] || 1)) : 1;
        const phrase = cleanBulkPhrase(p.replace(/(\d+)\s*개/g, "").trim());
        if (!phrase) continue;
        const matched = findBestMenuCatalogMatch(phrase, catalog, { allowLoose: true, looseThreshold: 3 });
        if (!matched?.menuItemId) continue;
        byId.set(matched.menuItemId, (byId.get(matched.menuItemId) || 0) + qty);
      }
      return Array.from(byId.entries()).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    },
    [findBestMenuCatalogMatch, getContextualCandidateCatalog, normalizeTranscript]
  );

  const parseFastAction = useCallback(
  (t: string): VoiceAction => {
    const tt = normalizeTranscript(t);
    const lower = tt.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    const qty = inferQty(tt);
    const setPickerActive = Boolean(uiMode?.setPickerActive || realtimeSetPickerPendingRef.current);
    const confirmUtterance = compact.replace(/[^\p{L}\p{N}]/gu, "");
    const confirmCore = confirmUtterance.replace(/^(음+|어+|아+|음흠+|흠+|어어+|음음+)+/, "");
    const positiveTokens = [
      "응",
      "네",
      "예",
      "넵",
      "넹",
      "ㅇㅇ",
      "맞아",
      "맞아요",
      "맞습니다",
      "맞지",
      "맞네",
      "그래",
      "그럼",
      "그렇지",
      "좋아",
      "좋아요",
      "좋습니다",
      "오케이",
      "오키",
      "yes",
      "ok",
      "okay",
      "진행",
      "진행해",
      "진행해줘",
      "확인",
      "확인해",
      "확정",
      "맞는것같아",
      "그걸로",
      "그걸로해",
      "그걸로할게",
    ];
    const negativeTokens = [
      "아니",
      "아니요",
      "아냐",
      "아닌데",
      "아닌것같아",
      "ㄴㄴ",
      "노",
      "no",
      "틀렸어",
      "틀렸어요",
      "별로",
      "싫어",
      "싫어요",
      "취소",
      "그만",
      "멈춰",
      "하지마",
      "안해",
      "안할래",
      "바꿔",
      "바꿔줘",
      "바꾸자",
      "바꾸고싶어",
      "다시",
      "다르게",
    ];
    const suggestionNextTokens = [
      "다른거",
      "다른건",
      "다른게",
      "다른메뉴",
      "다른추천메뉴",
      "또다른",
      "또추천",
      "다른추천",
      "더추천",
      "더없어",
      "다른거없어",
      "다른건없어",
      "또없어",
      "또뭐있어",
      "이거말고",
      "그거말고",
      "말고다른거",
    ];
    const hasPositiveCue = positiveTokens.some((tok) => confirmUtterance.includes(tok) || confirmCore.includes(tok));
    const hasNegativeCue = negativeTokens.some((tok) => confirmUtterance.includes(tok) || confirmCore.includes(tok));
    const isExplicitPositive = hasPositiveCue && !hasNegativeCue;
    const isExplicitNegative = hasNegativeCue && !hasPositiveCue;

    if (awaitingSuggestionAccept) {
      const directMenuMatch = findBestMenuCatalogMatch(tt, menuCatalog, { allowLoose: true });
      if (directMenuMatch?.menuItemId) {
        return { type: "ADD_MENU", menuItemId: directMenuMatch.menuItemId, quantity: qty };
      }
      if (suggestionNextTokens.some((tok) => confirmUtterance.includes(tok) || confirmCore.includes(tok))) {
        return { type: "RECOMMEND_MENU" };
      }
      if (isExplicitPositive) return { type: "ACCEPT_SUGGESTION" };
      if (isExplicitNegative) return { type: "ASK_SUGGESTION_CLARIFY" };
      const pickedSuggestion = findBestMenuCatalogMatch(
        tt,
        suggestedMenuCandidates.map((c) => ({ menuItemId: c.menuItemId, name: c.name, category: "", price: 0 })),
        { allowLoose: true, looseThreshold: 4 }
      );
      if (pickedSuggestion?.menuItemId) {
        return { type: "ACCEPT_SUGGESTION_ITEM", menuItemId: pickedSuggestion.menuItemId };
      }
    }

    if (awaitingCheckoutConfirm) {
      if (isExplicitPositive) return { type: "CONFIRM_CHECKOUT" };
      if (isExplicitNegative) return { type: "CANCEL_CHECKOUT" };
    }

    if (pendingOptionConfirm) {
      if (isExplicitPositive) return { type: "CONFIRM_PENDING_OPTION" };
      if (isExplicitNegative) return { type: "REJECT_PENDING_OPTION" };
    }

    if (setPickerActive) {
      const wantsExitSetPicker =
        compact.includes("이거아닌데") ||
        compact.includes("이거아니야") ||
        compact.includes("아니야") ||
        compact.includes("아닌데") ||
        compact.includes("취소할게") ||
        compact.includes("주문취소") ||
        compact.includes("세트취소") ||
        compact.includes("뒤로") ||
        compact.includes("이전");
      if (wantsExitSetPicker) {
        return { type: "CONTINUE_ORDER" };
      }
    }

    // In set picker flow, if side+drink are spoken together, capture both and ask one confirmation.
    if (setPickerActive) {
      const norm = (s: string) => normalizeTranscript(s).toLowerCase().replace(/\s+/g, "");
      const q = norm(tt);
      const sideCatalog = menuCatalog.filter((m) => {
        const c = String(m.category || "").toLowerCase();
        return c.includes("side") || c.includes("사이드");
      });
      const drinkCatalog = menuCatalog.filter((m) => {
        const c = String(m.category || "").toLowerCase();
        return c.includes("drink") || c.includes("음료");
      });
      const fallbackSideCatalog =
        sideCatalog.length > 0
          ? sideCatalog
          : menuCatalog.filter((m) => {
              const n = norm(m.name || "");
              return n.includes("프라이") || n.includes("감자") || n.includes("코울슬로") || n.includes("슬로") || n.includes("샐러드");
            });
      const fallbackDrinkCatalog =
        drinkCatalog.length > 0
          ? drinkCatalog
          : menuCatalog.filter((m) => {
              const n = norm(m.name || "");
              return n.includes("콜라") || n.includes("사이다") || n.includes("쉐이크") || n.includes("커피");
            });
      const pickByContains = (items: VoiceMenuCatalogItem[], phrase: string) => {
        let best: VoiceMenuCatalogItem | null = null;
        let bestLen = -1;
        for (const it of items) {
          const n = norm(it.name || "");
          if (!n) continue;
          if (phrase.includes(n) && n.length > bestLen) {
            best = it;
            bestLen = n.length;
          }
        }
        return best;
      };
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
      const simplifyOptionPhrase = (s: string) =>
        norm(s)
          .replace(/(사이드는|사이드를|사이드|음료는|음료를|음료|그리고|하고|랑|와|과|라지|미디엄|레귤러|스몰|사이즈|으로|로|은|는|이|가|을|를|요|해줘|해주세요|주고|해주고|바꾸고|바꿔|바꿔서|바꿔줘|바꿔주고|변경|변경하고|변경해줘)+/g, "")
          .trim();
      const toOptionComparable = (s: string) =>
        simplifyOptionPhrase(s)
          .replace(/[()]/g, "")
          .replace(/&/g, "")
          .replace(/(라지|미디엄|레귤러|스몰|사이즈|\d+|조각|m|l|r)+/g, "")
          .trim();
      const pickByComparable = (items: VoiceMenuCatalogItem[], phrase: string): VoiceMenuCatalogItem | null => {
        const p = toOptionComparable(phrase);
        if (!p || p.length < 2) return null;
        let best: { item: VoiceMenuCatalogItem; score: number } | null = null;
        for (const it of items) {
          const n = toOptionComparable(String(it.name || ""));
          if (!n) continue;
          let score = -1;
          if (p === n) score = 100;
          else if (p.includes(n) || n.includes(p)) score = Math.min(p.length, n.length);
          if (score > -1 && (!best || score > best.score)) {
            best = { item: it, score };
          }
        }
        return best?.item ?? null;
      };
      const pickByStem = (items: VoiceMenuCatalogItem[], phrase: string): VoiceMenuCatalogItem | null => {
        const p = simplifyOptionPhrase(phrase);
        if (!p || p.length < 2) return null;
        for (const it of items) {
          const nameStem = toOptionComparable(String(it.name || ""));
          if (!nameStem) continue;
          if (p.includes(nameStem) || nameStem.includes(p)) return it;
        }
        return null;
      };
      const pickByFuzzy = (items: VoiceMenuCatalogItem[], phrase: string): VoiceMenuCatalogItem | null => {
        const p = simplifyOptionPhrase(phrase);
        if (!p || p.length < 2) return null;
        let best: { item: VoiceMenuCatalogItem; d: number } | null = null;
        for (const it of items) {
          const n = norm(it.name || "");
          if (!n) continue;
          let d = 9999;
          if (p.includes(n) || n.includes(p)) d = 0;
          else d = levenshtein(p.slice(0, Math.min(40, p.length)), n.slice(0, Math.min(40, n.length)));
          if (!best || d < best.d) best = { item: it, d };
        }
        if (!best) return null;
        if (best.d <= 2) return best.item;
        if (p.length >= 4 && best.d <= 3) return best.item;
        return null;
      };
      const hasDrinkHint = q.includes("음료") || q.includes("콜라") || q.includes("사이다") || q.includes("밀크쉐이크") || q.includes("쉐이크") || q.includes("제로");
      const hasSideHint =
        q.includes("사이드") ||
        q.includes("프라이") ||
        q.includes("감자") ||
        q.includes("코울슬로") ||
        q.includes("갈릭") ||
        q.includes("통다리");
      const isBareSideLead = /^사이드(?:는|요|로|를)?$/.test(q);
      const isBareDrinkLead = /^음료(?:는|요|로|를)?$/.test(q);
      if (isBareSideLead || isBareDrinkLead) {
        return { type: "NONE" };
      }
      const hasBothMarkers = q.includes("사이드") && q.includes("음료");
      const wantsLarge = q.includes("라지") || q.includes("large");
      const wantsMedium = q.includes("미디엄") || q.includes("medium") || q.includes("레귤러");
      const isLargeName = (name: string) => {
        const n = norm(name).replace(/[()]/g, "");
        return n.includes("라지") || /(^|[^a-z])l($|[^a-z])/.test(n) || n.endsWith("l");
      };
      const isMediumName = (name: string) => {
        const n = norm(name).replace(/[()]/g, "");
        return n.includes("미디엄") || n.includes("레귤러") || /(^|[^a-z])(m|r)($|[^a-z])/.test(n) || n.endsWith("m") || n.endsWith("r");
      };
      const pickSizedDrink = (phrase: string) => {
        const p = norm(phrase);
        const hasSpecificDrinkWord =
          p.includes("콜라") ||
          p.includes("사이다") ||
          p.includes("제로") ||
          p.includes("쉐이크") ||
          p.includes("커피") ||
          p.includes("아메리카노") ||
          p.includes("주스");
        const wantsIced = p.includes("아이스") || p.includes("ice");
        const wantsHot = p.includes("핫") || p.includes("hot");
        let pool = fallbackDrinkCatalog;
        if (p.includes("제로") && p.includes("콜라")) {
          pool = fallbackDrinkCatalog.filter((d) => {
            const n = norm(d.name || "");
            return n.includes("제로") && n.includes("콜라");
          });
        } else if (p.includes("콜라")) {
          pool = fallbackDrinkCatalog.filter((d) => norm(d.name || "").includes("콜라"));
        } else if (p.includes("사이다")) {
          pool = fallbackDrinkCatalog.filter((d) => norm(d.name || "").includes("사이다"));
        }
        if (wantsIced) {
          const icedPool = pool.filter((d) => {
            const n = norm(d.name || "");
            return n.includes("아이스") || n.includes("ice");
          });
          if (icedPool.length) pool = icedPool;
        } else if (wantsHot) {
          const hotPool = pool.filter((d) => {
            const n = norm(d.name || "");
            return n.includes("핫") || n.includes("hot");
          });
          if (hotPool.length) pool = hotPool;
        }
        if (!pool.length) pool = fallbackDrinkCatalog;
        if (!hasSpecificDrinkWord && !wantsLarge && !wantsMedium) return null;
        if (wantsLarge) {
          const large = pool.find((d) => isLargeName(d.name || ""));
          if (large) return large;
        }
        if (wantsMedium) {
          const medium = pool.find((d) => isMediumName(d.name || ""));
          if (medium) return medium;
        }
        return pickByContains(pool, p) ?? null;
      };
      if (hasBothMarkers) {
        const sideIdx = q.indexOf("사이드");
        const drinkIdx = q.indexOf("음료");
        const sidePart = sideIdx >= 0 && drinkIdx > sideIdx ? q.slice(sideIdx, drinkIdx) : q;
        const drinkPart = drinkIdx >= 0 ? q.slice(drinkIdx) : q;
        let sidePicked: VoiceMenuCatalogItem | null =
          pickByComparable(fallbackSideCatalog, sidePart) ??
          pickByContains(fallbackSideCatalog, sidePart) ??
          pickByFuzzy(fallbackSideCatalog, sidePart);
        if (!sidePicked) sidePicked = pickByStem(fallbackSideCatalog, sidePart);
        if (!sidePicked) {
          sidePicked = findBestMenuCatalogMatch(sidePart, fallbackSideCatalog, {
            allowLoose: true,
            looseThreshold: 4,
          });
        }
        let drinkPicked: VoiceMenuCatalogItem | null = pickSizedDrink(drinkPart);

        if (!drinkPicked && (drinkPart.includes("제로콜라") || (drinkPart.includes("제로") && drinkPart.includes("콜라")))) {
          drinkPicked =
            fallbackDrinkCatalog.find((d) => {
              const n = norm(d.name || "");
              return n.includes("제로") && n.includes("콜라");
            }) ?? null;
        }
        if (!drinkPicked && drinkPart.includes("콜라")) {
          drinkPicked = fallbackDrinkCatalog.find((d) => norm(d.name || "").includes("콜라")) ?? null;
        }
        if (!drinkPicked && drinkPart.includes("사이다")) {
          drinkPicked = fallbackDrinkCatalog.find((d) => norm(d.name || "").includes("사이다")) ?? null;
        }
        if (!drinkPicked && (drinkPart.includes("밀크쉐이크") || (drinkPart.includes("밀크") && drinkPart.includes("쉐이크")))) {
          drinkPicked =
            fallbackDrinkCatalog.find((d) => {
              const n = norm(d.name || "");
              return n.includes("밀크") && n.includes("쉐이크");
            }) ?? null;
        }
        if (!drinkPicked) {
          drinkPicked = pickByComparable(fallbackDrinkCatalog, drinkPart);
        }
        if (!drinkPicked) {
          drinkPicked = pickByFuzzy(fallbackDrinkCatalog, drinkPart);
        }

        if (sidePicked && drinkPicked) {
          return {
            type: "ASK_CONFIRM_BOTH_OPTIONS",
            sideMenuItemId: sidePicked.menuItemId,
            sideName: sidePicked.name,
            drinkMenuItemId: drinkPicked.menuItemId,
            drinkName: drinkPicked.name,
            quantity: qty,
          };
        }
        // If one side fails due STT noise/typo, still proceed with the matched one
        // instead of dropping to set-option fallback.
        if (sidePicked) {
          return { type: "ADD_MENU", menuItemId: sidePicked.menuItemId, quantity: qty };
        }
        if (drinkPicked) {
          return { type: "ADD_MENU", menuItemId: drinkPicked.menuItemId, quantity: qty };
        }
        return { type: "NONE" };
      }

      // Single-domain utterance while set picker is active.
      if (hasDrinkHint && !hasSideHint) {
        let drinkPicked: VoiceMenuCatalogItem | null = pickSizedDrink(q);
        if (!drinkPicked && (q.includes("제로콜라") || (q.includes("제로") && q.includes("콜라")))) {
          drinkPicked =
            fallbackDrinkCatalog.find((d) => {
              const n = norm(d.name || "");
              return n.includes("제로") && n.includes("콜라");
            }) ?? null;
        }
        if (!drinkPicked && q.includes("콜라")) {
          drinkPicked = fallbackDrinkCatalog.find((d) => norm(d.name || "").includes("콜라")) ?? null;
        }
        if (!drinkPicked && q.includes("사이다")) {
          drinkPicked = fallbackDrinkCatalog.find((d) => norm(d.name || "").includes("사이다")) ?? null;
        }
        if (!drinkPicked) {
          drinkPicked = pickByFuzzy(fallbackDrinkCatalog, q);
        }
        if (!drinkPicked && q === "음료") {
          return { type: "NONE" };
        }
        if (drinkPicked) {
          return { type: "ADD_MENU", menuItemId: drinkPicked.menuItemId, quantity: qty };
        }
        return { type: "NONE" };
      }
      if (hasSideHint && !hasDrinkHint) {
        const sidePicked =
          pickByComparable(fallbackSideCatalog, q) ??
          pickByContains(fallbackSideCatalog, q) ??
          pickByFuzzy(fallbackSideCatalog, q) ??
          pickByStem(fallbackSideCatalog, q) ??
          findBestMenuCatalogMatch(q, fallbackSideCatalog, { allowLoose: true, looseThreshold: 4 });
        if (sidePicked) {
          return { type: "ADD_MENU", menuItemId: sidePicked.menuItemId, quantity: qty };
        }
        return { type: "NONE" };
      }
    }

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

    // Dining type:
    // - do not change dining during set option flow
    // - require a focused short utterance to avoid accidental trigger from noisy transcripts
    const focusedDiningUtterance =
      compact.length <= 14 &&
      !compact.includes("메뉴") &&
      !compact.includes("추천") &&
      !compact.includes("장바구니");
    if (!setPickerActive && !pendingOptionConfirm && focusedDiningUtterance && compact.includes("포장")) {
      return { type: "SET_DINING", diningType: "TAKE_OUT" };
    }
    if (
      !setPickerActive &&
      !pendingOptionConfirm &&
      focusedDiningUtterance &&
      (compact.includes("매장") || compact.includes("매장식사") || compact.includes("여기서") || compact.includes("먹고"))
    ) {
      return { type: "SET_DINING", diningType: "DINE_IN" };
    }

    const hasAddIntent =
      compact.includes("담아") ||
      compact.includes("담아줘") ||
      compact.includes("추가") ||
      compact.includes("주문") ||
      compact.includes("넣어") ||
      compact.includes("넣어줘");

    // Global intents.
    if (
      (compact.includes("장바구니") || compact.includes("주문내역")) &&
      (compact.includes("다없애") ||
        compact.includes("전부삭제") ||
        compact.includes("전체삭제") ||
        compact.includes("다지워") ||
        compact.includes("전부없애"))
    ) {
      return { type: "CLEAR_CART" };
    }
    if (compact.includes("카드") && compact.includes("결제")) return { type: "SELECT_PAYMENT", method: "CARD" };
    if (compact.includes("포인트") && compact.includes("결제")) return { type: "SELECT_PAYMENT", method: "POINT" };
    if ((compact.includes("간편") || compact.includes("삼성페이") || compact.includes("애플페이")) && compact.includes("결제")) {
      return { type: "SELECT_PAYMENT", method: "SIMPLE" };
    }
    if (compact.includes("결제")) return { type: "CHECKOUT" };
    const hasCartNoun =
      compact.includes("장바구니") || compact.includes("상바구니") || compact.includes("청바구니");
    const hasCartQueryIntent =
      compact.includes("보여") ||
      compact.includes("확인") ||
      compact.includes("열어") ||
      compact.includes("봐") ||
      compact.includes("뭐") ||
      compact.includes("무엇") ||
      compact.includes("담겨") ||
      compact.includes("담긴");
    if (hasCartNoun && hasCartQueryIntent && !hasAddIntent && !compact.includes("말고")) {
      return { type: "CHECK_CART" };
    }
    if (compact.includes("직원") || compact.includes("도움")) return { type: "CALL_STAFF" };

    // "방금 담은 메뉴 취소" -> remove last cart item first.
    const hasRecentTarget = compact.includes("방금") || compact.includes("최근") || compact.includes("마지막");
    const hasCancelVerb = compact.includes("취소") || compact.includes("빼") || compact.includes("삭제");
    if (hasRecentTarget && hasCancelVerb) {
      if (cartSnapshot.length > 0) {
        return { type: "REMOVE_MENU_AT", cartIndex: cartSnapshot.length - 1 };
      }
      return { type: "NONE" };
    }
    const hasRemoveIntent =
      hasCancelVerb ||
      compact.includes("없애") ||
      compact.includes("지워") ||
      compact.includes("빼줘");
    if (hasRemoveIntent) {
      const matched = findBestCartMatch(tt, cartSnapshot, { allowLoose: true });
      if (matched) {
        return { type: "REMOVE_MENU", menuItemId: matched.menuItemId };
      }
    }

    // Menu browsing queries.
    const hasRecommendationConstraint =
      compact.includes("알레르기") ||
      compact.includes("알래르기") ||
      compact.includes("알러지") ||
      compact.includes("알레르겐") ||
      compact.includes("없는") ||
      compact.includes("빼고") ||
      compact.includes("제외") ||
      compact.includes("안들어가") ||
      compact.includes("안들어간") ||
      compact.includes("들어가") ||
      compact.includes("들어간") ||
      compact.includes("원재료") ||
      compact.includes("재료") ||
      compact.includes("성분") ||
      compact.includes("포함");
    const hasRecommendationInfoIntent = compact.includes("추천") && hasRecommendationConstraint;
    if (hasRecommendationInfoIntent) {
      // Let AI policy handle recommendation constraints (allergen-free etc.).
      return { type: "NONE" };
    }
    if (isMenuInfoUtterance(tt)) {
      // Menu info Q&A should never be interpreted as cart mutation.
      return { type: "NONE" };
    }

    // Category navigation.
    const hasCategoryNavCue =
      compact.includes("보여") ||
      compact.includes("메뉴") ||
      compact.includes("카테고리") ||
      compact.includes("화면") ||
      compact.includes("안내") ||
      compact.includes("이동");
    if (compact.includes("세트") && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("set") ?? findCategoryKeyByToken("세트") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if ((compact.includes("단품") || compact.includes("버거")) && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("single") ?? findCategoryKeyByToken("burger") ?? findCategoryKeyByToken("단품") ?? findCategoryKeyByToken("버거") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if (compact.includes("치킨") && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("chicken") ?? findCategoryKeyByToken("치킨") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if (compact.includes("버거") && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("burger") ?? findCategoryKeyByToken("버거") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if ((compact.includes("사이드") || compact.includes("감자") || compact.includes("치킨")) && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("side") ?? findCategoryKeyByToken("사이드") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }
    if ((compact.includes("음료") || compact.includes("콜라") || compact.includes("커피")) && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("drink") ?? findCategoryKeyByToken("음료") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }

    // If user starts from drink utterance, route to drink category first.
    // NOTE: when set picker is active, do not navigate category here.
    // Set-option utterances must be resolved as option selections (ADD_MENU) within current picker step.
    const hasDrinkIntent = compact.includes("음료") || compact.includes("콜라") || compact.includes("사이다");
    if (hasDrinkIntent && !setPickerActive && hasCategoryNavCue) {
      const k = findCategoryKeyByToken("drink") ?? findCategoryKeyByToken("음료") ?? null;
      if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
    }

    // Generic browsing queries (must be after specific category routing).
    // Let recommendation requests flow to LLM policy instead of local fast-path.
    // This avoids premature CONTINUE_ORDER -> dining gate responses.
    const wantsAnotherRecommendation =
      compact.includes("다른추천") ||
      (compact.includes("다른") && compact.includes("추천")) ||
      compact.includes("다른추천메뉴") ||
      compact.includes("다른메뉴추천") ||
      compact.includes("또추천") ||
      compact.includes("더추천") ||
      compact.includes("또뭐있") ||
      compact.includes("다른거없어") ||
      compact.includes("다른건없어") ||
      compact.includes("또없어") ||
      compact.includes("이거말고") ||
      compact.includes("그거말고");
    if (wantsAnotherRecommendation && !setPickerActive && !pendingOptionConfirm && !awaitingCheckoutConfirm) {
      return { type: "RECOMMEND_MENU" };
    }
    if (compact.includes("추천")) {
      return { type: "NONE" };
    }
    if (
      compact.includes("뭐있") ||
      compact.includes("뭐가있") ||
      compact.includes("추천") ||
      (compact.includes("메뉴") && (compact.includes("보여") || compact.includes("알려") || compact.includes("뭐")))
    ) {
      return { type: "CONTINUE_ORDER" };
    }

    // Try menu matching.
    const q = normalizeForMatch(tt);
    const qSimple = simplifyForMenuMatch(tt);
    const bareCatalogKeyword = compact.match(/^(세트|단품|버거|치킨|사이드|음료|메뉴)(만|요|좀)?$/);
    if (bareCatalogKeyword && !hasAddIntent) {
      const key = bareCatalogKeyword[1];
      if (key === "세트") {
        const k = findCategoryKeyByToken("set") ?? findCategoryKeyByToken("세트");
        if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
      }
      if (key === "단품" || key === "버거") {
        const k =
          findCategoryKeyByToken("single") ??
          findCategoryKeyByToken("burger") ??
          findCategoryKeyByToken("단품") ??
          findCategoryKeyByToken("버거");
        if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
      }
      if (key === "치킨") {
        const k = findCategoryKeyByToken("chicken") ?? findCategoryKeyByToken("치킨");
        if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
      }
      if (key === "사이드") {
        const k = findCategoryKeyByToken("side") ?? findCategoryKeyByToken("사이드");
        if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
      }
      if (key === "음료") {
        const k = findCategoryKeyByToken("drink") ?? findCategoryKeyByToken("음료");
        if (k) return { type: "NAVIGATE_CATEGORY", categoryKey: k };
      }
      return { type: "CONTINUE_ORDER" };
    }
    const hasQuestionTone =
      compact.includes("왜") || compact.includes("냐") || compact.includes("니") || compact.includes("알아") || compact.includes("뭐야");
    if (hasQuestionTone && (compact.includes("담") || compact.includes("시켰"))) {
      return { type: "CHECK_CART" };
    }

    // While cart/order view is on, do not treat bare menu mentions as ADD_MENU.
    // User should explicitly say add intent words if they really want to add more.
    if (pageHint.showOrderView && !hasAddIntent) {
      return { type: "NONE" };
    }

    const bulkItems = parseBulkAddRequest(tt);
    if (bulkItems.length >= 2) {
      return { type: "ADD_MENU_BULK", items: bulkItems };
    }

    // In set-option flow, restrict matching to the active picker domain first.
    let candidateCatalog = menuCatalog;
    if (setPickerActive) {
      const sideOnly = menuCatalog.filter((it) => {
        const cat = String(it.category || "").toLowerCase();
        return cat.includes("side") || cat.includes("사이드");
      });
      const drinkOnly = menuCatalog.filter((it) => {
        const cat = String(it.category || "").toLowerCase();
        return cat.includes("drink") || cat.includes("음료");
      });
      // Keep active-step preference, but allow both to prevent false NONE -> LLM fallback.
      if (uiMode.setPickerStep === "side") {
        candidateCatalog = [...sideOnly, ...drinkOnly];
      } else {
        candidateCatalog = [...drinkOnly, ...sideOnly];
      }
      if (!candidateCatalog.length) candidateCatalog = menuCatalog;
    } else {
      const selected = String(selectedCategory || "").toLowerCase();
      const isSingleTab = selected.includes("single") || selected.includes("burger") || selected.includes("단품") || selected.includes("버거");
      const isSetTab = selected.includes("set") || selected.includes("세트");
      const isSideTab = selected.includes("side") || selected.includes("사이드");
      const isDrinkTab = selected.includes("drink") || selected.includes("음료");

      if (isSingleTab) {
        const singleOnly = menuCatalog.filter((it) => {
          const c = String(it.category || "").toLowerCase();
          const n = String(it.name || "").toLowerCase();
          const inSingle = c.includes("single") || c.includes("burger") || c.includes("단품") || c.includes("버거");
          const looksSet = c.includes("set") || c.includes("세트") || n.includes("세트");
          return inSingle && !looksSet;
        });
        if (singleOnly.length) candidateCatalog = singleOnly;
      } else if (isSetTab) {
        const setOnly = menuCatalog.filter((it) => {
          const c = String(it.category || "").toLowerCase();
          const n = String(it.name || "").toLowerCase();
          return c.includes("set") || c.includes("세트") || n.includes("세트");
        });
        if (setOnly.length) candidateCatalog = setOnly;
      } else if (isSideTab) {
        const sideOnly = menuCatalog.filter((it) => {
          const c = String(it.category || "").toLowerCase();
          return c.includes("side") || c.includes("사이드");
        });
        if (sideOnly.length) candidateCatalog = sideOnly;
      } else if (isDrinkTab) {
        const drinkOnly = menuCatalog.filter((it) => {
          const c = String(it.category || "").toLowerCase();
          return c.includes("drink") || c.includes("음료");
        });
        if (drinkOnly.length) candidateCatalog = drinkOnly;
      }
    }

    const best = findBestMenuCatalogMatch(tt, candidateCatalog, { allowLoose: hasAddIntent });
    if (best) {
      const explicitSetChoice =
        compact.includes("세트") ||
        compact.includes("단품") ||
        compact.includes("버거만") ||
        compact.includes("세트로") ||
        compact.includes("단품으로");
      if (!setPickerActive && !pendingOptionConfirm && !awaitingCheckoutConfirm && !explicitSetChoice) {
        const variantPair = findSetSingleVariantPair(best);
        if (variantPair) {
          return {
            type: "ASK_SET_OR_SINGLE",
            singleMenuItemId: variantPair.singleMenuItemId,
            setMenuItemId: variantPair.setMenuItemId,
            quantity: qty,
          };
        }
      }
      return { type: "ADD_MENU", menuItemId: best.menuItemId, quantity: qty };
    }

    return { type: "NONE" };
  },
  [
    awaitingCheckoutConfirm,
    awaitingSuggestionAccept,
    cartSnapshot,
    findBestCartMatch,
    findBestMenuCatalogMatch,
    findCategoryKeyByToken,
    inferQty,
    menuCatalog,
    normalizeForMatch,
    normalizeTranscript,
    pendingOptionConfirm,
    pendingSetChoice,
    simplifyForMenuMatch,
    suggestedMenuCandidates,
    selectedCategory,
    isMenuInfoUtterance,
    findSetSingleVariantPair,
    uiMode?.setPickerActive,
    uiMode?.setPickerStep,
  ]
);

const isOrderDomainUtterance = useCallback(
  (t: string) => {
    const tt = normalizeTranscript(t);
    const lower = tt.toLowerCase();
    const compact = lower.replace(/\s+/g, "");

    // Filter obvious noise.
    if (NOISE_TRANSCRIPT_PATTERNS.some((x) => compact.includes(x.replace(/\s+/g, "")))) return false;

    // While selecting set options, accept short option utterances as in-domain.
    if (uiMode?.setPickerActive || !!pendingSetChoice) {
      const setOptionTokens = [
        "사이드",
        "음료",
        "라지",
        "미디엄",
        "스몰",
        "콜라",
        "제로",
        "사이다",
        "아이스",
        "핫",
        "케첩",
      ];
      if (setOptionTokens.some((x) => compact.includes(x))) return true;
    }

    // Control / intent tokens.
    if (CONTROL_TRANSCRIPT_TOKENS.some((x) => compact.includes(x.toLowerCase().replace(/\s+/g, "")))) return true;
    if (compact.includes("담아") || compact.includes("추가") || compact.includes("주문")) return true;

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

    // Multi-item utterances like "징거버거 하나 타워버거 하나" should stay in-domain
    // even when separators are omitted by STT normalization.
    if (parseBulkAddRequest(tt).length >= 2) return true;

    // Direct menu mention (catalog-based fuzzy matcher shared with action parser).
    if (findBestMenuCatalogMatch(tt, menuCatalog, { allowLoose: true })) return true;

    return false;
  },
  [findBestMenuCatalogMatch, menuCatalog, normalizeTranscript, parseBulkAddRequest, pendingSetChoice, uiMode?.setPickerActive]
);

const isSetOptionDomainUtterance = useCallback(
  (t: string) => {
    const tt = normalizeTranscript(t);
    const compact = tt.toLowerCase().replace(/\s+/g, "");
    if (!compact) return false;

    const yesNoTokens = ["네", "예", "응", "아니", "아니요", "맞아", "맞아요", "틀렸", "바꿔", "다시"];
    if (yesNoTokens.some((x) => compact.includes(x))) return true;

    const optionTokens = [
      "사이드",
      "음료",
      "콜라",
      "제로",
      "사이다",
      "아메리카노",
      "커피",
      "라지",
      "미디엄",
      "스몰",
      "중간",
      "작은",
      "큰",
      "다음",
      "이전",
      "선택",
    ];
    if (optionTokens.some((x) => compact.includes(x))) return true;

    // allow short numeric picks like "1번", "2번"
    if (/^\d{1,2}(번)?$/.test(compact)) return true;
    return false;
  },
  [normalizeTranscript]
);

  const say = useCallback(
    async (
      text: string,
      motion?: MotionCode | null,
      segments?: Array<{ text: string; motion?: string | null }>,
      options?: { forceTts?: boolean }
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

      if (suppressActionSpeechRef.current) {
        const firstMotion = inlineSegments[0]?.motion;
        if (firstMotion) {
          onPlayMotion?.(firstMotion);
          addVoiceLog(`MOTION: ${firstMotion}`);
        }
        return;
      }

      if ((realtimeEnabled || realtimeConnected || realtimeConnecting) && !options?.forceTts) {
        const firstMotion = inlineSegments[0]?.motion;
        if (firstMotion) {
          onPlayMotion?.(firstMotion);
          addVoiceLog(`MOTION: ${firstMotion}`);
        }
        addVoiceLog("TTS SKIPPED: realtime mode active");
        return;
      }

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
        const fetchTtsBlob = async (segText: string): Promise<Blob | null> => {
          const ac = new AbortController();
          const timer = window.setTimeout(() => ac.abort(), 8000);
          try {
            const streamRes = await fetch(`${AI_BASE_URL}/tts/stream`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: segText, language: "ko", voice: "nova", speed: 1.0 }),
              signal: ac.signal,
            });
            if (streamRes.ok) {
              return await streamRes.blob();
            }

            // fallback: legacy base64 endpoint
            const legacyRes = await fetch(`${AI_BASE_URL}/tts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: segText, language: "ko", voice: "nova", speed: 1.0 }),
              signal: ac.signal,
            });
            if (!legacyRes.ok) return null;
            const legacyJson = await legacyRes.json();
            const audioB64 = legacyJson.data?.audioBase64;
            if (!audioB64) return null;
            const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
            return new Blob([bytes], { type: "audio/mpeg" });
          } catch {
            return null;
          } finally {
            window.clearTimeout(timer);
          }
        };

        // Pre-generate TTS for all segments in parallel.
        const preGenerated = inlineSegments.map((seg) => fetchTtsBlob(seg.text));

        for (let idx = 0; idx < inlineSegments.length; idx++) {
          const seg = inlineSegments[idx];
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

          try {
            const audioBlob = await preGenerated[idx];
            if (!audioBlob) {
              addVoiceLog("TTS ERROR: empty audio");
              continue;
            }
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            activeTtsAudioRef.current = audio;
            audio.volume = 1;
            audio.muted = false;
            try {
              const maybeSetSinkId = (audio as any).setSinkId;
              if (selectedOutputDeviceId && typeof maybeSetSinkId === "function") {
                await maybeSetSinkId.call(audio, selectedOutputDeviceId);
              }
            } catch (e: any) {
              addVoiceLog(`AUDIO OUTPUT WARN: ${e?.message || String(e)}`);
            }
            let lipCtx: AudioContext | null = null;
            let lipSrc: MediaElementAudioSourceNode | null = null;
            let lipAnalyser: AnalyserNode | null = null;
            let lipGain: GainNode | null = null;
            let lipData: Uint8Array | null = null;
            let lipRaf: number | null = null;
            const stopLipSync = async () => {
              try {
                if (lipRaf != null) {
                  window.cancelAnimationFrame(lipRaf);
                  lipRaf = null;
                }
              } catch {
                // ignore
              }
              try {
                lipSrc?.disconnect();
                lipAnalyser?.disconnect();
                lipGain?.disconnect();
              } catch {
                // ignore
              }
              (window as any).__AIKIOSK_TTS_MOUTH_OPEN = 0;
              (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = false;
              if (lipCtx) {
                try {
                  await lipCtx.close();
                } catch {
                  // ignore
                }
              }
              lipCtx = null;
              lipSrc = null;
              lipAnalyser = null;
              lipGain = null;
              lipData = null;
            };
            const startLipSync = async () => {
              try {
                const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!Ctx) return;
                const ctx: AudioContext = new Ctx();
                lipCtx = ctx;
                const maybeCtxSetSinkId = (ctx as any).setSinkId;
                if (selectedOutputDeviceId && typeof maybeCtxSetSinkId === "function") {
                  await maybeCtxSetSinkId.call(ctx, selectedOutputDeviceId);
                }
                lipSrc = ctx.createMediaElementSource(audio);
                lipAnalyser = ctx.createAnalyser();
                lipAnalyser.fftSize = 512;
                lipAnalyser.smoothingTimeConstant = 0.65;
                lipGain = ctx.createGain();
                // MediaElementSource is routed through WebAudio graph; keep audible output.
                lipGain.gain.value = 1;
                lipData = new Uint8Array(lipAnalyser.fftSize);
                lipSrc.connect(lipAnalyser);
                lipAnalyser.connect(lipGain);
                lipGain.connect(ctx.destination);
                if (ctx.state === "suspended") {
                  await ctx.resume();
                }
                (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = true;
                const tick = () => {
                  if (!lipAnalyser || !lipData) return;
                  const analyser = lipAnalyser!;
                  const data = lipData!;
                  analyser.getByteTimeDomainData(data as any);
                  let sum = 0;
                  for (let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128;
                    sum += v * v;
                  }
                  const rms = Math.sqrt(sum / data.length);
                  const mouth = Math.max(0, Math.min(1, (rms - 0.004) * 36));
                  (window as any).__AIKIOSK_TTS_MOUTH_OPEN = mouth;
                  lipRaf = window.requestAnimationFrame(tick);
                };
                tick();
              } catch {
                (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = false;
              }
            };
            await new Promise<void>((resolve) => {
              void startLipSync();
              audio.onended = () => resolve();
              audio.onpause = () => resolve();
              audio.onerror = () => resolve();
              void audio.play().catch(() => resolve());
            });
            await stopLipSync();
            if (activeTtsAudioRef.current === audio) {
              activeTtsAudioRef.current = null;
            }
            URL.revokeObjectURL(audioUrl);
          } catch (e: any) {
            addVoiceLog(`TTS ERROR: ${e?.message || String(e)}`);
          }
        }
      } finally {
        setSpeaking(false);
        if (listenResumeTimerRef.current != null) {
          window.clearTimeout(listenResumeTimerRef.current);
          listenResumeTimerRef.current = null;
        }
        if (shouldListenAfterSpeechRef.current && !holdListeningDuringLlmRef.current) {
          listenResumeTimerRef.current = window.setTimeout(() => {
            setListeningEnabled(true);
            listenResumeTimerRef.current = null;
          }, LISTEN_RESUME_DELAY_MS);
        } else {
          setListeningEnabled(false);
        }
      }
    },
    [addVoiceLog, listeningEnabled, onPlayMotion, realtimeConnected, realtimeConnecting, realtimeEnabled, selectedOutputDeviceId, sessionId, ttsEnabled]
  );

  const clearRealtimePlaybackQueue = useCallback(async () => {
    for (const source of realtimePlaybackSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // ignore
      }
      try {
        source.disconnect();
      } catch {
        // ignore
      }
    }
    realtimePlaybackSourcesRef.current = [];
    realtimePlaybackNextTimeRef.current = 0;
    const ctx = realtimePlaybackCtxRef.current;
    if (ctx) {
      try {
        const maybeSetSinkId = (ctx as any).setSinkId;
        if (selectedOutputDeviceId && typeof maybeSetSinkId === "function") {
          await maybeSetSinkId.call(ctx, selectedOutputDeviceId);
        }
      } catch {
        // ignore
      }
    }
  }, [selectedOutputDeviceId]);

  const ensureRealtimePlaybackContext = useCallback(async () => {
    let ctx = realtimePlaybackCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      realtimePlaybackCtxRef.current = ctx;
    }
    try {
      const maybeSetSinkId = (ctx as any).setSinkId;
      if (selectedOutputDeviceId && typeof maybeSetSinkId === "function") {
        await maybeSetSinkId.call(ctx, selectedOutputDeviceId);
      }
    } catch {
      // ignore
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }, [selectedOutputDeviceId]);

  const stopRealtimeLipSync = useCallback(async () => {
    if (realtimeForcedMouthTimerRef.current != null) {
      window.clearTimeout(realtimeForcedMouthTimerRef.current);
      realtimeForcedMouthTimerRef.current = null;
    }
    try {
      if (realtimeLipSyncRafRef.current != null) {
        window.cancelAnimationFrame(realtimeLipSyncRafRef.current);
        realtimeLipSyncRafRef.current = null;
      }
    } catch {
      // ignore
    }
    try {
      realtimeLipSyncSourceRef.current?.disconnect();
      realtimeLipSyncStreamSourceRef.current?.disconnect();
      realtimeLipSyncAnalyserRef.current?.disconnect();
      realtimeLipSyncGainRef.current?.disconnect();
    } catch {
      // ignore
    }
    (window as any).__AIKIOSK_TTS_MOUTH_OPEN = 0;
    (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = false;
    (window as any).__AIKIOSK_RT_FORCE_MOUTH = false;
    if (realtimeLipSyncCtxRef.current) {
      try {
        await realtimeLipSyncCtxRef.current.close();
      } catch {
        // ignore
      }
    }
    realtimeLipSyncSourceRef.current = null;
    realtimeLipSyncStreamSourceRef.current = null;
    realtimeLipSyncAnalyserRef.current = null;
    realtimeLipSyncGainRef.current = null;
    realtimeLipSyncCtxRef.current = null;
  }, []);

  const startRealtimeLipSync = useCallback(
    async (audio: HTMLAudioElement, remoteStream?: MediaStream | null) => {
      await stopRealtimeLipSync();
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx: AudioContext = new Ctx();
        realtimeLipSyncCtxRef.current = ctx;
        const maybeCtxSetSinkId = (ctx as any).setSinkId;
        if (selectedOutputDeviceId && typeof maybeCtxSetSinkId === "function") {
          await maybeCtxSetSinkId.call(ctx, selectedOutputDeviceId);
        }
        const analyser = ctx.createAnalyser();
        const gain = ctx.createGain();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        gain.gain.value = 1;
        if (remoteStream) {
          const src = ctx.createMediaStreamSource(remoteStream);
          src.connect(analyser);
          realtimeLipSyncStreamSourceRef.current = src;
        } else {
          const src = ctx.createMediaElementSource(audio);
          src.connect(analyser);
          analyser.connect(gain);
          gain.connect(ctx.destination);
          realtimeLipSyncSourceRef.current = src;
          realtimeLipSyncGainRef.current = gain;
        }
        realtimeLipSyncAnalyserRef.current = analyser;
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = true;
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          const activeAnalyser = realtimeLipSyncAnalyserRef.current;
          if (!activeAnalyser) return;
          activeAnalyser.getByteTimeDomainData(data as any);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const mouth = Math.max(0, Math.min(1, (rms - 0.004) * 36));
          (window as any).__AIKIOSK_TTS_MOUTH_OPEN = mouth;
          realtimeLipSyncRafRef.current = window.requestAnimationFrame(tick);
        };
        tick();
      } catch {
        (window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE = false;
      }
    },
    [selectedOutputDeviceId, stopRealtimeLipSync]
  );

  const enqueueRealtimeAudioDelta = useCallback(async (audioBase64: string) => {
    const ctx = await ensureRealtimePlaybackContext();
    if (!ctx) return;
    const pcm16 = base64ToInt16(String(audioBase64 || ""));
    if (!pcm16.length) return;
    const buffer = ctx.createBuffer(1, pcm16.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channel[i] = pcm16[i] / 0x8000;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.01, realtimePlaybackNextTimeRef.current || 0);
    source.start(startAt);
    realtimePlaybackNextTimeRef.current = startAt + buffer.duration;
    realtimePlaybackSourcesRef.current.push(source);
    source.onended = () => {
      realtimePlaybackSourcesRef.current = realtimePlaybackSourcesRef.current.filter((item) => item !== source);
    };
  }, [ensureRealtimePlaybackContext]);

  const prepareRecommendationReply = useCallback((): string => {
    const candidates = menuCatalog.filter((m) => m.menuItemId && m.name);
    if (!candidates.length) {
      setAwaitingSuggestionAccept(false);
      setSuggestedMenu(null);
      setSuggestedMenuCandidates([]);
      return "지금 추천할 수 있는 메뉴를 찾지 못했어요. 원하시는 메뉴를 말씀해 주세요.";
    }
    const previous = new Set(recentRecommendedMenuIdsRef.current);
    const preferred = candidates.filter((m) => !previous.has(m.menuItemId));
    const source = preferred.length >= 3 ? preferred : candidates;
    const count = Math.min(3, source.length);
    const start = recommendationCursorRef.current % source.length;
    const picks: typeof source = [];
    for (let i = 0; i < count; i++) {
      picks.push(source[(start + i) % source.length]);
    }
    recommendationCursorRef.current = (start + count) % source.length;
    recentRecommendedMenuIdsRef.current = [
      ...recentRecommendedMenuIdsRef.current,
      ...picks.map((m) => m.menuItemId),
    ].slice(-9);
    setSuggestedMenuCandidates(picks.map((m) => ({ menuItemId: m.menuItemId, name: m.name })));
    setSuggestedMenu({ menuItemId: picks[0].menuItemId, name: picks[0].name });
    setAwaitingSuggestionAccept(true);
    const spoken = picks.map((m) => m.name).join(", ");
    return `좋아요. 다른 추천 메뉴는 ${spoken}예요. 원하시는 메뉴를 말씀해 주세요.`;
  }, [menuCatalog]);

  const applyVoiceAction = useCallback(
    async (action: VoiceAction, options?: VoiceActionExecOptions): Promise<boolean> => {
      if (!action || action.type === "NONE") return false;
      addVoiceLog(`ACTION: ${action.type}`);
      currentActionTypeRef.current = action.type;
      const prevSuppressSpeech = suppressActionSpeechRef.current;
      suppressActionSpeechRef.current = Boolean(options?.skipSpeech);
      try {

      // If dining type isn't chosen yet, gate ordering/navigation and ask first.
      if (
        !diningType &&
        action.type !== "SET_DINING" &&
        (action.type === "CHECKOUT" || action.type === "SELECT_PAYMENT")
      ) {
        setPendingActionAfterDining(action);
        // Show the menu UI even before dining is chosen (user asked for menu-first flow).
        onContinueOrder();
        await say("드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.");
        return true;
      }

      if (action.type === "CONTINUE_ORDER") {
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        setAwaitingRemoveTarget(false);
        setAwaitingReplaceLast(false);
        setAwaitingSuggestionAccept(false);
        setSuggestedMenu(null);
        setSuggestedMenuCandidates([]);
        setPendingSlotClarify(null);
        setPendingOptionConfirm(null);
        if (uiMode?.setPickerActive) {
          onCancelSetPicker?.();
        }
        onContinueOrder();
        const setKey = findCategoryKeyByToken("set") ?? findCategoryKeyByToken("세트");
        if (setKey) onSelectCategory(setKey);
        if (!diningType) {
          await say("드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.");
        } else {
          await say("원하시는 메뉴를 말씀해 주세요.");
        }
        return true;
      }
      if (action.type === "NAVIGATE_CATEGORY" && uiMode?.setPickerActive) {
        onCancelSetPicker?.();
      }
      if (action.type === "RECOMMEND_MENU") {
        await say(prepareRecommendationReply(), "m02");
        return true;
      }
      if (action.type === "ADD_MENU_BULK") {
        if (!action.items.length) return false;
        let added: Array<{ name: string; quantity: number }> = [];
        for (const it of action.items) {
          const meta = menuCatalog.find((m) => m.menuItemId === it.menuItemId);
          const isSetLike =
            !!meta && (String(meta.name || "").includes("세트") || String(meta.category || "").toLowerCase().includes("set"));
          if (isSetLike) continue;
          const ok = await onAddMenu(it.menuItemId, Math.max(1, it.quantity));
          if (ok) {
            added.push({ name: formatMenuNameForTts(meta?.name || "메뉴"), quantity: Math.max(1, it.quantity) });
          }
        }
        if (!added.length) {
          await say("장바구니에 담지 못했어요. 다시 말씀해 주세요.");
          return true;
        }
        const spoken = added
          .slice(0, 4)
          .map((x) => `${x.name}${x.quantity > 1 ? ` ${x.quantity}개` : ""}`)
          .join(", ");
        if (!diningType) {
          onContinueOrder();
          await say(`${spoken}${added.length > 4 ? " 등" : ""}을 장바구니에 담았습니다. 드시고 가시나요, 포장인가요?`);
        } else {
          await say(`${spoken}${added.length > 4 ? " 등" : ""}을 장바구니에 담았습니다. 결제하시겠어요?`);
          setAwaitingCheckoutConfirm(true);
        }
        return true;
      }
      if (action.type === "CLEAR_CART") {
        if (!cartSnapshot.length) {
          await say("장바구니가 이미 비어 있어요.");
          return true;
        }
        for (let i = cartSnapshot.length - 1; i >= 0; i--) {
          await onRemoveAt(i);
        }
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        await say("장바구니를 비웠습니다. 원하시는 메뉴를 다시 말씀해 주세요.");
        return true;
      }

      if (action.type === "SET_DINING") {
        onSetDining(action.diningType);
        await say(action.diningType === "DINE_IN" ? "매장 식사로 설정했습니다." : "포장으로 설정했습니다.");
        return true;
      }
      if (action.type === "CONFIRM_PENDING_OPTION") {
        if (!pendingOptionConfirm) {
          await say("확인할 선택이 없어요. 다시 말씀해 주세요.");
          return true;
        }
        const confirmed = pendingOptionConfirm;
        const setSelectionState = explicitSetSelectionRef.current;
        let ok = false;
        if (confirmed.kind === "BOTH") {
          const sideId = String(confirmed.sideMenuItemId || "");
          const drinkId = String(confirmed.drinkMenuItemId || "");
          if (sideId && drinkId) {
            const okSide = await onAddMenu(sideId, 1);
            const okDrink = okSide ? await onAddMenu(drinkId, 1) : false;
            ok = okSide && okDrink;
          }
        } else {
          ok = await onAddMenu(confirmed.menuItemId, Math.max(1, confirmed.quantity || 1));
        }
        if (!ok) {
          await say("선택한 메뉴를 담지 못했어요. 다시 말씀해 주세요.");
          return true;
        }
        setPendingOptionConfirm(null);
        if (confirmed.kind === "BOTH") {
          explicitSetSelectionRef.current = {
            menuName: String(uiMode?.setMenuName || setSelectionState.menuName || ""),
            sideConfirmed: true,
            drinkConfirmed: true,
          };
          const setMenuSpoken = formatMenuNameForTts(uiMode?.setMenuName || "");
          const summary = setMenuSpoken
            ? `${setMenuSpoken}${setMenuSpoken.includes("세트") ? "" : " 세트"} 구성을 장바구니에 담았습니다.`
            : "선택하신 세트 구성을 장바구니에 담았습니다.";
          if (!diningType) {
            await say(`${summary} 드시고 가시나요, 포장인가요?`);
          } else {
            await say(summary);
            setAwaitingCheckoutConfirm(true);
          }
          return true;
        }
        if (confirmed.kind === "SIDE") {
          explicitSetSelectionRef.current = {
            menuName: String(uiMode?.setMenuName || setSelectionState.menuName || ""),
            sideConfirmed: true,
            drinkConfirmed: setSelectionState.drinkConfirmed,
          };
          if (setSelectionState.drinkConfirmed) {
            const setMenuSpoken = formatMenuNameForTts(uiMode?.setMenuName || "");
            const summary = setMenuSpoken
              ? `${setMenuSpoken}${setMenuSpoken.includes("세트") ? "" : " 세트"} 구성을 장바구니에 담았습니다.`
              : "선택하신 세트 구성을 장바구니에 담았습니다.";
            if (!diningType) {
              await say(`${summary} 드시고 가시나요, 포장인가요?`);
            } else {
              await say(summary);
              setAwaitingCheckoutConfirm(true);
            }
            return true;
          }
          await say(`${formatMenuNameForTts(confirmed.name)} 사이드 맞습니다. 이제 음료를 선택해 주세요.`);
          return true;
        }
        explicitSetSelectionRef.current = {
          menuName: String(uiMode?.setMenuName || setSelectionState.menuName || ""),
          sideConfirmed: setSelectionState.sideConfirmed,
          drinkConfirmed: true,
        };
        if (setSelectionState.sideConfirmed) {
          const setMenuSpoken = formatMenuNameForTts(uiMode?.setMenuName || "");
          const summary = setMenuSpoken
            ? `${setMenuSpoken}${setMenuSpoken.includes("세트") ? "" : " 세트"} 구성을 장바구니에 담았습니다.`
            : "선택하신 세트 구성을 장바구니에 담았습니다.";
          if (!diningType) {
            await say(`${summary} 드시고 가시나요, 포장인가요?`);
          } else {
            await say(summary);
            setAwaitingCheckoutConfirm(true);
          }
          return true;
        }
        await say(`${formatMenuNameForTts(confirmed.name)} 음료 맞습니다. 이제 사이드를 선택해 주세요.`);
        return true;
      }
      if (action.type === "REJECT_PENDING_OPTION") {
        if (!pendingOptionConfirm) {
          await say("다시 선택하실 메뉴를 말씀해 주세요.");
          return true;
        }
        const kind = pendingOptionConfirm.kind;
        setPendingOptionConfirm(null);
        if (kind === "SIDE") {
          await say("그럼 원하시는 사이드를 선택해 주세요.");
        } else if (kind === "DRINK") {
          await say("그럼 원하시는 음료를 선택해 주세요.");
        } else {
          await say("그럼 사이드와 음료를 다시 말씀해 주세요.");
        }
        return true;
      }
      if (action.type === "ASK_CONFIRM_BOTH_OPTIONS") {
        const sideSpoken = formatMenuNameForTts(action.sideName);
        const drinkSpoken = formatMenuNameForTts(action.drinkName);
        onPreviewSetPickerSelection?.({
          sideMenuItemId: action.sideMenuItemId,
          drinkMenuItemId: action.drinkMenuItemId,
        });
        setPendingOptionConfirm({
          kind: "BOTH",
          menuItemId: action.sideMenuItemId,
          name: action.sideName,
          quantity: Math.max(1, action.quantity || 1),
          sideMenuItemId: action.sideMenuItemId,
          sideName: action.sideName,
          drinkMenuItemId: action.drinkMenuItemId,
          drinkName: action.drinkName,
        });
        await say(`사이드는 ${sideSpoken}, 음료는 ${drinkSpoken} 맞으시죠?`);
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
        onContinueOrder();
        onSelectCategory(action.categoryKey);
        if (String(action.categoryKey).toLowerCase().includes("drink")) {
          await say("음료 카테고리로 이동합니다. 사이즈를 고를 수 있는 메뉴는 라지, 미디엄 중에서 선택해 주세요.");
        } else {
          await say("해당 카테고리로 이동합니다.");
        }
        return true;
      }
      if (action.type === "CHECK_CART") {
        onCheckCart();
        if (!cartSnapshot.length) {
          await say("현재 장바구니가 비어 있어요.");
          return true;
        }
        const preview = cartSnapshot
          .slice(0, 4)
          .map((x) => `${x.name}${x.quantity > 1 ? ` ${x.quantity}개` : ""}`)
          .join(", ");
        await say(`현재 장바구니에는 ${preview}${cartSnapshot.length > 4 ? " 등이" : "가"} 담겨 있어요.`);
        return true;
      }
      if (action.type === "CHECKOUT") {
        if (!cartSnapshot.length) {
          await say("장바구니가 비어 있어요. 먼저 메뉴를 담아주세요.");
          return true;
        }
        onCheckCart();
        setPendingCheckoutMethod(null);
        setAwaitingCheckoutConfirm(true);
        const preview = cartSnapshot
          .slice(0, 3)
          .map((x) => `${x.name}${x.quantity > 1 ? ` ${x.quantity}개` : ""}`)
          .join(", ");
        await say(`장바구니는 ${preview}${cartSnapshot.length > 3 ? " 외" : ""}입니다. 아래 메뉴가 맞으신가요?`);
        return true;
      }
      if (action.type === "SELECT_PAYMENT") {
        if (!cartSnapshot.length) {
          await say("장바구니가 비어 있어요. 먼저 메뉴를 담아주세요.");
          return true;
        }
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        const methodKo = action.method === "CARD" ? "카드" : action.method === "POINT" ? "포인트" : "간편";
        await say("알겠습니다. 잠시만 기다려 주세요.", "m20");
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
        onSelectPayment(action.method);
        await say(`${methodKo} 결제를 진행합니다.`);
        return true;
      }
      if (action.type === "CONFIRM_CHECKOUT") {
        if (!awaitingCheckoutConfirm) {
          await say("결제 확인 중인 내용이 없어요. 결제라고 말씀해 주세요.");
          return true;
        }
        setAwaitingCheckoutConfirm(false);
        const method = pendingCheckoutMethod;
        setPendingCheckoutMethod(null);
        if (method) {
          await say("알겠습니다. 잠시만 기다려 주세요.", "m20");
          await new Promise<void>((resolve) => window.setTimeout(resolve, 3000));
          onSelectPayment(method);
          if (method === "CARD") {
            await say("카드 결제를 진행합니다.");
          } else if (method === "POINT") {
            await say("포인트 결제를 진행합니다.");
          } else {
            await say("간편 결제를 진행합니다.");
          }
          return true;
        }
        onCheckout();
        await say("결제 방법을 선택해 주세요.");
        return true;
      }
      if (action.type === "CANCEL_CHECKOUT") {
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        onCheckCart();
        await say("알겠습니다. 결제 진행을 취소하고 장바구니를 다시 보여드릴게요.");
        return true;
      }
      if (action.type === "CALL_STAFF") {
        await onCallStaff();
        await say("직원을 호출했습니다. 잠시만 기다려 주세요.", "m20");
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
        setAwaitingSuggestionAccept(false);
        setSuggestedMenu(null);
        setSuggestedMenuCandidates([]);
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        return applyVoiceAction({
          type: "ADD_MENU",
          menuItemId: suggestedMenu.menuItemId,
          quantity: 1,
        }, options);
      }
      if (action.type === "ACCEPT_SUGGESTION_ITEM") {
        setAwaitingSuggestionAccept(false);
        setSuggestedMenu(null);
        setSuggestedMenuCandidates([]);
        setAwaitingCheckoutConfirm(false);
        setPendingCheckoutMethod(null);
        return applyVoiceAction({
          type: "ADD_MENU",
          menuItemId: action.menuItemId,
          quantity: 1,
        }, options);
      }
      if (action.type === "REMOVE_MENU_AT") {
        if (!cartSnapshot.length) {
          await say("장바구니에 담은 메뉴가 없어요.");
          return true;
        }
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
        setAwaitingSuggestionAccept(false);
        setSuggestedMenu(null);
        setSuggestedMenuCandidates([]);
        const meta = menuCatalog.find((m) => m.menuItemId === action.menuItemId);
        const isSetLike = !!meta && (String(meta.name || "").includes("세트") || String(meta.category || "").toLowerCase().includes("set"));
        const inferCategoryKey = (categoryText: string): string | null => {
          const c = String(categoryText || "").toLowerCase();
          if (c.includes("side") || c.includes("사이드")) return findCategoryKeyByToken("side") ?? findCategoryKeyByToken("사이드");
          if (c.includes("drink") || c.includes("음료")) return findCategoryKeyByToken("drink") ?? findCategoryKeyByToken("음료");
          if (c.includes("burger") || c.includes("single") || c.includes("버거") || c.includes("단품")) {
            return findCategoryKeyByToken("single") ?? findCategoryKeyByToken("burger") ?? findCategoryKeyByToken("버거");
          }
          if (c.includes("set") || c.includes("세트")) return findCategoryKeyByToken("set") ?? findCategoryKeyByToken("세트");
          return null;
        };
        if (uiMode?.setPickerActive) {
          const picked = menuCatalog.find((m) => m.menuItemId === action.menuItemId);
          const name = picked?.name || "선택한 메뉴";
          const pickedCategory = String(picked?.category || "").toLowerCase();
          let kind: "SIDE" | "DRINK";
          if (pickedCategory.includes("drink") || pickedCategory.includes("음료")) {
            kind = "DRINK";
          } else if (pickedCategory.includes("side") || pickedCategory.includes("사이드")) {
            kind = "SIDE";
          } else {
            kind = uiMode.setPickerStep === "side" ? "SIDE" : "DRINK";
          }
          if (pendingOptionConfirm && pendingOptionConfirm.kind !== "BOTH" && pendingOptionConfirm.kind !== kind) {
            if (kind === "SIDE") {
              const sideSpoken = formatMenuNameForTts(name);
              const drinkSpoken = formatMenuNameForTts(pendingOptionConfirm.name);
              onPreviewSetPickerSelection?.({
                sideMenuItemId: action.menuItemId,
                drinkMenuItemId: pendingOptionConfirm.menuItemId,
              });
              setPendingOptionConfirm({
                kind: "BOTH",
                menuItemId: action.menuItemId,
                name,
                quantity: action.quantity,
                sideMenuItemId: action.menuItemId,
                sideName: name,
                drinkMenuItemId: pendingOptionConfirm.menuItemId,
                drinkName: pendingOptionConfirm.name,
              });
              await say(`사이드는 ${sideSpoken}, 음료는 ${drinkSpoken} 맞으시죠?`);
              return true;
            }
            const sideSpoken = formatMenuNameForTts(pendingOptionConfirm.name);
            const drinkSpoken = formatMenuNameForTts(name);
            onPreviewSetPickerSelection?.({
              sideMenuItemId: pendingOptionConfirm.menuItemId,
              drinkMenuItemId: action.menuItemId,
            });
            setPendingOptionConfirm({
              kind: "BOTH",
              menuItemId: pendingOptionConfirm.menuItemId,
              name: pendingOptionConfirm.name,
              quantity: action.quantity,
              sideMenuItemId: pendingOptionConfirm.menuItemId,
              sideName: pendingOptionConfirm.name,
              drinkMenuItemId: action.menuItemId,
              drinkName: name,
            });
            await say(`사이드는 ${sideSpoken}, 음료는 ${drinkSpoken} 맞으시죠?`);
            return true;
          }
          onPreviewSetPickerSelection?.(
            kind === "SIDE" ? { sideMenuItemId: action.menuItemId } : { drinkMenuItemId: action.menuItemId }
          );
          setPendingOptionConfirm({
            kind,
            menuItemId: action.menuItemId,
            name,
            quantity: action.quantity,
          });
          if (kind === "SIDE") {
            await say(`사이드는 ${formatMenuNameForTts(name)} 맞으시죠?`);
          } else {
            await say(`음료는 ${formatMenuNameForTts(name)} 맞으시죠?`);
          }
          return true;
        }
        const ok = await onAddMenu(action.menuItemId, action.quantity);
        if (ok) {
          setPendingSetChoice(null);
          setAwaitingRemoveTarget(false);
          setAwaitingReplaceLast(false);
          const menuSpokenName = formatMenuNameForTts(String(meta?.name || "메뉴"));
          const metaCategory = String(meta?.category || "").toLowerCase();
          const isSingleLike =
            !isSetLike &&
            (metaCategory.includes("single") ||
              metaCategory.includes("burger") ||
              metaCategory.includes("단품") ||
              metaCategory.includes("버거"));
          const spokenItemLabel = isSingleLike ? `${menuSpokenName} 단품` : menuSpokenName;
          if (isSetLike) {
            setAwaitingCheckoutConfirm(false);
            setPendingCheckoutMethod(null);
            await say("사이드 선택 화면으로 이동합니다. 사이드와 음료를 선택해 주세요.");
            return true;
          }
          if (!diningType) {
            setAwaitingCheckoutConfirm(false);
            setPendingCheckoutMethod(null);
            // Keep menu-first flow: after successful add, move to menu view and focus likely category.
            onContinueOrder();
            const inferredCategory = inferCategoryKey(String(meta?.category || ""));
            if (inferredCategory) onSelectCategory(inferredCategory);
            await say(`${spokenItemLabel}을 장바구니에 담았습니다. 드시고 가시나요, 포장인가요?`);
          } else {
            await say(`${spokenItemLabel}을 장바구니에 담았습니다. 결제하시겠어요?`);
            setAwaitingCheckoutConfirm(true);
          }
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
        suppressActionSpeechRef.current = prevSuppressSpeech;
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
      onCancelSetPicker,
      onRemoveAt,
      onRemoveMenu,
      onReplaceLast,
      onSelectCategory,
      onSelectPayment,
      onSetDining,
      pendingSetChoice,
      pendingOptionConfirm,
      pendingCheckoutMethod,
      awaitingCheckoutConfirm,
      say,
      suggestedMenu,
      suggestedMenuCandidates,
      uiMode,
      onPreviewSetPickerSelection,
    ]
  );

  const applyLlmAction = useCallback(
    async (structuredAction: string, actionData: any, options?: VoiceActionExecOptions): Promise<boolean> => {
      const a = String(structuredAction || "NONE").toUpperCase();
      if (a === "NONE") return false;

      if (a === "CALL_STAFF") return applyVoiceAction({ type: "CALL_STAFF" }, options);
      if (a === "CHECK_CART") return applyVoiceAction({ type: "CHECK_CART" }, options);
      if (a === "CHECKOUT") return applyVoiceAction({ type: "CHECKOUT" }, options);
      if (a === "CONTINUE_ORDER") return applyVoiceAction({ type: "CONTINUE_ORDER" }, options);
      if (a === "SET_DINING") {
        const t = String(actionData?.diningType || "").toUpperCase();
        if (t === "DINE_IN" || t === "TAKE_OUT") return applyVoiceAction({ type: "SET_DINING", diningType: t }, options);
      }
      if (a === "NAVIGATE" || a === "NAVIGATE_CATEGORY") {
        const key = String(actionData?.categoryKey || actionData?.categoryId || "");
        if (key) return applyVoiceAction({ type: "NAVIGATE_CATEGORY", categoryKey: key }, options);
      }
      if (a === "ADD_MENU" || a === "ADD_TO_CART") {
        const menuRef = String(actionData?.menuItemId || actionData?.menuName || actionData?.name || "");
        const quantity = Math.max(1, Number(actionData?.quantity || 1));
        const menuItemId = resolveCatalogMenuItemIdInContext(menuRef);
        if (!menuItemId) return false;
        return applyVoiceAction({ type: "ADD_MENU", menuItemId, quantity }, options);
      }
      if (a === "ADD_MENU_BULK" || a === "ADD_TO_CART_BULK") {
        const rawItems = Array.isArray(actionData?.items) ? actionData.items : [];
        const resolved: Array<{ menuItemId: string; quantity: number }> = [];
        for (const it of rawItems) {
          const menuRef = String(it?.menuItemId || it?.menuName || it?.name || "");
          const menuItemId = resolveCatalogMenuItemIdInContext(menuRef);
          if (!menuItemId) continue;
          const quantity = Math.max(1, Number(it?.quantity || 1));
          const prev = resolved.find((x) => x.menuItemId === menuItemId);
          if (prev) prev.quantity += quantity;
          else resolved.push({ menuItemId, quantity });
        }
        if (!resolved.length) return false;
        return applyVoiceAction({ type: "ADD_MENU_BULK", items: resolved }, options);
      }
      if (a === "REMOVE_MENU" || a === "REMOVE_FROM_CART") {
        const menuRef = String(actionData?.menuItemId || actionData?.menuName || actionData?.name || "");
        if (!menuRef) return false;
        const matches = resolveCartIndexesByMenuRef(menuRef);
        if (matches.length > 1) {
          const menuItemId = cartSnapshot[matches[0]]?.menuItemId || "";
          if (!menuItemId) return false;
          return applyVoiceAction({
            type: "ASK_SLOT_CLARIFY",
            kind: "REMOVE_MENU",
            menuItemId,
            candidateIndexes: matches,
          }, options);
        }
        if (matches.length === 1) return applyVoiceAction({ type: "REMOVE_MENU_AT", cartIndex: matches[0] }, options);
        const menuItemId = resolveCatalogMenuItemIdInContext(menuRef);
        if (!menuItemId) return false;
        return applyVoiceAction({ type: "REMOVE_MENU", menuItemId }, options);
      }
      if (a === "CHANGE_QTY") {
        const menuRef = String(actionData?.menuItemId || actionData?.menuName || actionData?.name || "");
        const quantity = Math.max(1, Number(actionData?.quantity || 1));
        if (!menuRef) return false;
        const matches = resolveCartIndexesByMenuRef(menuRef);
        if (matches.length > 1) {
          const menuItemId = cartSnapshot[matches[0]]?.menuItemId || "";
          if (!menuItemId) return false;
          return applyVoiceAction({
            type: "ASK_SLOT_CLARIFY",
            kind: "CHANGE_QTY",
            menuItemId,
            quantity,
            candidateIndexes: matches,
          }, options);
        }
        if (matches.length === 1) return applyVoiceAction({ type: "CHANGE_QTY_AT", cartIndex: matches[0], quantity }, options);
        const menuItemId = resolveCatalogMenuItemIdInContext(menuRef);
        if (!menuItemId) return false;
        return applyVoiceAction({ type: "CHANGE_QTY", menuItemId, quantity }, options);
      }
      if (a === "SELECT_PAYMENT") {
        const method = String(actionData?.method || "").toUpperCase();
        if (method === "CARD" || method === "POINT" || method === "SIMPLE") {
          return applyVoiceAction({ type: "SELECT_PAYMENT", method }, options);
        }
      }
      return false;
    },
    [applyVoiceAction, cartSnapshot, resolveCatalogMenuItemIdInContext, resolveCartIndexesByMenuRef]
  );

  const buildVoiceLlmPayload = useCallback(
    (normalizedText: string) => {
      const userMsg: Msg = { role: "user", content: normalizedText };
      const messages = [...conversationHistory, userMsg].slice(-10);
      const stateMenuCatalog = getContextualCandidateCatalog();
      const paymentStepLower = String(pageHint?.paymentStep || "").toLowerCase();
      const stage =
        paymentStepLower === "select" ||
        paymentStepLower === "point" ||
        paymentStepLower === "processing" ||
        paymentStepLower === "complete"
          ? "PAYMENT"
          : pendingOptionConfirm
            ? pendingOptionConfirm.kind === "SIDE"
              ? "DRINK_SELECTION"
              : pendingOptionConfirm.kind === "DRINK"
                ? "SIDE_SELECTION"
                : "SIDE_SELECTION"
            : uiMode?.setPickerActive
              ? uiMode.setPickerStep === "drink"
                ? "DRINK_SELECTION"
                : "SIDE_SELECTION"
              : awaitingCheckoutConfirm || pageHint?.showOrderView
                ? "ORDER_REVIEW"
                : diningType
                  ? "MAIN_MENU"
                  : "ASK_DINING_TYPE";
      const stateForLlm = {
        stage,
        diningType,
        selectedCategory,
        pageHint,
        uiMode,
        awaitingCheckoutConfirm,
        pendingCheckoutMethod,
        pendingOptionConfirm,
        cartItems: cartSnapshot,
        menuCatalog: (stateMenuCatalog.length ? stateMenuCatalog : menuCatalog).slice(0, 160).map((m) => ({
          ...m,
          allergies: getKfcAllergensForMenuName(String(m.name || "")) || [],
        })),
        live2dMotionCatalog: LIVE2D_MOTION_CATALOG,
        llmInstruction:
          "Return spoken reply text in data.text. The only valid motion ids are idle and m02. If a motion is needed, always return m02 in data.motion. If no motion is needed, return idle or null. If you need mid-sentence motion changes, every segment motion must also be only m02 or idle. Do not include motion tags inside text.",
      };

      return {
        messages,
        body: {
          messages,
          sessionId,
          orderType: diningType,
          context: {
            sessionId,
            kioskState: selectedCategory,
            state: stateForLlm,
          },
        },
      };
    },
    [
      cartSnapshot,
      conversationHistory,
      diningType,
      getContextualCandidateCatalog,
      menuCatalog,
      awaitingCheckoutConfirm,
      pageHint,
      pendingCheckoutMethod,
      pendingOptionConfirm,
      selectedCategory,
      sessionId,
      uiMode,
    ]
  );

  const waitForIceGatheringComplete = useCallback(async (pc: RTCPeerConnection, timeoutMs = 1500) => {
    if (!pc || pc.iceGatheringState === "complete") return;

    await new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        pc.removeEventListener("icegatheringstatechange", handleStateChange);
        window.clearTimeout(timeoutId);
        resolve();
      };

      const handleStateChange = () => {
        if (pc.iceGatheringState === "complete") finish();
      };

      const timeoutId = window.setTimeout(finish, timeoutMs);
      pc.addEventListener("icegatheringstatechange", handleStateChange);
    });
  }, []);

  const sendRealtimeEvent = useCallback((payload: Record<string, any>) => {
    const channel = realtimeDcRef.current;
    if (!channel || channel.readyState !== "open") {
      throw new Error("Realtime data channel is not open.");
    }
    channel.send(JSON.stringify(payload));
  }, []);

  const armRealtimeForcedMouth = useCallback((speech: string, extraMs = 0) => {
    const text = String(speech || "").trim();
    const charCount = text.replace(/\s+/g, "").length;
    const estimatedMs = Math.max(1200, Math.min(7000, charCount * 110 + 900 + extraMs));
    (window as any).__AIKIOSK_RT_FORCE_MOUTH = true;
    if (realtimeForcedMouthTimerRef.current != null) {
      window.clearTimeout(realtimeForcedMouthTimerRef.current);
      realtimeForcedMouthTimerRef.current = null;
    }
    realtimeForcedMouthTimerRef.current = window.setTimeout(() => {
      if (!realtimeResponseActiveRef.current && !(window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE) {
        (window as any).__AIKIOSK_RT_FORCE_MOUTH = false;
        (window as any).__AIKIOSK_TTS_MOUTH_OPEN = 0;
      }
      realtimeForcedMouthTimerRef.current = null;
    }, estimatedMs);
  }, []);

  const requestRealtimeSpeech = useCallback(
    async (
      speech: string,
      motion?: MotionCode | null,
      segments?: Array<{ text: string; motion?: string | null }>
    ) => {
      const exactSpeech = String(speech || "").trim();
      realtimePlannedSpeechRef.current = exactSpeech;
      realtimeAssistantTranscriptRef.current = "";
      if (!exactSpeech) return;
      addVoiceLog(`RT SPEAK PLAN: ${exactSpeech}`);
      setPlanSubtitle(exactSpeech);
      setSubtitle("");
      armRealtimeForcedMouth(exactSpeech);
      if (motion && motion !== "idle") {
        onPlayMotion?.(motion);
        addVoiceLog(`MOTION: ${motion}`);
      } else if (segments?.[0]?.motion) {
        const firstMotion = normalizeMotionId(segments[0].motion);
        if (firstMotion && firstMotion !== "idle") {
          onPlayMotion?.(firstMotion);
          addVoiceLog(`MOTION: ${firstMotion}`);
        }
      }
      try {
        sendRealtimeEvent({
          type: "response.create",
          response: {
            instructions: [
              "Speak exactly and only the following Korean sentence naturally.",
              exactSpeech,
              "Do not add, omit, translate, or summarize anything.",
            ].join("\n"),
          },
        });
      } catch {
        await say(exactSpeech, motion, segments, { forceTts: true });
        setPlanSubtitle(exactSpeech);
        setSubtitle(exactSpeech);
        addVoiceLog(`RT ASSISTANT(FALLBACK): ${exactSpeech}`);
        realtimePlannedSpeechRef.current = "";
      }
    },
    [addVoiceLog, armRealtimeForcedMouth, onPlayMotion, say, sendRealtimeEvent]
  );

  useEffect(() => {
    const step = String(pageHint?.paymentStep || "").toLowerCase();
    if (step !== "complete") {
      lastPaymentCompleteSpokenKeyRef.current = "";
      return;
    }
    const orderNo = pageHint?.paidOrderNumber ?? null;
    const key = `complete:${orderNo == null ? "-" : String(orderNo)}`;
    if (lastPaymentCompleteSpokenKeyRef.current === key) return;
    lastPaymentCompleteSpokenKeyRef.current = key;

    shouldListenAfterSpeechRef.current = false;
    setListeningEnabled(false);

    void (async () => {
      const msg =
        orderNo == null
          ? "결제가 완료되었습니다."
          : `결제가 완료되었습니다. 주문 번호는 ${orderNo}번 입니다.`;
      if (realtimeEnabled && realtimeConnected) {
        onPlayMotion?.("m08");
        setPlanSubtitle(msg);
        addVoiceLog(`RT PAYMENT COMPLETE: ${msg}`);
        try {
          await requestRealtimeSpeech(msg, "m08");
        } catch {
          await say(msg, "m08");
        }
      } else {
        await say(msg, "m08");
      }
      recentRecommendedMenuIdsRef.current = [];
      recommendationCursorRef.current = 0;
      onPaymentCompleteSpoken?.();
    })();
  }, [
    addVoiceLog,
    onPaymentCompleteSpoken,
    onPlayMotion,
    pageHint?.paidOrderNumber,
    pageHint?.paymentStep,
    realtimeConnected,
    realtimeEnabled,
    requestRealtimeSpeech,
    say,
  ]);

  const buildRealtimeSessionUpdate = useCallback(() => {
    const menuPreview = menuCatalog
      .slice(0, 12)
      .map((item) => String(item.name || "").trim())
      .filter(Boolean)
      .join(", ");

    return {
      type: "session.update",
      session: {
        type: "realtime",
        output_modalities: ["audio"],
        instructions: [
          "You are the Korean voice ordering agent for a hamburger kiosk in Korea.",
          "Always speak only in natural Korean. Never reply in English, Chinese, or mixed language unless the customer explicitly asks for another language.",
          "You are not a generic assistant. You are helping a customer place an order at this store.",
          "For any menu question, order request, cart change, dining type request, payment request, or screen/navigation request, use the run_kiosk_order_flow tool.",
          "Do not invent menu names, prices, availability, or kiosk state from memory.",
          "When the tool returns JSON with speech, action, and actionData, treat the speech field as the source of truth for what you should say aloud.",
          "Speak the tool's speech naturally in Korean without reading JSON keys or mentioning tool names.",
          "Keep responses short, cashier-like, and relevant to a hamburger ordering kiosk.",
          menuPreview ? `Current store menu examples: ${menuPreview}` : "",
        ].join("\n"),
        audio: {
          input: {
            transcription: {
              model: "gpt-4o-transcribe",
              language: "ko",
              prompt:
                "한국 햄버거 키오스크 주문 대화입니다. 매장식사, 포장, 세트, 단품, 버거, 사이드, 음료, 장바구니, 결제 같은 단어를 정확히 인식하세요.",
            },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "medium",
              create_response: true,
              interrupt_response: true,
            },
          },
        },
        tools: [
          {
            type: "function",
            name: "run_kiosk_order_flow",
            description:
              "Use the existing kiosk ordering brain to interpret the customer's latest Korean speech and return the next order action and spoken reply.",
            parameters: {
              type: "object",
              properties: {
                userText: {
                  type: "string",
                  description: "The customer's latest spoken Korean request, as close to the original wording as possible.",
                },
              },
              additionalProperties: false,
              required: ["userText"],
            },
          },
        ],
        tool_choice: "auto",
      },
    };
  }, [menuCatalog]);

  const buildRealtimeActionData = useCallback((action: VoiceAction): Record<string, any> => {
    switch (action.type) {
      case "SET_DINING":
        return { diningType: action.diningType };
      case "NAVIGATE_CATEGORY":
        return { categoryKey: action.categoryKey };
      case "ADD_MENU":
        return { menuItemId: action.menuItemId, quantity: action.quantity };
      case "ADD_MENU_BULK":
        return { items: action.items };
      case "ASK_CONFIRM_BOTH_OPTIONS":
        return {
          sideMenuItemId: action.sideMenuItemId,
          sideName: action.sideName,
          drinkMenuItemId: action.drinkMenuItemId,
          drinkName: action.drinkName,
          quantity: action.quantity,
        };
      case "SELECT_PAYMENT":
        return { method: action.method };
      default:
        return {};
    }
  }, []);

  const buildRealtimeFastReply = useCallback(
    (action: VoiceAction): string => {
      if (action.type === "SET_DINING") {
        return action.diningType === "DINE_IN"
          ? "매장 식사로 설정했습니다. 원하시는 메뉴를 말씀해 주세요."
          : "포장으로 설정했습니다. 원하시는 메뉴를 말씀해 주세요.";
      }
      if (action.type === "CONTINUE_ORDER") {
        return diningType
          ? "원하시는 메뉴를 말씀해 주세요."
          : "드시고 가시나요, 포장인가요? 매장 식사 또는 포장이라고 말씀해 주세요.";
      }
      if (action.type === "NAVIGATE_CATEGORY") {
        return "해당 메뉴 화면으로 이동했습니다. 원하시는 메뉴를 말씀해 주세요.";
      }
      if (action.type === "ADD_MENU") {
        const menuMeta = menuCatalog.find((item) => item.menuItemId === action.menuItemId);
        const menuName = formatMenuNameForTts(menuMeta?.name || "메뉴");
        const isSetLike =
          String(menuMeta?.name || "").includes("세트") ||
          String(menuMeta?.name || "").includes("코스") ||
          String(menuMeta?.category || "").toLowerCase().includes("set");
        if (isSetLike) {
          return `${menuName} 선택 화면으로 이동했습니다. 사이드와 음료를 선택해 주세요.`;
        }
        if (uiMode?.setPickerActive) {
          const categoryText = String(menuMeta?.category || "").toLowerCase();
          if (categoryText.includes("side") || categoryText.includes("사이드")) {
            return `사이드는 ${menuName} 맞으시죠?`;
          }
          if (categoryText.includes("drink") || categoryText.includes("음료")) {
            return `음료는 ${menuName} 맞으시죠?`;
          }
        }
        return diningType
          ? `${menuName}을 장바구니에 담았습니다. 결제하시겠어요?`
          : `${menuName}을 장바구니에 담았습니다. 드시고 가시나요, 포장인가요?`;
      }
      if (action.type === "ADD_MENU_BULK") {
        return diningType
          ? "메뉴를 장바구니에 담았습니다. 결제하시겠어요?"
          : "메뉴를 장바구니에 담았습니다. 드시고 가시나요, 포장인가요?";
      }
      if (action.type === "CHECK_CART") {
        return cartSnapshot.length ? "현재 장바구니를 확인해 주세요." : "현재 장바구니가 비어 있어요.";
      }
      if (action.type === "CHECKOUT") {
        return cartSnapshot.length
          ? pageHint?.showOrderView
            ? "장바구니가 맞으시면 네라고 말씀해 주세요. 수정할 메뉴가 있으면 말씀해 주세요."
            : "장바구니를 확인해 주세요. 맞으면 결제를 진행할게요."
          : "장바구니가 비어 있어요. 먼저 메뉴를 담아주세요.";
      }
      if (action.type === "ASK_CONFIRM_BOTH_OPTIONS") {
        const sideName = formatMenuNameForTts(action.sideName);
        const drinkName = formatMenuNameForTts(action.drinkName);
        return `사이드는 ${sideName}, 음료는 ${drinkName} 맞으시죠?`;
      }
      if (action.type === "ASK_SET_OR_SINGLE") {
        return "세트로 드릴까요, 단품으로 드릴까요? 세트 또는 단품이라고 말씀해 주세요.";
      }
      if (action.type === "CONFIRM_PENDING_OPTION") {
        if (!pendingOptionConfirm) {
          return "확인할 선택이 없어요. 다시 말씀해 주세요.";
        }
        const setSelectionState = explicitSetSelectionRef.current;
        const setMenuSpoken = formatMenuNameForTts(uiMode?.setMenuName || "");
        const setSummary = setMenuSpoken
          ? `${setMenuSpoken}${setMenuSpoken.includes("세트") ? "" : " 세트"} 구성을 장바구니에 담았습니다.`
          : "선택하신 세트 구성을 장바구니에 담았습니다.";
        if (pendingOptionConfirm.kind === "BOTH") {
          return !diningType
            ? `${setSummary} 드시고 가시나요, 포장인가요?`
            : setSummary;
        }
        if (pendingOptionConfirm.kind === "SIDE") {
          if (setSelectionState.drinkConfirmed) {
            return !diningType
              ? `${setSummary} 드시고 가시나요, 포장인가요?`
              : setSummary;
          }
          return `${formatMenuNameForTts(pendingOptionConfirm.name)} 사이드 맞습니다. 이제 음료를 선택해 주세요.`;
        }
        if (setSelectionState.sideConfirmed) {
          return !diningType
            ? `${setSummary} 드시고 가시나요, 포장인가요?`
            : setSummary;
        }
        return `${formatMenuNameForTts(pendingOptionConfirm.name)} 음료 맞습니다. 이제 사이드를 선택해 주세요.`;
      }
      if (action.type === "REJECT_PENDING_OPTION") {
        if (!pendingOptionConfirm) {
          return "다시 선택하실 메뉴를 말씀해 주세요.";
        }
        if (pendingOptionConfirm.kind === "SIDE") {
          return "그럼 원하시는 사이드를 선택해 주세요.";
        }
        if (pendingOptionConfirm.kind === "DRINK") {
          return "그럼 원하시는 음료를 선택해 주세요.";
        }
        return "그럼 사이드와 음료를 다시 말씀해 주세요.";
      }
      if (action.type === "CONFIRM_CHECKOUT") {
        if (!awaitingCheckoutConfirm) {
          return "결제 확인 중인 내용이 없어요. 결제라고 말씀해 주세요.";
        }
        if (pendingCheckoutMethod === "CARD") return "카드 결제를 진행합니다.";
        if (pendingCheckoutMethod === "POINT") return "포인트 결제를 진행합니다.";
        if (pendingCheckoutMethod === "SIMPLE") return "간편 결제를 진행합니다.";
        return "결제 방법을 선택해 주세요.";
      }
      if (action.type === "CANCEL_CHECKOUT") {
        return "알겠습니다. 결제 진행을 취소하고 장바구니를 다시 보여드릴게요.";
      }
      if (action.type === "SELECT_PAYMENT") {
        return action.method === "CARD"
          ? "카드 결제를 진행합니다."
          : action.method === "POINT"
            ? "포인트 결제를 진행합니다."
            : "간편 결제를 진행합니다.";
      }
      if (action.type === "CALL_STAFF") {
        return "직원을 호출했습니다. 잠시만 기다려 주세요.";
      }
      return "원하시는 메뉴를 다시 말씀해 주세요.";
    },
    [
      cartSnapshot.length,
      diningType,
      menuCatalog,
      awaitingCheckoutConfirm,
      pageHint?.showOrderView,
      pendingCheckoutMethod,
      pendingOptionConfirm,
      uiMode?.setDrinkMenuItemId,
      uiMode?.setMenuName,
      uiMode?.setPickerActive,
      uiMode?.setSideMenuItemId,
    ]
  );

  const buildRealtimeSmallTalkReply = useCallback(
    (normalizedText: string): string | null => {
      const compact = normalizeTranscript(normalizedText).toLowerCase().replace(/\s+/g, "");
      if (compact.includes("안녕")) {
        return diningType
          ? "안녕하세요. 원하시는 메뉴를 말씀해 주세요."
          : "안녕하세요. 매장 식사이신가요, 포장이신가요?";
      }
      if (compact.includes("누구") || compact.includes("뭐하는")) {
        return diningType
          ? "저는 주문 도와드리는 AI 키오스크예요. 원하시는 메뉴를 말씀해 주세요."
          : "저는 주문 도와드리는 AI 키오스크예요. 매장 식사이신가요, 포장이신가요?";
      }
      return null;
    },
    [diningType, normalizeTranscript]
  );

  const parseRealtimeSetOptionAction = useCallback(
    (normalizedText: string): { action: VoiceAction; speech: string } | null => {
      const setPickerActive = Boolean(uiMode?.setPickerActive);
      const pendingSetPicker = Boolean(realtimeSetPickerPendingRef.current);
      if (!(setPickerActive || pendingSetPicker)) {
        addVoiceLog(`RT SET OPTION SKIP: inactive | ui=${setPickerActive ? "1" : "0"} pending=${pendingSetPicker ? "1" : "0"} | text=${normalizedText}`);
        return null;
      }

      const compact = normalizeTranscript(normalizedText).toLowerCase().replace(/\s+/g, "");
      const sideCatalog = menuCatalog.filter((item) => String(item.category || "").toLowerCase().includes("side"));
      const drinkCatalog = menuCatalog.filter((item) => String(item.category || "").toLowerCase().includes("drink"));

      const normalizeOptionKey = (value: string) =>
        String(value || "")
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[()]/g, "")
          .replace(/(라지|미디엄|레귤러|스몰|사이즈)/g, "")
          .replace(/(\d+조각|\d+개|\d+)/g, "")
          .replace(/조각/g, "")
          .replace(/치킨안심텐더/g, "치킨텐더")
          .replace(/치킨안심/g, "치킨텐더")
          .replace(/([mlr])$/g, "");

      const sidePart =
        compact.includes("음료") && compact.includes("사이드")
          ? compact.slice(compact.indexOf("사이드"), compact.indexOf("음료"))
          : compact;
      const drinkPart =
        compact.includes("음료")
          ? compact.slice(compact.indexOf("음료"))
          : compact;

      addVoiceLog(
        `RT SET OPTION STATE: ui=${setPickerActive ? "1" : "0"} pending=${pendingSetPicker ? "1" : "0"} compact=${compact} sidePart=${sidePart} drinkPart=${drinkPart}`
      );

      const findOption = (items: VoiceMenuCatalogItem[], phrase: string) => {
        let best: VoiceMenuCatalogItem | null = null;
        let bestLen = -1;
        const normalizedPhrase = normalizeOptionKey(phrase)
          .replace(/(사이드는|사이드를|사이드|음료는|음료를|음료|그리고|이랑|랑|와|과|으로|은|는|이|가|을|를|해주세요|해줘|해주고|주고)/g, "");
        addVoiceLog(`RT SET OPTION PHRASE: ${normalizedPhrase || "(empty)"}`);
        for (const item of items) {
          const key = normalizeOptionKey(item.name || "");
          if (!key) continue;
          if (
            normalizedPhrase.includes(key) ||
            key.includes(normalizedPhrase) ||
            normalizedPhrase.includes(key.replace(/(콜라|사이다|텐더|후라이|치즈스틱)/g, "$1"))
          ) {
            best = item;
            bestLen = key.length;
          }
        }
        return best;
      };

      const side = findOption(sideCatalog, sidePart);
      const drink = findOption(drinkCatalog, drinkPart);
      addVoiceLog(`RT SET OPTION MATCH: side=${side?.name || "-"} drink=${drink?.name || "-"}`);

      if (side && drink) {
        return {
          action: {
            type: "ASK_CONFIRM_BOTH_OPTIONS",
            sideMenuItemId: side.menuItemId,
            sideName: side.name,
            drinkMenuItemId: drink.menuItemId,
            drinkName: drink.name,
            quantity: 1,
          },
          speech: `사이드는 ${formatMenuNameForTts(side.name)}, 음료는 ${formatMenuNameForTts(drink.name)} 맞으시죠?`,
        };
      }

      if (side) {
        return {
          action: { type: "ADD_MENU", menuItemId: side.menuItemId, quantity: 1 },
          speech: `사이드는 ${formatMenuNameForTts(side.name)} 맞으시죠?`,
        };
      }

      if (drink) {
        return {
          action: { type: "ADD_MENU", menuItemId: drink.menuItemId, quantity: 1 },
          speech: `음료는 ${formatMenuNameForTts(drink.name)} 맞으시죠?`,
        };
      }

      addVoiceLog(`RT SET OPTION MISS: ${normalizedText} | sideCatalog=${sideCatalog.length} drinkCatalog=${drinkCatalog.length}`);
      return null;
    },
    [addVoiceLog, menuCatalog, normalizeTranscript, uiMode?.setPickerActive]
  );

  const buildRealtimeFlowGuardReply = useCallback((): string | null => {
    const paymentStepLower = String(pageHint?.paymentStep || "").toLowerCase();
    if (pendingOptionConfirm) {
      if (pendingOptionConfirm.kind === "SIDE") return "지금은 사이드 확인 단계예요. 맞으면 네라고 말씀하시거나 음료를 말씀해 주세요.";
      if (pendingOptionConfirm.kind === "DRINK") return "지금은 음료 확인 단계예요. 맞으면 네라고 말씀하시거나 사이드를 말씀해 주세요.";
      return "지금은 세트 옵션 확인 단계예요. 맞으면 네라고 말씀해 주세요.";
    }
    if (uiMode?.setPickerActive) {
      return uiMode.setPickerStep === "drink"
        ? "지금은 음료를 선택하는 단계예요. 원하시는 음료를 말씀해 주세요."
        : "지금은 사이드를 선택하는 단계예요. 원하시는 사이드를 말씀해 주세요.";
    }
    if (awaitingCheckoutConfirm || pageHint?.showOrderView) {
      return "지금은 주문 확인 단계예요. 맞으면 네라고 말씀하시거나 수정할 메뉴를 말씀해 주세요.";
    }
    if (paymentStepLower === "select" || paymentStepLower === "point") {
      return "지금은 결제 수단 선택 단계예요. 카드, 포인트, 간편결제 중에서 말씀해 주세요.";
    }
    return null;
  }, [
    awaitingCheckoutConfirm,
    pageHint?.paymentStep,
    pageHint?.showOrderView,
    pendingOptionConfirm,
    uiMode?.setPickerActive,
    uiMode?.setPickerStep,
  ]);

  const runRealtimeCentralBrain = useCallback(
    async (
      normalizedText: string,
      fallbackSpeech: string
    ): Promise<{ reply: string; action: string; actionData: Record<string, any> } | null> => {
      const { messages, body } = buildVoiceLlmPayload(normalizedText);
      const response = await fetch(AI_V2_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Client-Source": "frontend-v2-realtime",
        },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message || `Realtime tool bridge failed (${response.status})`);
      }

      const reply = String(json.data?.text || json.data?.reply || fallbackSpeech).trim() || fallbackSpeech;
      const structuredAction = String(json.data?.action || "NONE");
      const structuredActionData = json.data?.actionData || {};
      const genericFallbackReply =
        reply === "원하시는 메뉴를 다시 말씀해 주세요." || reply === "죄송해요. 다시 말씀해 주세요.";
      const aiHandled = structuredAction !== "NONE" || !genericFallbackReply;
      if (!aiHandled) {
        return null;
      }

      setConversationHistory([...messages, { role: "assistant", content: reply }]);
      setPlanSubtitle(reply);
      addVoiceLog(`RT CENTRAL ACTION: ${structuredAction}`);
      addVoiceLog(`RT TOOL ACTION: ${structuredAction}`);
      addVoiceLog(`RT TOOL OUT: ${reply}`);
      await applyLlmAction(structuredAction, structuredActionData, { skipSpeech: true });
      return { reply, action: structuredAction, actionData: structuredActionData };
    },
    [AI_V2_CHAT_URL, addVoiceLog, applyLlmAction, buildVoiceLlmPayload]
  );

  const executeRealtimeToolCall = useCallback(
    async (callId: string, userText: string) => {
      const normalizedText = normalizeTranscript(userText);
      const fallbackSpeech = "죄송해요. 주문 내용을 다시 한 번 말씀해 주세요.";

      if (!normalizedText) {
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ speech: fallbackSpeech, action: "NONE", actionData: {} }),
          },
        });
        sendRealtimeEvent({ type: "response.create" });
        return;
      }

      addVoiceLog(`RT TOOL REQ: ${normalizedText}`);
      addVoiceLog(
        `RT TOOL STATE: uiSet=${uiMode?.setPickerActive ? "1" : "0"} pendingSet=${realtimeSetPickerPendingRef.current ? "1" : "0"} dining=${diningType || "-"} cart=${cartSnapshot.length}`
      );
      const hasStructuredUiFlow = Boolean(
        uiMode?.setPickerActive ||
          pendingOptionConfirm ||
          awaitingCheckoutConfirm ||
          pendingCheckoutMethod ||
          pageHint?.showOrderView
      );
      const smallTalkReply = buildRealtimeSmallTalkReply(normalizedText);
      if (smallTalkReply && !hasStructuredUiFlow) {
        setPlanSubtitle(smallTalkReply);
        addVoiceLog("RT SMALLTALK: handled locally");
        addVoiceLog(`RT TOOL ACTION: NONE`);
        addVoiceLog(`RT TOOL OUT: ${smallTalkReply}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ speech: smallTalkReply, action: "NONE", actionData: {} }),
          },
        });
        requestRealtimeSpeech(smallTalkReply);
        return;
      }
      if (smallTalkReply && hasStructuredUiFlow) {
        const guardReply = buildRealtimeFlowGuardReply() || "지금 단계에 맞는 주문 내용을 말씀해 주세요.";
        setPlanSubtitle(guardReply);
        addVoiceLog("RT FLOW GUARD: structured-step");
        addVoiceLog(`RT TOOL ACTION: NONE`);
        addVoiceLog(`RT TOOL OUT: ${guardReply}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ speech: guardReply, action: "NONE", actionData: {} }),
          },
        });
        requestRealtimeSpeech(guardReply);
        return;
      }

      const fastAction = parseFastAction(normalizedText);
      if (fastAction.type === "RECOMMEND_MENU") {
        const fastReply = prepareRecommendationReply();
        setPlanSubtitle(fastReply);
        setConversationHistory((prev) =>
          [...prev, { role: "user", content: normalizedText }, { role: "assistant", content: fastReply }].slice(-10)
        );
        addVoiceLog(`RT FAST ACTION: ${fastAction.type}`);
        addVoiceLog(`RT TOOL ACTION: ${fastAction.type}`);
        addVoiceLog(`RT TOOL OUT: ${fastReply}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({
              speech: fastReply,
              action: fastAction.type,
              actionData: buildRealtimeActionData(fastAction),
            }),
          },
        });
        requestRealtimeSpeech(fastReply, "m02");
        return;
      }

      const shouldPreferCentralBrain = !uiMode?.setPickerActive && !pendingOptionConfirm && !awaitingCheckoutConfirm;
      if (shouldPreferCentralBrain) {
        try {
          const handled = await runRealtimeCentralBrain(normalizedText, fallbackSpeech);
          if (handled) {
            sendRealtimeEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({
                  speech: handled.reply,
                  action: handled.action,
                  actionData: handled.actionData,
                }),
              },
            });
            requestRealtimeSpeech(handled.reply);
            return;
          }
        } catch (error: any) {
          addVoiceLog(`RT CENTRAL ERROR: ${error?.message || String(error)}`);
        }
      }

      if (fastAction.type !== "NONE") {
        if (fastAction.type === "ADD_MENU") {
          const menuMeta = menuCatalog.find((item) => item.menuItemId === fastAction.menuItemId);
          const isSetLike =
            String(menuMeta?.name || "").includes("세트") ||
            String(menuMeta?.name || "").includes("코스") ||
            String(menuMeta?.category || "").toLowerCase().includes("set");
          if (isSetLike) {
            realtimeSetPickerPendingRef.current = true;
            addVoiceLog(`RT SET OPTION ARM: ${menuMeta?.name || fastAction.menuItemId}`);
          }
        }
        const fastReply = buildRealtimeFastReply(fastAction);
        await applyVoiceAction(fastAction, { skipSpeech: true });
        setPlanSubtitle(fastReply);
        setConversationHistory((prev) =>
          [...prev, { role: "user", content: normalizedText }, { role: "assistant", content: fastReply }].slice(-10)
        );
        addVoiceLog(`RT FAST ACTION: ${fastAction.type}`);
        addVoiceLog(`RT TOOL ACTION: ${fastAction.type}`);
        addVoiceLog(`RT TOOL OUT: ${fastReply}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({
              speech: fastReply,
              action: fastAction.type,
              actionData: buildRealtimeActionData(fastAction),
            }),
          },
        });
        requestRealtimeSpeech(fastReply);
        return;
      }

      const setOptionTurn = parseRealtimeSetOptionAction(normalizedText);
      if (setOptionTurn) {
        await applyVoiceAction(setOptionTurn.action, { skipSpeech: true });
        setPlanSubtitle(setOptionTurn.speech);
        addVoiceLog(`RT SET OPTION: ${setOptionTurn.action.type}`);
        addVoiceLog(`RT TOOL ACTION: ${setOptionTurn.action.type}`);
        addVoiceLog(`RT TOOL OUT: ${setOptionTurn.speech}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({
              speech: setOptionTurn.speech,
              action: setOptionTurn.action.type,
              actionData: buildRealtimeActionData(setOptionTurn.action),
            }),
          },
        });
        requestRealtimeSpeech(setOptionTurn.speech);
        return;
      }

      try {
        const handled = await runRealtimeCentralBrain(normalizedText, fallbackSpeech);
        if (!handled) {
          throw new Error("central_brain_returned_none");
        }

        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({
              speech: handled.reply,
              action: handled.action,
              actionData: handled.actionData,
            }),
          },
        });
        requestRealtimeSpeech(handled.reply);
      } catch (error: any) {
        const message = String(error?.message || fallbackSpeech);
        addVoiceLog(`RT TOOL ERROR: ${message}`);
        sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ speech: fallbackSpeech, action: "NONE", actionData: {}, error: message }),
          },
        });
        requestRealtimeSpeech(fallbackSpeech);
      }
    },
    [
      AI_V2_CHAT_URL,
      addVoiceLog,
      applyLlmAction,
      applyVoiceAction,
      buildRealtimeActionData,
      buildRealtimeFastReply,
      buildRealtimeSmallTalkReply,
      parseRealtimeSetOptionAction,
      buildVoiceLlmPayload,
      normalizeTranscript,
      parseFastAction,
      requestRealtimeSpeech,
      sendRealtimeEvent,
    ]
  );

  const handleRealtimeEventPayload = useCallback(
    async (event: Record<string, any>) => {
      const type = String(event?.type || "");
      if (!type) return;

      if (type === "session.created" || type === "session.updated") {
        setRealtimeStatusText(type);
        addVoiceLog(`RT EVENT: ${type}`);
        return;
      }

      if (type === "input_audio_buffer.speech_started") {
        if (activeTtsAudioRef.current) {
          try {
            activeTtsAudioRef.current.pause();
            activeTtsAudioRef.current.currentTime = 0;
          } catch {
            // ignore
          }
          activeTtsAudioRef.current = null;
        }
        void clearRealtimePlaybackQueue();
        if (realtimeResponseActiveRef.current) {
          try {
            sendRealtimeEvent({ type: "response.cancel" });
          } catch {
            // ignore
          }
        }
        setSpeaking(false);
        setRealtimeStatusText("listening");
        return;
      }

      if (type === "input_audio_buffer.speech_stopped") {
        setRealtimeStatusText("thinking");
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = String(event?.transcript || "").trim();
        if (transcript) {
          addVoiceLog(`RT USER: ${transcript}`);
        }
        return;
      }

      if (type === "response.function_call_arguments.done") {
        const callId = String(event?.call_id || "").trim();
        const toolName = String(event?.name || "").trim();
        if (!callId || toolName !== "run_kiosk_order_flow") return;
        if (realtimeHandledCallIdsRef.current.has(callId)) return;
        realtimeHandledCallIdsRef.current.add(callId);
        let userText = "";
        try {
          const parsed = JSON.parse(String(event?.arguments || "{}"));
          userText = String(parsed?.userText || "").trim();
        } catch {
          userText = "";
        }
        await executeRealtimeToolCall(callId, userText);
        return;
      }

      if (type === "response.output_item.done") {
        const item = event?.item;
        if (item?.type !== "function_call") return;
        const callId = String(item?.call_id || "").trim();
        const toolName = String(item?.name || "").trim();
        if (!callId || toolName !== "run_kiosk_order_flow") return;
        if (realtimeHandledCallIdsRef.current.has(callId)) return;
        realtimeHandledCallIdsRef.current.add(callId);
        let userText = "";
        try {
          const parsed = JSON.parse(String(item?.arguments || "{}"));
          userText = String(parsed?.userText || "").trim();
        } catch {
          userText = "";
        }
        await executeRealtimeToolCall(callId, userText);
        return;
      }

      if (type === "kiosk.response") {
        const transcript = String(event?.transcript || "").trim();
        const action = String(event?.action || "NONE").toUpperCase();
        const actionData = event?.actionData && typeof event.actionData === "object" ? event.actionData : {};
        const speech = String(event?.speech || "").trim() || "원하시는 메뉴를 다시 말씀해 주세요.";
        const motion = normalizeMotionId(event?.motion) ?? null;
        const segments = Array.isArray(event?.segments)
          ? event.segments
              .map((seg: any) => ({
                text: String(seg?.text || "").trim(),
                motion: normalizeMotionId(seg?.motion),
              }))
              .filter((seg: { text: string }) => seg.text.length > 0)
          : [];

        addVoiceLog(`RT TOOL REQ: ${transcript || "(empty)"}`);
        addVoiceLog(
          `RT TOOL STATE: uiSet=${uiMode?.setPickerActive ? "1" : "0"} pendingSet=${realtimeSetPickerPendingRef.current ? "1" : "0"} dining=${diningType || "-"} cart=${cartSnapshot.length}`
        );
        await applyLlmAction(action, actionData);
        addVoiceLog(`RT TOOL ACTION: ${action}`);
        addVoiceLog(`RT TOOL OUT: ${speech}`);
        realtimePlannedSpeechRef.current = speech;
        setPlanSubtitle(speech);
        addVoiceLog(`RT SPEAK PLAN: ${speech}`);
        if (motion && motion !== "idle") {
          onPlayMotion?.(motion);
          addVoiceLog(`MOTION: ${motion}`);
        }
        if (segments.length > 0 && !motion) {
          const firstMotion = segments[0]?.motion;
          if (firstMotion && firstMotion !== "idle") {
            onPlayMotion?.(firstMotion);
            addVoiceLog(`MOTION: ${firstMotion}`);
          }
        }
        return;
      }

      if (type === "response.output_audio.delta") {
        const delta = String(event?.delta || "");
        if (delta) {
          realtimeResponseActiveRef.current = true;
          setSpeaking(true);
          if (realtimeWsRef.current) {
            void enqueueRealtimeAudioDelta(delta);
          }
        }
        return;
      }

      if (type === "response.output_audio_transcript.delta" || type === "response.text.delta") {
        const delta = String(event?.delta || "").trimStart();
        if (delta) {
          realtimeAssistantTranscriptRef.current += delta;
          setSubtitle(realtimeAssistantTranscriptRef.current);
        }
        return;
      }

      if (type === "response.output_audio_transcript.done" || type === "response.text.done") {
        const transcript = String(event?.transcript || event?.text || realtimeAssistantTranscriptRef.current || "").trim();
        realtimeAssistantTranscriptRef.current = "";
        if (transcript) {
          const finalSubtitle = transcript || realtimePlannedSpeechRef.current;
          setSubtitle(finalSubtitle);
          addVoiceLog(`RT ASSISTANT: ${finalSubtitle}`);
          realtimePlannedSpeechRef.current = "";
        }
        return;
      }

      if (type === "response.created") {
        realtimeResponseActiveRef.current = true;
        (window as any).__AIKIOSK_RT_FORCE_MOUTH = true;
        setSpeaking(true);
        setRealtimeStatusText("speaking");
        addVoiceLog("RT RESPONSE: started");
        return;
      }

      if (type === "response.done") {
        realtimeResponseActiveRef.current = false;
        setSpeaking(false);
        addVoiceLog("RT RESPONSE: done");
        if (realtimePlannedSpeechRef.current) {
          setPlanSubtitle(realtimePlannedSpeechRef.current);
          setSubtitle(realtimePlannedSpeechRef.current);
          addVoiceLog(`RT ASSISTANT(FALLBACK): ${realtimePlannedSpeechRef.current}`);
          realtimePlannedSpeechRef.current = "";
        }
        setRealtimeStatusText("idle");
        return;
      }

      if (type === "error") {
        const message = String(event?.error?.message || "Realtime 오류").trim();
        if (message === "Cancellation failed: no active response found") {
          return;
        }
        addVoiceLog(`RT ERROR: ${message}`);
        setRealtimeStatusText(message);
      }
    },
    [addVoiceLog, applyLlmAction, cartSnapshot.length, clearRealtimePlaybackQueue, diningType, enqueueRealtimeAudioDelta, executeRealtimeToolCall, onPlayMotion, sendRealtimeEvent, uiMode?.setPickerActive]
  );

  useEffect(() => {
    realtimeEventHandlerRef.current = (event: Record<string, any>) => {
      void handleRealtimeEventPayload(event);
    };
  }, [handleRealtimeEventPayload]);

  const disconnectRealtime = useCallback(
    async (reason?: string) => {
      realtimeAssistantTranscriptRef.current = "";
      realtimePlannedSpeechRef.current = "";
      setPlanSubtitle("");
      realtimeHandledCallIdsRef.current.clear();
      realtimeSetPickerPendingRef.current = false;
      realtimeSentChunkCountRef.current = 0;

      if (activeTtsAudioRef.current) {
        try {
          activeTtsAudioRef.current.pause();
          activeTtsAudioRef.current.currentTime = 0;
        } catch {
          // ignore
        }
        activeTtsAudioRef.current = null;
      }
      if (realtimeMicProcessorRef.current) {
        try {
          realtimeMicProcessorRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      if (realtimeMicSourceRef.current) {
        try {
          realtimeMicSourceRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      if (realtimeMicContextRef.current) {
        try {
          await realtimeMicContextRef.current.close();
        } catch {
          // ignore
        }
      }
      if (realtimeMicStreamRef.current) {
        realtimeMicStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (realtimeStreamRef.current) {
        realtimeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (realtimeDcRef.current) {
        try {
          realtimeDcRef.current.onopen = null;
          realtimeDcRef.current.onclose = null;
          realtimeDcRef.current.onmessage = null;
          realtimeDcRef.current.onerror = null;
          realtimeDcRef.current.close();
        } catch {
          // ignore
        }
      }
      if (realtimePcRef.current) {
        try {
          realtimePcRef.current.ontrack = null;
          realtimePcRef.current.oniceconnectionstatechange = null;
          realtimePcRef.current.close();
        } catch {
          // ignore
        }
      }
      if (realtimeAudioRef.current) {
        try {
          realtimeAudioRef.current.pause();
          realtimeAudioRef.current.srcObject = null;
        } catch {
          // ignore
        }
      }
      if (realtimeWsRef.current) {
        try {
          realtimeWsRef.current.onopen = null;
          realtimeWsRef.current.onclose = null;
          realtimeWsRef.current.onmessage = null;
          realtimeWsRef.current.onerror = null;
          realtimeWsRef.current.close();
        } catch {
          // ignore
        }
      }

      realtimeMicProcessorRef.current = null;
      realtimeMicSourceRef.current = null;
      realtimeMicContextRef.current = null;
      realtimeMicStreamRef.current = null;
      realtimeStreamRef.current = null;
      realtimeDcRef.current = null;
      realtimePcRef.current = null;
      realtimeAudioRef.current = null;
      realtimeWsRef.current = null;
      for (const source of realtimePlaybackSourcesRef.current) {
        try {
          source.stop();
        } catch {
          // ignore
        }
        try {
          source.disconnect();
        } catch {
          // ignore
        }
      }
      realtimePlaybackSourcesRef.current = [];
      realtimePlaybackNextTimeRef.current = 0;
      realtimeResponseActiveRef.current = false;
      (window as any).__AIKIOSK_RT_FORCE_MOUTH = false;
      await stopRealtimeLipSync();
      if (realtimePlaybackCtxRef.current) {
        try {
          await realtimePlaybackCtxRef.current.close();
        } catch {
          // ignore
        }
      }
      realtimePlaybackCtxRef.current = null;
      realtimeConnectInFlightRef.current = false;
      realtimeConnectingRef.current = false;
      if (sessionId && window.__AIKIOSK_RT_AUTO_CONNECT_SESSION__ === sessionId) {
        delete window.__AIKIOSK_RT_AUTO_CONNECT_SESSION__;
      }
      setRealtimeConnected(false);
      setRealtimeConnecting(false);
      setRealtimeStatusText(reason || "idle");
      setSpeaking(false);
    },
    [sessionId]
  );

  const connectRealtime = useCallback(async () => {
    if (realtimeConnectedRef.current || realtimeConnectingRef.current || realtimeConnectInFlightRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection !== "function") {
      setRealtimeStatusText("브라우저가 Realtime 음성을 지원하지 않습니다.");
      return;
    }

    realtimeConnectInFlightRef.current = true;
    realtimeConnectingRef.current = true;
    setRealtimeConnecting(true);
    setRealtimeStatusText("connecting");
    addVoiceLog("RT CONNECT: preparing");

    try {
      const configResponse = await fetch(AI_V2_REALTIME_CONFIG_URL);
      if (configResponse.ok) {
        const configJson = await configResponse.json().catch(() => null);
        const model = String(configJson?.data?.model || "");
        const voice = String(configJson?.data?.voice || "");
        const transport = String(configJson?.data?.transport || "");
        if (model || voice) {
          addVoiceLog(`RT CONFIG: ${model || "unknown"} / ${voice || "default"}`);
        }
        if (transport) {
          addVoiceLog(`RT TRANSPORT: ${transport}`);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const pc = new RTCPeerConnection();
      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudio.playsInline = true;
      try {
        const anyAudio = remoteAudio as HTMLAudioElement & {
          setSinkId?: (deviceId: string) => Promise<void>;
        };
        if (selectedOutputDeviceId && typeof anyAudio.setSinkId === "function") {
          await anyAudio.setSinkId(selectedOutputDeviceId);
        }
      } catch {
        // ignore sink selection failures
      }

      realtimePcRef.current = pc;
      realtimeStreamRef.current = stream;
      realtimeAudioRef.current = remoteAudio;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        remoteAudio.srcObject = remoteStream;
        void remoteAudio.play().catch(() => undefined);
        void startRealtimeLipSync(remoteAudio, remoteStream);
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "closed") {
          void disconnectRealtime(pc.iceConnectionState);
        }
      };

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const channel = pc.createDataChannel("oai-events");
      realtimeDcRef.current = channel;
      channel.onopen = () => {
        setRealtimeConnected(true);
        setRealtimeConnecting(false);
        realtimeConnectedRef.current = true;
        realtimeConnectingRef.current = false;
        setRealtimeStatusText("connected");
        addVoiceLog("RT CONNECTED");
        try {
          channel.send(JSON.stringify(buildRealtimeSessionUpdate()));
        } catch (error: any) {
          addVoiceLog(`RT SEND ERROR: ${error?.message || String(error)}`);
        }
      };
      channel.onclose = () => {
        void disconnectRealtime("disconnected");
      };
      channel.onerror = () => {
        addVoiceLog("RT EVENT ERROR: data-channel");
      };
      channel.onmessage = (messageEvent) => {
        try {
          const event = JSON.parse(String(messageEvent.data || "{}"));
          realtimeEventHandlerRef.current(event);
        } catch {
          addVoiceLog("RT EVENT ERROR: invalid JSON");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      const finalSdp = pc.localDescription?.sdp || offer.sdp || "";
      const response = await fetch(AI_V2_REALTIME_SESSION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          ...(sessionId ? { "X-Session-Id": sessionId } : {}),
        },
        body: finalSdp,
      });
      const responseText = await response.text();
      if (!response.ok) {
        let errorMessage = `Realtime setup failed (${response.status})`;
        try {
          const json = JSON.parse(responseText);
          errorMessage = String(json?.error?.message || json?.message || errorMessage);
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: responseText,
      });
    } catch (error: any) {
      addVoiceLog(`RT CONNECT ERROR: ${error?.message || String(error)}`);
      await disconnectRealtime(error?.message || "connect failed");
    } finally {
      realtimeConnectInFlightRef.current = false;
      if (!realtimeConnectedRef.current) {
        realtimeConnectingRef.current = false;
      }
      setRealtimeConnecting(false);
    }
  }, [
    AI_V2_REALTIME_SESSION_URL,
    AI_V2_REALTIME_CONFIG_URL,
    addVoiceLog,
    buildRealtimeSessionUpdate,
    disconnectRealtime,
    realtimeConnected,
    realtimeConnecting,
    selectedDeviceId,
    selectedOutputDeviceId,
    sessionId,
    sendRealtimeEvent,
    startRealtimeLipSync,
    stopRealtimeLipSync,
    waitForIceGatheringComplete,
  ]);

  useEffect(() => {
    connectRealtimeRef.current = connectRealtime;
  }, [connectRealtime]);

  const doLLM = useCallback(
    async (text: string) => {
      const paymentStepLower = String(pageHint?.paymentStep || "").toLowerCase();
      if (paymentStepLower === "processing" || paymentStepLower === "complete") {
        addVoiceLog(`STT IGNORED: payment-${paymentStepLower}`);
        return;
      }

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
      // Once a real utterance is in flight, never re-run the "voice order starts now" greeting
      // just because dining type changed mid-conversation.
      autoVoiceStartedRef.current = true;

      if (isAbusiveUtterance(normalizedText)) {
        addVoiceLog(`STT ABUSE DETECTED: ${normalizedText}`);
        onPlayMotion?.("m24");
        addVoiceLog("MOTION: m24");
        await say("불편을 드려 죄송합니다. 주문 관련 말씀을 해주시면 바로 도와드릴게요.", "m24");
        return;
      }
      const isInfoQuery = isMenuInfoUtterance(normalizedText);

      // While confirming set options, allow inline correction like
      // "미디엄 말고 라지" without forcing yes/no first.
      if (pendingOptionConfirm && !isInfoQuery) {
        const compact = normalizeTranscript(normalizedText).toLowerCase().replace(/\s+/g, "");
        const incompleteOptionLead =
          /^(그리고)?(음료|사이드)(는|를|로|요)?$/.test(compact) ||
          /^(그리고)?(음료|사이드)만$/.test(compact);
        if (incompleteOptionLead) {
          await say("말씀이 중간에 끊긴 것 같아요. 다시 한 번 말씀해주시겠어요?");
          return;
        }
        const wantsLarge = compact.includes("라지") || compact.includes("large");
        const wantsMedium = compact.includes("미디엄") || compact.includes("medium") || compact.includes("레귤러");
        const hasDrinkCue = compact.includes("음료") || compact.includes("콜라") || compact.includes("사이다") || compact.includes("쉐이크") || compact.includes("제로");
        const hasSideCue = compact.includes("사이드") || compact.includes("프라이") || compact.includes("코울슬로") || compact.includes("갈릭") || compact.includes("통다리");
        const hasCorrectionCue = compact.includes("말고") || compact.includes("아니고") || compact.includes("바꿔") || compact.includes("변경");
        const shouldTryDrinkCorrection =
          (pendingOptionConfirm.kind === "DRINK" || pendingOptionConfirm.kind === "BOTH") &&
          (hasDrinkCue || wantsLarge || wantsMedium || hasCorrectionCue) &&
          !hasSideCue;
        if (shouldTryDrinkCorrection) {
          const norm = (s: string) => normalizeTranscript(s).toLowerCase().replace(/\s+/g, "");
          const isLargeName = (name: string) => {
            const n = norm(name).replace(/[()]/g, "");
            return n.includes("라지") || /(^|[^a-z])l($|[^a-z])/.test(n) || n.endsWith("l");
          };
          const isMediumName = (name: string) => {
            const n = norm(name).replace(/[()]/g, "");
            return n.includes("미디엄") || n.includes("레귤러") || /(^|[^a-z])(m|r)($|[^a-z])/.test(n) || n.endsWith("m") || n.endsWith("r");
          };
          const drinkPoolBase = menuCatalog.filter((m) => {
            const c = String(m.category || "").toLowerCase();
            return c.includes("drink") || c.includes("음료");
          });
          const drinkPool = drinkPoolBase.length
            ? drinkPoolBase
            : menuCatalog.filter((m) => {
                const n = norm(m.name || "");
                return n.includes("콜라") || n.includes("사이다") || n.includes("쉐이크") || n.includes("커피");
              });
          const basePhrase =
            (pendingOptionConfirm.kind === "BOTH" ? pendingOptionConfirm.drinkName : pendingOptionConfirm.name) || normalizedText;
          const base = norm(basePhrase);
          let candidates = drinkPool;
          if (base.includes("제로") && base.includes("콜라")) {
            candidates = drinkPool.filter((d) => {
              const n = norm(d.name || "");
              return n.includes("제로") && n.includes("콜라");
            });
          } else if (base.includes("콜라") || compact.includes("콜라")) {
            candidates = drinkPool.filter((d) => norm(d.name || "").includes("콜라"));
          } else if (base.includes("사이다") || compact.includes("사이다")) {
            candidates = drinkPool.filter((d) => norm(d.name || "").includes("사이다"));
          }
          if (!candidates.length) candidates = drinkPool;
          let selected: VoiceMenuCatalogItem | null = null;
          if (wantsLarge) selected = candidates.find((d) => isLargeName(d.name || "")) ?? null;
          if (!selected && wantsMedium) selected = candidates.find((d) => isMediumName(d.name || "")) ?? null;
          if (!selected) {
            selected = candidates.find((d) => compact.includes(norm(d.name || ""))) ?? null;
          }
          if (selected) {
            onPreviewSetPickerSelection?.(
              pendingOptionConfirm.kind === "BOTH"
                ? {
                    sideMenuItemId: pendingOptionConfirm.sideMenuItemId,
                    drinkMenuItemId: selected.menuItemId,
                  }
                : { drinkMenuItemId: selected.menuItemId }
            );
            setPendingOptionConfirm((prev) => {
              if (!prev) return prev;
              if (prev.kind === "BOTH") {
                return {
                  ...prev,
                  drinkMenuItemId: selected!.menuItemId,
                  drinkName: selected!.name,
                };
              }
              return {
                ...prev,
                menuItemId: selected!.menuItemId,
                name: selected!.name,
              };
            });
            if (pendingOptionConfirm.kind === "BOTH") {
              const sideName = pendingOptionConfirm.sideName || "사이드";
              await say(
                `수정했습니다. 사이드는 ${formatMenuNameForTts(sideName)}, 음료는 ${formatMenuNameForTts(selected.name)} 맞으시죠?`
              );
            } else {
              await say(`수정했습니다. 음료는 ${formatMenuNameForTts(selected.name)} 맞으시죠?`);
            }
            return;
          }
        }
      }

      const inSetOptionFlow = Boolean(uiMode?.setPickerActive || pendingSetChoice);
      if (!inSetOptionFlow && !pendingOptionConfirm) {
        const bulkItems = parseBulkAddRequest(normalizedText);
        if (bulkItems.length >= 2) {
          const bulkHandled = await applyVoiceAction({ type: "ADD_MENU_BULK", items: bulkItems });
          if (bulkHandled) return;
        }
      }

      if (inSetOptionFlow && !pendingOptionConfirm && !isInfoQuery) {
        const compact = normalizeTranscript(normalizedText).toLowerCase().replace(/\s+/g, "");
        const incompleteOptionLead =
          /^(그리고)?(음료|사이드)(는|를|로|요)?$/.test(compact) ||
          /^(그리고)?(음료|사이드)만$/.test(compact);
        if (incompleteOptionLead) {
          await say("말씀이 중간에 끊긴 것 같아요. 다시 한 번 말씀해주시겠어요?");
          return;
        }
      }

      const fastAction = parseFastAction(normalizedText);
      const handled = await applyVoiceAction(fastAction);
      if (handled) return;

      if (awaitingCheckoutConfirm && !isInfoQuery) {
        await say("맞으면 긍정 표현으로, 아니면 부정 표현으로 말씀해 주세요. 예: 맞아요 또는 아니요.");
        return;
      }
      if (pendingOptionConfirm && !isInfoQuery) {
        await say("맞으면 긍정 표현으로, 아니면 부정 표현으로 말씀해 주세요. 예: 맞아요 또는 아니요.");
        return;
      }
      if (inSetOptionFlow && !isInfoQuery && !isSetOptionDomainUtterance(normalizedText)) {
        addVoiceLog(`STT IGNORED: set-option-domain (${normalizedText})`);
        await say("지금은 세트 옵션 선택 단계예요. 사이드나 음료를 말씀해 주세요.");
        return;
      }
      if (inSetOptionFlow && !isInfoQuery) {
        addVoiceLog(`STT IGNORED: set-option-fallback (${normalizedText})`);
        await say("지금은 세트 옵션 선택 단계예요. 사이드와 음료를 먼저 선택해 주세요.");
        return;
      }
      if (!inSetOptionFlow && !isOrderDomainUtterance(normalizedText)) {
        addVoiceLog(`STT IGNORED: out-of-domain (${normalizedText})`);
        void fetch(`${AI_BASE_URL.replace(/\/+$/, "").replace(/\/api\/v1$/i, "/api/v2")}/metrics/out-of-domain-drop`, {
          method: "POST",
        }).catch(() => undefined);
        await say("메뉴 이름이나 '결제', '장바구니'처럼 주문 관련 표현으로 말씀해 주세요.");
        return;
      }
      if (!llmEnabled) {
        await say("지금은 AI 응답 기능이 꺼져 있어요. 메뉴 이름이나 '결제'라고 말씀해 주세요.");
        return;
      }

      try {
        const { messages, body } = buildVoiceLlmPayload(normalizedText);
        addVoiceLog(`LLM REQ: ${messages.length} messages`);
        holdListeningDuringLlmRef.current = true;
        llmRequestInFlightRef.current = true;
        llmWaitPromptTriggeredRef.current = false;
        llmWaitPromptPromiseRef.current = null;
        if (llmWaitPromptTimerRef.current != null) {
          window.clearTimeout(llmWaitPromptTimerRef.current);
          llmWaitPromptTimerRef.current = null;
        }
        addVoiceLog("LLM WAIT: scheduled (2200ms)");
        llmWaitPromptTimerRef.current = window.setTimeout(() => {
          llmWaitPromptTimerRef.current = null;
          if (!llmRequestInFlightRef.current || llmWaitPromptPromiseRef.current) return;
          llmWaitPromptTriggeredRef.current = true;
          llmWaitPromptPromiseRef.current = say("잠시만 기다려 주세요. 확인해보고 있어요.", "m20")
            .catch(() => undefined)
            .then(() => undefined);
        }, 2200);

        const ac = new AbortController();
        const llmTimeout = window.setTimeout(() => ac.abort(), 15000);
        let json: any = null;
        try {
          const res = await fetch(AI_V2_CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-AI-Client-Source": "frontend-v2-voice",
            },
            body: JSON.stringify(body),
            signal: ac.signal,
          });
          if (!res.ok) {
            addVoiceLog(`LLM ERROR: ${res.status} ${res.statusText}`);
            llmRequestInFlightRef.current = false;
            if (llmWaitPromptTimerRef.current != null) {
              window.clearTimeout(llmWaitPromptTimerRef.current);
              llmWaitPromptTimerRef.current = null;
            }
            if (llmWaitPromptPromiseRef.current) {
              await llmWaitPromptPromiseRef.current;
              llmWaitPromptPromiseRef.current = null;
              if (llmWaitPromptTriggeredRef.current) {
                onPlayMotion?.("m01");
                addVoiceLog("MOTION: m01");
                llmWaitPromptTriggeredRef.current = false;
              }
            }
            holdListeningDuringLlmRef.current = false;
            await say("응답이 지연되고 있어요. 다시 한 번 말씀해 주세요.");
            return;
          }
          json = await res.json();
        } finally {
          llmRequestInFlightRef.current = false;
          window.clearTimeout(llmTimeout);
          if (llmWaitPromptTimerRef.current != null) {
            window.clearTimeout(llmWaitPromptTimerRef.current);
            llmWaitPromptTimerRef.current = null;
          }
        }
        if (llmWaitPromptPromiseRef.current) {
          await llmWaitPromptPromiseRef.current;
          llmWaitPromptPromiseRef.current = null;
          if (llmWaitPromptTriggeredRef.current) {
            onPlayMotion?.("m01");
            addVoiceLog("MOTION: m01");
            llmWaitPromptTriggeredRef.current = false;
          }
        }
        holdListeningDuringLlmRef.current = false;
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

        const recommendationCandidates = Array.isArray(structuredActionData?.recommendationCandidates)
          ? (structuredActionData.recommendationCandidates as any[])
              .map((c) => ({
                menuItemId: String(c?.menuItemId || "").trim(),
                name: String(c?.name || "").trim(),
              }))
              .filter((c) => c.menuItemId && c.name)
          : [];
        const intentUpper = String(json.data?.intent || "").toUpperCase();
        const stageUpper = String(json.data?.stage || structuredActionData?.stage || "").toUpperCase();
        const isRecommendationReply =
          recommendationCandidates.length > 0 ||
          intentUpper === "MENU_RECOMMEND" ||
          stageUpper === "RECOMMENDATION";
        if (isRecommendationReply) {
          setAwaitingCheckoutConfirm(false);
          setPendingCheckoutMethod(null);
          setAwaitingSuggestionAccept(recommendationCandidates.length > 0);
          setSuggestedMenuCandidates(recommendationCandidates);
          setSuggestedMenu(recommendationCandidates[0] ?? null);
        }

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
        const msg = (e as any)?.name === "AbortError" ? "timeout" : "request failed";
        addVoiceLog(`LLM ERROR: ${msg}`);
        llmRequestInFlightRef.current = false;
        if (llmWaitPromptTimerRef.current != null) {
          window.clearTimeout(llmWaitPromptTimerRef.current);
          llmWaitPromptTimerRef.current = null;
        }
        if (llmWaitPromptPromiseRef.current) {
          await llmWaitPromptPromiseRef.current;
          llmWaitPromptPromiseRef.current = null;
          if (llmWaitPromptTriggeredRef.current) {
            onPlayMotion?.("m01");
            addVoiceLog("MOTION: m01");
            llmWaitPromptTriggeredRef.current = false;
          }
        }
        holdListeningDuringLlmRef.current = false;
        await say("응답이 지연되고 있어요. 다시 한 번 말씀해 주세요.");
      }
    },
    [
      addVoiceLog,
      applyLlmAction,
      applyVoiceAction,
      buildVoiceLlmPayload,
      isOrderDomainUtterance,
      llmEnabled,
      normalizeTranscript,
      pageHint,
      parseFastAction,
      say,
      sessionId,
      shouldIgnoreTranscript,
      isSetOptionDomainUtterance,
      isAbusiveUtterance,
      uiMode?.setPickerActive,
      pendingSetChoice,
      pendingOptionConfirm,
      awaitingCheckoutConfirm,
      isMenuInfoUtterance,
      parseBulkAddRequest,
      onPreviewSetPickerSelection,
      onPlayMotion,
    ]
  );

  useEffect(() => {
    if (!realtimeEnabled && (realtimeConnected || realtimeConnecting)) {
      void disconnectRealtime("realtime off");
    }
  }, [disconnectRealtime, realtimeConnected, realtimeConnecting, realtimeEnabled]);

  useEffect(() => {
    if (!realtimeEnabled) return;
    if (realtimeConnected || realtimeConnecting) return;
    if (!sessionId) return;
    if (window.__AIKIOSK_RT_AUTO_CONNECT_SESSION__ === sessionId) return;
    window.__AIKIOSK_RT_AUTO_CONNECT_SESSION__ = sessionId;
    void connectRealtime();
  }, [connectRealtime, realtimeConnected, realtimeConnecting, realtimeEnabled, sessionId]);

  useEffect(() => {
    if (uiMode?.setPickerActive) {
      addVoiceLog("RT SET OPTION UI: active");
      realtimeSetPickerPendingRef.current = false;
    }
  }, [addVoiceLog, uiMode?.setPickerActive]);

  useEffect(() => {
    if (realtimeEnabled && ttsEnabled) {
      setTtsEnabled(false);
    }
  }, [realtimeEnabled, ttsEnabled]);

  useEffect(() => {
    return () => {
      void disconnectRealtime();
    };
  }, [disconnectRealtime]);

  useEffect(() => {
    const currentMenuName = String(uiMode?.setMenuName || "");
    if (!uiMode?.setPickerActive) {
      explicitSetSelectionRef.current = { menuName: "", sideConfirmed: false, drinkConfirmed: false };
      return;
    }
    if (currentMenuName !== explicitSetSelectionRef.current.menuName) {
      explicitSetSelectionRef.current = {
        menuName: currentMenuName,
        sideConfirmed: false,
        drinkConfirmed: false,
      };
    }
  }, [uiMode?.setMenuName, uiMode?.setPickerActive]);

  useMicStreamer({
    enabled: listeningEnabled && sttEnabled && !realtimeEnabled,
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
    minSpeechMs: 500,
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
    if (hesitationTimerRef.current != null) {
      window.clearTimeout(hesitationTimerRef.current);
      hesitationTimerRef.current = null;
    }
    if (listenResumeTimerRef.current != null) {
      window.clearTimeout(listenResumeTimerRef.current);
      listenResumeTimerRef.current = null;
    }
    recentRecommendedMenuIdsRef.current = [];
    recommendationCursorRef.current = 0;
    addVoiceLog(`VOICE START: mic=${selectedDeviceId || "default"} out=${selectedOutputDeviceId || "default"}`);
    shouldListenAfterSpeechRef.current = true;
    // Prevent the "auto voice start on diningType set" effect from firing again after a manual start.
    autoVoiceStartedRef.current = true;

    if (realtimeEnabled) {
      shouldListenAfterSpeechRef.current = false;
      setListeningEnabled(true);
      await connectRealtime();
      return;
    }

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
  }, [addVoiceLog, connectRealtime, diningType, pingAiServer, realtimeEnabled, say, selectedDeviceId, selectedOutputDeviceId]);

  const handleVoiceStop = useCallback(() => {
    addVoiceLog("VOICE STOP");
    shouldListenAfterSpeechRef.current = false;
    if (listenResumeTimerRef.current != null) {
      window.clearTimeout(listenResumeTimerRef.current);
      listenResumeTimerRef.current = null;
    }
    if (realtimeEnabled) {
      void disconnectRealtime("stopped");
    }
    setListeningEnabled(false);
  }, [addVoiceLog, disconnectRealtime, realtimeEnabled]);

  useEffect(() => {
    if (!sessionId) return;
    if (!diningType) return;
    if (speaking || listeningEnabled) return;
    if (autoVoiceStartedRef.current) return;
    autoVoiceStartedRef.current = true;
    void handleVoiceStart();
  }, [diningType, handleVoiceStart, listeningEnabled, sessionId, speaking]);

  // After dining type is chosen, resume a pending action (e.g., user already said a menu name).
  useEffect(() => {
    if (!diningType) return;
    if (!pendingActionAfterDining) return;
    const act = pendingActionAfterDining;
    setPendingActionAfterDining(null);
    void applyVoiceAction(act);
  }, [applyVoiceAction, diningType, pendingActionAfterDining]);

  const triggerHesitationAssist = useCallback(
    async (score: number) => {
      const inSetOptionFlow = Boolean(uiMode?.setPickerActive || pendingSetChoice || pendingOptionConfirm);
      if (inSetOptionFlow) return;
    if (hesitationAssistConsumed || hesitationAssistLockedRef.current) return;
      hesitationAssistLockedRef.current = true;

      const pickMenus = menuCatalog.slice(0, 3).filter((m) => m.menuItemId && m.name);
      const picks = pickMenus.map((m) => m.name).filter(Boolean);
      const fallback = `뭘 고를지 고민되시나요? 오늘의 추천 메뉴는 ${picks.join(", ") || "대표 메뉴"}예요.`;

      let speech = fallback;
      if (llmEnabled && sessionId) {
        try {
          // LangGraph should decide proactive speech from hesitation state.
          const messages = [...conversationHistory, { role: "user" as const, content: "" }].slice(-10);
          const stateForLlm = {
            diningType,
            selectedCategory,
            pageHint,
            cartItems: cartSnapshot,
            menuCatalog: menuCatalog.slice(0, 120),
            reason: "hesitation_assist",
            isHesitating: true,
            hesitationScore: Number(score || 0),
            hesitationDurationMs: 2000,
          };
          const res = await fetch(AI_V2_CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-AI-Client-Source": "frontend-v2-hesitation",
            },
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
          if (res.ok) {
            const json = await res.json();
            const reply = String(json?.data?.text || json?.data?.reply || "").trim();
            if (reply) {
              speech = reply;
              setConversationHistory([...messages, { role: "assistant", content: reply }]);
            }
          } else {
            addVoiceLog(`HESITATION LLM WARN: ${res.status} ${res.statusText}`);
          }
        } catch (e: any) {
          addVoiceLog(`HESITATION LLM WARN: ${e?.message || String(e)}`);
        }
      }

      setHesitationAssistConsumed(true);
      recentRecommendedMenuIdsRef.current = [
        ...recentRecommendedMenuIdsRef.current,
        ...pickMenus.map((m) => m.menuItemId),
      ].slice(-9);
      if (pickMenus.length > 0) {
        recommendationCursorRef.current = pickMenus.length % Math.max(1, menuCatalog.length);
      }
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
      // Proactive hesitation help is already an active voice turn, so don't auto-greet again
      // when dining type gets chosen later in the same conversation.
      autoVoiceStartedRef.current = true;
      // Proactive hesitation help should keep the character calm rather than triggering a recommendation gesture.
      if (realtimeEnabled) {
        try {
          if (!realtimeConnectedRef.current && !realtimeConnectingRef.current) {
            await connectRealtimeRef.current?.();
          }
          for (let attempt = 0; attempt < 20 && !realtimeConnectedRef.current; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
          }
          if (realtimeConnectedRef.current) {
            await requestRealtimeSpeech(speech);
            return;
          }
        } catch (e: any) {
          addVoiceLog(`HESITATION RT WARN: ${e?.message || String(e)}`);
        }
      }
      await say(speech, "idle");
    },
    [
      addVoiceLog,
      cartSnapshot,
      conversationHistory,
      diningType,
      hesitationAssistConsumed,
      llmEnabled,
      menuCatalog,
      pendingOptionConfirm,
      pendingSetChoice,
      pageHint,
      realtimeConnected,
      realtimeConnecting,
      realtimeEnabled,
      requestRealtimeSpeech,
      say,
      selectedCategory,
      sessionId,
      uiMode?.setPickerActive,
    ]
  );

  useEffect(() => {
    const inSetOptionFlow = Boolean(uiMode?.setPickerActive || pendingSetChoice || pendingOptionConfirm);
    if (inSetOptionFlow) {
      if (hesitationTimerRef.current != null) {
        window.clearTimeout(hesitationTimerRef.current);
        hesitationTimerRef.current = null;
      }
      return;
    }
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
    if (speaking || llmRequestInFlightRef.current) return;

    hesitationTimerRef.current = window.setTimeout(() => {
      hesitationTimerRef.current = null;
      void triggerHesitationAssist(score);
    }, 2000);
  }, [
    hesitationAssistConsumed,
    pendingOptionConfirm,
    pendingSetChoice,
    speaking,
    tracking.hesitationScore,
    tracking.isHesitating,
    triggerHesitationAssist,
    uiMode?.setPickerActive,
  ]);

  useEffect(() => {
    if (!hesitationAssistConsumed) {
      hesitationAssistLockedRef.current = false;
    }
  }, [hesitationAssistConsumed]);

  useEffect(() => {
    const sid = String(sessionId || "").trim() || null;
    if (hesitationAssistSessionIdRef.current === sid) return;
    hesitationAssistSessionIdRef.current = sid;
    setHesitationAssistConsumed(false);
    hesitationAssistLockedRef.current = false;
    if (hesitationTimerRef.current != null) {
      window.clearTimeout(hesitationTimerRef.current);
      hesitationTimerRef.current = null;
    }
    if (sid) addVoiceLog(`HESITATION: one-shot re-armed for session ${sid}`);
  }, [addVoiceLog, sessionId]);

  useEffect(() => {
    return () => {
      if (hesitationTimerRef.current != null) {
        window.clearTimeout(hesitationTimerRef.current);
        hesitationTimerRef.current = null;
      }
    };
  }, []);

  const trimmedPlanSubtitle = useMemo(() => planSubtitle.trim(), [planSubtitle]);
  const trimmedSubtitle = useMemo(() => subtitle.trim(), [subtitle]);

  return (
    <>
      {trimmedPlanSubtitle ? (
        <div
          className="fixed z-[4500] left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ bottom: `${Math.max(92, Math.round(688 * uiScale))}px` }}
        >
          <div
            className="px-5 py-2.5 rounded-2xl bg-slate-900/78 text-slate-100 text-sm md:text-base font-semibold shadow-lg w-[min(92vw,960px)] leading-snug break-words text-center"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span className="mr-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/90">
              PLAN
            </span>
            {trimmedPlanSubtitle}
          </div>
        </div>
      ) : null}

      {trimmedSubtitle ? (
        <div
          className="fixed z-[4500] left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ bottom: `${Math.max(24, Math.round(610 * uiScale))}px` }}
        >
          <div
            className="px-5 py-2.5 rounded-2xl bg-black/70 text-white text-base md:text-lg font-semibold shadow-lg w-[min(92vw,960px)] leading-snug break-words text-center"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span className="mr-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-amber-300/90">
              SPOKEN
            </span>
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
        realtimeEnabled={realtimeEnabled}
        realtimeConnected={realtimeConnected}
        realtimeStatusText={realtimeStatusText}
        listeningEnabled={listeningEnabled}
        onToggleStt={setSttEnabled}
        onToggleTts={setTtsEnabled}
        onToggleLlm={setLlmEnabled}
        onToggleRealtime={setRealtimeEnabled}
        onStartVoice={handleVoiceStart}
        onStopVoice={handleVoiceStop}
        micDevices={micDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id || undefined)}
        speakerDevices={speakerDevices}
        selectedOutputDeviceId={selectedOutputDeviceId}
        onSelectOutputDevice={(id) => setSelectedOutputDeviceId(id || undefined)}
        voiceLogs={voiceLogs}
      />
    </>
  );
}
