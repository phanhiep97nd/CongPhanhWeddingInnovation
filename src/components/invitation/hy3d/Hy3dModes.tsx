import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import type { PublicGuest, Wedding } from "../../../lib/types";
import { canRender3d } from "./capability";
import "./mode-switch.css";

const Hy3dInvitation = lazy(() => import("./InvitationShell"));
const ClassicInvitation = lazy(() => import("../original/InvitationShell"));
const MixedInvitation = lazy(() => import("./MixedMode"));

type Mode = "3d" | "mixed" | "normal";
const STORAGE_KEY = "hy3d-mode";
const MODES: { value: Mode; label: string; short: string }[] = [
  { value: "3d", label: "3D", short: "3D" },
  { value: "mixed", label: "Kết hợp", short: "KH" },
  { value: "normal", label: "Thường", short: "2D" },
];

function storedMode(): Mode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "3d" || value === "mixed" || value === "normal" ? value : null;
  } catch {
    return null;
  }
}

// ── Viewing modes ──
export default function Hy3dModes(props: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const [available, setAvailable] = useState(() => canRender3d());
  const [mode, setMode] = useState<Mode>(() => (available ? storedMode() ?? "3d" : "normal"));
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = MODES.find((option) => option.value === mode)!;

  useEffect(() => {
    if (!menuOpen) return;
    const trigger = triggerRef.current;
    menuRef.current?.querySelector<HTMLButtonElement>("[aria-pressed='true']")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [menuOpen]);

  function unavailable() {
    setAvailable(false);
    setMenuOpen(false);
    setMode("normal");
  }

  function choose(next: Mode) {
    setMenuOpen(false);
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
          ? <Hy3dInvitation {...props} onUnavailable={unavailable} />
          : mode === "mixed"
            ? <MixedInvitation {...props} onUnavailable={unavailable} />
            : <ClassicInvitation {...props} />}
      </Suspense>
      {available && (
        <>
          <button
            ref={triggerRef}
            type="button"
            className="mode-switch-compact"
            aria-label={`Chế độ xem thiệp: ${current.label}`}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {current.short}
          </button>
          {menuOpen && (
            <div className="mode-menu-overlay" onClick={(event) => {
              if (event.target === event.currentTarget) setMenuOpen(false);
            }}>
              <div ref={menuRef} id={menuId} className="mode-menu" role="dialog" aria-modal="true" aria-label="Chọn chế độ xem thiệp">
                <div role="group" aria-label="Chế độ xem thiệp">
                  {MODES.map((option) => (
                    <button key={option.value} type="button" aria-pressed={mode === option.value} onClick={() => choose(option.value)}>
                      <span>{option.label}</span>
                      <span aria-hidden="true">{mode === option.value ? "●" : "○"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
