import React, { useEffect, useRef } from "react";
import { useFaceTracking } from "../hook/useFaceTracking";

export function Live2DStage({
    modelPath = "/models/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json",
    speaking = false,
    enableFaceTracking = false,
    enablePose = false,
    poseDeviceId,
    motionTrigger = 0,
    specificMotion = null,
    onHesitationChange,
    tracking,
}: {
    modelPath?: string;
    speaking?: boolean;
    enableFaceTracking?: boolean;
    enablePose?: boolean;
    poseDeviceId?: string;
    motionTrigger?: number;
    specificMotion?: string | null;
    onHesitationChange?: (score: number, isHesitating: boolean, poseLandmarks: any[], videoEl: HTMLVideoElement | null) => void;
    tracking?: any;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<any>(null);
    const appRef = useRef<any>(null);
    const animRef = useRef<number | null>(null);
    const tickerCallbackRef = useRef<((delta: number) => void) | null>(null);
    const lastSeenRef = useRef(0);
    const targetRef = useRef({ x: 0, y: 0 });
    const smoothRef = useRef({ x: 0, y: 0 });
    const biasRef = useRef({ x: 0, y: 0 });
    const biasReadyAtRef = useRef(0);
    const mouthSmoothRef = useRef(0);
    const originalInternalUpdateRef = useRef<((delta: number) => void) | null>(null);

    const {
        hesitationScore,
        isHesitating,
        poseLandmarks,
        videoElement,
        isDetecting,
        error: faceTrackingError,
        facePosition
    } = tracking || {};

    useEffect(() => {
        if (typeof onHesitationChange === "function") {
            onHesitationChange(hesitationScore || 0, !!isHesitating, poseLandmarks || [], videoElement || null);
        }
    }, [hesitationScore, isHesitating, poseLandmarks, videoElement, onHesitationChange]);

    const motionList = Array.from({ length: 26 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`);
    const isSpeakingNow = () => {
        return Boolean(speaking || (window as any).__AIKIOSK_TTS_SPEAKING);
    };
    const computeMouthTarget = () => {
        const activeSpeaking = isSpeakingNow();
        const audioLipActive = Boolean((window as any).__AIKIOSK_TTS_LIPSYNC_ACTIVE);
        const audioMouth = Math.max(0, Math.min(1, Number((window as any).__AIKIOSK_TTS_MOUTH_OPEN || 0)));
        const forceRealtimeMouth = Boolean((window as any).__AIKIOSK_RT_FORCE_MOUTH);
        let mouthTarget = 0;
        if (audioLipActive) {
            mouthTarget = audioMouth;
        } else if (forceRealtimeMouth || activeSpeaking) {
            mouthTarget = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        }
        mouthSmoothRef.current = mouthSmoothRef.current * 0.7 + mouthTarget * 0.3;
        if (mouthSmoothRef.current < 0.01) mouthSmoothRef.current = 0;
        return mouthSmoothRef.current;
    };

    useEffect(() => {
        let destroyed = false;
        (async () => {
            const PIXI = (window as any).PIXI;
            if (!PIXI || !(window as any).Live2DCubismCore || !PIXI.live2d) {
                console.error("[Live2D] Missing dependencies");
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
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: "-1",
                pointerEvents: "none",
            });

            const { Live2DModel } = PIXI.live2d;
            const model = await Live2DModel.from(modelPath, { autoInteract: false });
            if (destroyed) return;

            modelRef.current = model;
            // Explicitly disable pointer-driven focus/drag behavior.
            model.interactive = false;
            app.stage.addChild(model);

            const internalModel = model.internalModel;
            const core = internalModel?.coreModel;
            if (internalModel && core && typeof internalModel.update === "function") {
                const originalUpdate = internalModel.update.bind(internalModel);
                originalInternalUpdateRef.current = originalUpdate;
                internalModel.update = (...args: any[]) => {
                    const result = originalUpdate(...args);
                    const mouth = computeMouthTarget();
                    core.setParameterValueById("ParamMouthOpenY", mouth);
                    return result;
                };
            }

            const place = () => {
                const w = boxRef.current?.clientWidth || 0;
                const h = boxRef.current?.clientHeight || 0;
                if (h === 0) return;

                // 머리 부근을 기준점으로 설정
                model.anchor.set(0.5, 0.1);
                // 화면 중앙(0.5)에서 0.3만큼 위로 올려 0.2 지점에 배치
                model.position.set(w / 2, h * 0.2);

                // 기존 스케일 복구
                const scale = Math.min(w, h) / 1000;
                model.scale.set(scale);
            };
            place();
            app.renderer.on("resize", place);
        })();

        return () => {
            destroyed = true;
            const model = modelRef.current;
            const internalModel = model?.internalModel;
            if (internalModel && originalInternalUpdateRef.current) {
                try {
                    internalModel.update = originalInternalUpdateRef.current;
                } catch {
                    // ignore
                }
            }
            originalInternalUpdateRef.current = null;
            try {
                appRef.current?.destroy(true);
            } catch { }
            if (boxRef.current) boxRef.current.innerHTML = "";
        };
    }, [modelPath]);

    useEffect(() => {
        const model = modelRef.current;
        if (!model) return;
        if (!specificMotion && motionTrigger <= 0) return;
        const motionName = specificMotion || motionList[Math.floor(Math.random() * motionList.length)];
        const motionGroup = "";
        let motionIndex = 0;

        if (motionName === "idle") {
            motionIndex = 0;
        } else {
            const parsed = Number.parseInt(String(motionName).replace(/^m/i, ""), 10);
            if (!Number.isFinite(parsed) || parsed < 1) return;
            motionIndex = parsed;
        }

        try {
            model.motion(motionGroup, motionIndex, 3);
        } catch (e) {
            console.warn("[Live2D] motion play failed", e);
        }
    }, [motionTrigger, specificMotion]);

    useEffect(() => {
        const model = modelRef.current;
        if (!model) return;
        const core = model.internalModel?.coreModel;
        if (!core) return;
        const app = appRef.current;
        const PIXI = (window as any).PIXI;

        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        const maxStep = 0.025; // limit per-frame movement to reduce shaking
        const applyFrame = () => {
            // Follow head/eye in non-mirrored (natural) direction.
            if (isDetecting && facePosition) {
                if (!biasReadyAtRef.current) {
                    biasReadyAtRef.current = Date.now() + 1200;
                }
                // Learn neutral center slowly to remove one-sided offset.
                biasRef.current.x = biasRef.current.x * 0.995 + facePosition.x * 0.005;
                biasRef.current.y = biasRef.current.y * 0.995 + facePosition.y * 0.005;

                // Invert X so Live2D follows real-world direction (not mirror-like).
                const correctedX = -(facePosition.x - biasRef.current.x);
                const correctedY = facePosition.y - biasRef.current.y;
                targetRef.current.x = clamp(correctedX * 1.35, -1, 1);
                targetRef.current.y = clamp(correctedY * 1.2, -1, 1);
                lastSeenRef.current = Date.now();
            } else {
                // Keep last target briefly to avoid "snap-to-center" jitter on short detection drops.
                if (Date.now() - lastSeenRef.current > 500) {
                    targetRef.current.x = 0;
                    targetRef.current.y = 0;
                }
            }
            const dx = clamp(targetRef.current.x - smoothRef.current.x, -maxStep, maxStep);
            const dy = clamp(targetRef.current.y - smoothRef.current.y, -maxStep, maxStep);
            smoothRef.current.x += dx;
            smoothRef.current.y += dy;
            smoothRef.current.x = smoothRef.current.x * 0.94 + targetRef.current.x * 0.06;
            smoothRef.current.y = smoothRef.current.y * 0.94 + targetRef.current.y * 0.06;

            // Small dead-zone to suppress jitter from tiny detection noise.
            if (Math.abs(smoothRef.current.x) < 0.03) smoothRef.current.x = 0;
            if (Math.abs(smoothRef.current.y) < 0.03) smoothRef.current.y = 0;

            core.setParameterValueById("ParamAngleX", clamp(smoothRef.current.x * 5, -5, 5));
            core.setParameterValueById("ParamAngleY", clamp(smoothRef.current.y * 3.5, -3.5, 3.5));
            core.setParameterValueById("ParamEyeBallX", clamp(smoothRef.current.x * 0.75, -1, 1));
            core.setParameterValueById("ParamEyeBallY", clamp(smoothRef.current.y * 0.75, -1, 1));

            // Keep mouth independent from preset motions by applying it at the tail end of the render tick.
            core.setParameterValueById("ParamMouthOpenY", computeMouthTarget());
        };

        if (app?.ticker?.add && PIXI?.UPDATE_PRIORITY) {
            const tickerTick = () => {
                applyFrame();
            };
            tickerCallbackRef.current = tickerTick;
            app.ticker.add(tickerTick, undefined, PIXI.UPDATE_PRIORITY.LOW);
            return () => {
                if (tickerCallbackRef.current) {
                    try {
                        app.ticker.remove(tickerCallbackRef.current);
                    } catch {
                        // ignore
                    }
                    tickerCallbackRef.current = null;
                }
            };
        }

        const tick = () => {
            applyFrame();
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => {
            if (tickerCallbackRef.current && app?.ticker) {
                try {
                    app.ticker.remove(tickerCallbackRef.current);
                } catch {
                    // ignore
                }
                tickerCallbackRef.current = null;
            }
            if (animRef.current != null) cancelAnimationFrame(animRef.current);
            animRef.current = null;
        };
    }, [speaking, isDetecting, facePosition]);

    return (
        <div ref={boxRef} className="relative w-full h-full min-h-[400px]">
            {enableFaceTracking && !isDetecting && !faceTrackingError && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur">
                    😶 얼굴을 찾는 중...
                </div>
            )}
        </div>
    );
}
