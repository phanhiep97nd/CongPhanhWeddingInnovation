import { useEffect, useRef, useState } from "react";
import "../../styles/invitation-toolbar.css";
import { Mic, Pause } from "lucide-react";

// The couple's recorded invitation for this guest. Browsers only play sound after a tap, so the guest starts it;
// background music on the page and inside a library card pauses while it plays.
export default function GuestVoice({ src, couple }: { src: string; couple: string }) {
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => player.current?.pause(), []);
  function toggle() {
    const audio = player.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    document.querySelectorAll("audio").forEach(other => { if (other !== audio) other.pause(); });
    document.querySelectorAll("iframe").forEach(frame => frame.contentWindow?.postMessage({ type: "ht:pause-media" }, "*"));
    void audio.play().catch(() => setPlaying(false));
  }
  return <div className="guest-voice">
    <audio ref={player} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" aria-pressed={playing} onClick={toggle}>
      {playing ? <Pause size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
      <span>{playing ? "Đang phát lời mời" : `Nghe lời mời từ ${couple}`}</span>
    </button>
  </div>;
}
