import { useState, useEffect, useRef, useCallback } from "react";
import KioskMain from "./kiosk_page/KioskMain";
import KioskOrder from "./kiosk_page/KioskOrder";
import KioskMenu from "./kiosk_page/KioskMenu";
import KioskRecommended from "./kiosk_page/KioskRecommended";
import KioskCategoryPage from "./kiosk_page/KioskCategoryPage";
import {
  getMenuItems,
  createOrder,
  createCart,
  addCartItem,
  processPayment,
  createKioskSession,
  recordSessionEvent,
  confirmOrder,
  requestTicket,
  callStaff
} from "./api/services";
import { useMicStreamer } from "./hook/useMicStreamer";
import { useAudioDevices } from "./hook/useAudioDevices";
import { CategoryType } from "./types/kiosk";
import { AI_BASE_URL } from "./api/config";
import { useCart } from "./hooks/useCart";
import { KioskCharacter } from "./components/KioskComponents";
import { useFaceTracking } from "./hook/useFaceTracking";
import MediaPipeDebugPanel from "./components/MediaPipeDebugPanel";

type PageType = "main" | "order" | "menu" | "recommended" | "burgerSingle" | "burgerSet" | "side" | "drink";

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("main");

  // AI & Voice States
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [speaking, setSpeaking] = useState(false);
  const [listeningEnabled, setListeningEnabled] = useState(true);
  const [subtitle, setSubtitle] = useState("");
  const [kioskSessionId, setKioskSessionId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const { devices } = useAudioDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const prevListeningRef = useRef(listeningEnabled);
  const [scale, setScale] = useState(1);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const cart = useCart(cartId);

  // MediaPipe Tracking (Shared across App and Character)
  const tracking = useFaceTracking(true, true); // Enabled by default for debug view

  useEffect(() => {
    const handleResize = () => {
      // 너비(1080)에 맞춰서 스케일을 조정하면 정사각형 화면에서도 큼직하게 보입니다.
      // 대신 세로가 길어지므로 부모 컨테이너에 스크롤을 허용합니다.
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
          inputMode: "TOUCH", // HYBRID -> TOUCH (백엔드 Enum에 맞춤)
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

  const say = async (text: string) => {
    return new Promise<void>(async (resolve) => {
      setSpeaking(true);
      if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "TTS_PLAYED", text });
      prevListeningRef.current = listeningEnabled;
      setListeningEnabled(false);
      try {
        const res = await fetch(`${AI_BASE_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: lang, voice: "alloy", speed: 1.0 })
        });
        const json = await res.json();
        const audioB64 = json.data?.audioBase64;
        if (audioB64) {
          const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
          audio.onended = () => {
            setSpeaking(false);
            setListeningEnabled(prevListeningRef.current);
            resolve();
          };
          await audio.play();
        } else {
          setSpeaking(false);
          setListeningEnabled(prevListeningRef.current);
          resolve();
        }
      } catch (e) {
        console.error(e);
        setSpeaking(false);
        setListeningEnabled(prevListeningRef.current);
        resolve();
      }
    });
  };

  const handleOrderFlow = useCallback(async () => {
    if (!cartId || !kioskSessionId) return null;
    try {
      const orderRes = await createOrder({ cartId, sessionId: kioskSessionId, orderType: "DINE_IN" });
      if (orderRes?.orderId) {
        const payRes = await processPayment({ orderId: orderRes.orderId.toString(), amount: orderRes.amount?.totalPrice || 0, method: "CARD" });
        if (payRes.success) {
          await confirmOrder(orderRes.orderId);
          const ticketRes = await requestTicket(orderRes.orderId);
          const finalTicket = ticketRes?.ticketNumber || orderRes.orderId;
          setTicketNumber(finalTicket);
          await say(lang === "ko" ? `주문이 확정되었습니다. 번호는 ${finalTicket}번입니다.` : `Confirmed. Number ${finalTicket}`);
          return finalTicket;
        }
      }
    } catch (e) { console.error(e); }
    return null;
  }, [cartId, kioskSessionId, lang]);

  /**
   * 메뉴얼 결제 완료 시 호출되는 함수 (결제 프로세스 실행)
   */
  const handleManualOrderProcess = useCallback(async (amount: number) => {
    if (!cartId || !kioskSessionId) return null;
    try {
      // 1. 주문 생성
      const orderRes = await createOrder({ cartId, sessionId: kioskSessionId, orderType: "DINE_IN" });
      if (orderRes?.orderId) {
        // 2. 결제 처리
        const payRes = await processPayment({
          orderId: orderRes.orderId.toString(),
          amount: orderRes.amount?.totalPrice || amount,
          method: "CARD"
        });

        if (payRes.success) {
          // 3. 주문 확정
          await confirmOrder(orderRes.orderId);
          // 4. 티켓 발행
          const ticketRes = await requestTicket(orderRes.orderId);
          const finalTicket = ticketRes?.ticketNumber || orderRes.orderId;
          setTicketNumber(finalTicket);
          return finalTicket;
        }
      }
    } catch (e) {
      console.error("Order process failed:", e);
    }
    return null;
  }, [cartId, kioskSessionId]);

  const doLLM = async (text: string) => {
    if (!text.trim()) return;
    if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "USER_SPEECH", text });
    try {
      const userMsg = { role: "user" as const, content: text };
      const messages = [...conversationHistory, userMsg].slice(-10);
      const res = await fetch(`${AI_BASE_URL}/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sessionId: kioskSessionId, orderType: "EAT_IN" }),
      });
      const json = await res.json();
      const reply = json.data?.text || "";
      setSubtitle(reply);
      if (kioskSessionId) recordSessionEvent(kioskSessionId, "SYSTEM_NOTICE", { type: "AI_REPLY", text: reply });
      setConversationHistory([...messages, { role: "assistant", content: reply }]);
      await say(reply);

      if (json.data?.action === "ADD_TO_CART" && cartId) {
        await addCartItem(cartId, json.data.actionData);
      } else if (json.data?.action === "ORDER_START") {
        handleOrderFlow();
      }
    } catch (e) { console.error(e); }
  };

  useMicStreamer({
    enabled: listeningEnabled,
    deviceId: selectedDeviceId,
    inputLang: lang,
    outputs: [],
    onResult: (res) => doLLM(res.original),
    sttModel: "whisper-1",
    llmModel: "gpt-4o"
  });

  const handleStaffCall = async () => {
    try {
      await callStaff("KIOSK_001");
      await say("직원을 호출했습니다. 잠시만 기다려 주세요.");
    } catch (e) { console.error(e); }
  };

  const renderer = () => {
    if (currentPage === "burgerSingle" || currentPage === "burgerSet" || currentPage === "side" || currentPage === "drink") {
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
      />
    );
    if (currentPage === "menu") return <KioskMenu onBack={goToOrder} onRecommended={goToRecommended} onCategory={(cat) => setCurrentPage(cat as PageType)} />;
    if (currentPage === "order") return <KioskOrder onBack={goToMain} onSelectType={goToMenu} />;
    return <KioskMain onOrder={goToOrder} onAccessibility={goToOrder} />;
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
        {/* Pass speaking state to pages if they use KioskCharacter */}
        {/* We can use a context or just let KioskCharacter handle it if we make it smarter */}
        {/* Persisted Character Background */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <KioskCharacter speaking={speaking} tracking={tracking} />
        </div>

        {/* MediaPipe Debug Panel (Temporary) */}
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2000 }}>
          <MediaPipeDebugPanel
            faceResults={tracking.faceResults}
            poseResults={tracking.poseResults}
            handsResults={tracking.handsResults}
            videoElement={tracking.videoElement}
          />
        </div>

        {/* Dynamic Page Content */}
        {renderer()}

        {/* Global Subtitle Overlay */}
        {subtitle && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-white/90 px-8 py-4 rounded-3xl shadow-xl z-[100] text-center"
            style={{ bottom: "400px", width: "80%", fontSize: "40px", color: "#4A3728", fontFamily: "Noto Sans KR" }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
