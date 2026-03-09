import { useEffect, useState } from "react";

/** 브라우저에서 오디오 입출력 장치 목록을 가져오는 훅 */
export function useAudioDevices() {
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        // label을 읽으려면 권한이 필요해서, 한 번 권한 요청
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const all = await navigator.mediaDevices.enumerateDevices();
        const mics = all.filter((d) => d.kind === "audioinput");
        const speakers = all.filter((d) => d.kind === "audiooutput");
        if (mounted) {
          setMicDevices(mics);
          setSpeakerDevices(speakers);
          setReady(true);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "mic permission failed");
      }
    }
    refresh();
    const onChange = () => refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => {
      mounted = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
    };
  }, []);

  // Backward compatibility: `devices`는 기존 코드에서 마이크 목록으로 사용됨.
  return { devices: micDevices, micDevices, speakerDevices, ready, error };
}
