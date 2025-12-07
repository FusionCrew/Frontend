import { useEffect, useRef } from "react";

/** ===== 타입 & 옵션 ===== */
type Opts = {
  enabled: boolean;
  deviceId?: string;
  inputLang: string;
  outputs: string[];
  sttModel: string;
  llmModel: string;
  onResult: (json: { original: string; translations: { lang: string; text: string }[] }) => void;
  onError?: (msg: string) => void;
  // ====== VAD & 세그먼트 파라미터 (필요시 조절) ======
  /** VAD 시작 임계치 (높을수록 둔감). 기본 0.005 */
  vadGateHigh?: number;
  /** VAD 종료 임계치(히스테리시스). 기본 0.004 */
  vadGateLow?: number;
  /** 무음 패딩(ms): 말이 멈춘 뒤 이 시간만 조용하면 segment 종료. 기본 70ms */
  padMs?: number;
  /** 최소 발화 길이(ms): 이보다 짧으면 폐기. 기본 400ms */
  minSpeechMs?: number;
  /** 최대 발화 길이(ms): 이보다 길면 안전하게 강제 컷. 기본 5000ms */
  maxSegmentMs?: number;
  /** 아주 약한 프리게인(1.0~1.3 권장). 기본 1.05 */
  preGain?: number;
  // ====== 번역 파라미터 ======
  /** 번역 샘플링 파라미터 (이전 모듈과 유사) */
  translationTemperature?: number; // 기본 0
  translationTopP?: number;        // 기본 1
  translationMaxTokens?: number;   // 기본 256
  /** 병렬 워커 수 상한 */
  translationParallelWorkers?: number; // 기본 outputs.length
};

/** ===== 유틸 ===== */
function floatTo16BitPCM(src: Float32Array): Int16Array {
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    let s = Math.max(-1, Math.min(1, src[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function downsampleTo16k(float32: Float32Array, inRate: number): Float32Array {
  const outRate = 16000;
  if (inRate === outRate) return float32;
  const ratio = inRate / outRate;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Float32Array(outLen);
  let pos = 0;
  let idx = 0;
  while (idx < outLen) {
    const nextPos = (idx + 1) * ratio;
    let sum = 0, count = 0;
    for (; pos < nextPos && pos < float32.length; pos++) { sum += float32[pos]; count++; }
    out[idx++] = count ? sum / count : 0;
  }
  return out;
}

function encodeWav(int16: Int16Array, sampleRate = 16000): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = 1 * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = int16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  writeString(view, 20, String.fromCharCode(1, 0)); // PCM
  writeString(view, 22, String.fromCharCode(1, 0)); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < int16.length; i++, offset += 2) view.setInt16(offset, int16[i], true);
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function rmsEnergy(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, tries = 2, baseDelayMs = 350) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, baseDelayMs * (1 << i)));
    }
  }
  throw lastErr;
}

