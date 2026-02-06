import { useEffect, useRef, useState } from "react";
import { FaceMesh, Results as FaceResults } from "@mediapipe/face_mesh";
import { Pose, Results as PoseResults } from "@mediapipe/pose";
import { Hands, Results as HandsResults } from "@mediapipe/hands";

interface FaceTrackingResult {
  facePosition: { x: number; y: number };
  isDetecting: boolean;
  error: string | null;
  // 포즈 기반 망설임 힌트 (0~1), threshold 이상이면 망설임으로 판단
  hesitationScore: number;
  isHesitating: boolean;
  videoElement?: HTMLVideoElement | null;
  faceResults?: FaceResults | null;
  poseResults?: PoseResults | null;
  handsResults?: HandsResults | null;
}

/**
 * MediaPipe Face Mesh를 사용하여 웹캠에서 얼굴을 추적하는 훅
 * @param enabled - 얼굴 추적 활성화 여부
 * @param enablePose - Pose 추적 활성화 여부
 * @param deviceId - 사용할 비디오 장치 ID (선택적)
 * @returns 얼굴 위치, 감지 상태, 에러 정보
 */
export function useFaceTracking(enabled: boolean, enablePose = false, deviceId?: string): FaceTrackingResult & { poseLandmarks: any[] } {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const originalConsoleRef = useRef<{ warn: any; info: any } | null>(null);

  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 });
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hesitationScore, setHesitationScore] = useState(0);
  const [isHesitating, setIsHesitating] = useState(false);
  const [poseLandmarks, setPoseLandmarks] = useState<any[]>([]);
  const [faceResults, setFaceResults] = useState<FaceResults | null>(null);
  const [poseResults, setPoseResults] = useState<PoseResults | null>(null);
  const [handsResults, setHandsResults] = useState<HandsResults | null>(null);

  // Throttle을 위한 ref (매 프레임마다 setState 호출 방지)
  const lastUpdateRef = useRef({ face: 0, pose: 0, hands: 0, hesitation: 0, logError: 0 });
  const UPDATE_INTERVAL = 33; // ~30fps

  // 스무딩을 위한 이전 위치 저장 (떨림 방지)
  const smoothedPositionRef = useRef({ x: 0, y: 0 });

  // MediaPipe ready flags (must be at component level to survive Strict Mode)
  const faceReadyRef = useRef(false);
  const poseReadyRef = useRef(false);
  const handsReadyRef = useRef(false);
  const SMOOTHING_FACTOR = 0.3; // 0~1, 낮을수록 부드럽고 느리게 반응 (0.3 = 70% 이전값 + 30% 새값)

  // cleanup 함수를 외부에 정의하여 useEffect에서 참조 가능하도록
  const cleanup = () => {
    try {
      // 상태 먼저 초기화
      setIsDetecting(false);
      setFacePosition({ x: 0, y: 0 });

      // 애니메이션 프레임 취소
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // 비디오 스트림 먼저 중지 (가장 중요)
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {
              // 이미 중지된 경우 무시
            }
          });
        }
        videoRef.current.srcObject = null;
      }

      // FaceMesh 정리
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (e) {
          // FaceMesh 정리 실패 시 무시
        }
        // Don't set to null - Strict Mode will call cleanup while mounted
      }

      // Pose 정리
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) { }
        // Don't set to null
      }

      // Hands 정리
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) { }
        // Don't set to null
      }

      // 비디오 요소 DOM에서 제거
      if (videoRef.current) {
        try {
          // parentNode와 parentElement를 모두 확인하여 안전하게 제거
          const video = videoRef.current;
          if (video && video.parentNode && video.parentNode.contains(video)) {
            video.parentNode.removeChild(video);
          }
        } catch (e) {
          // 이미 제거된 경우 무시
        }
        videoRef.current = null;
      }

      // console 복원
      if (originalConsoleRef.current) {
        console.warn = originalConsoleRef.current.warn;
        console.info = originalConsoleRef.current.info;
        originalConsoleRef.current = null;
      }
    } catch (e) {
      console.error("[useFaceTracking] Cleanup error:", e);
    }
  };

  useEffect(() => {
    if (!enabled && !enablePose) {
      // 비활성화 시 즉시 상태 초기화
      setIsDetecting(false);
      setFacePosition({ x: 0, y: 0 });
      setError(null);
      cleanup();
      return;
    }

    // deviceId가 변경되면 기존 카메라를 먼저 정리
    console.log('[useFaceTracking] Initializing with deviceId:', deviceId);
    cleanup();

    let mounted = true;

    const initFaceTracking = async () => {
      try {
        // 비디오 엘리먼트 생성 (가시성을 유지하되 화면 밖으로 밀어냄)
        const video = document.createElement("video");
        video.setAttribute('data-mediapipe', 'true'); // 디버그 패널이 쉽게 찾을 수 있도록 태그 추가
        video.style.position = "absolute";
        video.style.left = "-10000px";
        video.style.top = "0";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";
        video.muted = true;
        video.autoplay = true;
        (video as any).playsInline = true;
        video.width = 640;
        video.height = 480;
        videoRef.current = video;
        setVideoElement(video);
        document.body.appendChild(video);

        // MediaPipe 파일 경로 통합 관리 (타입 호환성 수정)
        const getMediaPipeFile = (file: string, prefix?: string): string => {
          const baseUrl = "https://cdn.jsdelivr.net/npm";
          const fileName = file.split('/').pop() || file;

          // 패키지별 버전 고정
          const versions: Record<string, string> = {
            'face_mesh': '0.4.1633559619',
            'hands': '0.4.1675469240',
            'pose': '0.5.1675469404'
          };

          // 파일명에 맞는 패키지 찾기
          if (fileName.includes('face_mesh') || fileName.includes('face_landmark') || fileName.includes('face_detection') || fileName.includes('face_geometry')) {
            return `${baseUrl}/@mediapipe/face_mesh@${versions.face_mesh}/${fileName}`;
          }
          if (fileName.includes('hand')) {
            return `${baseUrl}/@mediapipe/hands@${versions.hands}/${fileName}`;
          }
          if (fileName.includes('pose')) {
            return `${baseUrl}/@mediapipe/pose@${versions.pose}/${fileName}`;
          }
          if (fileName.includes('drawing_utils')) {
            return `${baseUrl}/@mediapipe/drawing_utils/${fileName}`;
          }

          // 추측 fallback
          const pkg = prefix?.includes('face') ? 'face_mesh' : (prefix?.includes('hand') ? 'hands' : 'pose');
          return `${baseUrl}/@mediapipe/${pkg}@${versions[pkg] || 'latest'}/${fileName}`;
        };

        // MediaPipe WASM 및 WebGL 로그 억제 (기존 방식 제거 - 충돌 원인)
        // MediaPipe 내부 모듈이 전역 상태를 오염시키지 않도록 설정하지 않음

        // 1. FaceMesh 초기화
        const faceMesh = new FaceMesh({ locateFile: getMediaPipeFile });
        faceMesh.setOptions({
          maxNumFaces: 1, // 한 명의 얼굴만 추적
          refineLandmarks: true, // 눈, 입술 등 세밀한 랜드마크 포함
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        let faceFrameCount = 0;
        faceMesh.onResults((results: FaceResults) => {
          if (!mounted) return;
          faceFrameCount++;
          if (faceFrameCount % 60 === 0) {
            console.log(`[useFaceTracking] 📹 FaceMesh received ${faceFrameCount} frames, detected: ${!!results.multiFaceLandmarks}`);
          }

          const now = Date.now();
          if (now - lastUpdateRef.current.face < UPDATE_INTERVAL) return;
          lastUpdateRef.current.face = now;

          if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
            const clonedLandmarks = results.multiFaceLandmarks.map(arr => arr.map(p => ({ ...p })));
            setFaceResults({ multiFaceLandmarks: clonedLandmarks } as any);
            const landmarks = results.multiFaceLandmarks[0];
            const noseTip = landmarks[1];
            const rawX = (0.5 - noseTip.x) * 2 * 1;
            const rawY = (noseTip.y - 0.5) * 2 * 1;

            smoothedPositionRef.current.x = smoothedPositionRef.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR;
            smoothedPositionRef.current.y = smoothedPositionRef.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR;

            setFacePosition({ x: smoothedPositionRef.current.x, y: -smoothedPositionRef.current.y });
            setIsDetecting(true);
            setError(null);
          } else {
            setIsDetecting(false);
            setFaceResults(null);
          }
        });
        faceMeshRef.current = faceMesh;

        // 2. Pose 초기화
        let pose: Pose | null = null;
        if (enablePose) {
          pose = new Pose({ locateFile: getMediaPipeFile });
        }

        if (pose) {
          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        // 히스토리/상태 (이동량 기반으로 망설임 판단)
        const lastMovementRef = { t: Date.now(), score: 0 };
        const movementDecay = 0.95;
        const movementThreshold = 0.02; // 작게 움직이면 무시
        const hesitationMs = 1500; // 이 시간 이상 작게 움직이면 망설임
        // moving average buffer for smoother movement estimate
        const movementHistory: number[] = [];
        const maxHistory = 24; // about 24 frames buffer

        if (pose) {
          pose.onResults((pResults: PoseResults) => {
            if (!mounted) return;

            const now = Date.now();

            if (!pResults.poseLandmarks || pResults.poseLandmarks.length === 0) {
              // Throttle 적용
              if (now - lastUpdateRef.current.pose < UPDATE_INTERVAL) return;
              lastUpdateRef.current.pose = now;

              // 포즈 감지 안됨 -> 망설임 판단 보수적으로 false
              setHesitationScore((s) => Math.max(0, s * movementDecay));
              setIsHesitating(false);
              setPoseLandmarks([]);
              setPoseResults(null);
              return;
            }

            // Clone pose landmarks
            const clonedPose = pResults.poseLandmarks.map(p => ({ ...p }));
            setPoseResults({ poseLandmarks: clonedPose } as any);
            setPoseLandmarks(clonedPose);

            // 관심 랜드마크: 코(0), 왼쪽어깨(11), 오른쪽어깨(12)
            const lm = pResults.poseLandmarks;

            const indexes = [0, 11, 12].filter(i => i < lm.length);
            let cx = 0, cy = 0, count = 0;
            for (const i of indexes) {
              cx += lm[i].x;
              cy += lm[i].y;
              count++;
            }
            if (count === 0) return;
            cx /= count; cy /= count;

            // 이전 값 비교
            const prev = (pose as any).__prevCenter || { x: cx, y: cy, t: Date.now() };
            const dx = cx - prev.x;
            const dy = cy - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            (pose as any).__prevCenter = { x: cx, y: cy, t: Date.now() };

            // 업데이트된 이동 score: push into history and compute avg
            movementHistory.push(dist);
            if (movementHistory.length > maxHistory) movementHistory.shift();
            const avgDist = movementHistory.reduce((a, b) => a + b, 0) / Math.max(1, movementHistory.length);

            // also keep an exponential-decayed peak for compatibility
            lastMovementRef.score = Math.max(avgDist, lastMovementRef.score * movementDecay);
            lastMovementRef.t = Date.now();

            // 망설임 스코어는 이동량의 역수 (작게 움직일수록 높음), clamp 0~1
            const raw = Math.min(1, Math.max(0, (movementThreshold - avgDist) / movementThreshold));

            // Throttle 적용 - 상태 업데이트
            if (now - lastUpdateRef.current.pose >= UPDATE_INTERVAL) {
              lastUpdateRef.current.pose = now;

              // 상태로 포즈 랜드마크 저장 (정규화 좌표)
              setPoseLandmarks(lm);

              // 부드럽게(이전 스코어 유지와 새 스코어의 완만한 결합)
              setHesitationScore((prev) => Math.max(prev * 0.9, raw));

              // 얼굴 위치(facePosition)도 pose의 코(0번)로 대체하여 설정 (Pose로 얼굴 추적)
              try {
                const nose = lm[0];
                if (nose) {
                  const rawX = (0.5 - nose.x) * 2 * 1;
                  const rawY = (nose.y - 0.5) * 2 * 1;

                  // 스무딩 적용: 이전 위치와 현재 위치의 가중 평균 (떨림 방지)
                  smoothedPositionRef.current.x = smoothedPositionRef.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR;
                  smoothedPositionRef.current.y = smoothedPositionRef.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR;

                  setFacePosition({ x: smoothedPositionRef.current.x, y: -smoothedPositionRef.current.y });
                  setIsDetecting(true);
                  setError(null);
                }
              } catch { }

              // 망설임 판정: 최근 이동이 매우 작고, 시간이 지났으면 true
              if (lastMovementRef.score < movementThreshold && now - lastMovementRef.t >= hesitationMs) {
                setIsHesitating(true);
              } else {
                setIsHesitating(false);
              }
            }
          });

          poseRef.current = pose;
        }

        // 3. Hands 초기화
        const hands = new Hands({ locateFile: getMediaPipeFile });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        hands.onResults((results) => {
          if (!mounted) return;
          const now = Date.now();
          if (now - lastUpdateRef.current.hands < UPDATE_INTERVAL) return;
          lastUpdateRef.current.hands = now;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            console.debug("[useFaceTracking] Hands detected:", results.multiHandLandmarks.length);
            const clonedHands = results.multiHandLandmarks.map(hand => hand.map(p => ({ ...p })));
            setHandsResults({ multiHandLandmarks: clonedHands } as any);
          } else {
            setHandsResults(null);
          }
        });
        handsRef.current = hands;

        // 웹캠 시작 - 직접 getUserMedia로 스트림을 얻은 후 비디오에 연결
        let stream: MediaStream;

        if (deviceId) {
          console.log('[useFaceTracking] Requesting camera with deviceId:', deviceId);
          try {
            // 먼저 exact로 시도
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: deviceId },
                width: 640,
                height: 480,
              },
              audio: false,
            });
            console.log('[useFaceTracking] Successfully got stream with exact deviceId');
          } catch (exactError) {
            console.warn('[useFaceTracking] exact deviceId failed, trying ideal:', exactError);
            // exact 실패 시 ideal로 시도
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: deviceId },
                width: 640,
                height: 480,
              },
              audio: false,
            });
            console.log('[useFaceTracking] Got stream with ideal deviceId');
          }
        } else {
          console.log('[useFaceTracking] Requesting default camera');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 640,
              height: 480,
            },
            audio: false,
          });
        }

        // 스트림을 비디오 요소에 연결
        video.srcObject = stream;
        await video.play();

        const activeTrack = stream.getVideoTracks()[0];
        console.log('[useFaceTracking] ✅ Video stream active:', activeTrack?.label);
        console.log('[useFaceTracking] ✅ Device ID:', activeTrack?.getSettings().deviceId);

        // 순차적 초기화
        const initModels = async () => {
          if ((window as any).__mediapipe_initializing) return;
          (window as any).__mediapipe_initializing = true;

          try {
            console.log("[useFaceTracking] 🛠 Initializing models...");

            if (!(window as any).Module) (window as any).Module = { arguments: [] };

            await faceMesh.initialize();
            faceReadyRef.current = true;
            console.log("[useFaceTracking] FaceMesh Ready");

            await new Promise(r => setTimeout(r, 300));

            if (pose) {
              await pose.initialize();
              poseReadyRef.current = true;
              console.log("[useFaceTracking] Pose Ready");
            }

            await new Promise(r => setTimeout(r, 300));

            await hands.initialize();
            handsReadyRef.current = true;
            console.log("[useFaceTracking] Hands Ready");

            await new Promise(r => setTimeout(r, 500));
            console.log("[useFaceTracking] 🚀 All MediaPipe models ready and stabilized!");
          } catch (initErr) {
            console.warn("[useFaceTracking] Initialization warning (ignoring if partial success):", initErr);
            faceReadyRef.current = true;
            handsReadyRef.current = true;
          } finally {
            (window as any).__mediapipe_initializing = false;
          }
        };

        // 🚀 각각의 루프를 분리하여 서로 간섭받지 않게 함
        let faceLoopCount = 0;
        let faceSendCount = 0;
        const runFaceLoop = async () => {
          if (!mounted) return;
          faceLoopCount++;
          if (faceLoopCount % 120 === 0) {
            console.log(`[useFaceTracking] 🔄 FaceLoop running (${faceLoopCount} iterations), ready: ${faceReadyRef.current}, video: ${video?.readyState}, sends: ${faceSendCount}`);
            if (video) {
              console.log(`[useFaceTracking] 📺 Video state: ${video.videoWidth}x${video.videoHeight}, time: ${video.currentTime.toFixed(2)}s`);
            }
            console.log(`[useFaceTracking] 🔍 Conditions: video=${!!video}, readyState=${video?.readyState}, faceMeshRef=${!!faceMeshRef.current}, faceReady=${faceReadyRef.current}`);
          }
          if (video && video.readyState >= 2 && faceMeshRef.current && faceReadyRef.current) {
            try {
              await faceMeshRef.current.send({ image: video });
              faceSendCount++;
              if (faceSendCount === 1) {
                console.log('[useFaceTracking] ✅ First FaceMesh send() completed successfully!');
              }
            } catch (e) {
              if (faceLoopCount % 120 === 0) {
                console.error('[useFaceTracking] ❌ FaceMesh send() error:', e);
              }
            }
          }
          requestAnimationFrame(runFaceLoop);
        };

        let poseLoopCount = 0;
        const runPoseLoop = async () => {
          if (!mounted) return;
          poseLoopCount++;
          if (poseLoopCount % 120 === 0) {
            console.log(`[useFaceTracking] 🔄 PoseLoop running (${poseLoopCount} iterations), ready: ${poseReadyRef.current}, video: ${video?.readyState}`);
          }
          if (video && video.readyState >= 2 && poseRef.current && poseReadyRef.current) {
            try { await poseRef.current.send({ image: video }); } catch (e) { }
          }
          requestAnimationFrame(runPoseLoop);
        };

        let handsLoopCount = 0;
        const runHandsLoop = async () => {
          if (!mounted) return;
          handsLoopCount++;
          if (handsLoopCount % 120 === 0) {
            console.log(`[useFaceTracking] 🔄 HandsLoop running (${handsLoopCount} iterations), ready: ${handsReadyRef.current}, video: ${video?.readyState}`);
          }
          if (video && video.readyState >= 2 && handsRef.current && handsReadyRef.current) {
            try { await handsRef.current.send({ image: video }); } catch (e) { }
          }
          requestAnimationFrame(runHandsLoop);
        };

        // Initialize models first, THEN start loops
        initModels().then(() => {
          console.log("[useFaceTracking] 🚀 Starting tracking loops...");
          runFaceLoop();
          runPoseLoop();
          runHandsLoop();
        });

        if (!mounted) {
          cleanup();
        }
      } catch (e: any) {
        console.error("[useFaceTracking] Error:", e);
        setError(e?.message || "얼굴 추적 초기화 실패");
        setIsDetecting(false);
      }
    };

    initFaceTracking();

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, enablePose, deviceId]);

  return { facePosition, isDetecting, error, hesitationScore, isHesitating, poseLandmarks, videoElement, faceResults, poseResults, handsResults };
}

