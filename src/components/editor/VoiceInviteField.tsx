import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { uploadAudio } from "../../lib/images";
import LockedFeature from "../billing/LockedFeature";

// Recordings stay short: a spoken invitation, not a song. The upload limit (15 MB) still applies to files.
const MAX_SECONDS = 180;
const pickType = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(type => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) || "";

// A recorded invitation for one guest (Premium): record in the browser or upload a file; the guest hears it on their card.
export default function VoiceInviteField({ value, onChange, locked, onUpgrade, onBusy }: {
  value: string;
  onChange: (voiceUrl: string) => void;
  locked: boolean;
  onUpgrade: () => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number>(0);
  const canRecord = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => () => { window.clearInterval(timer.current); recorder.current?.state === "recording" && recorder.current.stop(); }, []);

  async function upload(file: File) {
    setBusy(true); onBusy?.(true); setError("");
    try { onChange(await uploadAudio(file)); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); onBusy?.(false); }
  }
  async function start() {
    setError("");
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError("Không mở được micro. Hãy cho phép trình duyệt dùng micro hoặc tải tệp ghi âm lên."); return; }
    const type = pickType();
    const media = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    media.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      window.clearInterval(timer.current);
      setRecording(false);
      const mime = (media.mimeType || type || "audio/webm").split(";")[0];
      const blob = new Blob(chunks, { type: mime });
      if (blob.size) void upload(new File([blob], `loi-moi.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`, { type: mime }));
    };
    recorder.current = media;
    media.start();
    setRecording(true); setSeconds(0);
    timer.current = window.setInterval(() => setSeconds(current => {
      if (current + 1 >= MAX_SECONDS) media.stop();
      return current + 1;
    }), 1000);
  }
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return <div className="voice-invite full">
    <span className="voice-invite-label">Lời mời ghi âm <small>(khách nghe trên thiệp của mình)</small></span>
    {locked && <LockedFeature plan="premium" label="Lời mời ghi âm cho từng khách" onUpgrade={onUpgrade} />}
    {value && !recording && <audio controls preload="none" src={value} aria-label="Nghe lại lời mời ghi âm" />}
    <div className="voice-invite-actions">
      {recording
        ? <button type="button" className="button voice-recording" onClick={() => recorder.current?.stop()}><Square size={15} aria-hidden="true" /> Dừng ghi ({clock})</button>
        : <button type="button" className="button-outline" disabled={locked || busy || !canRecord} title={canRecord ? undefined : "Trình duyệt này không hỗ trợ ghi âm"} onClick={() => void start()}><Mic size={15} aria-hidden="true" /> {value ? "Ghi âm lại" : "Ghi âm trực tiếp"}</button>}
      <label className={`button-outline${locked || busy || recording ? " is-disabled" : ""}`}><Upload size={15} aria-hidden="true" /> {busy ? "Đang tải lên…" : "Tải tệp lên"}
        <input type="file" accept="audio/*" disabled={locked || busy || recording} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      </label>
      {value && !recording && <button type="button" className="text-button" disabled={busy} onClick={() => onChange("")}><Trash2 size={14} aria-hidden="true" /> Xóa ghi âm</button>}
    </div>
    <small className="field-hint">Ghi tối đa {MAX_SECONDS / 60} phút, hoặc tải tệp âm thanh không quá 15 MB.</small>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
