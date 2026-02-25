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
    const isPlayingMotionRef = useRef(false);

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
            const model = await Live2DModel.from(modelPath);
            if (destroyed) return;

            modelRef.current = model;
            app.stage.addChild(model);

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
            try {
                appRef.current?.destroy(true);
            } catch { }
            if (boxRef.current) boxRef.current.innerHTML = "";
        };
    }, [modelPath]);

    useEffect(() => {
        const model = modelRef.current;
        if (!model) return;
        if (speaking) {
            if (!isPlayingMotionRef.current) {
                isPlayingMotionRef.current = true;
                model.motion("Speak", 0, (window as any).PIXI.live2d.MotionPriority.FORCE).finally(() => {
                    isPlayingMotionRef.current = false;
                });
            }
        }
    }, [speaking]);

    useEffect(() => {
        const model = modelRef.current;
        if (!model) return;
        const m = specificMotion || motionList[Math.floor(Math.random() * motionList.length)];
        model.motion(m, 0, 3);
    }, [motionTrigger, specificMotion]);

    useEffect(() => {
        const model = modelRef.current;
        if (!model) return;
        const core = model.internalModel?.coreModel;
        if (!core) return;
        const tick = () => {
            if (!speaking) {
                core.setParameterValueById("ParamMouthOpenY", 0);
            } else {
                core.setParameterValueById("ParamMouthOpenY", Math.sin(Date.now() / 50) * 0.5 + 0.5);
            }
            requestAnimationFrame(tick);
        };
        const rid = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rid);
    }, [speaking, facePosition]);

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
