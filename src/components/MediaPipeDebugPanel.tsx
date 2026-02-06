import React, { useEffect, useRef } from "react";
import { FACEMESH_TESSELATION, FACEMESH_CONTOURS } from "@mediapipe/face_mesh";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface Props {
    faceResults?: any;
    poseResults?: any;
    handsResults?: any;
    videoElement?: HTMLVideoElement | null;
}

export default function MediaPipeDebugPanel({ faceResults, poseResults, handsResults, videoElement }: Props) {
    const faceCanvasRef = useRef<HTMLCanvasElement>(null);
    const poseCanvasRef = useRef<HTMLCanvasElement>(null);
    const handsCanvasRef = useRef<HTMLCanvasElement>(null);

    const lastLogTime = useRef<number>(0);

    const draw = (canvas: HTMLCanvasElement | null, results: any, type: 'face' | 'pose' | 'hands') => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        if (w === 0 || h === 0) return;

        // 1. CLEAR & BACKGROUND
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, w, h);

        // 2. MIRROR & DRAW (VIDEO + LANDMARKS)
        ctx.save();
        ctx.translate(w, 0); // Move to right side
        ctx.scale(-1, 1);    // Flip horizontally

        // Draw Video
        if (videoElement && videoElement.readyState >= 2) {
            ctx.drawImage(videoElement, 0, 0, w, h);
        }

        // Draw Landmarks (Inside mirrored context)
        if (results) {
            try {
                const drawOptions = {
                    face: { connector: { color: '#ffffff50', lineWidth: 1 }, contour: { color: '#ffffff', lineWidth: 2 } },
                    pose: { connector: { color: '#10b981', lineWidth: 3 }, landmark: { color: '#ffffff', lineWidth: 1, radius: 2 } },
                    hands: { connector: { color: '#33ccff', lineWidth: 4 }, landmark: { color: '#ffffff', lineWidth: 1, radius: 2 } }
                };

                if (type === 'face' && results.multiFaceLandmarks) {
                    for (const landmarks of results.multiFaceLandmarks) {
                        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, drawOptions.face.connector);
                        drawConnectors(ctx, landmarks, FACEMESH_CONTOURS, drawOptions.face.contour);
                    }
                }

                if (type === 'pose' && results.poseLandmarks) {
                    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, drawOptions.pose.connector);
                    drawLandmarks(ctx, results.poseLandmarks, drawOptions.pose.landmark);
                }

                if (type === 'hands' && results.multiHandLandmarks) {
                    for (const landmarks of results.multiHandLandmarks) {
                        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, drawOptions.hands.connector);
                        drawLandmarks(ctx, landmarks, drawOptions.hands.landmark);
                    }
                }
            } catch (err) {
                console.error(`[MediaPipe] Error drawing ${type}:`, err);
            }
        }

        // 3. DEBUG CENTER POINT (Red dot)
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 4. STATUS TEXT (Drawn LAST to be on top)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`${type.toUpperCase()}: ${results ? 'DETECTED' : 'SEARCHING...'}`, 10, 25);
        if (videoElement) {
            ctx.fillText(`Webcam: ${videoElement.readyState >= 2 ? 'OK' : 'LOADING...'}`, 10, 42);
        }
        ctx.shadowBlur = 0;
    };

    useEffect(() => {
        let requestId: number;
        const renderLoop = () => {
            draw(faceCanvasRef.current, faceResults, 'face');
            draw(poseCanvasRef.current, poseResults, 'pose');
            draw(handsCanvasRef.current, handsResults, 'hands');
            requestId = requestAnimationFrame(renderLoop);
        };
        requestId = requestAnimationFrame(renderLoop);
        return () => cancelAnimationFrame(requestId);
    }, [faceResults, poseResults, handsResults, videoElement]);

    return (
        <div
            className="fixed flex flex-col gap-4 p-4 bg-white/10 backdrop-blur-lg rounded-3xl z-[1000] border border-white/20 shadow-2xl"
            style={{
                top: '40px',
                right: '40px',
                width: '360px',
            }}
        >
            <div className="flex flex-col gap-2">
                <span className="text-white text-sm font-bold px-2 tracking-wider">FACE MESH</span>
                <canvas
                    ref={faceCanvasRef} width={320} height={240}
                    className="w-full bg-black/40 rounded-2xl border border-white/10 shadow-inner"
                />
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-white text-sm font-bold px-2 tracking-wider">POSE</span>
                <canvas
                    ref={poseCanvasRef} width={320} height={240}
                    className="w-full bg-black/40 rounded-2xl border border-white/10 shadow-inner"
                />
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-white text-sm font-bold px-2 tracking-wider">HANDS</span>
                <canvas
                    ref={handsCanvasRef} width={320} height={240}
                    className="w-full bg-black/40 rounded-2xl border border-white/10 shadow-inner"
                />
            </div>

            <div className="text-white/40 text-[10px] text-center mt-1 uppercase tracking-tighter">
                MediaPipe Analysis Pipeline Active
            </div>
        </div>
    );
}
