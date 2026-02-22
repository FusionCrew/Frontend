import { useEffect, useRef } from "react";
import { AI_BASE_URL } from "../api/config";

/** ===== ???& ?듭뀡 ===== */
type Opts = {
  enabled: boolean;
  deviceId?: string;
  inputLang: string;
  outputs?: string[];
  sttModel: string;
  llmModel: string;
  onResult: (json: { original: string; translations: { lang: string; text: string }[] }) => void;
  onError?: (msg: string) => void;
  onDebug?: (msg: string) => void;
  // ====== VAD & ?멸렇癒쇳듃 ?뚮씪誘명꽣 (?꾩슂??議곗젅) ======
  /** VAD ?쒖옉 ?꾧퀎移?(?믪쓣?섎줉 ?붽컧). 湲곕낯 0.005 */
  vadGateHigh?: number;
  /** VAD 醫낅즺 ?꾧퀎移??덉뒪?뚮━?쒖뒪). 湲곕낯 0.004 */
  vadGateLow?: number;
  /** 臾댁쓬 ?⑤뵫(ms): 留먯씠 硫덉텣 ?????쒓컙留?議곗슜?섎㈃ segment 醫낅즺. 湲곕낯 70ms */
  padMs?: number;
  /** 理쒖냼 諛쒗솕 湲몄씠(ms): ?대낫??吏㏃쑝硫??먭린. 湲곕낯 400ms */
  minSpeechMs?: number;
  /** 理쒕? 諛쒗솕 湲몄씠(ms): ?대낫??湲몃㈃ ?덉쟾?섍쾶 媛뺤젣 而? 湲곕낯 5000ms */
  maxSegmentMs?: number;
  /** ?꾩＜ ?쏀븳 ?꾨━寃뚯씤(1.0~1.3 沅뚯옣). 湲곕낯 1.05 */
  preGain?: number;
  // ====== 踰덉뿭 ?뚮씪誘명꽣 ======
  /** 踰덉뿭 ?섑뵆留??뚮씪誘명꽣 (?댁쟾 紐⑤뱢怨??좎궗) */
  translationTemperature?: number; // 湲곕낯 0
  translationTopP?: number;        // 湲곕낯 1
  translationMaxTokens?: number;   // 湲곕낯 256
  /** 蹂묐젹 ?뚯빱 ???곹븳 */
  translationParallelWorkers?: number; // 湲곕낯 outputs.length
};

