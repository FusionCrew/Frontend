import { useState, useEffect, useRef, useCallback } from "react";
import KioskMain from "./KioskMain";
import KioskOrder from "./KioskOrder";
import KioskMenu from "./KioskMenu";
import KioskRecommended from "./KioskRecommended";
import KioskCategoryPage from "./KioskCategoryPage";
import {
    getMenuItems,
    createOrder,
    createCart,
    getCart,
    addCartItem,
    processPayment,
    createKioskSession,
    recordSessionEvent,
    confirmOrder,
    requestTicket,
    callStaff
} from "../api/services";
import { useMicStreamer } from "../hook/useMicStreamer";
import { useAudioDevices } from "../hook/useAudioDevices";
import { CategoryType } from "../types/kiosk";
import { AI_BASE_URL, AI_V2_CHAT_URL } from "../api/config";
import { useCart } from "../hooks/useCart";
import { KioskCharacter } from "../components/KioskComponents";
import { useFaceTracking } from "../hook/useFaceTracking";
import MediaPipeDebugPanel from "../components/MediaPipeDebugPanel";

type PageType = "main" | "order" | "menu" | "recommended" | "burger" | "side" | "drink" | "all";
type VoiceAction =
    | { type: "NAVIGATE"; page: PageType }
    | { type: "SET_DINING"; diningType: "DINE_IN" | "TAKE_OUT" }
    | { type: "ADD_MENU"; menuItemId: string; quantity: number }
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
    | { type: "CHECKOUT" }
    | { type: "SELECT_PAYMENT"; method: "CARD" | "POINT" | "SIMPLE" }
    | { type: "CHECK_CART" }
    | { type: "CALL_STAFF" }
    | { type: "NONE" };

const NOISE_TRANSCRIPT_PATTERNS = [
    "시청해 주셔서 감사합니다",
    "시청해주셔서 감사합니다",
    "구독과 좋아요",
    "자막",
    "mbc 뉴스",
    "뉴스",
];

const CONTROL_TRANSCRIPT_TOKENS = [
    "주문하기",
    "주문",
    "이전",
    "뒤로",
    "버거",
    "사이드",
    "음료",
    "세트",
    "단품",
    "결제",
    "매장",
    "포장",
    "추천",
    "메뉴",
];

