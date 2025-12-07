import { useEffect, useRef, useState } from "react";
import { FaceMesh, Results as FaceResults } from "@mediapipe/face_mesh";
import { Pose, Results as PoseResults } from "@mediapipe/pose";

interface FaceTrackingResult {
  facePosition: { x: number; y: number };
  isDetecting: boolean;
  error: string | null;
  // 포즈 기반 망설임 힌트 (0~1), threshold 이상이면 망설임으로 판단
  hesitationScore: number;
  isHesitating: boolean;
  videoElement?: HTMLVideoElement | null;
}

/**
 * MediaPipe Face Mesh를 사용하여 웹캠에서 얼굴을 추적하는 훅
 * @param enabled - 얼굴 추적 활성화 여부
 * @param enablePose - Pose 추적 활성화 여부
 * @param deviceId - 사용할 비디오 장치 ID (선택적)
 * @returns 얼굴 위치, 감지 상태, 에러 정보
 */
export function useFaceTracking(enabled: boolean, enablePose = false, deviceId?: string): FaceTrackingResult & { poseLandmarks: any[] } {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const originalConsoleRef = useRef<{ warn: any; info: any } | null>(null);
  
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 });
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hesitationScore, setHesitationScore] = useState(0);
  const [isHesitating, setIsHesitating] = useState(false);
  const [poseLandmarks, setPoseLandmarks] = useState<any[]>([]);
  
  // Throttle을 위한 ref (매 프레임마다 setState 호출 방지)
  const lastUpdateRef = useRef({ face: 0, pose: 0, hesitation: 0 });
  const UPDATE_INTERVAL = 50; // 50ms = 20fps로 상태 업데이트 제한
  
  // 스무딩을 위한 이전 위치 저장 (떨림 방지)
  const smoothedPositionRef = useRef({ x: 0, y: 0 });
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
        faceMeshRef.current = null;
      }
      
      // Pose 정리
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {
          // 무시
        }
        poseRef.current = null;
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
        // 비디오 엘리먼트 생성 (숨김; 캔버스에 직접 그려 사용)
        const video = document.createElement("video");
        video.style.display = "none";
        video.muted = true;
        video.autoplay = true;
        (video as any).playsInline = true;
        video.width = 640;
        video.height = 480;
        videoRef.current = video;
        document.body.appendChild(video);

        // MediaPipe FaceMesh 초기화
        const faceMesh = new FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        // MediaPipe WASM 및 WebGL 로그 억제
        if (typeof (window as any).Module === 'undefined') {
          (window as any).Module = {};
        }
        (window as any).Module.print = () => {}; // stdout 억제
        (window as any).Module.printErr = () => {}; // stderr 억제
        
        // WebGL 경고 메시지 필터링 (console 오버라이드)
        if (!originalConsoleRef.current) {
          originalConsoleRef.current = {
            warn: console.warn,
            info: console.info,
          };
          
          console.warn = (...args: any[]) => {
            const msg = args.join(' ');
            if (msg.includes('gl_context') || msg.includes('WebGL')) return;
            originalConsoleRef.current!.warn.apply(console, args);
          };
          console.info = (...args: any[]) => {
            const msg = args.join(' ');
            if (msg.includes('gl_context') || msg.includes('WebGL')) return;
            originalConsoleRef.current!.info.apply(console, args);
          };
        }

        faceMesh.setOptions({
          maxNumFaces: 1, // 한 명의 얼굴만 추적
          refineLandmarks: true, // 눈, 입술 등 세밀한 랜드마크 포함
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: FaceResults) => {
          if (!mounted) return;

          const now = Date.now();
          // Throttle: 50ms마다만 상태 업데이트
          if (now - lastUpdateRef.current.face < UPDATE_INTERVAL) return;
          lastUpdateRef.current.face = now;

          if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // 코 끝 (landmark 1) 사용 - 얼굴의 중심점
            const noseTip = landmarks[1];
            
            // MediaPipe는 0~1 범위의 정규화된 좌표를 반환
            // Live2D focusController에 맞게 -1~1 범위로 변환 후 스케일 조정
            // X축 반전: 웹캠은 거울 모드이므로 좌우를 뒤집어야 자연스러움
            // 스케일 팩터를 낮춰서 자연스러운 반응 (400 -> 1)
            const rawX = (0.5 - noseTip.x) * 2 * 1; // 좌우 이동 범위 (반전)
            const rawY = (noseTip.y - 0.5) * 2 * 1; // 상하 이동 범위
            
            // 스무딩 적용: 이전 위치와 현재 위치의 가중 평균 (떨림 방지)
            smoothedPositionRef.current.x = smoothedPositionRef.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR;
            smoothedPositionRef.current.y = smoothedPositionRef.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR;
            
            setFacePosition({ x: smoothedPositionRef.current.x, y: -smoothedPositionRef.current.y }); // Y축 반전 (화면 좌표 -> Live2D 좌표)
            setIsDetecting(true);
            setError(null);
          } else {
            setIsDetecting(false);
          }
        });

        faceMeshRef.current = faceMesh;
        
        // MediaPipe Pose 초기화 (포즈로 사용자 움직임/정지 판단) - pose가 활성화된 경우에만
        let pose: Pose | null = null;
        if (enablePose) {
          pose = new Pose({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            },
          });
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
            return;
          }

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
            } catch {}

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
        
        // requestAnimationFrame을 사용해 직접 프레임을 MediaPipe에 전송
        const sendFrame = async () => {
          if (!mounted || !video.readyState || video.readyState < 2) {
            // 비디오가 준비되지 않았으면 다음 프레임에서 다시 시도
            if (mounted) {
              animationFrameRef.current = requestAnimationFrame(sendFrame);
            }
            return;
          }
          
          try {
            // FaceMesh와 Pose에 현재 비디오 프레임 전송
            if (faceMeshRef.current && mounted) {
              await faceMeshRef.current.send({ image: video });
            }
            if (poseRef.current && mounted) {
              await poseRef.current.send({ image: video });
            }
          } catch (e) {
            console.error('[useFaceTracking] Error sending frame:', e);
          }
          
          // 다음 프레임 요청
          if (mounted) {
            animationFrameRef.current = requestAnimationFrame(sendFrame);
          }
        };
        
        // 프레임 전송 시작
        animationFrameRef.current = requestAnimationFrame(sendFrame);

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

  return { facePosition, isDetecting, error, hesitationScore, isHesitating, poseLandmarks, videoElement: videoRef.current };
}

