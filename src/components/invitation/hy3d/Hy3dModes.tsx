import { lazy, Suspense, useState } from "react";
import type { PublicGuest, Wedding } from "../../../lib/types";
import { canRender3d } from "./capability";
import "./mode-switch.css";

const Hy3dInvitation = lazy(() => import("./InvitationShell"));
const ClassicInvitation = lazy(() => import("../original/InvitationShell"));

type Mode = "3d" | "normal";
const STORAGE_KEY = "hy3d-mode";

function storedMode(): Mode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "3d" || value === "normal" ? value : null;
  } catch {
    return null;
  }
}

// ── Two modes for the Hỷ 3D template ──────────────────────────────────────────
// "3D": the walking-couple scene. "Thường": the classic invitation exactly as before.
// Guests switch freely; devices that cannot render 3D only get the normal mode.
export default function Hy3dModes(props: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const [available] = useState(() => canRender3d());
  const [mode, setMode] = useState<Mode>(() => (available ? storedMode() ?? "3d" : "normal"));

  function choose(next: Mode) {
    if (next === mode) return;
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice just isn't remembered.
    }
    window.scrollTo(0, 0);
  }

  return (
    <>
      <Suspense fallback={<p className="page-loading">Đang mở thiệp...</p>}>
        {mode === "3d"
          ? <Hy3dInvitation {...props} onUnavailable={() => setMode("normal")} />
          : <ClassicInvitation {...props} />}
      </Suspense>
      {available && (
        <div className="mode-switch" role="group" aria-label="Chế độ xem thiệp">
          <button type="button" aria-pressed={mode === "3d"} onClick={() => choose("3d")}>3D</button>
          <button type="button" aria-pressed={mode === "normal"} onClick={() => choose("normal")}>Thường</button>
        </div>
      )}
    </>
  );
}