// Tracking Overlay Component to isolate high-frequency re-renders
function TrackingManager({
    speaking,
    children,
    sttEnabled,
    ttsEnabled,
    llmEnabled,
    listeningEnabled,
    onToggleStt,
    onToggleTts,
    onToggleLlm,
    onStartVoice,
    onStopVoice,
    micDevices,
    selectedDeviceId,
    onSelectDevice,
    voiceLogs,
    onHesitationAssist,
    onDebugLog,
    hesitationAssistConsumed,
}: {
    speaking: boolean,
    children: React.ReactNode,
    sttEnabled: boolean,
    ttsEnabled: boolean,
    llmEnabled: boolean,
    listeningEnabled: boolean,
    onToggleStt: (next: boolean) => void,
    onToggleTts: (next: boolean) => void,
    onToggleLlm: (next: boolean) => void,
    onStartVoice: () => void,
    onStopVoice: () => void,
    micDevices: MediaDeviceInfo[],
    selectedDeviceId?: string,
    onSelectDevice: (deviceId: string) => void,
    voiceLogs: string[],
    onHesitationAssist?: (score: number) => void,
    onDebugLog?: (line: string) => void,
    hesitationAssistConsumed?: boolean,
}) {
    const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
    const hesitationTimerRef = useRef<number | null>(null);
    const lastAssistAtRef = useRef(0);
    // Enable FaceMesh-only local tracking for Live2D mirror movement.
    // Pose local tracking stays off to avoid previous wasm collisions.
    const tracking = useFaceTracking(true, false, undefined, true, true);

    useEffect(() => {
        if (hesitationAssistConsumed) {
            if (hesitationTimerRef.current != null) {
                clearTimeout(hesitationTimerRef.current);
                hesitationTimerRef.current = null;
            }
            return;
        }
        if (!onHesitationAssist) return;
        const shouldWatch = tracking.isHesitating || tracking.hesitationScore >= 0.6;
        if (shouldWatch) {
            if (hesitationTimerRef.current != null) return;
            onDebugLog?.(
                `HESITATION WATCH: start state=${tracking.isHesitating ? "HESITATING" : "NORMAL"} score=${Math.round(
                    (tracking.hesitationScore || 0) * 100
                )}%`
            );
            hesitationTimerRef.current = window.setTimeout(() => {
                hesitationTimerRef.current = null;
                const now = Date.now();
                if (now - lastAssistAtRef.current < 25000) {
                    onDebugLog?.("HESITATION WATCH: cooldown skip");
                    return;
                }
                lastAssistAtRef.current = now;
                onDebugLog?.(
                    `HESITATION WATCH: trigger score=${Math.round((tracking.hesitationScore || 0) * 100)}%`
                );
                onHesitationAssist(tracking.hesitationScore || 0);
            }, 5000);
            return;
        }
        if (hesitationTimerRef.current != null) {
            clearTimeout(hesitationTimerRef.current);
            hesitationTimerRef.current = null;
            onDebugLog?.("HESITATION WATCH: reset");
        }
    }, [tracking.isHesitating, tracking.hesitationScore, onHesitationAssist, onDebugLog, hesitationAssistConsumed]);

    useEffect(() => {
        return () => {
            if (hesitationTimerRef.current != null) clearTimeout(hesitationTimerRef.current);
            hesitationTimerRef.current = null;
        };
    }, []);

    return (
        <>
            {/* Layer 0: Character Background (At the very back) */}
            <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                <KioskCharacter speaking={speaking} tracking={tracking} />
            </div>

            {/* Layer 10: Main Content (Overlays the character) */}
            {children}

            {/* Layer 5000: Right-side dev tab (toggle) */}
            <MediaPipeDebugPanel
                isOpen={isDevPanelOpen}
                onToggle={() => setIsDevPanelOpen((prev) => !prev)}
                hesitationScore={tracking.hesitationScore}
                isHesitating={tracking.isHesitating}
                faceScore={tracking.faceScore}
                poseScore={tracking.poseScore}
                poseFeatures={tracking.poseFeatures}
                isDetecting={tracking.isDetecting}
                error={tracking.error}
                sttEnabled={sttEnabled}
                ttsEnabled={ttsEnabled}
                llmEnabled={llmEnabled}
                listeningEnabled={listeningEnabled}
                onToggleStt={onToggleStt}
                onToggleTts={onToggleTts}
                onToggleLlm={onToggleLlm}
                onStartVoice={onStartVoice}
                onStopVoice={onStopVoice}
                micDevices={micDevices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={onSelectDevice}
                voiceLogs={voiceLogs}
            />
        </>
    );
}

export default function KioskApp() {
    const [currentPage, setCurrentPage] = useState<PageType>("main");

    // AI & Voice States
    const [lang, setLang] = useState<"ko" | "en">("ko");
    const [speaking, setSpeaking] = useState(false);
    const [listeningEnabled, setListeningEnabled] = useState(true);
    const [sttEnabled, setSttEnabled] = useState(true);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [llmEnabled, setLlmEnabled] = useState(true);
    const [voiceLogs, setVoiceLogs] = useState<string[]>([]);
    const [subtitle, setSubtitle] = useState("");
    const [kioskSessionId, setKioskSessionId] = useState<string | null>(null);
    const [cartId, setCartId] = useState<string | null>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [stock, setStock] = useState<Record<string, number>>({});
    const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
    const [diningType, setDiningType] = useState<"DINE_IN" | "TAKE_OUT">("DINE_IN");

    const { devices } = useAudioDevices();
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const prevListeningRef = useRef(listeningEnabled);
    const shouldListenAfterSpeechRef = useRef(true);
    const lastVoiceLogRef = useRef<{ line: string; ts: number }>({ line: "", ts: 0 });
    const [scale, setScale] = useState(1);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [voiceCheckoutSignal, setVoiceCheckoutSignal] = useState(0);
    const [voiceContinueSignal, setVoiceContinueSignal] = useState(0);
    const [voiceCartSignal, setVoiceCartSignal] = useState(0);
    const [voicePaymentSignal, setVoicePaymentSignal] = useState(0);
    const [voicePaymentMethod, setVoicePaymentMethod] = useState<"CARD" | "POINT" | "SIMPLE" | null>(null);
    const [suggestedMenu, setSuggestedMenu] = useState<{ menuItemId: string; name: string } | null>(null);
    const [suggestedMenuCandidates, setSuggestedMenuCandidates] = useState<Array<{ menuItemId: string; name: string }>>([]);
    const [awaitingSuggestionAccept, setAwaitingSuggestionAccept] = useState(false);
    const [awaitingCheckoutConfirm, setAwaitingCheckoutConfirm] = useState(false);
    const [awaitingReplaceLast, setAwaitingReplaceLast] = useState(false);
    const [awaitingRemoveTarget, setAwaitingRemoveTarget] = useState(false);
    const [pendingSlotClarify, setPendingSlotClarify] = useState<{
        kind: "REMOVE_MENU" | "CHANGE_QTY";
        menuItemId: string;
        quantity?: number;
        candidateIndexes: number[];
    } | null>(null);
    const autoVoiceStartedRef = useRef(false);
    const queuedHesitationScoreRef = useRef<number | null>(null);
    const hesitationAssistDoneRef = useRef(false);
    const [hesitationAssistConsumed, setHesitationAssistConsumed] = useState(false);
    const cart = useCart(cartId);
    const addVoiceLog = useCallback((line: string) => {
        const now = Date.now();
        const prev = lastVoiceLogRef.current;
        if (line === prev.line && now - prev.ts < 1000) return;
        if (line.startsWith("MIC DEBUG: speech") && now - prev.ts < 120) return;
        lastVoiceLogRef.current = { line, ts: now };
        const ts = new Date().toLocaleTimeString("ko-KR", { hour12: false });
        setVoiceLogs((prev) => [`[${ts}] ${line}`, ...prev].slice(0, 80));
    }, []);

    const parseQuantity = (text: string): number => {
        const digitMatch = text.match(/(\d+)/);
        if (digitMatch) return Math.max(1, Number(digitMatch[1]));

        const map: Record<string, number> = {
            "한 개": 1, "한개": 1, "하나": 1, "한잔": 1, "one": 1,
            "두 개": 2, "두개": 2, "둘": 2, "two": 2,
            "세 개": 3, "세개": 3, "셋": 3, "three": 3,
            "네 개": 4, "네개": 4, "넷": 4, "four": 4,
            "다섯 개": 5, "다섯개": 5, "five": 5,
        };
        for (const [k, v] of Object.entries(map)) {
            if (text.includes(k)) return v;
        }
        return 1;
    };

    const matchMenuItem = (text: string) => {
        const norm = text.replace(/\s+/g, "").toLowerCase();
        const genericCategoryWords = new Set(["버거", "사이드", "음료", "드링크", "세트", "단품", "메뉴", "추천"]);
        if (genericCategoryWords.has(norm)) return null;
        const candidates = menuItems
            .map((m: any) => {
                const name = String(m.name || "").trim();
                const compact = name.replace(/\s+/g, "").toLowerCase();
                return { item: m, name, compact };
            })
            .filter(({ compact }) => compact.length > 0);

        const exact = candidates.find(({ compact }) => norm.includes(compact));
        if (exact) return exact.item;

        let best: any = null;
        let bestScore = 0;
        if (norm.length < 3) return null;
        for (const c of candidates) {
            const score = c.compact.split("").reduce((acc, ch) => acc + (norm.includes(ch) ? 1 : 0), 0);
            if (score > bestScore && score >= Math.ceil(c.compact.length * 0.6)) {
                bestScore = score;
                best = c.item;
            }
        }
        return best;
    };

    const describeCartItem = (idx: number) => {
        const item = cart.cartItems[idx];
        if (!item) return "";
        const parts: string[] = [item.menu?.name || "메뉴"];
        if (item.size) parts.push(item.size);
        if (item.drink) parts.push(item.drink);
        if (item.side) parts.push(item.side);
        if (item.selectedOptions?.length) parts.push(item.selectedOptions.map((o) => o.name).join("/"));
        return parts.join(" ");
    };

    const resolveCandidateIndex = (text: string, candidates: number[]) => {
        const t = normalizeTranscript(text).toLowerCase();
        if (!candidates.length) return null;
        const ordinalRules: Array<{ keys: string[]; pos: number }> = [
            { keys: ["첫", "첫번째", "1번", "1"], pos: 0 },
            { keys: ["두", "두번째", "2번", "2"], pos: 1 },
            { keys: ["세", "세번째", "3번", "3"], pos: 2 },
            { keys: ["네", "네번째", "4번", "4"], pos: 3 },
        ];
        for (const rule of ordinalRules) {
            if (rule.keys.some((k) => t.includes(k)) && candidates[rule.pos] != null) {
                return candidates[rule.pos];
            }
        }
        const scored = candidates
            .map((idx) => {
                const d = describeCartItem(idx).toLowerCase();
                let score = 0;
                if (t.includes("아이스") && d.includes("아이스")) score += 3;
                if (t.includes("핫") && d.includes("핫")) score += 3;
                if ((t.includes("라지") || t.includes("큰")) && (d.includes("라지") || d.includes("large"))) score += 2;
                if (t.includes("세트") && d.includes("세트")) score += 2;
                if (t.includes("단품") && d.includes("단품")) score += 2;
                const compactDesc = d.replace(/\s+/g, "");
                const compactText = t.replace(/\s+/g, "");
                if (compactText && compactDesc.includes(compactText)) score += 2;
                return { idx, score };
            })
            .sort((a, b) => b.score - a.score);
        if (scored[0] && scored[0].score > 0) return scored[0].idx;
        if (candidates.length === 1) return candidates[0];
        return null;
    };

    const parseVoiceAction = (text: string): VoiceAction => {
        const t = normalizeTranscript(text).trim().toLowerCase();
        if (!t) return { type: "NONE" };

        if (pendingSlotClarify) {
            if (t.includes("아니") || t.includes("취소") || t.includes("괜찮")) return { type: "CONTINUE_ORDER" };
            const picked = resolveCandidateIndex(t, pendingSlotClarify.candidateIndexes);
            if (picked != null) {
                if (pendingSlotClarify.kind === "REMOVE_MENU") return { type: "REMOVE_MENU_AT", cartIndex: picked };
                return { type: "CHANGE_QTY_AT", cartIndex: picked, quantity: Math.max(1, pendingSlotClarify.quantity || 1) };
            }
            return {
                type: "ASK_SLOT_CLARIFY",
                kind: pendingSlotClarify.kind,
                menuItemId: pendingSlotClarify.menuItemId,
                quantity: pendingSlotClarify.quantity,
                candidateIndexes: pendingSlotClarify.candidateIndexes,
            };
        }

        const hasLocalCartItems = cart.cartItems.length > 0;
        const positive = ["응", "네", "좋아", "좋아요", "그래", "그래요", "맞아", "할게", "주문할게", "그거", "그걸로"];
        const negative = ["아니", "아니요", "괜찮아", "괜찮아요", "다른 거", "더 볼게"];

        if (t.includes("직원") || t.includes("도움")) return { type: "CALL_STAFF" };
        const menuForDirectOrder = matchMenuItem(t);
        const qtyForDirectOrder = parseQuantity(t);
        const hasDirectOrderPhrase =
            /(줘|주세요|주라|시켜|담아|추가|주문|할게|할래|먹을게|먹을래|로 해|으로 해)/.test(t) ||
            /(하나|한개|한 개|두개|두 개|세개|세 개|\d+\s*개)/.test(t);
        const hasBrowseIntent =
            /(보여|목록|카테고리|탭|페이지|이동|들어가|가자|추천|뭐가|뭐 있어|어떤|있어|있니|\?)/.test(t);
        if (menuForDirectOrder?.menuItemId && hasDirectOrderPhrase) {
            return { type: "ADD_MENU", menuItemId: menuForDirectOrder.menuItemId, quantity: qtyForDirectOrder };
        }
        if (menuForDirectOrder?.menuItemId && !hasBrowseIntent) {
            return { type: "ADD_MENU", menuItemId: menuForDirectOrder.menuItemId, quantity: qtyForDirectOrder };
        }
        if (
            t.includes("더 주문") ||
            t.includes("또 주문") ||
            t.includes("다시 주문") ||
            t.includes("계속 주문") ||
            t.includes("추가 주문") ||
            t.includes("메뉴 더") ||
            t.includes("더 고를래") ||
            t.includes("더 시킬래")
        ) {
            return { type: "CONTINUE_ORDER" };
        }
        if (awaitingSuggestionAccept && suggestedMenu?.menuItemId) {
            const candidates = suggestedMenuCandidates;
            const compactText = t.replace(/\s+/g, "");
            const namedPick = candidates.find((c) => compactText.includes(c.name.replace(/\s+/g, "").toLowerCase()));
            if (namedPick) return { type: "ACCEPT_SUGGESTION_ITEM", menuItemId: namedPick.menuItemId };
            if ((t.includes("첫") || t.includes("1번")) && candidates[0]) return { type: "ACCEPT_SUGGESTION_ITEM", menuItemId: candidates[0].menuItemId };
            if ((t.includes("두") || t.includes("2번")) && candidates[1]) return { type: "ACCEPT_SUGGESTION_ITEM", menuItemId: candidates[1].menuItemId };
            if ((t.includes("세") || t.includes("3번")) && candidates[2]) return { type: "ACCEPT_SUGGESTION_ITEM", menuItemId: candidates[2].menuItemId };
            if (positive.some((w) => t.includes(w))) return { type: "ACCEPT_SUGGESTION" };
            if (negative.some((w) => t.includes(w))) return { type: "CONTINUE_ORDER" };
        }
        if (awaitingCheckoutConfirm) {
            if (
                t.includes("결제") ||
                t.includes("주문 완료") ||
                t.includes("주문할게") ||
                t.includes("주문할래") ||
                t.includes("주문해") ||
                positive.some((w) => t.includes(w))
            ) {
                return { type: "CHECKOUT" };
            }
            if (negative.some((w) => t.includes(w))) return { type: "CONTINUE_ORDER" };
        }
        if (
            t.includes("신용카드") ||
            t.includes("카드로") ||
            t === "카드" ||
            t.includes("체크카드")
        ) {
            return { type: "SELECT_PAYMENT", method: "CARD" };
        }
        if (t.includes("포인트")) {
            return { type: "SELECT_PAYMENT", method: "POINT" };
        }
        if (
            t.includes("간편결제") ||
            t.includes("심플") ||
            t.includes("카카오페이") ||
            t.includes("네이버페이") ||
            t.includes("페이")
        ) {
            return { type: "SELECT_PAYMENT", method: "SIMPLE" };
        }
        if (
            t.includes("결제") ||
            t.includes("주문 완료") ||
            t.includes("주문할게") ||
            t.includes("주문할래") ||
            t.includes("주문해")
        ) {
            return { type: "CHECKOUT" };
        }
        if (t.includes("장바구니") && (t.includes("뭐") || t.includes("확인") || t.includes("보여") || t.includes("있") || t.includes("얼마"))) {
            return { type: "CHECK_CART" };
        }
        if (t.includes("주문하기") || t.includes("주문 시작") || t.includes("주문하러") || t.includes("주문 화면")) {
            return hasLocalCartItems ? { type: "CHECKOUT" } : { type: "NAVIGATE", page: "order" };
        }
        if (t.includes("이전") || t.includes("뒤로")) {
            if (currentPage === "order") return { type: "NAVIGATE", page: "main" };
            if (currentPage === "menu") return { type: "NAVIGATE", page: "order" };
            if (currentPage === "recommended" || currentPage === "burger" || currentPage === "side" || currentPage === "drink" || currentPage === "all") {
                return { type: "NAVIGATE", page: "menu" };
            }
            return { type: "NONE" };
        }

        if (t.includes("매장")) return { type: "SET_DINING", diningType: "DINE_IN" };
        if (t.includes("포장") || t.includes("테이크아웃")) return { type: "SET_DINING", diningType: "TAKE_OUT" };

        if (t.includes("처음으로") || t.includes("메인으로")) return { type: "NAVIGATE", page: "main" };
        if (t.includes("추천")) return { type: "NAVIGATE", page: "recommended" };
        if (t.includes("전체 메뉴") || (t.includes("전체") && t.includes("메뉴"))) return { type: "NAVIGATE", page: "all" };
        if (t.includes("버거")) return { type: "NAVIGATE", page: "burger" };
        if (t.includes("사이드")) return { type: "NAVIGATE", page: "side" };
        if (t.includes("음료") || t.includes("드링크")) return { type: "NAVIGATE", page: "drink" };
        if (t.includes("메뉴")) return { type: "NAVIGATE", page: "menu" };

        const menu = matchMenuItem(t);
        const qty = parseQuantity(t);
        const hasReplacePhrase = t.includes("아까 시킨거 말고") || t.includes("이거 말고") || t.includes("대신");
        const hasRemovePhrase = t.includes("빼") || t.includes("삭제") || t.includes("제거") || t.includes("취소");
        const hasQtyPhrase = (t.includes("개") || t.includes("잔")) && (t.includes("로") || t.includes("으로") || t.includes("해") || t.includes("맞춰"));

        if (awaitingRemoveTarget && menu?.menuItemId) {
            return { type: "REMOVE_MENU", menuItemId: menu.menuItemId };
        }
        if (awaitingReplaceLast && menu?.menuItemId) {
            return { type: "REPLACE_LAST", menuItemId: menu.menuItemId, quantity: qty };
        }
        if (hasReplacePhrase && !menu?.menuItemId) {
            return { type: "START_REPLACE_LAST" };
        }
        if (menu?.menuItemId && hasReplacePhrase) {
            return { type: "REPLACE_LAST", menuItemId: menu.menuItemId, quantity: qty };
        }
        if (menu?.menuItemId && hasRemovePhrase) {
            const matches = cart.cartItems
                .map((c, idx) => ({ idx, id: c.menu?.menuItemId || String(c.menu?.id || "") }))
                .filter((x) => x.id === menu.menuItemId)
                .map((x) => x.idx);
            if (matches.length > 1) {
                return { type: "ASK_SLOT_CLARIFY", kind: "REMOVE_MENU", menuItemId: menu.menuItemId, candidateIndexes: matches };
            }
            return { type: "REMOVE_MENU", menuItemId: menu.menuItemId };
        }
        if (hasRemovePhrase && !menu?.menuItemId) {
            if (cart.cartItems.length > 1) return { type: "ASK_REMOVE_TARGET" };
            if (cart.cartItems.length === 1) {
                const only = cart.cartItems[0]?.menu;
                const onlyId = only?.menuItemId || String(only?.id || "");
                if (onlyId) return { type: "REMOVE_MENU", menuItemId: onlyId };
            }
        }
        if (menu?.menuItemId && hasQtyPhrase) {
            const matches = cart.cartItems
                .map((c, idx) => ({ idx, id: c.menu?.menuItemId || String(c.menu?.id || "") }))
                .filter((x) => x.id === menu.menuItemId)
                .map((x) => x.idx);
            if (matches.length > 1) {
                return { type: "ASK_SLOT_CLARIFY", kind: "CHANGE_QTY", menuItemId: menu.menuItemId, quantity: qty, candidateIndexes: matches };
            }
            return { type: "CHANGE_QTY", menuItemId: menu.menuItemId, quantity: qty };
        }
        if (menu?.menuItemId) {
            return { type: "ADD_MENU", menuItemId: menu.menuItemId, quantity: qty };
        }

        if (t.includes("다른거 시킬래") || t.includes("다른 거 시킬래") || t.includes("바꿀래")) {
            return { type: "START_REPLACE_LAST" };
        }
        return { type: "NONE" };
    };

    const normalizeTranscript = (raw: string): string => {
        let t = raw.trim();
        if (!t) return t;
        t = t.replace(/[.!?~]+/g, " ");
        const fixes: Array<[RegExp, string]> = [
            [/\b허허\b/g, "버거"],
            [/\b허거\b/g, "버거"],
            [/햄버거/g, "버거"],
            [/뻐거/g, "버거"],
            [/주문 하(기|러)/g, "주문하기"],
        ];
        for (const [re, to] of fixes) {
            t = t.replace(re, to);
        }
        return t.replace(/\s+/g, " ").trim();
    };

    const getServerCartItems = useCallback(async (): Promise<Array<any> | null> => {
        if (!cartId) return null;
        try {
            const serverCart = await getCart(cartId);
            return (serverCart?.items || serverCart?.cartItems || serverCart?.data?.items || []) as Array<any>;
        } catch {
            return null;
        }
    }, [cartId]);


    useEffect(() => {
        const handleResize = () => {
            const s = window.innerWidth / 1080;
            setScale(s);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const goToMain = () => setCurrentPage("main");
    const goToOrder = () => setCurrentPage("order");
    const goToMenu = () => setCurrentPage("menu");
    const goToRecommended = () => setCurrentPage("recommended");

    useEffect(() => {
        const initKiosk = async () => {
            try {
                const sessionRes = await createKioskSession({
                    language: "ko",
                    accessibility: { largeText: false, highContrast: false, voiceGuidance: true },
                    inputMode: "TOUCH",
                    device: { kioskId: "KIOSK_001", appVersion: "1.0.0" }
                });
                if (sessionRes?.data?.sessionId) {
                    const sid = sessionRes.data.sessionId;
                    setKioskSessionId(sid);
                    const newCart = await createCart(sid);
                    if (newCart) setCartId(newCart.cartId);
                }
                const items = await getMenuItems();
                if (items?.length > 0) {
                    setMenuItems(items);
                    const initialStock: Record<string, number> = {};
                    items.forEach((item: any) => { initialStock[item.menuItemId || item.id] = 10; });
                    setStock(initialStock);
                }
            } catch (e) {
                console.error("Init Failed", e);
            }
        };
        initKiosk();
    }, []);

    useEffect(() => {
        if (devices.length > 0 && !selectedDeviceId) {
            const def = devices.find(d => d.deviceId === "default") || devices[0];
            setSelectedDeviceId(def.deviceId);
        }
    }, [devices, selectedDeviceId]);

    useEffect(() => {
        addVoiceLog(`STATE: listening=${listeningEnabled} stt=${sttEnabled} tts=${ttsEnabled} llm=${llmEnabled}`);
    }, [listeningEnabled, sttEnabled, ttsEnabled, llmEnabled, addVoiceLog]);

    const say = async (text: string) => {
        return new Promise<void>(async (resolve) => {
            setSubtitle(text);
            addVoiceLog(`TTS OUT: ${text}`);
            if (!ttsEnabled) {
                resolve();
                return;
            }
            setSpeaking(true);
            if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "TTS_PLAYED", text });
            prevListeningRef.current = listeningEnabled;
            setListeningEnabled(false);
            try {
                const res = await fetch(`${AI_BASE_URL}/tts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, language: lang, voice: "nova", speed: 1.0 })
                });
                const json = await res.json();
                const audioB64 = json.data?.audioBase64;
                if (audioB64) {
                    const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
                    audio.onended = () => {
                        setSpeaking(false);
                        setListeningEnabled(shouldListenAfterSpeechRef.current);
                        resolve();
                    };
                    await audio.play();
                } else {
                    setSpeaking(false);
                    setListeningEnabled(shouldListenAfterSpeechRef.current);
                    resolve();
                }
            } catch (e) {
                console.error(e);
                setSpeaking(false);
                setListeningEnabled(shouldListenAfterSpeechRef.current);
                resolve();
            }
        });
    };

    const handleOrderFlow = useCallback(async () => {
        if (!cartId || !kioskSessionId) return null;
        try {
            const orderRes = await createOrder({ cartId, sessionId: kioskSessionId, orderType: diningType });
            if (orderRes?.orderId) {
                const payRes = await processPayment({ orderId: orderRes.orderId.toString(), amount: orderRes.amount?.totalPrice || 0, method: "CARD" });
                if (payRes.success) {
                    await confirmOrder(orderRes.orderId);
                    console.log("[KioskApp] Order created:", orderRes.orderId);
                    const ticketRes = await requestTicket(orderRes.orderId);
                    console.log("[KioskApp] TicketResponse:", ticketRes);
                    const finalTicket = ticketRes?.ticketNumber || (orderRes.orderId ? `#${orderRes.orderId}` : orderRes.orderId);
                    setTicketNumber(finalTicket);
                    await say(lang === "ko" ? `주문이 확정되었습니다. 번호는 ${finalTicket}번입니다.` : `Confirmed. Number ${finalTicket}`);
                    return finalTicket;
                }
            }
        } catch (e) { console.error(e); }
        return null;
    }, [cartId, kioskSessionId, lang]);

    const handleManualOrderProcess = useCallback(async (amount: number) => {
        if (!cartId || !kioskSessionId) return null;
        try {
            await say("결제를 진행하겠습니다. 잠시만 기다려 주세요.");
            const orderRes = await createOrder({ cartId, sessionId: kioskSessionId, orderType: diningType });
            if (orderRes?.orderId) {
                const payRes = await processPayment({
                    orderId: orderRes.orderId.toString(),
                    amount: orderRes.amount?.totalPrice || amount,
                    method: "CARD"
                });

                if (payRes.success) {
                    await confirmOrder(orderRes.orderId);
                    console.log("[KioskApp] Order created (Manual):", orderRes.orderId);
                    const ticketRes = await requestTicket(orderRes.orderId);
                    console.log("[KioskApp] TicketResponse (Manual):", ticketRes);
                    const finalTicket = ticketRes?.ticketNumber || (orderRes.orderId ? `#${orderRes.orderId}` : orderRes.orderId);
                    setTicketNumber(finalTicket);
                    await say(`결제가 완료되었습니다. 주문 번호는 ${finalTicket}번입니다.`);
                    return finalTicket;
                }
            }
        } catch (e) {
            console.error("Order process failed:", e);
        }
        return null;
    }, [cartId, kioskSessionId]);

    const applyVoiceAction = async (action: VoiceAction): Promise<boolean> => {
        if (!action || action.type === "NONE") return false;
        addVoiceLog(`ACTION: ${action.type}`);
        const findLastCartIndexByMenuId = (menuItemId: string) => {
            for (let i = cart.cartItems.length - 1; i >= 0; i -= 1) {
                const id = cart.cartItems[i]?.menu?.menuItemId || String(cart.cartItems[i]?.menu?.id || "");
                if (id === menuItemId) return i;
            }
            return -1;
        };
        const removeLastCartItem = async () => {
            if (!cart.cartItems.length) return false;
            const idx = cart.cartItems.length - 1;
            await cart.removeFromCart(idx);
            return true;
        };

        if (action.type === "CALL_STAFF") {
            await handleStaffCall();
            return true;
        }

        if (action.type === "START_REPLACE_LAST") {
            setAwaitingRemoveTarget(false);
            setPendingSlotClarify(null);
            setAwaitingReplaceLast(true);
            await say("좋아요. 바꿀 메뉴를 말씀해 주세요.");
            return true;
        }

        if (action.type === "ASK_SLOT_CLARIFY") {
            setAwaitingReplaceLast(false);
            setAwaitingRemoveTarget(false);
            setPendingSlotClarify({
                kind: action.kind,
                menuItemId: action.menuItemId,
                quantity: action.quantity,
                candidateIndexes: action.candidateIndexes,
            });
            const options = action.candidateIndexes
                .slice(0, 4)
                .map((idx, i) => `${i + 1}번 ${describeCartItem(idx)}`)
                .join(", ");
            const verb = action.kind === "REMOVE_MENU" ? "삭제" : "수량 변경";
            await say(`${verb}할 항목을 정확히 알려주세요. ${options}`);
            return true;
        }

        if (action.type === "ASK_REMOVE_TARGET") {
            setAwaitingReplaceLast(false);
            setAwaitingRemoveTarget(true);
            setPendingSlotClarify(null);
            const names = cart.cartItems
                .slice(0, 4)
                .map((c) => c.menu?.name)
                .filter(Boolean)
                .join(", ");
            await say(`장바구니에 여러 메뉴가 있어요. 어떤 메뉴를 삭제할까요? ${names ? `예를 들면 ${names}` : ""}`);
            return true;
        }

        if (action.type === "REPLACE_LAST") {
            if (!cartId) {
                await say("장바구니를 준비 중입니다. 잠시 후 다시 말씀해 주세요.");
                return true;
            }
            const removed = await removeLastCartItem();
            const addedRes = await addCartItem(cartId, { menuItemId: action.menuItemId, quantity: action.quantity });
            if (!addedRes) {
                await say("메뉴 교체에 실패했습니다. 다시 말씀해 주세요.");
                return true;
            }
            const added = menuItems.find((m: any) => m.menuItemId === action.menuItemId);
            if (added) cart.appendLocalVoiceItem(added, action.quantity, addedRes?.itemId);
            setAwaitingReplaceLast(false);
            setPendingSlotClarify(null);
            setVoiceCartSignal((n) => n + 1);
            await say(`${removed ? "기존 메뉴를 빼고 " : ""}${added?.name || "메뉴"} ${action.quantity}개로 변경했습니다. 결제하시겠어요?`);
            setAwaitingCheckoutConfirm(true);
            return true;
        }

        if (action.type === "REMOVE_MENU_AT") {
            if (!cart.cartItems[action.cartIndex]) {
                await say("해당 항목을 찾지 못했습니다.");
                return true;
            }
            const targetName = cart.cartItems[action.cartIndex]?.menu?.name || "메뉴";
            await cart.removeFromCart(action.cartIndex);
            setPendingSlotClarify(null);
            setAwaitingRemoveTarget(false);
            setVoiceCartSignal((n) => n + 1);
            await say(`${targetName}를 장바구니에서 제거했습니다.`);
            return true;
        }

        if (action.type === "REMOVE_MENU") {
            const idx = findLastCartIndexByMenuId(action.menuItemId);
            if (idx < 0) {
                await say("장바구니에서 해당 메뉴를 찾지 못했습니다.");
                return true;
            }
            const targetName = cart.cartItems[idx]?.menu?.name || "메뉴";
            await cart.removeFromCart(idx);
            setPendingSlotClarify(null);
            setAwaitingRemoveTarget(false);
            setVoiceCartSignal((n) => n + 1);
            await say(`${targetName}를 장바구니에서 제거했습니다.`);
            return true;
        }

        if (action.type === "CHANGE_QTY_AT") {
            if (!cart.cartItems[action.cartIndex]) {
                await say("해당 항목을 찾지 못했습니다.");
                return true;
            }
            const targetName = cart.cartItems[action.cartIndex]?.menu?.name || "메뉴";
            await cart.setCartQuantity(action.cartIndex, action.quantity);
            setPendingSlotClarify(null);
            setAwaitingRemoveTarget(false);
            setVoiceCartSignal((n) => n + 1);
            await say(`${targetName} 수량을 ${action.quantity}개로 변경했습니다.`);
            return true;
        }

        if (action.type === "CHANGE_QTY") {
            const idx = findLastCartIndexByMenuId(action.menuItemId);
            if (idx < 0) {
                await say("장바구니에서 해당 메뉴를 찾지 못했습니다.");
                return true;
            }
            const targetName = cart.cartItems[idx]?.menu?.name || "메뉴";
            await cart.setCartQuantity(idx, action.quantity);
            setPendingSlotClarify(null);
            setAwaitingRemoveTarget(false);
            setVoiceCartSignal((n) => n + 1);
            await say(`${targetName} 수량을 ${action.quantity}개로 변경했습니다.`);
            return true;
        }

        if (action.type === "CHECKOUT") {
            setAwaitingCheckoutConfirm(false);
            if (!cartId) {
                await say("장바구니가 준비되지 않았습니다.");
                return true;
            }
            const serverItems = await getServerCartItems();
            if (serverItems === null) {
                await say("장바구니 확인이 잠시 지연되고 있어요. 다시 한 번 결제라고 말씀해 주세요.");
                return true;
            }
            const hasItems = serverItems.length > 0 || cart.cartItems.length > 0;
            if (!hasItems) {
                await say("장바구니가 비어 있습니다. 메뉴를 먼저 담아주세요.");
                return true;
            }
            if (!["all", "burger", "side", "drink", "recommended"].includes(currentPage)) {
                setCurrentPage("all");
            }
            setVoiceCheckoutSignal((n) => n + 1);
            await say("결제 수단을 선택해 주세요.");
            return true;
        }

        if (action.type === "SELECT_PAYMENT") {
            if (!["all", "burger", "side", "drink", "recommended"].includes(currentPage)) {
                await say("먼저 주문 화면으로 이동한 뒤 결제를 진행할게요.");
                setCurrentPage("all");
                setVoiceCheckoutSignal((n) => n + 1);
                return true;
            }
            setVoicePaymentMethod(action.method);
            setVoicePaymentSignal((n) => n + 1);
            return true;
        }

        if (action.type === "ASK_SUGGESTION_CLARIFY") {
            const list = suggestedMenuCandidates.map((m, i) => `${i + 1}번 ${m.name}`).join(", ");
            await say(`어떤 메뉴로 담아드릴까요? ${list}. 메뉴 이름이나 첫번째처럼 말씀해 주세요.`);
            return true;
        }

        if (action.type === "ACCEPT_SUGGESTION" || action.type === "ACCEPT_SUGGESTION_ITEM") {
            const selectedById =
                action.type === "ACCEPT_SUGGESTION_ITEM"
                    ? suggestedMenuCandidates.find((m) => m.menuItemId === action.menuItemId) || null
                    : null;
            if (action.type === "ACCEPT_SUGGESTION" && suggestedMenuCandidates.length > 1) {
                return applyVoiceAction({ type: "ASK_SUGGESTION_CLARIFY" });
            }
            const menuId = selectedById?.menuItemId || suggestedMenu?.menuItemId;
            const menuName = selectedById?.name || suggestedMenu?.name || "추천 메뉴";
            if (!menuId || !cartId) {
                await say("추천 메뉴를 다시 안내해 드릴게요.");
                return true;
            }
            const addedRes = await addCartItem(cartId, { menuItemId: menuId, quantity: 1 });
            if (!addedRes) {
                await say("메뉴 추가에 실패했습니다. 다시 말씀해 주세요.");
                return true;
            }
            const added = menuItems.find((m: any) => m.menuItemId === menuId);
            if (added) cart.appendLocalVoiceItem(added, 1, addedRes?.itemId);
            setAwaitingSuggestionAccept(false);
            setAwaitingCheckoutConfirm(true);
            setAwaitingReplaceLast(false);
            setSuggestedMenuCandidates([]);
            if (!["all", "burger", "side", "drink", "recommended", "menu"].includes(currentPage)) {
                setCurrentPage("all");
            }
            setVoiceCartSignal((n) => n + 1);
            await say(`${menuName} 1개를 장바구니에 담았습니다. 장바구니를 보여드릴게요. 결제하시겠어요?`);
            return true;
        }

        if (action.type === "CONTINUE_ORDER") {
            setAwaitingSuggestionAccept(false);
            setAwaitingCheckoutConfirm(false);
            setAwaitingReplaceLast(false);
            setAwaitingRemoveTarget(false);
            setPendingSlotClarify(null);
            setSuggestedMenuCandidates([]);
            setCurrentPage("all");
            setVoiceContinueSignal((n) => n + 1);
            await say("좋아요. 다른 메뉴를 천천히 골라보세요.");
            return true;
        }

        if (action.type === "CHECK_CART") {
            if (!cartId) {
                await say("장바구니를 아직 만들지 않았어요.");
                return true;
            }
            const items = await getServerCartItems();
            if (items === null) {
                await say("장바구니 조회가 잠시 지연되고 있어요. 다시 한 번 말씀해 주세요.");
                return true;
            }
            if (!items.length) {
                await say("현재 장바구니는 비어 있어요.");
                return true;
            }
            const preview = items
                .slice(0, 3)
                .map((it) => `${it.menuName || it.name || "메뉴"} ${it.quantity || 1}개`)
                .join(", ");
            await say(`현재 장바구니에는 ${preview}${items.length > 3 ? " 등이 있어요." : "가 있어요."}`);
            return true;
        }

        if (action.type === "SET_DINING") {
            setDiningType(action.diningType);
            goToMenu();
            await say(action.diningType === "DINE_IN" ? "매장 식사로 설정했습니다. 메뉴를 말씀해 주세요." : "포장으로 설정했습니다. 메뉴를 말씀해 주세요.");
            return true;
        }

        if (action.type === "NAVIGATE") {
            setCurrentPage(action.page);
            return true;
        }

        if (action.type === "ADD_MENU") {
            if (!cartId) {
                await say("장바구니를 준비 중입니다. 잠시 후 다시 말씀해 주세요.");
                return true;
            }
            const addedRes = await addCartItem(cartId, { menuItemId: action.menuItemId, quantity: action.quantity });
            if (!addedRes) {
                await say("메뉴 추가에 실패했습니다. 다시 한 번 말씀해 주세요.");
                return true;
            }
            const added = menuItems.find((m: any) => m.menuItemId === action.menuItemId);
            if (added) {
                cart.appendLocalVoiceItem(added, action.quantity, addedRes?.itemId);
            }
            setAwaitingReplaceLast(false);
            setAwaitingRemoveTarget(false);
            const serverItems = await getServerCartItems();
            const itemCount = serverItems?.length ?? 0;
            // Stay in current browsing context unless user is outside menu pages.
            if (!["all", "burger", "side", "drink", "recommended", "menu"].includes(currentPage)) {
                setCurrentPage("all");
            }
            await say(`${added?.name || "메뉴"} ${action.quantity}개를 장바구니에 담았습니다.${itemCount > 0 ? ` 현재 ${itemCount}개 품목이 있어요.` : ""} 다른 메뉴도 고르실 수 있어요.`);
            return true;
        }

        return false;
    };

    const shouldIgnoreTranscript = (raw: string): boolean => {
        const t = normalizeTranscript(raw).trim().toLowerCase();
        if (!t) return true;
        for (const p of NOISE_TRANSCRIPT_PATTERNS) {
            if (t.includes(p)) return true;
        }
        const tokenized = t
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (tokenized.length >= 6) {
            const hits = tokenized.filter((tok) => CONTROL_TRANSCRIPT_TOKENS.some((k) => tok === k || tok.includes(k))).length;
            if (hits / tokenized.length >= 0.65) return true;
        }
        // 1-char syllable or punctuation-like fragments are usually VAD noise
        if (t.length <= 1) return true;
        return false;
    };

    const isOrderDomainUtterance = (raw: string): boolean => {
        const t = normalizeTranscript(raw).toLowerCase();
        if (!t) return false;
        const compact = t.replace(/\s/g, "");

        // Allow menu Q&A queries (menu list / ingredient / allergen / calories).
        const infoTokens = [
            "메뉴",
            "뭐있",
            "뭐가있",
            "뭐있어",
            "뭐있나요",
            "뭐뭐있",
            "목록",
            "종류",
            "재료",
            "알레르기",
            "칼로리",
            "kcal",
            "들어가",
            "들어간",
            "포함",
            "제외",
            "빼고",
            "없는",
        ];
        if (infoTokens.some((k) => compact.includes(k))) return true;

        const keys = [
            "주문", "결제", "장바구니", "메뉴", "버거", "사이드", "음료", "추천",
            "카드", "포인트", "간편", "신용카드", "포장", "매장", "추가", "삭제", "빼", "수량",
            "담아", "시켜", "주세요", "줘", "할게", "할래", "더 주문", "또 주문", "다시 주문",
        ];
        return keys.some((k) => t.includes(k));
    };

    const applyLlmAction = async (action: string, actionData: any): Promise<boolean> => {
        const a = String(action || "NONE").toUpperCase();
        if (a === "NONE") return false;

        if (a === "NAVIGATE") {
            const page = String(actionData?.page || "").toLowerCase() as PageType;
            const allowed: PageType[] = ["main", "order", "menu", "recommended", "burger", "side", "drink", "all"];
            if (allowed.includes(page)) {
                return applyVoiceAction({ type: "NAVIGATE", page });
            }
            return false;
        }

        if (a === "ADD_MENU") {
            const menuItemId = String(actionData?.menuItemId || "");
            const quantity = Math.max(1, Number(actionData?.quantity || 1));
            if (!menuItemId) return false;
            return applyVoiceAction({ type: "ADD_MENU", menuItemId, quantity });
        }

        if (a === "REMOVE_MENU") {
            const menuItemId = String(actionData?.menuItemId || "");
            if (!menuItemId) return applyVoiceAction({ type: "ASK_REMOVE_TARGET" });
            return applyVoiceAction({ type: "REMOVE_MENU", menuItemId });
        }

        if (a === "CHANGE_QTY") {
            const menuItemId = String(actionData?.menuItemId || "");
            const quantity = Math.max(1, Number(actionData?.quantity || 1));
            if (!menuItemId) return false;
            return applyVoiceAction({ type: "CHANGE_QTY", menuItemId, quantity });
        }

        if (a === "CHECK_CART") return applyVoiceAction({ type: "CHECK_CART" });
        if (a === "CHECKOUT") return applyVoiceAction({ type: "CHECKOUT" });
        if (a === "CONTINUE_ORDER") return applyVoiceAction({ type: "CONTINUE_ORDER" });
        if (a === "SELECT_PAYMENT") {
            const method = String(actionData?.method || "").toUpperCase();
            if (method === "CARD" || method === "POINT" || method === "SIMPLE") {
                return applyVoiceAction({ type: "SELECT_PAYMENT", method });
            }
        }
        return false;
    };

    const doLLM = async (text: string) => {
        const normalizedText = normalizeTranscript(text);
        if (shouldIgnoreTranscript(normalizedText)) {
            addVoiceLog(`STT IGNORED: ${normalizedText || "(empty)"}`);
            return;
        }
        if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "USER_SPEECH", text: normalizedText });
        addVoiceLog(`STT IN: ${normalizedText}`);

        const fastAction = parseVoiceAction(normalizedText);
        const handled = await applyVoiceAction(fastAction);
        if (handled) return;
        if (!isOrderDomainUtterance(normalizedText)) {
            addVoiceLog(`STT IGNORED: out-of-domain (${normalizedText})`);
            await say("잘 못 들었어요. 메뉴 이름이나 결제라고 말씀해 주세요.");
            return;
        }
        if (!llmEnabled) {
            await say("LLM이 비활성화되어 있어 일반 대화 응답은 생략합니다.");
            return;
        }

        try {
            const userMsg = { role: "user" as const, content: normalizedText };
            const messages = [...conversationHistory, userMsg].slice(-10);
            addVoiceLog(`LLM REQ: ${messages.length} messages`);
            const stateForLlm = {
                currentPage,
                diningType,
                awaitingSuggestionAccept,
                awaitingCheckoutConfirm,
                awaitingReplaceLast,
                awaitingRemoveTarget,
                pendingSlotClarify,
                cartItems: cart.cartItems.map((c) => ({
                    menuItemId: c.menu.menuItemId || String(c.menu.id),
                    name: c.menu.name,
                    quantity: c.quantity,
                })),
                menuCatalog: menuItems.slice(0, 120).map((m: any) => ({
                    menuItemId: m.menuItemId,
                    name: m.name,
                    category: m.category || m.categoryId || "",
                    price: m.price,
                })),
            };
            const res = await fetch(AI_V2_CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-AI-Client-Source": "frontend-v1-voice",
                },
                body: JSON.stringify({
                    messages,
                    sessionId: kioskSessionId,
                    orderType: diningType,
                    context: {
                        sessionId: kioskSessionId,
                        kioskState: currentPage,
                        state: stateForLlm,
                    },
                }),
            });
            const json = await res.json();
            const reply = json.data?.text || json.data?.reply || "";
            const structuredAction = String(json.data?.action || "NONE");
            const structuredActionData = json.data?.actionData || {};
            addVoiceLog(`LLM OUT: ${reply || "(empty)"}`);
            if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "AI_REPLY", text: reply, action: structuredAction, actionData: structuredActionData });
            setConversationHistory([...messages, { role: "assistant", content: reply }]);

            const actionHandled = await applyLlmAction(structuredAction, structuredActionData);
            if (!actionHandled && reply) {
                setSubtitle(reply);
                await say(reply);
            }
        } catch (e) {
            console.error(e);
            addVoiceLog("LLM ERROR: request failed");
        }
    };

    useMicStreamer({
        enabled: listeningEnabled && sttEnabled,
        deviceId: selectedDeviceId,
        inputLang: lang,
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
        onDebug: (msg) => {
            addVoiceLog(`MIC DEBUG: ${msg}`);
        },
        onError: (msg) => {
            console.warn("[MicStreamer]", msg);
            addVoiceLog(`MIC ERROR: ${msg}`);
        },
    });

    const handleStaffCall = useCallback(async () => {
        if (!kioskSessionId) {
            console.error("No kiosk session ID available");
            return;
        }
        try {
            await callStaff(kioskSessionId, "KIOSK_001");
            await say("직원을 호출했습니다. 잠시만 기다려 주세요.");
        } catch (e) {
            console.error("Staff call error:", e);
        }
    }, [kioskSessionId]);

    const handleVoiceStart = useCallback(async () => {
        addVoiceLog(`VOICE START: mic=${selectedDeviceId || "default"}`);
        shouldListenAfterSpeechRef.current = true;
        setListeningEnabled(true);
        await say("음성 주문을 시작합니다. 원하시는 메뉴를 말씀해 주세요.");
        setListeningEnabled(true);
    }, [addVoiceLog, selectedDeviceId]);

    const handleVoiceStop = useCallback(() => {
        addVoiceLog("VOICE STOP");
        shouldListenAfterSpeechRef.current = false;
        setListeningEnabled(false);
    }, [addVoiceLog]);

    useEffect(() => {
        if (!kioskSessionId) return;
        if (autoVoiceStartedRef.current) return;
        autoVoiceStartedRef.current = true;
        void handleVoiceStart();
    }, [kioskSessionId, handleVoiceStart]);

    const handleHesitationAssist = useCallback(async (_score: number) => {
        if (hesitationAssistDoneRef.current) {
            addVoiceLog("HESITATION: one-shot already consumed");
            return;
        }
        if (!kioskSessionId) {
            queuedHesitationScoreRef.current = _score;
            addVoiceLog(`HESITATION: queued (score=${Math.round((_score || 0) * 100)}%) waiting session`);
            return;
        }
        if (!menuItems.length) {
            queuedHesitationScoreRef.current = _score;
            addVoiceLog("HESITATION: queued waiting menu catalog");
            return;
        }
        if (kioskSessionId) {
            recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", {
                type: "HESITATION_ASSIST_TRIGGERED",
                score: Number(_score || 0),
                page: currentPage,
            });
        }
        hesitationAssistDoneRef.current = true;
        setHesitationAssistConsumed(true);
        addVoiceLog("HESITATION: one-shot locked");
        const pickMenus = menuItems.slice(0, 3).filter((m: any) => m?.menuItemId && m?.name);
        setSuggestedMenuCandidates(pickMenus.map((m: any) => ({ menuItemId: m.menuItemId, name: m.name })));
        const primary = pickMenus[0];
        if (primary?.menuItemId) {
            setSuggestedMenu({ menuItemId: primary.menuItemId, name: primary.name });
            setAwaitingSuggestionAccept(true);
            setAwaitingCheckoutConfirm(false);
        }
        if (!llmEnabled) {
            const list = pickMenus.map((m: any) => m.name).join(", ") || "불고기버거, 치즈버거, 카페라떼";
            const fallback = `주문을 도와드릴까요? 추천 메뉴로 ${list}가 있어요. 메뉴 이름이나 첫번째처럼 말씀해 주세요.`;
            addVoiceLog(`LLM OUT: ${fallback}`);
            if (currentPage !== "recommended") setCurrentPage("recommended");
            await say(fallback);
            return;
        }
        try {
            const topMenus = menuItems
                .slice(0, 3)
                .map((m: any) => `${m.name}`)
                .join(", ");
            const messages = [
                {
                    role: "user",
                    content: `사용자가 주문을 망설이고 있어요. 짧게 안내해줘. 반드시 "주문을 도와드릴까요?"를 포함하고, 추천 메뉴 2~3개(${topMenus})를 말한 뒤 "괜찮으시면 그거 주문할게라고 말씀해 주세요"로 끝내.`,
                },
            ];
            addVoiceLog("LLM REQ: hesitation assist");
            const res = await fetch(AI_V2_CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-AI-Client-Source": "frontend-v1-hesitation",
                },
                body: JSON.stringify({ messages, sessionId: kioskSessionId, orderType: diningType }),
            });
            const json = await res.json();
            const reply =
                json.data?.text ||
                json.data?.reply ||
                "주문을 도와드릴까요? 추천 메뉴로 불고기버거, 치즈버거, 카페라떼가 있어요. 메뉴 이름이나 첫번째처럼 말씀해 주세요.";
            addVoiceLog(`LLM OUT: ${reply}`);
            if (currentPage !== "recommended" && currentPage !== "all" && currentPage !== "burger" && currentPage !== "side" && currentPage !== "drink") {
                setCurrentPage("recommended");
            }
            await say(reply);
        } catch {
            const fallback = "주문을 도와드릴까요? 추천 메뉴로 불고기버거, 치즈버거, 카페라떼가 있어요. 메뉴 이름이나 첫번째처럼 말씀해 주세요.";
            addVoiceLog(`LLM OUT: ${fallback}`);
            if (currentPage !== "recommended") setCurrentPage("recommended");
            await say(fallback);
        }
    }, [llmEnabled, kioskSessionId, menuItems, addVoiceLog, diningType, currentPage]);

    useEffect(() => {
        if (!kioskSessionId) return;
        if (!menuItems.length) return;
        const queued = queuedHesitationScoreRef.current;
        if (queued == null) return;
        queuedHesitationScoreRef.current = null;
        addVoiceLog(`HESITATION: flush queued trigger (score=${Math.round((queued || 0) * 100)}%)`);
        void handleHesitationAssist(queued);
    }, [kioskSessionId, menuItems.length, handleHesitationAssist, addVoiceLog]);

    const renderer = () => {
        if (currentPage === "burger" || currentPage === "side" || currentPage === "drink" || currentPage === "all") {
            return (
                <KioskCategoryPage
                    onBack={goToMenu}
                    onCategory={(cat) => setCurrentPage(cat as PageType)}
                    currentCategory={currentPage as CategoryType}
                    onGoToMain={goToMain}
                    speaking={speaking}
                    menuItems={menuItems}
                    sharedCart={cart}
                    onProcessOrder={handleManualOrderProcess}
                    ticketNumber={ticketNumber}
                    onResetTicket={() => setTicketNumber(null)}
                    voiceCheckoutSignal={voiceCheckoutSignal}
                    voiceContinueSignal={voiceContinueSignal}
                    voiceCartSignal={voiceCartSignal}
                    voicePaymentSignal={voicePaymentSignal}
                    voicePaymentMethod={voicePaymentMethod}
                />
            );
        }
        if (currentPage === "recommended") return (
            <KioskRecommended
                onBack={goToMenu}
                onGoToMain={goToMain}
                speaking={speaking}
                menuItems={menuItems}
                sharedCart={cart}
                onProcessOrder={handleManualOrderProcess}
                ticketNumber={ticketNumber}
                onResetTicket={() => setTicketNumber(null)}
                voiceCheckoutSignal={voiceCheckoutSignal}
                voiceContinueSignal={voiceContinueSignal}
                voiceCartSignal={voiceCartSignal}
                voicePaymentSignal={voicePaymentSignal}
                voicePaymentMethod={voicePaymentMethod}
            />
        );
        if (currentPage === "menu") return <KioskMenu onBack={goToOrder} onRecommended={goToRecommended} onCategory={(cat) => setCurrentPage(cat as PageType)} />;
        if (currentPage === "order") return (
            <KioskOrder
                onBack={goToMain}
                onSelectType={(type) => {
                    setDiningType(type as "DINE_IN" | "TAKE_OUT");
                    goToMenu();
                }}
            />
        );
        return <KioskMain onOrder={goToOrder} onAccessibility={goToOrder} onStaffCall={handleStaffCall} />;
    };

    const scaledHeight = 1920 * scale;

    return (
        <div className="fixed inset-0 bg-neutral-900 overflow-y-auto overflow-x-hidden flex justify-center">
            <div
                className="relative bg-[#F5EDE4] shadow-2xl"
                style={{
                    width: "1080px",
                    height: "1920px",
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                    marginBottom: `-${1920 - scaledHeight}px`,
                    flexShrink: 0
                }}
            >
                <TrackingManager
                    speaking={speaking}
                    sttEnabled={sttEnabled}
                    ttsEnabled={ttsEnabled}
                    llmEnabled={llmEnabled}
                    listeningEnabled={listeningEnabled}
                    onToggleStt={setSttEnabled}
                    onToggleTts={setTtsEnabled}
                    onToggleLlm={setLlmEnabled}
                    onStartVoice={handleVoiceStart}
                    onStopVoice={handleVoiceStop}
                    micDevices={devices}
                    selectedDeviceId={selectedDeviceId}
                    onSelectDevice={setSelectedDeviceId}
                    voiceLogs={voiceLogs}
                    onHesitationAssist={handleHesitationAssist}
                    onDebugLog={addVoiceLog}
                    hesitationAssistConsumed={hesitationAssistConsumed}
                >
                    <div style={{ position: "relative", zIndex: 10, width: "1080px", height: "1920px" }}>
                        {renderer()}
                    </div>
                </TrackingManager>

                {subtitle && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 bg-white/90 px-8 py-4 rounded-3xl shadow-xl z-[3000] text-center"
                        style={{ bottom: "400px", width: "80%", fontSize: "40px", color: "#4A3728", fontFamily: "Noto Sans KR" }}
                    >
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}
