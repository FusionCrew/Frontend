interface Props {
  videoElement?: HTMLVideoElement | null;
  hesitationScore?: number;
  isHesitating?: boolean;
  faceScore?: number;
  poseScore?: number;
  poseFeatures?: Record<string, number> | null;
  isDetecting?: boolean;
  error?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  sttEnabled: boolean;
  ttsEnabled: boolean;
  llmEnabled: boolean;
  listeningEnabled: boolean;
  onToggleStt: (next: boolean) => void;
  onToggleTts: (next: boolean) => void;
  onToggleLlm: (next: boolean) => void;
  realtimeEnabled?: boolean;
  realtimeConnected?: boolean;
  realtimeStatusText?: string;
  onToggleRealtime?: (next: boolean) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  micDevices: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
  speakerDevices?: MediaDeviceInfo[];
  selectedOutputDeviceId?: string;
  onSelectOutputDevice?: (deviceId: string) => void;
  voiceLogs: string[];
}

export default function MediaPipeDebugPanel({
  hesitationScore = 0,
  isHesitating = false,
  faceScore = 0,
  poseScore = 0,
  poseFeatures = null,
  isDetecting = false,
  error = null,
  isOpen,
  onToggle,
  sttEnabled,
  ttsEnabled,
  llmEnabled,
  listeningEnabled,
  onToggleStt,
  onToggleTts,
  onToggleLlm,
  realtimeEnabled = false,
  realtimeConnected = false,
  realtimeStatusText,
  onToggleRealtime,
  onStartVoice,
  onStopVoice,
  micDevices,
  selectedDeviceId,
  onSelectDevice,
  speakerDevices = [],
  selectedOutputDeviceId,
  onSelectOutputDevice,
  voiceLogs,
}: Props) {
  const handHover = Number(poseFeatures?.hand_hover ?? 0);
  const torsoLean = Number(poseFeatures?.torso_lean ?? 0);
  const sway = Number(poseFeatures?.sway ?? 0);

  return (
    <div className="fixed z-[5000]" style={{ top: "24px", right: "24px" }}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-2 rounded-xl bg-black/70 text-white text-xs border border-white/20 hover:bg-black/80"
        >
          {isOpen ? "DEV 닫기" : "DEV 열기"}
        </button>

        {isOpen && (
          <div
            className="flex flex-col gap-3 p-3 bg-black/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl"
            style={{ width: "380px" }}
          >
            <div className="text-white text-xs font-semibold">Server Hesitation (Face+Pose Always On)</div>

            <div className="grid grid-cols-2 gap-2 text-xs text-white">
              <div className="bg-white/10 rounded-lg px-2 py-1">
                Final: <b>{Math.round(hesitationScore * 100)}%</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                State: <b className={isHesitating ? "text-red-300" : "text-emerald-300"}>{isHesitating ? "HESITATING" : "NORMAL"}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                face_score: <b>{faceScore.toFixed(3)}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                pose_score: <b>{poseScore.toFixed(3)}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                hand_hover: <b>{handHover.toFixed(3)}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                torso_lean: <b>{torsoLean.toFixed(3)}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                sway: <b>{sway.toFixed(3)}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1">
                Tracking: <b>{isDetecting ? "ON" : "OFF"}</b>
              </div>
              <div className="bg-white/10 rounded-lg px-2 py-1 col-span-2">
                {error ? <span className="text-red-300">{error}</span> : <span className="text-white/80">Local MediaPipe disabled for stability</span>}
              </div>
            </div>

            <div className="text-white text-xs font-semibold">Voice AI Controls</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onToggleStt(!sttEnabled)}
                className={`px-2 py-1 rounded-lg border ${sttEnabled ? "bg-emerald-500/70 text-white border-emerald-300/60" : "bg-white/10 text-white/80 border-white/20"}`}
              >
                STT {sttEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => onToggleTts(!ttsEnabled)}
                className={`px-2 py-1 rounded-lg border ${ttsEnabled ? "bg-emerald-500/70 text-white border-emerald-300/60" : "bg-white/10 text-white/80 border-white/20"}`}
              >
                TTS {ttsEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => onToggleLlm(!llmEnabled)}
                className={`px-2 py-1 rounded-lg border ${llmEnabled ? "bg-emerald-500/70 text-white border-emerald-300/60" : "bg-white/10 text-white/80 border-white/20"}`}
              >
                LLM {llmEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => onToggleRealtime?.(!realtimeEnabled)}
                className={`px-2 py-1 rounded-lg border ${realtimeEnabled ? "bg-cyan-500/70 text-white border-cyan-300/60" : "bg-white/10 text-white/80 border-white/20"}`}
              >
                RT {realtimeEnabled ? "ON" : "OFF"}
              </button>
            </div>
            <div className="text-[11px] text-white/80">
              Realtime: <b>{realtimeConnected ? "CONNECTED" : realtimeEnabled ? "READY" : "OFF"}</b>
              {realtimeStatusText ? <span className="ml-1 text-white/60">({realtimeStatusText})</span> : null}
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={onStartVoice}
                className="flex-1 px-2 py-1 rounded-lg border bg-blue-500/70 text-white border-blue-300/60"
              >
                VOICE START
              </button>
              <button
                type="button"
                onClick={onStopVoice}
                className="flex-1 px-2 py-1 rounded-lg border bg-white/10 text-white/80 border-white/20"
              >
                VOICE STOP
              </button>
            </div>
            <div className="text-[11px] text-white/80">Mic: <b>{listeningEnabled ? "LISTENING" : "PAUSED"}</b></div>

            <div className="text-white text-xs font-semibold">Mic Device</div>
            <select
              value={selectedDeviceId || ""}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
            >
              {micDevices.length === 0 ? (
                <option value="">No mic detected</option>
              ) : (
                micDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>

            <div className="text-white text-xs font-semibold">Output Device</div>
            <select
              value={selectedOutputDeviceId || ""}
              onChange={(e) => onSelectOutputDevice?.(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
            >
              {speakerDevices.length === 0 ? (
                <option value="">Default output</option>
              ) : (
                speakerDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>

            <div className="text-white text-xs font-semibold">Voice Logs</div>
            <div className="max-h-44 overflow-y-auto bg-black/30 border border-white/15 rounded-lg p-2 text-[11px] text-white/90">
              {voiceLogs.length === 0 ? (
                <div className="text-white/60">No logs yet</div>
              ) : (
                voiceLogs.map((log, idx) => (
                  <div key={`${idx}-${log}`} className="py-0.5 border-b border-white/10 last:border-b-0">
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="text-white/50 text-[10px] text-center uppercase tracking-tight">Developer Panel</div>
          </div>
        )}
      </div>
    </div>
  );
}