/** ===== ?좏떥 ===== */
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
    enabled, deviceId, inputLang, outputs = [], sttModel, llmModel, onResult, onError, onDebug,
    vadGateHigh = 0.01, vadGateLow = 0.004, padMs = 70, minSpeechMs = 800, maxSegmentMs = 5000, preGain = 1.02,
    translationTemperature = 0, translationTopP = 1, translationMaxTokens = 256, translationParallelWorkers,
  } = opts;

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const reqCtrlRef = useRef<AbortController | null>(null);

  // ?멸렇癒쇳듃 ?곹깭
  const segFramesRef = useRef<Float32Array[]>([]);
  const segDurMsRef = useRef<number>(0);
  const silenceMsRef = useRef<number>(0);
  const speakingRef = useRef<boolean>(false);
  const voicedMsRef = useRef<number>(0);       // ???꾩쟻 "諛쒗솕" ?쒓컙(臾댁꽦 援ш컙 ?쒖쇅)

  useEffect(() => {
    (async () => {
      try {
        // Warmup endpoint is not guaranteed in every deployment.
        // Use health ping to avoid noisy 500s when proxy routes are absent.
        await fetch(`${AI_BASE_URL}/meta/health`, {
          method: "GET",
        });
      } catch { }
    })();
  }, [sttModel, llmModel, inputLang]);

  const outputsKey = (outputs && Array.isArray(outputs)) ? outputs.join("|") : "";

  useEffect(() => {
    if (!enabled) {
      onDebug?.("mic disabled");
      cleanup();
      return;
    }

    let stopped = false;
    (async () => {
      try {
        onDebug?.(`mic init: device=${deviceId || "default"}`);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (stopped) return;
        mediaRef.current = stream;
        onDebug?.("mic stream opened");

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;
        if (ctx.state !== "running") {
          await ctx.resume();
        }
        onDebug?.(`audio context: ${ctx.state}`);
        const src = ctx.createMediaStreamSource(stream);
        srcRef.current = src;
        const proc = ctx.createScriptProcessor(2048, 1, 1);
        procRef.current = proc;

        // 珥덇린??
        segFramesRef.current = [];
        segDurMsRef.current = 0;
        silenceMsRef.current = 0;
        speakingRef.current = false;
        voicedMsRef.current = 0;

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
              onDebug?.(`speech start: energy=${energy.toFixed(4)}`);
              speakingRef.current = true;
              segFramesRef.current.push(down);
              segDurMsRef.current += frameMs;
              silenceMsRef.current = 0;
              voicedMsRef.current += frameMs;             // ???쒖옉 ?꾨젅?꾩쓣 諛쒗솕濡?移댁슫??
            }
          } else {
            segFramesRef.current.push(down);
            segDurMsRef.current += frameMs;

            if (energy < vadGateLow) {
              silenceMsRef.current += frameMs;
              if (silenceMsRef.current >= padMs || segDurMsRef.current >= maxSegmentMs) {
                onDebug?.(`speech end: dur=${Math.round(segDurMsRef.current)}ms`);
                finalizeSegment().catch(e => onError?.(String(e)));
                resetSegmentState();
              }
            } else {
              silenceMsRef.current = 0;
              voicedMsRef.current += frameMs;             // ??諛쒗솕 ?꾨젅???꾩쟻
              if (segDurMsRef.current >= maxSegmentMs) {
                onDebug?.(`speech cut(max): dur=${Math.round(segDurMsRef.current)}ms`);
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
    enabled, deviceId, inputLang, outputsKey,
    sttModel, llmModel, vadGateHigh, vadGateLow, padMs,
    minSpeechMs, maxSegmentMs, preGain
  ]);

  function resetSegmentState() {
    segFramesRef.current = [];
    segDurMsRef.current = 0;
    silenceMsRef.current = 0;
    speakingRef.current = false;
    voicedMsRef.current = 0;
  }

  async function finalizeSegment() {
    const frames = segFramesRef.current;
    const durMs = segDurMsRef.current;
    const voicedMs = voicedMsRef.current;

    if (!frames.length) return;

    // ?⑹튂湲?
    const totalLen = frames.reduce((a, b) => a + b.length, 0);
    const merged = new Float32Array(totalLen);
    let off = 0;
    for (const f of frames) { merged.set(f, off); off += f.length; }

    // ?덉쭏 吏??怨꾩궛
    let peak = 0;
    for (let i = 0; i < merged.length; i++) {
      const a = Math.abs(merged[i]);
      if (a > peak) peak = a;
    }
    const rms = rmsEnergy(merged);
    const voicedFraction = voicedMs > 0 ? voicedMs / Math.max(1, durMs) : 0;
    const dynamicMinSpeechMs =
      voicedFraction >= 0.35 ? Math.max(500, minSpeechMs - 200) : Math.max(500, minSpeechMs);

    if (durMs < dynamicMinSpeechMs) {
      onDebug?.(`segment dropped(short): dur=${Math.round(durMs)}ms min=${Math.round(dynamicMinSpeechMs)}ms`);
      return;
    }

    // ?꾩＜ ?쏀븳 ?좎젣 ?꾪꽣 (臾댁꽦/?≪쓬留뚯씤 寃쎌슦)
    if (voicedFraction < 0.18 && durMs < 1200) {
      // 嫄곗쓽 臾댁꽦 + 吏㏃쓬 ???꾩삁 ?먭린
      onDebug?.(`segment dropped(noisy): voiced=${voicedFraction.toFixed(2)} dur=${Math.round(durMs)}ms`);
      return;
    }

    const pcm16 = floatTo16BitPCM(merged);
    const wavBuf = encodeWav(pcm16, 16000);
    const blob = new Blob([wavBuf], { type: "audio/wav" });

    // ?ㅽ듃?뚰겕 ?붿껌 而⑦듃濡ㅻ윭
    reqCtrlRef.current?.abort();
    const ac = new AbortController();
    reqCtrlRef.current = ac;

    try {
      onDebug?.(`stt request: dur=${Math.round(durMs)}ms`);
      /** 1) STT (Updated for Spring Boot: JSON with Base64) */
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise(resolve => reader.onloadend = resolve);
      const base64Audio = (reader.result as string).split(',')[1];

      const sttRes = await fetchWithRetry(
        `${AI_BASE_URL}/stt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            language: inputLang,
            model: sttModel,
            mimeType: "audio/wav"
          }),
          signal: ac.signal
        },
        2, 250
      );

      // Spring returns AiCommonResponse<SttDto.Result>
      // { success: true, data: { text: "..." } }
      const sttJson = await sttRes.json();
      const transcript = (
        sttJson?.data?.text ||
        sttJson?.data?.transcript ||
        sttJson?.text ||
        ""
      ).trim();
      if (!transcript) {
        const errCode = sttJson?.error?.code || "";
        const errMsg = sttJson?.error?.message || "";
        onDebug?.(
          `stt empty transcript (success=${String(sttJson?.success)} code=${String(errCode)} message=${String(errMsg || sttJson?.message || "")})`
        );
        return;
      }
      onDebug?.(`stt ok: ${transcript}`);

      /** 2) 踰덉뿭 ??蹂묐젹 */
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
          `${AI_BASE_URL}/translate`,
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
            try { await translateOne(lang); } catch { }
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
    } catch { }
    reqCtrlRef.current = null;
    procRef.current = null;
    srcRef.current = null;
    ctxRef.current = null;
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    resetSegmentState();
  }
}
