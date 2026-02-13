import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Pose } from "@mediapipe/pose";
import type { Results as FaceResults } from "@mediapipe/face_mesh";
import type { Results as PoseResults } from "@mediapipe/pose";
import { AI_BASE_URL } from "../api/config";

interface FaceTrackingResult {
  facePosition: { x: number; y: number };
  isDetecting: boolean;
  error: string | null;
  hesitationScore: number;
  isHesitating: boolean;
  faceScore: number;
  poseScore: number;
  poseFeatures?: Record<string, number> | null;
  videoElement?: HTMLVideoElement | null;
  faceResults?: FaceResults | null;
  poseResults?: PoseResults | null;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function getMediaPipeFile(file: string): string {
  const baseUrl = "https://cdn.jsdelivr.net/npm";
  const fileName = file.split("/").pop() || file;

  if (
    fileName.includes("face_mesh") ||
    fileName.includes("face_landmark") ||
    fileName.includes("face_detection") ||
    fileName.includes("face_geometry")
  ) {
    return `${baseUrl}/@mediapipe/face_mesh@0.4.1633559619/${fileName}`;
  }
  if (fileName.includes("pose")) {
    return `${baseUrl}/@mediapipe/pose@0.5.1675469404/${fileName}`;
  }
  if (fileName.includes("drawing_utils")) {
    return `${baseUrl}/@mediapipe/drawing_utils/${fileName}`;
  }
  return `${baseUrl}/${fileName}`;
}

export function useFaceTracking(
  enabled: boolean,
  enablePose = false,
  deviceId?: string,
  enableLocalVision = true,
  enableFace = true
): FaceTrackingResult & { poseLandmarks: any[] } {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 });
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hesitationScore, setHesitationScore] = useState(0);
  const [isHesitating, setIsHesitating] = useState(false);
  const [faceScore, setFaceScore] = useState(0);
  const [poseScore, setPoseScore] = useState(0);
  const [poseFeatures, setPoseFeatures] = useState<Record<string, number> | null>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<any[]>([]);
  const [faceResults, setFaceResults] = useState<FaceResults | null>(null);
  const [poseResults, setPoseResults] = useState<PoseResults | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const poseRef = useRef<Pose | null>(null);

  const faceReadyRef = useRef(false);
  const poseReadyRef = useRef(false);

  const faceRafRef = useRef<number | null>(null);
  const poseRafRef = useRef<number | null>(null);
  const hesitationTimerRef = useRef<number | null>(null);
  const hesitationBusyRef = useRef(false);
  const hesitationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mpCrashedRef = useRef(false);
  const mpErrorLoggedRef = useRef(false);
  const faceBusyRef = useRef(false);
  const poseBusyRef = useRef(false);
  const faceSendErrorCountRef = useRef(0);
  const poseSendErrorCountRef = useRef(0);
  const hesitationEndpointRef = useRef<string | null>(null);
  const hesitationRetryAtRef = useRef(0);

  const smoothRef = useRef({ x: 0, y: 0 });
  const lastUpdateRef = useRef({ face: 0, pose: 0, hesitation: 0, log: 0 });
  const UPDATE_INTERVAL = 33;
  const SMOOTHING_FACTOR = 0.3;
  const SEND_INTERVAL = 50;

  const cleanup = () => {
    if (faceRafRef.current != null) {
      cancelAnimationFrame(faceRafRef.current);
      faceRafRef.current = null;
    }
    if (poseRafRef.current != null) {
      cancelAnimationFrame(poseRafRef.current);
      poseRafRef.current = null;
    }
    if (hesitationTimerRef.current != null) {
      clearInterval(hesitationTimerRef.current);
      hesitationTimerRef.current = null;
    }

    try {
      faceMeshRef.current?.close();
    } catch {}
    try {
      poseRef.current?.close();
    } catch {}

    faceMeshRef.current = null;
    poseRef.current = null;
    faceReadyRef.current = false;
    poseReadyRef.current = false;
    hesitationBusyRef.current = false;
    mpCrashedRef.current = false;
    mpErrorLoggedRef.current = false;
    faceBusyRef.current = false;
    poseBusyRef.current = false;
    faceSendErrorCountRef.current = 0;
    poseSendErrorCountRef.current = 0;
    hesitationEndpointRef.current = null;
    hesitationRetryAtRef.current = 0;

    if (videoRef.current) {
      try {
        const stream = videoRef.current.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
      } catch {}

      try {
        if (videoRef.current.parentNode?.contains(videoRef.current)) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
      } catch {}

      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    hesitationCanvasRef.current = null;
  };

  useEffect(() => {
    if (!enabled && !enablePose && !enableFace) {
      setIsDetecting(false);
      setFacePosition({ x: 0, y: 0 });
      setError(null);
      setFaceResults(null);
      setPoseResults(null);
      setPoseLandmarks([]);
      setHesitationScore(0);
      setIsHesitating(false);
      setFaceScore(0);
      setPoseScore(0);
      setPoseFeatures(null);
      cleanup();
      return;
    }

    let mounted = true;
    const stopMediaPipeLoops = (reason: string, details?: unknown) => {
      if (mpCrashedRef.current) return;
      mpCrashedRef.current = true;
      faceBusyRef.current = false;
      poseBusyRef.current = false;
      faceReadyRef.current = false;
      poseReadyRef.current = false;

      if (faceRafRef.current != null) {
        cancelAnimationFrame(faceRafRef.current);
        faceRafRef.current = null;
      }
      if (poseRafRef.current != null) {
        cancelAnimationFrame(poseRafRef.current);
        poseRafRef.current = null;
      }

      if (!mpErrorLoggedRef.current) {
        mpErrorLoggedRef.current = true;
        console.error(`[useFaceTracking] MediaPipe disabled: ${reason}`, details);
      }
      setError(reason);
    };

    const handleGlobalMediaPipeError = (msg: string, details?: unknown) => {
      if (
        msg.includes("solution_packed_assets_loader") ||
        msg.includes("solution_simd_wasm_bin") ||
        msg.includes("Module.arguments has been replaced")
      ) {
        stopMediaPipeLoops("MediaPipe loader crashed", details);
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const msg = `${event.message || ""} ${event.filename || ""}`;
      handleGlobalMediaPipeError(msg, event.error || event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = `${reason?.message || reason || ""}`;
      handleGlobalMediaPipeError(msg, reason);
    };

    if (enableLocalVision && (enableFace || enablePose)) {
      window.addEventListener("error", onWindowError);
      window.addEventListener("unhandledrejection", onUnhandledRejection);
    }

    const init = async () => {
      try {
        const video = document.createElement("video");
        video.setAttribute("data-mediapipe", "true");
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

        let stream: MediaStream;
        if (deviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: deviceId },
                facingMode: "user",
                width: 640,
                height: 480,
              },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: deviceId },
                facingMode: "user",
                width: 640,
                height: 480,
              },
              audio: false,
            });
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 },
            audio: false,
          });
        }

        video.srcObject = stream;
        await video.play();
        if (!mounted) return;

        if (enableLocalVision && (enableFace || enablePose)) {
          if (enableFace) {
            const faceMesh = new FaceMesh({ locateFile: getMediaPipeFile });
            faceMesh.setOptions({
              maxNumFaces: 1,
              refineLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });

            faceMesh.onResults((results: FaceResults) => {
              if (!mounted) return;
              const now = Date.now();
              if (now - lastUpdateRef.current.face < UPDATE_INTERVAL) return;
              lastUpdateRef.current.face = now;

              if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
                const cloned = results.multiFaceLandmarks.map((arr) => arr.map((p) => ({ ...p })));
                setFaceResults({ multiFaceLandmarks: cloned } as any);

                const nose = results.multiFaceLandmarks[0][1];
                // Use non-mirrored camera coordinate system (raw webcam orientation).
                const rawX = (nose.x - 0.5) * 2;
                const rawY = (nose.y - 0.5) * 2;
                smoothRef.current.x = smoothRef.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR;
                smoothRef.current.y = smoothRef.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR;

                setFacePosition({ x: smoothRef.current.x, y: -smoothRef.current.y });
                setIsDetecting(true);
                setError(null);
              } else {
                setFaceResults(null);
                setIsDetecting(false);
              }
            });

            faceMeshRef.current = faceMesh;
          } else {
            faceMeshRef.current = null;
            setFaceResults(null);
          }

          let pose: Pose | null = null;
          if (enablePose) {
            pose = new Pose({ locateFile: getMediaPipeFile });
            pose.setOptions({
              modelComplexity: 1,
              smoothLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });

            pose.onResults((pResults: PoseResults) => {
              if (!mounted) return;
              const now = Date.now();
              if (now - lastUpdateRef.current.pose < UPDATE_INTERVAL) return;
              lastUpdateRef.current.pose = now;

              if (!pResults.poseLandmarks || pResults.poseLandmarks.length === 0) {
                setPoseLandmarks([]);
                setPoseResults(null);
                return;
              }

              const clonedPose = pResults.poseLandmarks.map((p) => ({ ...p }));
              setPoseResults({ poseLandmarks: clonedPose } as any);
              setPoseLandmarks(clonedPose);

              const nose = clonedPose[0];
              if (nose) {
                // Use non-mirrored camera coordinate system (raw webcam orientation).
                const rawX = (nose.x - 0.5) * 2;
                const rawY = (nose.y - 0.5) * 2;
                smoothRef.current.x = smoothRef.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR;
                smoothRef.current.y = smoothRef.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR;
                setFacePosition({ x: smoothRef.current.x, y: -smoothRef.current.y });
                setIsDetecting(true);
                setError(null);
              }
            });
          }

          poseRef.current = pose;
          if (!mounted) return;

          faceReadyRef.current = enableFace;
          if (pose) poseReadyRef.current = true;

          const runFaceLoop = async () => {
            if (!mounted || mpCrashedRef.current) return;
            const now = Date.now();
            if (
              now - lastUpdateRef.current.face >= SEND_INTERVAL &&
              video.readyState >= 2 &&
              faceMeshRef.current &&
              faceReadyRef.current &&
              !faceBusyRef.current
            ) {
              faceBusyRef.current = true;
              try {
                await faceMeshRef.current.send({ image: video });
                faceSendErrorCountRef.current = 0;
              } catch (e: any) {
                faceSendErrorCountRef.current += 1;
                if (faceSendErrorCountRef.current >= 3) {
                  stopMediaPipeLoops("MediaPipe FaceMesh crashed", e);
                } else {
                  const ts = Date.now();
                  if (ts - lastUpdateRef.current.log > 2000) {
                    lastUpdateRef.current.log = ts;
                    console.warn("[useFaceTracking] FaceMesh send failed, retrying...", e);
                  }
                }
              } finally {
                faceBusyRef.current = false;
                lastUpdateRef.current.face = now;
              }
            }
            if (!mpCrashedRef.current) {
              faceRafRef.current = requestAnimationFrame(runFaceLoop);
            }
          };

          const runPoseLoop = async () => {
            if (!mounted || mpCrashedRef.current) return;
            const now = Date.now();
            if (
              now - lastUpdateRef.current.pose >= SEND_INTERVAL &&
              video.readyState >= 2 &&
              poseRef.current &&
              poseReadyRef.current &&
              !poseBusyRef.current
            ) {
              poseBusyRef.current = true;
              try {
                await poseRef.current.send({ image: video });
                poseSendErrorCountRef.current = 0;
              } catch (e: any) {
                poseSendErrorCountRef.current += 1;
                if (poseSendErrorCountRef.current >= 3) {
                  stopMediaPipeLoops("MediaPipe Pose crashed", e);
                } else {
                  const ts = Date.now();
                  if (ts - lastUpdateRef.current.log > 2000) {
                    lastUpdateRef.current.log = ts;
                    console.warn("[useFaceTracking] Pose send failed, retrying...", e);
                  }
                }
              } finally {
                poseBusyRef.current = false;
                lastUpdateRef.current.pose = now;
              }
            }
            if (!mpCrashedRef.current) {
              poseRafRef.current = requestAnimationFrame(runPoseLoop);
            }
          };

          if (enableFace) runFaceLoop();
          if (pose) runPoseLoop();
        }

        const hCanvas = document.createElement("canvas");
        hCanvas.width = 320;
        hCanvas.height = 240;
        hesitationCanvasRef.current = hCanvas;

        const postHesitation = async () => {
          if (!mounted || hesitationBusyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
          if (Date.now() < hesitationRetryAtRef.current) return;
          hesitationBusyRef.current = true;
          try {
            const c = hesitationCanvasRef.current;
            if (!c) return;
            const cctx = c.getContext("2d");
            if (!cctx) return;
            cctx.drawImage(videoRef.current, 0, 0, c.width, c.height);
            const image = c.toDataURL("image/jpeg", 0.62).split(",")[1];

            const payload = JSON.stringify({ image, binary: false });
            const aiBase = AI_BASE_URL.replace(/\/+$/, "");
            const aiHost = aiBase.replace(/\/api\/v1$/, "").replace(/\/api$/, "");
            const candidates = hesitationEndpointRef.current
              ? [hesitationEndpointRef.current]
              : Array.from(
                  new Set([
                    `${aiHost}/api/hesitation/detect-base64`,
                    "http://localhost:8000/api/hesitation/detect-base64",
                  ])
                );

            let res: Response | null = null;
            for (const url of candidates) {
              try {
                const r = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: payload,
                });
                if (r.ok) {
                  hesitationEndpointRef.current = url;
                  res = r;
                  break;
                }
                if (r.status !== 404) {
                  break;
                }
              } catch {}
            }

            if (!res) {
              hesitationRetryAtRef.current = Date.now() + 3000;
              return;
            }
            const data = await res.json();
            const score = clamp01(Number(data.final_ema ?? data.confidence ?? 0));
            const hes = Boolean(data.is_hesitating ?? (data.status === "HESITATING" || data.label === "HESITATING") ?? (score >= 0.6));
            const face = clamp01(Number(data.face_score ?? 0));
            const pose = clamp01(Number(data.pose_score ?? 0));
            const pf = (data.pose_features && typeof data.pose_features === "object")
              ? data.pose_features
              : null;

            setHesitationScore(score);
            setIsHesitating(hes);
            setFaceScore(face);
            setPoseScore(pose);
            setPoseFeatures(pf);
          } catch (e: any) {
            const now = Date.now();
            if (now - lastUpdateRef.current.log > 2000) {
              lastUpdateRef.current.log = now;
              console.warn("[useFaceTracking] hesitation fetch warning:", e?.message || e);
            }
          } finally {
            hesitationBusyRef.current = false;
          }
        };

        hesitationTimerRef.current = window.setInterval(postHesitation, 280);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "face tracking init failed");
        setIsDetecting(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (enableLocalVision && (enableFace || enablePose)) {
        window.removeEventListener("error", onWindowError);
        window.removeEventListener("unhandledrejection", onUnhandledRejection);
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, enablePose, deviceId, enableLocalVision, enableFace]);

  return {
    facePosition,
    isDetecting,
    error,
    hesitationScore,
    isHesitating,
    faceScore,
    poseScore,
    poseFeatures,
    poseLandmarks,
    videoElement,
    faceResults,
    poseResults,
  };
}