export function useMicStreamer(opts: Opts) {
  const {
    enabled, deviceId, inputLang, outputs, sttModel, llmModel, onResult, onError,
    vadGateHigh = 0.01, vadGateLow = 0.004, padMs = 70, minSpeechMs = 800, maxSegmentMs = 5000, preGain = 1.02,
    translationTemperature = 0, translationTopP = 1, translationMaxTokens = 256, translationParallelWorkers,
  } = opts;

  const ctxRef  = useRef<AudioContext | null>(null);
  const srcRef  = useRef<MediaStreamAudioSourceNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const mediaRef= useRef<MediaStream | null>(null);
  const reqCtrlRef = useRef<AbortController | null>(null);

  // 세그먼트 상태
  const segFramesRef = useRef<Float32Array[]>([]);
  const segDurMsRef  = useRef<number>(0);
  const silenceMsRef = useRef<number>(0);
  const speakingRef  = useRef<boolean>(false);
  const voicedMsRef  = useRef<number>(0);       // ✅ 누적 "발화" 시간(무성 구간 제외)

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/warmup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sttModel, llmModel, warmupLanguage: inputLang }),
        });
      } catch {}
    })();
  }, [sttModel, llmModel, inputLang]);

  useEffect(() => {
    if (!enabled) { cleanup(); return; }

    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (stopped) return;
        mediaRef.current = stream;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        srcRef.current = src;
        const proc = ctx.createScriptProcessor(2048, 1, 1);
        procRef.current = proc;

        // 초기화
        segFramesRef.current = [];
        segDurMsRef.current  = 0;
        silenceMsRef.current = 0;
        speakingRef.current  = false;
        voicedMsRef.current  = 0;

        proc.onaudioprocess = (ev) => {
          const inCh = ev.inputBuffer.getChannelData(0);
          let down = downsampleTo16k(inCh, ctx.sampleRate);

          if (preGain !== 1) {
            for (let i = 0; i < down.length; i++) {
              const v = down[i] * preGain;
              down[i] = v > 1 ? 1 : v < -1 ? -1 : v;
            }
          }

          const frameMs = (down.length / 16000) * 1000;
          const energy = rmsEnergy(down);

          if (!speakingRef.current) {
            if (energy >= vadGateHigh) {
              speakingRef.current = true;
              segFramesRef.current.push(down);
              segDurMsRef.current += frameMs;
              silenceMsRef.current = 0;
              voicedMsRef.current  += frameMs;             // ✅ 시작 프레임을 발화로 카운트
            }
          } else {
            segFramesRef.current.push(down);
            segDurMsRef.current += frameMs;

            if (energy < vadGateLow) {
              silenceMsRef.current += frameMs;
              if (silenceMsRef.current >= padMs || segDurMsRef.current >= maxSegmentMs) {
                finalizeSegment().catch(e => onError?.(String(e)));
                resetSegmentState();
              }
            } else {
              silenceMsRef.current = 0;
              voicedMsRef.current  += frameMs;             // ✅ 발화 프레임 누적
              if (segDurMsRef.current >= maxSegmentMs) {
                finalizeSegment().catch(e => onError?.(String(e)));
                resetSegmentState();
              }
            }
          }
        };

        src.connect(proc);
        proc.connect(ctx.destination);
      } catch (e: any) {
        onError?.(e?.message || "mic init failed");
      }
    })();

    return () => { stopped = true; cleanup(); };
  }, [
    enabled, deviceId, inputLang, outputs.join("|"),
    sttModel, llmModel, vadGateHigh, vadGateLow, padMs,
    minSpeechMs, maxSegmentMs, preGain
  ]);

  function resetSegmentState() {
    segFramesRef.current = [];
    segDurMsRef.current  = 0;
    silenceMsRef.current = 0;
    speakingRef.current  = false;
    voicedMsRef.current  = 0;
  }

  async function finalizeSegment() {
    const frames = segFramesRef.current;
    const durMs  = segDurMsRef.current;
    const voicedMs = voicedMsRef.current;

    if (!frames.length) return;
    if (durMs < minSpeechMs) return;

    // 합치기
    const totalLen = frames.reduce((a, b) => a + b.length, 0);
    const merged = new Float32Array(totalLen);
    let off = 0;
    for (const f of frames) { merged.set(f, off); off += f.length; }

    // 품질 지표 계산
    let peak = 0;
    for (let i = 0; i < merged.length; i++) {
      const a = Math.abs(merged[i]);
      if (a > peak) peak = a;
    }
    const rms = rmsEnergy(merged);
    const voicedFraction = voicedMs > 0 ? voicedMs / Math.max(1, durMs) : 0;

    // 아주 약한 선제 필터 (무성/잡음만인 경우)
    if (voicedFraction < 0.18 && durMs < 1200) {
      // 거의 무성 + 짧음 ⇒ 아예 폐기
      return;
    }

    const pcm16 = floatTo16BitPCM(merged);
    const wavBuf = encodeWav(pcm16, 16000);
    const blob = new Blob([wavBuf], { type: "audio/wav" });

    // 네트워크 요청 컨트롤러
    reqCtrlRef.current?.abort();
    const ac = new AbortController();
    reqCtrlRef.current = ac;

    try {
      /** 1) STT */
      const sttFd = new FormData();
      sttFd.append("audio", blob, "segment.wav");
      sttFd.append("inputLang", inputLang);
      sttFd.append("sttModel", sttModel);
      sttFd.append("stats", JSON.stringify({ durMs, voicedMs, voicedFraction, rms, peak })); // ✅ 전달

      const sttRes = await fetchWithRetry(
        "/api/transcribe",
        { method: "POST", body: sttFd, signal: ac.signal },
        2, 250
      );
      const sttJson = await sttRes.json() as { text?: string };
      const transcript = (sttJson?.text || "").trim();
      if (!transcript) return;

      /** 2) 번역 — 병렬 */
      const maxWorkers = Math.max(
        1, Math.min(outputs.length || 1, translationParallelWorkers ?? (outputs.length || 1))
      );
      const queue = [...outputs];
      const results: { lang: string; text: string }[] = [];
      const runners: Promise<void>[] = [];

      const translateOne = async (lang: string) => {
        const body = JSON.stringify({
          text: transcript, target: lang, source: inputLang || "auto",
          model: llmModel, temperature: translationTemperature, top_p: translationTopP, max_tokens: translationMaxTokens,
        });
        const res = await fetchWithRetry(
          "/api/translate",
          { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ac.signal },
          2, 300
        );
        const json = await res.json() as { text?: string };
        const t = (json?.text || "").trim();
        if (t) results.push({ lang, text: t });
      };

      for (let i = 0; i < maxWorkers; i++) {
        runners.push((async () => {
          while (queue.length) {
            const lang = queue.shift();
            if (!lang) break;
            try { await translateOne(lang); } catch {}
          }
        })());
      }

      await Promise.allSettled(runners);

      onResult({
        original: transcript,
        translations: results.sort((a, b) => outputs.indexOf(a.lang) - outputs.indexOf(b.lang)),
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      onError?.(e?.message || String(e));
    }
  }

  function cleanup() {
    try {
      reqCtrlRef.current?.abort();
      procRef.current?.disconnect();
      srcRef.current?.disconnect();
      ctxRef.current?.close();
    } catch {}
    reqCtrlRef.current = null;
    procRef.current = null;
    srcRef.current = null;
    ctxRef.current = null;
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    resetSegmentState();
  }
}
