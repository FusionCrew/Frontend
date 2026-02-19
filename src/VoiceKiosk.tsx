import { useEffect, useRef, useState } from "react";
import { useFaceTracking } from "./hook/useFaceTracking";
import { useAudioDevices } from "./hook/useAudioDevices";
import { useMicStreamer } from "./hook/useMicStreamer";
import { getMenuItems, createOrder, createCart, addCartItem, processPayment, createKioskSession, recordSessionEvent, confirmOrder, requestTicket } from "./api/services";


// 임시 메뉴 리스트 제거 (실제 DB 데이터만 사용하도록)
const FALLBACK_MENU: any[] = [];

/* ===========================================================
   작은 유틸
=========================================================== */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ===========================================================
   무음 WAV 생성 (STT 헬스체크 용)
=========================================================== */
function encodeWavFromFloat32(float32: Float32Array, sampleRate = 16000): Blob {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytesPerSample = 2;
  const blockAlign = 1 * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (ofs: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(ofs + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcm16.length; i++, offset += 2) view.setInt16(offset, pcm16[i], true);
  return new Blob([buffer], { type: "audio/wav" });
}

/* ===========================================================
   Live2D Stage (Pixi + pixi-live2d-display)
=========================================================== */
function Live2DStage({
  modelPath = "/models/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json",
  speaking = false,
  enableFaceTracking = false,
  enablePose = false,
  poseDeviceId,
  motionTrigger = 0, // 모션 재생 트리거 (값이 변경되면 랜덤 모션 재생)
  specificMotion = null, // 특정 모션 재생 (예: "m01")
  onHesitationChange,
}: {
  modelPath?: string;
  speaking?: boolean;
  enableFaceTracking?: boolean;
  enablePose?: boolean;
  poseDeviceId?: string;
  motionTrigger?: number;
  specificMotion?: string | null;
  onHesitationChange?: (score: number, isHesitating: boolean, poseLandmarks: any[], videoEl: HTMLVideoElement | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<any>(null);
  const appRef = useRef<any>(null);
  const isPlayingMotionRef = useRef(false); // 모션 재생 중 플래그

  // 얼굴 추적 훅 (포즈 기반 망설임 정보 포함)
  const { facePosition, isDetecting, error: faceTrackingError, hesitationScore, isHesitating, poseLandmarks, videoElement } = useFaceTracking(enableFaceTracking, enablePose, poseDeviceId);

  // 부모에게 망설임 상태 통지 (있으면)
  useEffect(() => {
    if (typeof onHesitationChange === "function") {
      onHesitationChange(hesitationScore || 0, !!isHesitating, poseLandmarks || [], videoElement || null);
    }
  }, [hesitationScore, isHesitating, poseLandmarks, videoElement, onHesitationChange]);

  // 모션 목록 (haru_g_m01 ~ m26)
  const motionList = Array.from({ length: 26 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const PIXI = (window as any).PIXI;
      if (!PIXI || !(window as any).Live2DCubismCore || !PIXI.live2d) {
        console.error("[Live2D] Missing dependencies (PIXI or Cubism)");
        return;
      }

      const app = new PIXI.Application({
        resizeTo: boxRef.current!,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      appRef.current = app;
      boxRef.current!.appendChild(app.view as HTMLCanvasElement);

      Object.assign(app.view.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        zIndex: "10",
        pointerEvents: "none",
      });

      const { Live2DModel } = PIXI.live2d;
      const model = await Live2DModel.from(modelPath);
      if (destroyed) return;

      modelRef.current = model;
      model.anchor.set(0.5, 0.5);
      app.stage.addChild(model);

      const place = () => {
        const w = boxRef.current!.clientWidth;
        const h = boxRef.current!.clientHeight;
        // 머리 부근(상단 10%)을 기준점으로 설정
        model.anchor.set(0.5, 0.1);
        // 그 지점을 화면 정중앙에 배치
        model.position.set(w / 2, h / 2);
        // 적절한 크기로 조정
        const scale = Math.min(w, h) / 1200;
        model.scale.set(scale);
      };
      place();
      app.renderer.on("resize", place);
    })();

    return () => {
      destroyed = true;
      try {
        appRef.current?.destroy(true);
      } catch { }
      if (boxRef.current) boxRef.current.innerHTML = "";
    };
  }, [modelPath]);

  // 얼굴 추적 적용 (모션 재생 중에는 비활성화)
  useEffect(() => {
    if (!enableFaceTracking || !isDetecting || isPlayingMotionRef.current) return;

    const model = modelRef.current;
    if (!model) return;

    const focus = model.focusController || model.internalModel?.focusController;
    if (!focus) return;

    // 얼굴 위치를 Live2D 시선에 적용
    focus.focus(facePosition.x, facePosition.y);
  }, [facePosition, isDetecting, enableFaceTracking]);

  // 모션 재생 (specificMotion 우선, 없으면 motionTrigger로 랜덤)
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    let motionToPlay: string | null = null;

    if (specificMotion) {
      // 특정 모션 지정
      motionToPlay = specificMotion;
    } else if (motionTrigger > 0) {
      // 랜덤 모션
      const randomIdx = Math.floor(Math.random() * motionList.length);
      motionToPlay = motionList[randomIdx];
    }

    if (motionToPlay) {
      try {
        // 모션 재생 시작 플래그 설정
        isPlayingMotionRef.current = true;

        // model3.json의 Motions 배열 인덱스:
        // 0: idle, 1: m01, 2: m02, ..., 26: m26
        const motionGroup = ""; // 빈 문자열 그룹
        let motionIndex = 0;

        if (motionToPlay === "idle") {
          motionIndex = 0;
        } else {
          // m01 -> 1, m02 -> 2, ..., m26 -> 26
          motionIndex = parseInt(motionToPlay.replace("m", ""));
        }

        // motion() API 사용 (pixi-live2d-display)
        const motionPromise = model.motion(motionGroup, motionIndex, 3);

        // 모션이 끝나면 플래그 해제 (Promise 반환하는 경우)
        if (motionPromise && typeof motionPromise.then === 'function') {
          motionPromise.then(() => {
            isPlayingMotionRef.current = false;
          }).catch(() => {
            isPlayingMotionRef.current = false;
          });
        } else {
          // Promise가 아니면 일정 시간 후 해제 (일반적으로 3초 정도)
          setTimeout(() => {
            isPlayingMotionRef.current = false;
          }, 3000);
        }
      } catch (e) {
        console.warn(`[Live2D] Motion play failed:`, e);
        isPlayingMotionRef.current = false;
      }
    }
  }, [motionTrigger, specificMotion, motionList]);

  useEffect(() => {
    const app = appRef.current;
    const model = modelRef.current;
    if (!app || !model) return;
    const core = model.internalModel?.coreModel;
    if (!core) return;
    let t = 0;
    const tick = (delta: number) => {
      if (!speaking) {
        core.setParameterValueById("ParamMouthOpenY", 0);
        return;
      }
      t += delta / 60;
      const v = (Math.sin(t * 14) + 1) / 2;
      core.setParameterValueById("ParamMouthOpenY", v);
    };
    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
    };
  }, [speaking]);

  return (
    <div ref={boxRef} className="relative w-full h-full">
      {/* 얼굴 추적 상태 표시 */}
      {enableFaceTracking && (
        <div className="absolute top-3 right-3 z-20 text-xs bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur flex items-center gap-2">
          {isDetecting ? (
            <>
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>👁️ 얼굴 감지됨</span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span>😶 얼굴을 찾는 중...</span>
            </>
          )}
        </div>
      )}
      {/* 얼굴 추적 에러 표시 */}
      {enableFaceTracking && faceTrackingError && (
        <div className="absolute top-14 right-3 z-20 text-xs bg-red-500/80 px-3 py-1.5 rounded-lg backdrop-blur">
          ⚠️ {faceTrackingError}
        </div>
      )}
      {/* 망설임 디버그 표시 */}
      {enableFaceTracking && (
        <div className="absolute top-20 right-3 z-20 text-xs bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur">
          <div className="text-[10px]">망설임: {Math.round((hesitationScore || 0) * 100)}%</div>
          <div className="text-[10px]">{isHesitating ? "✅ 망설임 감지" : "—"}</div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   상태 불빛
=========================================================== */
type LightState = "idle" | "checking" | "ok" | "fail";
function StatusLight({ state }: { state: LightState }) {
  const color =
    state === "checking" ? "bg-amber-400" :
      state === "ok" ? "bg-emerald-500" :
        state === "fail" ? "bg-rose-500" : "bg-white/30";
  const pulse = state === "checking" ? "animate-pulse" : "";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} ${pulse}`} />;
}

/* ===========================================================
   VoiceKiosk UI
=========================================================== */
export default function VoiceKiosk() {
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [subtitle, setSubtitle] = useState("");
  const subtitleRef = useRef<string>(""); // PIP 창에서 실시간 참조용
  const [speaking, setSpeaking] = useState(false);

  const [sttModel, setSttModel] = useState("whisper-1");
  const [llmModel, setLlmModel] = useState("gpt-4o");
  const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 11)}`);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [kioskSessionId, setKioskSessionId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [_cart, setCart] = useState<any>(null);

  const displayMenu = menuItems.length > 0
    ? menuItems.map((m: any) => ({
      id: m.menuItemId || m.id,
      label: m.name,
      emoji: m.emoji || (m.name.includes("버거") ? "🍔" : "☕"),
      ...m
    }))
    : FALLBACK_MENU;

  // Pose 추적 모드 (face tracking 제거, pose로 대체)
  const [usePoseTracking, setUsePoseTracking] = useState(false);
  const [poseDeviceId, setPoseDeviceId] = useState<string | undefined>(undefined);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Live2D 모션 제어
  const [motionTrigger, setMotionTrigger] = useState(0);
  const [specificMotion, setSpecificMotion] = useState<string | null>(null);
  const [autoMotion, setAutoMotion] = useState(false);

  const { devices, ready, error } = useAudioDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const initKiosk = async () => {
      try {
        console.log("Creating Kiosk Session...");
        const sessionRes = await createKioskSession("KIOSK_001");
        if (sessionRes && sessionRes.sessionId) {
          setKioskSessionId(sessionRes.sessionId);
          console.log("Kiosk Session created:", sessionRes.sessionId);

          console.log("Creating Cart...");
          const newCart = await createCart(sessionRes.sessionId);
          if (newCart) {
            setCartId(newCart.cartId);
            setCart(newCart);
            console.log("Cart initialized:", newCart.cartId);
          }
        }

        console.log("Fetching menu from backend...");
        const items = await getMenuItems();
        if (items && items.length > 0) {
          setMenuItems(items);
          const initialStock: Record<string, number> = {};
          items.forEach((item: any) => {
            initialStock[item.menuItemId || item.id] = 10;
          });
          setStock(prev => ({ ...prev, ...initialStock }));
        }
      } catch (e) {
        console.error("Kiosk Initialization Failed:", e);
      }
    };
    initKiosk();
  }, []);

  // 마이크 목록이 로드되면 기본 마이크를 자동 선택
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      // 1. deviceId가 "default"인 마이크 찾기
      let defaultDevice = devices.find(d => d.deviceId === "default");

      // 2. 없으면 label에 "기본값" 또는 "default" 포함된 마이크 찾기
      if (!defaultDevice) {
        defaultDevice = devices.find(d =>
          d.label.toLowerCase().includes("default") ||
          d.label.includes("기본값")
        );
      }

      // 3. 그래도 없으면 첫 번째 마이크 사용
      const selectedDevice = defaultDevice || devices[0];

      setSelectedDeviceId(selectedDevice.deviceId);
      console.log('[마이크] 기본 마이크 자동 선택:', selectedDevice.label, selectedDevice.deviceId);
    }
  }, [devices, selectedDeviceId]);

  // ✅ 초기 재고 (햄버거 메뉴)
  const [stock, setStock] = useState<Record<string, number>>({
    classic: 5,       // 클래식 버거
    cheese: 5,        // 치즈 버거
    bacon: 5,         // 베이컨 버거
    double: 5,        // 더블 버거
    chicken: 5,       // 치킨 버거
    shrimp: 5,        // 쉬림프 버거
    bulgogi: 5,       // 불고기 버거
    teriyaki: 5,      // 테리야키 버거
    bbq: 5,           // 바비큐 버거
    mushroom: 5,      // 머쉬룸 버거
    jalapeno: 5,      // 할라피뇨 버거
    avocado: 5,       // 아보카도 버거
    veggie: 5,        // 베지 버거
    chili: 5,         // 칠리 버거
    truffle: 5,       // 트러플 버거
    signature: 5,     // 시그니처 버거
  });
  const stockRef = useRef<Record<string, number>>(stock); // PIP 창에서 실시간 참조용

  // subtitle과 stock 변경 시 ref 업데이트 (PIP 창 동기화용)
  useEffect(() => {
    subtitleRef.current = subtitle;
  }, [subtitle]);

  useEffect(() => {
    stockRef.current = stock;
  }, [stock]);

  // 항시 음성 인식 모드
  const [listeningEnabled, setListeningEnabled] = useState(false);

  // 패널 테스트 (헬스 + 마이크 레벨)
  const [serverState, setServerState] = useState<LightState>("idle");
  const [llmState, setLlmState] = useState<LightState>("idle");
  const [sttState, setSttState] = useState<LightState>("idle");

  const [testRunning, setTestRunning] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0~1
  const testStreamRef = useRef<MediaStream | null>(null);
  const testContextRef = useRef<AudioContext | null>(null);
  const testAnalyserRef = useRef<AnalyserNode | null>(null);
  const testRafRef = useRef<number | null>(null);

  const [testTranscript, setTestTranscript] = useState("");
  const [testReply, setTestReply] = useState("");
  const [poseForDebug, setPoseForDebug] = useState<any[]>([]);
  const poseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [poseVideoElement, setPoseVideoElement] = useState<HTMLVideoElement | null>(null);
  const [_recommendedHistory, setRecommendedHistory] = useState<string[]>([]);
  // 마지막 추천 메뉴 (사용자가 "응", "그거 주세요" 등으로 수락할 수 있게)
  const [lastRecommendedItem, setLastRecommendedItem] = useState<string | null>(null);
  // OpenAI messages 형식으로 대화 히스토리 관리
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [pipMode, setPipMode] = useState(false);

  // 고개 끄덕(yes) 감지용



  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipAnimationRef = useRef<number | null>(null);




  // Web Speech API voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);

  const prevListeningRef = useRef<boolean | null>(null);
  // Pose canvas 그리기
  useEffect(() => {
    let raf = 0;
    const canvas = poseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const connections = [
      // 일부 주요 연결 (MediaPipe Pose 인덱스)
      [11, 13], [13, 15], // left shoulder-elbow-wrist
      [12, 14], [14, 16], // right shoulder-elbow-wrist
      [11, 12], // shoulders
      [23, 24], // hips
      [11, 23], [12, 24], // shoulders to hips
      [23, 25], [25, 27], // left hip-knee-ankle
      [24, 26], [26, 28], // right hip-knee-ankle
      [0, 1], [0, 2], // nose to eyes (approx)
    ];

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 배경
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, w, h);

      // Draw video background if available
      if (usePoseTracking && poseVideoElement && poseVideoElement.readyState >= 2) {
        // draw mirrored video to canvas as background
        ctx.save();
        // mirror horizontally
        ctx.scale(-1, 1);
        ctx.drawImage(poseVideoElement, -w, 0, w, h);
        ctx.restore();
      } else {
        if (!usePoseTracking || !poseForDebug || poseForDebug.length === 0) {
          raf = requestAnimationFrame(draw);
          return;
        }
      }

      // draw connections
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(16,185,129,0.9)";
      for (const [a, b] of connections) {
        const A = poseForDebug[a];
        const B = poseForDebug[b];
        if (!A || !B) continue;
        // Mirror X so canvas shows mirrored view (like webcam mirror)
        const ax = (1 - A.x) * w;
        const ay = A.y * h;
        const bx = (1 - B.x) * w;
        const by = B.y * h;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // draw points
      for (let i = 0; i < poseForDebug.length; i++) {
        const p = poseForDebug[i];
        if (!p) continue;
        const x = (1 - p.x) * w;
        const y = p.y * h;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // If no landmarks, show hint
      if (usePoseTracking && (!poseForDebug || poseForDebug.length === 0)) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "12px sans-serif";
        ctx.fillText("Pose not detected or webcam permission denied", 8, 14);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [poseForDebug, usePoseTracking]);
  // Web Speech voices 로드
  useEffect(() => {
    const loadVoices = () => {
      try {
        // 한국어(KR) 음성만 필터해서 불러옴
        const allVoices = window.speechSynthesis.getVoices() || [];
        const vs = allVoices.filter(v => (v.lang || "").toLowerCase().startsWith("ko"));
        setVoices(vs);
        // 기본 선택: 한국어 음성 중 첫 번째
        if (!selectedVoiceName && vs.length > 0) {
          setSelectedVoiceName(vs[0].name);
        }
      } catch (e) { }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null as any; };
  }, [lang, selectedVoiceName]);

  // 비디오 장치 목록 로드
  useEffect(() => {
    const loadVideoDevices = async () => {
      try {
        // 권한 요청
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cameras);
        // 기본 카메라 선택
        if (cameras.length > 0 && !poseDeviceId) {
          const defaultCam = cameras.find(d => d.deviceId === 'default') || cameras[0];
          setPoseDeviceId(defaultCam.deviceId);
        }
      } catch (e) {
        console.error('[Video Devices] Failed to load:', e);
      }
    };
    loadVideoDevices();

    navigator.mediaDevices.addEventListener?.('devicechange', loadVideoDevices);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', loadVideoDevices);
    };
  }, [poseDeviceId]);
  // 망설임 트리거 방지용 timestamp
  const lastHesitationAt = useRef<number>(0);

  // PIP 모드 토글 (새 창으로 표시, 무한정 크기 조절 가능)
  const togglePipMode = async () => {
    console.log('[PIP] togglePipMode called, current pipMode:', pipMode);

    if (pipMode) {
      // PIP 종료
      try {
        console.log('[PIP] Closing window...');
        if (pipAnimationRef.current) {
          cancelAnimationFrame(pipAnimationRef.current);
          pipAnimationRef.current = null;
        }
        if ((window as any).pipWindow && !(window as any).pipWindow.closed) {
          (window as any).pipWindow.close();
        }
        (window as any).pipWindow = null;
        setPipMode(false);
        console.log('[PIP] Closed');
      } catch (e) {
        console.error('[PIP] Close failed:', e);
      }
    } else {
      // PIP 시작 (새 창으로)
      try {
        console.log('[PIP] Opening new window...');
        const stageElement = document.querySelector('.live2d-stage-container') as HTMLElement;

        if (!stageElement) {
          alert('무대 요소를 찾을 수 없습니다.');
          return;
        }

        const live2dCanvas = stageElement.querySelector('canvas') as HTMLCanvasElement;

        if (!live2dCanvas) {
          alert('Live2D 캔버스를 찾을 수 없습니다.');
          return;
        }

        // 새 창 열기 (1080x1920 초기 크기, 무한정 리사이즈 가능)
        const newWindow = window.open(
          '',
          'KioskPIP',
          'width=1080,height=1920,left=100,top=100,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no'
        );

        if (!newWindow) {
          alert('팝업 차단으로 창을 열 수 없습니다. 팝업 차단을 해제해주세요.');
          return;
        }

        (window as any).pipWindow = newWindow;

        // 새 창 HTML 작성
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>AI Kiosk - Display</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background: #000; 
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100vw;
                height: 100vh;
              }
              canvas {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <canvas id="pipCanvas"></canvas>
          </body>
          </html>
        `);
        newWindow.document.close();

        // Canvas 생성
        const canvas = newWindow.document.getElementById('pipCanvas') as HTMLCanvasElement;
        canvas.width = 1080;
        canvas.height = 1920;
        pipCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          alert('Canvas를 생성할 수 없습니다.');
          newWindow.close();
          return;
        }

        // 그리기 함수 (클로저로 최신 상태 참조)
        const drawFrame = () => {
          if (newWindow.closed) {
            console.log('[PIP] Window closed by user');
            setPipMode(false);
            if (pipAnimationRef.current) {
              cancelAnimationFrame(pipAnimationRef.current);
              pipAnimationRef.current = null;
            }
            return;
          }

          const live2dCanvas = stageElement.querySelector('canvas') as HTMLCanvasElement;
          if (!live2dCanvas) {
            pipAnimationRef.current = requestAnimationFrame(drawFrame);
            return;
          }

          ctx.clearRect(0, 0, 1080, 1920);

          // 전체 배경
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1080, 1920);

          // 무대 영역 (상단 78% - 더 넓게)
          const stageHeight = 1920 * 0.78;

          // 배경 그라데이션
          const gradient = ctx.createLinearGradient(0, 0, 1080, stageHeight);
          gradient.addColorStop(0, 'rgba(244, 114, 182, 0.2)');
          gradient.addColorStop(0.5, 'rgba(192, 132, 252, 0.1)');
          gradient.addColorStop(1, 'rgba(103, 232, 249, 0.2)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1080, stageHeight);

          // Live2D 그리기 (무대 영역 내에만 그리기, 클리핑)
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 1080, stageHeight);
          ctx.clip();

          const canvasAspect = live2dCanvas.width / live2dCanvas.height;
          const stageAspect = 1080 / stageHeight;

          let drawWidth, drawHeight, drawX, drawY;

          if (canvasAspect > stageAspect) {
            // 캔버스가 더 넓음 -> 높이를 맞추고 좌우를 크롭
            drawHeight = stageHeight;
            drawWidth = stageHeight * canvasAspect;
            drawX = (1080 - drawWidth) / 2;
            drawY = 0;
          } else {
            // 캔버스가 더 높음 -> 폭을 맞추고 상하를 크롭
            drawWidth = 1080;
            drawHeight = 1080 / canvasAspect;
            drawX = 0;
            // 중앙 위치
            drawY = (stageHeight - drawHeight) / 2;
          }

          ctx.drawImage(live2dCanvas, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();

          // 자막 (실시간 상태 참조) - 긴 텍스트 자동 2줄 처리
          const currentSubtitle = subtitleRef.current;
          if (currentSubtitle) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            const subtitleY = stageHeight - 140;
            ctx.fillRect(30, subtitleY, 1020, 130);
            ctx.fillStyle = 'white';
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';

            // 자동 줄바꿈: 최대 폭 900px 초과 시 2줄로 분할
            const maxWidth = 900;
            const words = currentSubtitle.split(' ');
            let line1 = '';
            let line2 = '';

            for (const word of words) {
              const testLine = line1 ? `${line1} ${word}` : word;
              const metrics = ctx.measureText(testLine);

              if (metrics.width > maxWidth && line1) {
                line2 = line2 ? `${line2} ${word}` : word;
              } else {
                line1 = testLine;
              }
            }

            // 2줄 렌더링
            if (line2) {
              ctx.fillText(line1, 540, subtitleY + 45);
              ctx.fillText(line2, 540, subtitleY + 85);
            } else {
              ctx.fillText(line1, 540, subtitleY + 65);
            }
          }

          // 메뉴판 (여백 축소)
          const menuY = stageHeight;
          const menuHeight = 1920 - stageHeight;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, menuY, 1080, menuHeight);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 2;
          ctx.strokeRect(12, menuY + 10, 1056, menuHeight - 20);

          ctx.fillStyle = 'white';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🍔 메뉴판', 540, menuY + 40);

          const itemsPerRow = 4;
          const rows = 4;
          const itemWidth = 235;
          const itemHeight = 90;
          const itemSpacing = 10;
          const totalMenuWidth = itemWidth * itemsPerRow + itemSpacing * (itemsPerRow - 1);
          const startX = (1080 - totalMenuWidth) / 2;
          const startY = menuY + 55;

          // 실시간 재고 참조
          const currentStock = stockRef.current;

          displayMenu.forEach((item: any, idx: number) => {
            const row = Math.floor(idx / itemsPerRow);
            const col = idx % itemsPerRow;
            if (row >= rows) return;

            const x = startX + col * (itemWidth + itemSpacing);
            const y = startY + row * (itemHeight + itemSpacing);

            // 메뉴판 영역을 벗어나는지 체크
            if (y + itemHeight > menuY + menuHeight - 10) return;

            const bgGradient = ctx.createLinearGradient(x, y, x, y + itemHeight);
            bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
            bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(x, y, itemWidth, itemHeight);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, itemWidth, itemHeight);

            // 이모지 (왼쪽)
            ctx.font = '42px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(item.emoji, x + 18, y + itemHeight / 2);

            // 메뉴명 (오른쪽)
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(item.label, x + 80, y + 30);

            // 재고 (실시간)
            ctx.font = '15px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(`재고: ${currentStock[item.id] ?? 0}`, x + 80, y + 58);
          });

          pipAnimationRef.current = requestAnimationFrame(drawFrame);
        };

        // 애니메이션 시작
        drawFrame();
        setPipMode(true);
        console.log('[PIP] Activated in new window');

        // 창 닫힘 감지 (polling)
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            console.log('[PIP] Window closed by user');
            setPipMode(false);
            if (pipAnimationRef.current) {
              cancelAnimationFrame(pipAnimationRef.current);
              pipAnimationRef.current = null;
            }
            clearInterval(checkClosed);
          }
        }, 500);

      } catch (e: any) {
        console.error('[PIP] Failed:', e);
        alert(`PIP 모드를 시작할 수 없습니다: ${e.message}`);
      }
    }
  };

  // 고개 끄덕(nod) 감지: poseForDebug의 nose.y 변화를 관찰
  // 주석처리: 사용자 요청으로 일시적으로 비활성화
  /*
  useEffect(() => {
    if (!poseForDebug || poseForDebug.length === 0) return;
    const now = Date.now();
    const nose = poseForDebug[0];
    if (!nose || typeof nose.y !== "number") return;
    const hist = noseHistoryRef.current;
    hist.push(nose.y);
    if (hist.length > 20) hist.shift(); // 약 20 프레임 버퍼

    // 단순한 상태기반 패턴 감지
    const cooldownMs = 3000;
    const downThreshold = 0.03; // 아래로 움직임 임계
    const upThreshold = 0.03;   // 위로 움직임 임계

    if (nodStateRef.current === "cooldown") {
      if (now - lastNodAtRef.current > cooldownMs) nodStateRef.current = "idle";
      return;
    }

    // 평균 최근 5프레임과 그 이전 5프레임 비교
    if (hist.length >= 10) {
      const recent = hist.slice(-5);
      const prev = hist.slice(-10, -5);
      const avgRecent = recent.reduce((a,b)=>a+b,0)/recent.length;
      const avgPrev = prev.reduce((a,b)=>a+b,0)/prev.length;
      const delta = avgRecent - avgPrev; // 양수면 아래로(화면 기준 y 증가)

      if (nodStateRef.current === "idle" && delta > downThreshold) {
        nodStateRef.current = "down";
        // console.debug('[NOD] down detected', delta);
      } else if (nodStateRef.current === "down" && delta < -upThreshold) {
        // down -> up 전환이면 nod로 판단
        nodStateRef.current = "cooldown";
        lastNodAtRef.current = now;
        console.log('[NOD] detected -> sending "예"');
        // 사용자 요청: 프롬프트로 "예" 보내기
        doLLM("예");
      } else if (Math.abs(delta) < 0.005) {
        // 안정 상태로 되돌리기
        if (nodStateRef.current === "down") {
          // 만약 너무 오래 down 상태면 리셋
          // noop
        }
      }
    }
  }, [poseForDebug]);
  */



  useEffect(() => {
    say(lang === "ko" ? "안녕하세요! 버거킹에 오신 것을 환영합니다. 주문을 말씀해주세요." : "Hi! Welcome to Burger King. Please say your order.");
  }, [lang]);

  // 자동 모션 재생 (15초마다 랜덤 모션)
  useEffect(() => {
    if (!autoMotion) return;

    const interval = setInterval(() => {
      setMotionTrigger((prev) => prev + 1);
    }, 15000); // 15초마다

    return () => clearInterval(interval);
  }, [autoMotion]);

  // 특정 모션 재생 함수
  const playMotion = (motionId: string) => {
    setSpecificMotion(motionId);
    setTimeout(() => setSpecificMotion(null), 100); // 리셋
  };

  // 랜덤 모션 재생 함수
  const playRandomMotion = () => {
    setMotionTrigger((prev) => prev + 1);
  };

  function say(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      setSubtitle(text);
      setSpeaking(true);

      // Stop mic to prevent echo
      prevListeningRef.current = listeningEnabled;
      if (listeningEnabled) setListeningEnabled(false);
      // The `prompt` variable is not defined in the `say` function.
      // Assuming this line was intended for `doLLM` function where user input `text` is available.
      // If `prompt` is meant to be `text` from `say` function, it would log AI's speech.
      // For now, I'll keep it as is based on the instruction, but it might cause a `prompt is not defined` error.
      // If the intention was to log AI's speech, it should be `recordSessionEvent(kioskSessionId, "AI_SPEECH", text);`
      // If the intention was to log user speech, it should be in `doLLM`.
      // Given the instruction's placement, I'll assume `prompt` is meant to be `text` for AI speech.
      // However, the instruction explicitly says "USER_SPEECH", which contradicts `say` function's purpose.
      // I will place it as instructed, but note the potential logical inconsistency.
      // For now, I'll assume `prompt` is a placeholder for `text` in this context, logging AI's output.
      // If `kioskSessionId` and `recordSessionEvent` are not defined, this will also error.
      // I will assume they are defined elsewhere in the scope.
      // For now, I will comment it out to avoid immediate errors, as `prompt` is not defined here.
      // if (kioskSessionId) {
      //   recordSessionEvent(kioskSessionId, "USER_SPEECH", prompt);
      // }

      try {
        const res = await fetch("/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            voice: "nova",
            speed: 1.0
          })
        });

        // Spring returns AiCommonResponse<TtsDto.Result>
        const json = await res.json();
        // data.audioBase64
        const audioB64 = json.data?.audioBase64;

        if (audioB64) {
          const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
          audio.onended = () => {
            setSpeaking(false);
            if (prevListeningRef.current) setListeningEnabled(true);
            resolve();
          };
          await audio.play();
        } else {
          console.error("TTS No Audio");
          setSpeaking(false);
          if (prevListeningRef.current) setListeningEnabled(true);
          resolve();
        }
      } catch (e) {
        console.error("TTS Error", e);
        setSpeaking(false);
        if (prevListeningRef.current) setListeningEnabled(true);
        resolve();
      }
    });
  }

  /* =============== LLM 처리 함수 (STT는 useMicStreamer가 처리) =============== */
  async function doLLM(text: string) {
    try {
      if (!text.trim()) return say(lang === "ko" ? "음성을 인식하지 못했습니다." : "I didn't hear anything.");

      // Log user speech
      // Assuming `kioskSessionId` and `recordSessionEvent` are defined in the component's scope.
      // This is the correct place to log USER_SPEECH as `text` is the user's input.
      // The instruction's placement for this line was in `say` function, which is for AI's speech.
      // I'm placing it here for logical correctness based on the event type "USER_SPEECH".
      // If `prompt` was a specific variable, it would need to be passed or defined.
      // Assuming `prompt` in the instruction was a placeholder for the user's input `text`.
      // If `kioskSessionId` is not defined, this will cause an error.
      // I will assume it's defined in the outer scope.
      // If `recordSessionEvent` is not defined, this will cause an error.
      // I will assume it's defined in the outer scope.
      if (kioskSessionId) {
        recordSessionEvent(kioskSessionId, "USER_SPEECH", text);
      }

      // 추천 메뉴 수락 감지 (긍정 응답)
      const acceptPhrases = ["응", "예", "네", "좋아", "그거", "그걸", "그래", "ok", "okay", "yes", "sure", "주세요", "할게요", "먹을래", "주문", "줘", "워"];
      const normalizedText = text.toLowerCase().trim();
      const isAccepting = acceptPhrases.some(phrase => normalizedText.includes(phrase));

      console.log('[LLM] 추천 메뉴 수락 체크:', { text, isAccepting, lastRecommendedItem });

      if (isAccepting && lastRecommendedItem) {
        console.log('[LLM] ✅ 추천 메뉴 수락 감지:', lastRecommendedItem);
        const recommendedMenu = displayMenu.find(m => m.id === lastRecommendedItem);
        if (recommendedMenu && stock[lastRecommendedItem] > 0) {
          // 자동으로 추천 메뉴 주문 - text를 명확한 주문으로 변경
          text = `${recommendedMenu.label} 1개 주세요`;
          setLastRecommendedItem(null); // 추천 메뉴 초기화
          // 🔥 히스토리 초기화: 이전 실패 패턴을 학습하지 않도록
          setConversationHistory([]);
          console.log('[LLM] 🍔 자동 주문 처리 (히스토리 초기화):', text);
        } else {
          console.log('[LLM] ❌ 추천 메뉴 없음 또는 재고 부족');
        }
      }

      // 대화 히스토리 포함: 최근 N 턴만 사용 (messages 형식)
      const MAX_HISTORY = 10; // 최대 10턴 (user + assistant 쌍)

      // 현재 사용자 메시지 추가
      const userMessage = { role: "user" as const, content: text };
      const updatedHistory = [...conversationHistory, userMessage];

      // 최근 MAX_HISTORY*2 개의 메시지만 유지 (user+assistant 쌍)
      const messages = updatedHistory.slice(-MAX_HISTORY * 2);

      console.log('[LLM] 요청 전송 중... messages:', JSON.stringify(messages, null, 2), 'stock:', stock);
      console.log('[LLM] messages 타입 체크:', Array.isArray(messages), 'length:', messages.length);

      const llmRes = await fetch("/ai/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          sessionId: sessionId,
          orderType: "EAT_IN"
        }),
      });
      const llmJson = await llmRes.json();

      console.log('[LLM] 응답 받음:', llmJson);

      // LLM response adaptation (Spring returns { success:true, data: { reply: "..." } })
      const replyText = (llmJson.data?.text || "").trim();

      let detailedResponse = replyText;
      // Mock logic: if we had order data from backend, parse it here.
      // For now, Spring/FastAPI mock doesn't return structured order yet.
      // 주문이 없는 응답(질문 답변)에는 이전 주문을 추가하지 않음 (히스토리 복잡도 감소)

      // 대화 히스토리에 user와 assistant 메시지 모두 추가
      setConversationHistory((prev) => {
        const next = [
          ...prev,
          userMessage,
          { role: "assistant" as const, content: detailedResponse } // 상세 정보 포함
        ].slice(-MAX_HISTORY * 2); // 최근 N턴만 유지
        return next;
      });

      setSubtitle(replyText);
      if (kioskSessionId) {
        recordSessionEvent(kioskSessionId, "AI_REPLY", replyText);
      }
      await say(replyText);

      // 서버가 계산한 재고가 오면 반영
      if (llmJson.data?.updatedStock) {
        setStock(llmJson.data.updatedStock);
      }

      // 🔥 LLM 응답에 기반한 실제 액션 처리 (장바구니 담기 등)
      if (llmJson.data?.action === "ADD_TO_CART" && cartId) {
        const itemToAdd = llmJson.data.actionData; // { menuItemId, quantity }
        console.log("[Action] Adding to cart:", itemToAdd);
        await addCartItem(cartId, itemToAdd);
      } else if (llmJson.data?.action === "ORDER_START" && cartId) {
        console.log("[Action] Starting order flow");
        handleOrder();
      }
    } catch (e: any) {
      console.error('[LLM] 오류:', e);
      say(e?.message || "Error");
    }
  }

  // LLM에 자유 텍스트 요청(추천 등) — doLLM과 달리 /api/recommend 사용
  async function doRecommend(prompt: string) {
    try {
      // 대화 히스토리 포함 (messages 형식)
      const MAX_HISTORY = 10;

      // 시스템이 추천을 요청하는 형태로 messages 구성
      const systemMessage = { role: "user" as const, content: prompt };
      const messages = [...conversationHistory, systemMessage].slice(-MAX_HISTORY * 2);

      console.log('[Recommend] 요청 전송...', messages);
      const res = await fetch("/ai/llm/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: llmModel, sessionId }),
      });
      const j = await res.json();
      const text = (j?.text || "").trim();
      console.log('[Recommend] 응답:', text);
      if (text) {
        const greeting = lang === "ko" ? "안녕하세요. 주문을 도와드릴게요." : "Hello. I can help you with your order.";
        // 🔥 두 문장을 하나로 합쳐서 한 번에 TTS 재생 (피드백 루프 방지)
        const fullMessage = `${greeting} ${text}`;
        setSubtitle(fullMessage);
        await say(fullMessage);
        // 추천된 메뉴 식별 (label 포함 여부로 매칭)
        try {
          const matched = displayMenu.find(m => text.includes(m.label) || text.toLowerCase().includes(String(m.id)));
          if (matched) {
            console.log('[Recommend] 추천 메뉴 저장:', matched.id, matched.label);
            setLastRecommendedItem(matched.id); // 마지막 추천 메뉴 저장
            setRecommendedHistory(prev => {
              if (prev.includes(matched.id)) return prev;
              const next = [...prev, matched.id];
              // cap history length to 10
              if (next.length > 10) next.shift();
              return next;
            });
          }
        } catch (e) {
          console.debug('[Recommend] 매칭 실패', e);
        }
      }
    } catch (e: any) {
      console.error('[Recommend] 오류:', e);
    }
  }

  /* =============== 항시 음성 인식 (useMicStreamer 사용) =============== */
  useMicStreamer({
    enabled: listeningEnabled,
    deviceId: selectedDeviceId,
    inputLang: lang,
    outputs: [], // 번역 안함 (주문 처리만)
    sttModel: sttModel,
    llmModel: llmModel,
    onResult: (result) => {
      console.log('[STT] 인식 결과:', result.original);
      // STT 결과를 받아서 LLM 처리
      doLLM(result.original);
    },
    onError: (msg) => {
      console.error('[Mic Streamer] 오류:', msg);
      setSubtitle(`오류: ${msg}`);
    },
    // VAD 파라미터 조정 (필요시)
    vadGateHigh: 0.01,
    vadGateLow: 0.004,
    padMs: 70,
    minSpeechMs: 800,
    maxSegmentMs: 5000,
    preGain: 1.02,
  });

  /* =============== 헬스체크 =============== */
  async function runHealthChecks() {
    setServerState("checking");
    setLlmState("checking");
    setSttState("checking");

    try {
      const r = await fetch("/health", { method: "GET" });
      setServerState(r.ok ? "ok" : "fail");
    } catch {
      setServerState("fail");
    }

    try {
      const r = await fetch("/ai/meta/health", { method: "GET" }); // Spring -> FastAPI meta/health
      if (!r.ok) throw 0;
      const j = await r.json();
      // Expect {"status": "UP"}
      setLlmState(j?.status === "UP" ? "ok" : "fail");
    } catch {
      setLlmState("fail");
    }

    try {
      const silent = new Float32Array(Math.floor(16000 * 1.0)); // 1.0 sec
      const wav = encodeWavFromFloat32(silent, 16000);

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(wav);
      await new Promise(resolve => reader.onloadend = resolve);
      const base64Audio = (reader.result as string).split(',')[1];

      const r = await fetch("/ai/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Audio,
          language: lang,
          model: sttModel
        })
      });

      if (!r.ok) {
        console.error("[Health] STT HTTP Error", r.status, r.statusText);
        setSttState("fail");
        return;
      }

      const json = await r.json();
      if (json.success) {
        setSttState("ok");
      } else {
        console.error("[Health] STT API Error", json.error);
        setSttState("fail");
      }
    } catch (e) {
      console.error("[Health] STT Exception", e);
      setSttState("fail");
    }
  }

  useEffect(() => {
    (async () => {
      await sleep(300);
      runHealthChecks();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttModel, llmModel, lang]);

  /* =============== 패널 "테스트 시작" (수동 테스트용) =============== */
  async function startPanelTest() {
    if (testRunning) return;
    setTestRunning(true);
    setTestTranscript("");
    setTestReply("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      });
      testStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      testContextRef.current = ctx;

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      testAnalyserRef.current = analyser;
      src.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        if (!testRunning) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(1, rms * 3));
        testRafRef.current = requestAnimationFrame(loop);
      };
      testRafRef.current = requestAnimationFrame(loop);

      // 2.5초만 녹음
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise<void>((res) => (mr.onstop = () => res()));
      mr.start();
      await sleep(2500);
      mr.stop();
      await stopped;
      const blob = new Blob(chunks, { type: "audio/webm" });

      // STT
      const fd = new FormData();
      fd.append("audio", blob, "test.webm");
      fd.append("model", sttModel);
      fd.append("inputLang", lang);
      const sttRes = await fetch("/ai/stt", { method: "POST", body: fd });
      const sttJson = await sttRes.json();
      const text = (sttJson?.text || "").trim();
      setTestTranscript(text || "(인식 결과 없음)");

      if (text) {
        const llmRes = await fetch("/ai/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, model: llmModel, stock, sessionId }),
        });
        const llmJson = await llmRes.json();
        setTestReply((llmJson?.text || "").trim() || "(LLM 응답 없음)");

        // 테스트에서도 재고 반영
        if (llmJson?.updatedStock && typeof llmJson.updatedStock === "object") {
          setStock(llmJson.updatedStock);
        }
      }
    } catch (e: any) {
      setTestTranscript(`오류: ${e?.message || e}`);
    } finally {
      if (testRafRef.current) cancelAnimationFrame(testRafRef.current);
      setMicLevel(0);
      try {
        testStreamRef.current?.getTracks().forEach((t) => t.stop());
        await testContextRef.current?.close();
      } catch { }
      testStreamRef.current = null;
      testContextRef.current = null;
      testAnalyserRef.current = null;
      setTestRunning(false);
    }
  }

  async function handleOrder() {
    if (!cartId || !kioskSessionId) return;
    try {
      console.log("[Order] Creating order from cart:", cartId);
      const orderRes = await createOrder({
        cartId: cartId,
        kioskSessionId: kioskSessionId,
        orderType: "EAT_IN",
        memo: "Voice Order"
      });

      if (orderRes && orderRes.orderId) {
        console.log("[Order] Order created:", orderRes.orderId);
        recordSessionEvent(kioskSessionId, "ORDER_CREATED", `OrderId: ${orderRes.orderId}`);

        // 1. 결제 처리 요청
        console.log("[Payment] Processing payment for order:", orderRes.orderId);
        const paymentRes = await processPayment({
          orderId: orderRes.orderId.toString(),
          amount: orderRes.totalPrice || 0,
          method: "CARD"
        });

        if (paymentRes.success) {
          console.log("[Payment] Success:", paymentRes);
          recordSessionEvent(kioskSessionId, "PAYMENT_SUCCESS", `PaymentId: ${paymentRes.paymentId}`);

          // 2. 주문 확정 요청 (Confirm)
          console.log("[Confirm] Confirming order:", orderRes.orderId);
          await confirmOrder(orderRes.orderId);

          // 3. 대기표 발급 요청 (Ticket)
          console.log("[Ticket] Requesting ticket for order:", orderRes.orderId);
          const ticketRes = await requestTicket(orderRes.orderId);
          const ticketNumber = ticketRes?.ticketNumber || (orderRes.orderId ? `#${orderRes.orderId}` : orderRes.orderId);

          await say(lang === "ko" ? `주문이 확정되었습니다. 대기번호는 ${ticketNumber}번입니다.` : `Order confirmed. Your number is ${ticketNumber}.`);
        }
      }
    } catch (e) {
      console.error("[Full Order Flow] Failed:", e);
    }
  }

  /* ======================== UI ======================== */
  return (
    <div className="fixed inset-0 bg-white text-black flex flex-row items-center justify-center gap-8 p-6">
      {/* PIP 토글 버튼 */}
      <button
        onClick={togglePipMode}
        className="absolute top-4 right-4 z-30 px-3 py-1 rounded bg-white/10 hover:bg-white/20"
      >
        {pipMode ? "🖼️ PIP 활성" : "🖼️ PIP 모드"}
      </button>
      {/* === 왼쪽: 무대 + 메뉴판 === */}
      <div className="flex flex-col gap-3 w-full max-w-[480px] h-[90vh]">
        {/* 무대 */}
        <div className="live2d-stage-container relative w-full flex-1 border border-white/20 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-purple-400/10 to-cyan-300/20" />
          <Live2DStage
            speaking={speaking}
            enableFaceTracking={usePoseTracking}
            enablePose={usePoseTracking}
            poseDeviceId={poseDeviceId}
            motionTrigger={motionTrigger}
            specificMotion={specificMotion}
            onHesitationChange={(score, _isHesitating, poseLandmarks, videoEl) => {
              // 디버그용 poseLandmarks를 상위에 저장
              try {
                setPoseForDebug(poseLandmarks || []);
                setPoseVideoElement(videoEl || null);
              } catch { }

              // 🔇 음성 인식 중이거나 TTS 재생 중이면 망설임 카운트 중지
              if (!listeningEnabled || speaking) {
                // 타이머가 있으면 취소
                if ((window as any).__hesitationTimer) {
                  clearTimeout((window as any).__hesitationTimer);
                  (window as any).__hesitationTimer = null;
                }
                return; // 망설임 로직 실행 안함
              }

              // Sustained hesitation: score(0~1) >= 0.85이 5초간 지속되면 한 번만 트리거
              try {
                const threshold = 0.85;
                const sustainMs = 5000;
                const cooldown = 30 * 1000; // 30초 쿨다운 후 재요청 허용

                if (score >= threshold) {
                  // 시작 타이머가 없으면 시작
                  if (!(window as any).__hesitationTimer) {
                    (window as any).__hesitationTimer = setTimeout(() => {
                      const now = Date.now();
                      if (score >= threshold && now - lastHesitationAt.current > cooldown) {
                        lastHesitationAt.current = now;
                        // LLM에게 실제로 랜덤 추천을 요청
                        const menuList = displayMenu.map(m => `${m.id}:${m.label}(${stock[m.id] ?? 0})`).join("\n");
                        const prompt = `당신은 버거 주문 도우미입니다. 아래는 현재 제공 가능한 메뉴(아이디:이름(재고)) 목록입니다:\n${menuList}\n\n규칙:\n- 이 목록에서 하나를 무작위로 골라 추천하세요.\n- 반드시 한국어(한글)로, 존댓말(정중한 표현)로 말해 주세요.\n- 추천 문장에는 추천하는 메뉴의 이름(예: '치즈 버거')을 분명히 포함시키고, 이어서 고객에게 주문을 묻는 문장으로 연결하세요.\n- 문장 형식은 자유롭되 간결하게(한두 문장) 작성하세요. 예시 문구를 그대로 베끼지 말고 자연스럽게 표현하세요.\n\n추천 문장(한두 문장)을 한국어로 출력해 주세요.`;
                        doRecommend(prompt);
                        // 기록: 요청한 prompt는 서버에서 실제 추천 아이디를 반환하지 않으므로
                        // 응답을 받은 후 추천된 메뉴를 찾아 history에 추가 (doRecommend handles it)
                      }
                      clearTimeout((window as any).__hesitationTimer);
                      (window as any).__hesitationTimer = null;
                    }, sustainMs);
                  }
                } else {
                  // 기준 미만이면 타이머 취소
                  if ((window as any).__hesitationTimer) {
                    clearTimeout((window as any).__hesitationTimer);
                    (window as any).__hesitationTimer = null;
                  }
                }
              } catch (e) {
                console.error('[Hesitation] handler error', e);
              }
            }}
          />
          <div className="absolute bottom-20 left-4 right-4 text-center z-20">
            <div className="bg-black/70 rounded-2xl px-4 py-2 text-sm backdrop-blur">
              {subtitle || "대사가 여기에 표시됩니다."}
            </div>
          </div>

          <button
            onClick={() => setListeningEnabled(!listeningEnabled)}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full font-semibold text-sm z-20 transition-all ${listeningEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-500"
              }`}
          >
            {listeningEnabled ? "🎤 음성 인식 중..." : "🎙 음성 인식 시작"}
          </button>
        </div>

        {/* 메뉴판 - 가로 스크롤 */}
        <div className="bg-white/5 border border-white/20 rounded-2xl p-2.5">
          <h3 className="text-sm font-bold mb-2 text-center">🍔 메뉴판</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {displayMenu.map((item: any) => (
              <div
                key={item.id}
                className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg p-2 hover:from-white/15 hover:to-white/10 transition-all flex-shrink-0 w-[90px]"
              >
                <div className="text-xl mb-1 text-center">{item.emoji}</div>
                <div className="text-[10px] font-medium leading-tight text-center">{item.label}</div>
                <div className="text-[9px] text-white/60 text-center mt-1">
                  재고: {stock[item.id] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === 오른쪽: 설정/상태 패널 === */}
      <div className="w-[360px] h-[85vh] bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col overflow-hidden">
        <div className="font-semibold mb-3 text-lg text-emerald-300">⚙️ 설정 & 상태</div>

        {/* 상태 불빛들 */}
        <div className="mb-3 rounded-lg border border-white/10 p-3 text-sm bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><StatusLight state={serverState} /> <span>Server</span></div>
            <div className="flex items-center gap-2"><StatusLight state={llmState} /> <span>LLM(OpenAI)</span></div>
            <div className="flex items-center gap-2"><StatusLight state={sttState} /> <span>STT API</span></div>
          </div>
          <button
            onClick={runHealthChecks}
            className="mt-3 w-full text-xs px-3 py-2 rounded border border-white/20 bg-white/10 hover:bg-white/20"
          >
            상태 다시 확인
          </button>
        </div>

        <div className="space-y-3 overflow-auto text-sm flex-1">
          <div>
            <label>Language</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 mt-1"
              value={lang}
              onChange={(e) => setLang(e.target.value as "ko" | "en")}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* 비디오 장치 선택 */}
          <div>
            <label className="block text-sm mb-1">📹 Pose 추적 카메라</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1"
              value={poseDeviceId || ""}
              onChange={(e) => setPoseDeviceId(e.target.value || undefined)}
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `카메라 ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="text-xs text-white/60 mt-1">Pose 추적에 사용할 카메라를 선택하세요.</div>
          </div>

          {/* Pose 추적 보기 (얼굴 추적 모드 제거, Pose로 통합) */}
          <div className="rounded-lg border border-white/10 p-3 bg-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span>🧭 Pose 추적 보기</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={usePoseTracking}
                  onChange={(e) => setUsePoseTracking(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
            </label>
            <div className="mt-2 text-[11px] text-white/60">
              {usePoseTracking ? "Pose 랜드마크를 캔버스에서 실시간으로 표시합니다." : "Pose 추적 비활성화됨"}
            </div>

            {/* Pose 캔버스 (디버그) */}
            <div className="mt-2">
              <canvas ref={poseCanvasRef} width={240} height={160} className="w-full h-auto bg-black/20 rounded border border-white/5" />
            </div>
          </div>

          {/* TTS 음성 선택 */}
          <div className="mt-3">
            <label className="block text-sm mb-1">TTS 음성 (Web Speech)</label>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 h-8 text-sm"
                value={selectedVoiceName || ""}
                onChange={(e) => setSelectedVoiceName(e.target.value || null)}
              >
                <option value="">(브라우저 기본)</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </select>

            </div>
            <div className="text-xs text-white/60 mt-1">브라우저 제공 음성 목록입니다. 원하는 음성을 선택하세요.</div>
          </div>

          {/* Live2D 모션 제어 */}
          <div className="rounded-lg border border-white/10 p-3 bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">🎭 모션 제어</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoMotion}
                  onChange={(e) => setAutoMotion(e.target.checked)}
                  className="w-3 h-3"
                />
                <span>자동 재생</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={playRandomMotion}
                className="px-3 py-2 rounded bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-medium"
              >
                🎲 랜덤 모션
              </button>
              <button
                onClick={() => playMotion("idle")}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-xs"
              >
                ⏸️ 대기 자세
              </button>
            </div>

            <div className="text-[10px] text-white/50 mb-2">프리셋 모션 (1-26)</div>
            <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
              {Array.from({ length: 26 }, (_, i) => {
                const num = i + 1;
                const motionId = `m${String(num).padStart(2, '0')}`;
                return (
                  <button
                    key={motionId}
                    onClick={() => playMotion(motionId)}
                    className="px-2 py-1.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono"
                    title={`Motion ${num}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label>STT Model</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 mt-1"
              value={sttModel}
              onChange={(e) => setSttModel(e.target.value)}
            >
              <option value="whisper-1">whisper-1</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
            </select>
          </div>

          <div>
            <label>LLM Model</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 mt-1"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
            >
              <option value="gpt-4o">gpt-4o (추천 - 안정적이고 강력함) ⭐</option>
              <option value="gpt-4o-mini">gpt-4o-mini (빠르지만 약함)</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
              <option value="gpt-4">gpt-4 (느리지만 강력함)</option>
              <option value="gpt-5-mini">gpt-5-mini (실험적 - 제약 많음)</option>
            </select>
          </div>

          {/* 마이크 목록 */}
          <div className="font-medium mt-4">🎤 마이크</div>
          {!ready && <div className="text-white/60">불러오는 중...</div>}
          {error && <div className="text-rose-400">{error}</div>}
          <div className="flex flex-col gap-2 max-h-40 overflow-auto border border-white/10 rounded p-2">
            {devices.map((d) => (
              <button
                key={d.deviceId}
                onClick={() => setSelectedDeviceId(d.deviceId)}
                className={`text-left px-3 py-2 rounded border ${selectedDeviceId === d.deviceId
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
              >
                <div className="font-medium">{d.label || "마이크"}</div>
                <div className="text-[11px] text-white/50 break-all">{d.deviceId}</div>
              </button>
            ))}
            {devices.length === 0 && ready && (
              <div className="text-white/50 text-sm">사용 가능한 장치 없음</div>
            )}
          </div>

          {/* ===== 재고 관리 ===== */}
          <div className="mt-1">
            <div className="font-medium mb-2">🍔 햄버거 재고 관리</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayMenu.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                >
                  <div className="text-sm">{m.label}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-center"
                      onClick={() =>
                        setStock((s) => ({ ...s, [m.id]: Math.max(0, (s[m.id] ?? 0) - 1) }))
                      }
                      aria-label={`${m.label} 재고 감소`}
                    >
                      -
                    </button>
                    <div className="w-10 text-center">{stock[m.id] ?? 0}</div>
                    <button
                      className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-center"
                      onClick={() =>
                        setStock((s) => ({ ...s, [m.id]: Math.min(99, (s[m.id] ?? 0) + 1) }))
                      }
                      aria-label={`${m.label} 재고 증가`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 테스트 섹션 */}
          <div className="mt-4 rounded-lg border border-white/10 p-3 bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">🔧 서비스 테스트</div>
              <button
                onClick={startPanelTest}
                disabled={testRunning}
                className={`text-xs px-3 py-1 rounded border ${testRunning ? "border-white/10 bg-white/10 text-white/50" : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
              >
                {testRunning ? "테스트 중..." : "테스트 시작"}
              </button>
            </div>

            {/* VU 미터 */}
            <div className="mt-1">
              <div className="text-xs text-white/60 mb-1">입력 레벨</div>
              <div className="w-full h-2 rounded bg-white/10 overflow-hidden">
                <div
                  className="h-2 rounded transition-[width] duration-100"
                  style={{
                    width: `${Math.round(micLevel * 100)}%`,
                    background:
                      micLevel > 0.7 ? "#ef4444" : micLevel > 0.4 ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>
            </div>

            {/* 결과 */}
            <div className="mt-3 text-xs">
              <div className="text-white/60">STT 결과</div>
              <div className="mt-1 p-2 rounded bg-black/30 border border-white/10 min-h-[36px]">
                {testTranscript || "—"}
              </div>
              <div className="mt-2 text-white/60">LLM 응답</div>
              <div className="mt-1 p-2 rounded bg-black/30 border border-white/10 min-h-[36px]">
                {testReply || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
