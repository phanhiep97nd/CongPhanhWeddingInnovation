import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen, Box, Check, Layers, type LucideIcon } from "lucide-react";
import type { PublicGuest, ViewMode, Wedding } from "../../../lib/types";
import { canRender3d } from "./capability";
import { VIEW_MODES, allowedModes, initialMode } from "./viewModes";
import "./mode-switch.css";

const Hy3dInvitation = lazy(() => import("./InvitationShell"));
const ClassicInvitation = lazy(() => import("../original/InvitationShell"));
const MixedInvitation = lazy(() => import("./MixedMode"));

const STORAGE_KEY = "hy3d-mode";
const ICONS: Record<ViewMode, LucideIcon> = { "3d": Box, mixed: Layers, normal: BookOpen };

function storedMode(): ViewMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "3d" || value === "mixed" || value === "normal" ? value : null;
  } catch {
    return null;
  }
}

// ── Viewing modes ─────────────────────────────────────────────────────────────
// The owner chooses which of 3D / Trong suốt / Thường guests may use (wedding.viewModes); devices without WebGL
// only get the classic mode. The switcher only appears when there is more than one mode to choose from.
export default function Hy3dModes(props: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const [can3d, setCan3d] = useState(() => canRender3d());
  const allowed = useMemo(() => allowedModes(props.wedding.viewModes, can3d), [props.wedding.viewModes, can3d]);
  const [chosen, setChosen] = useState<ViewMode>(() => initialMode(allowed, storedMode()));
  const mode = allowed.includes(chosen) ? chosen : allowed[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = VIEW_MODES.find((option) => option.value === mode)!;
  const CurrentIcon = ICONS[mode];

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

  // WebGL failed at runtime: fall back to what is left (the classic mode at least).
  function unavailable() {
    setCan3d(false);
    setMenuOpen(false);
  }

  function choose(next: ViewMode) {
    setMenuOpen(false);
    if (next === mode) return;
    setChosen(next);
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
      {allowed.length > 1 && (
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
            <CurrentIcon aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="mode-menu-overlay" onClick={(event) => {
              if (event.target === event.currentTarget) setMenuOpen(false);
            }}>
              <div ref={menuRef} id={menuId} className="mode-menu" role="dialog" aria-modal="true" aria-label="Chọn chế độ xem thiệp">
                <p className="mode-menu-title">Chế độ xem thiệp</p>
                <div role="group" aria-label="Chế độ xem thiệp">
                  {VIEW_MODES.filter((option) => allowed.includes(option.value)).map((option) => {
                    const Icon = ICONS[option.value];
                    const selected = mode === option.value;
                    return (
                      // Name = the label, description read separately (inline spans would run together as "3DCô dâu…").
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={option.label}
                        aria-describedby={`${menuId}-${option.value}`}
                        onClick={() => choose(option.value)}
                      >
                        <Icon className="mode-menu-icon" aria-hidden="true" />
                        <span className="mode-menu-text">
                          <span className="mode-menu-label">{option.label}</span>
                          <span id={`${menuId}-${option.value}`} className="mode-menu-description">{option.description}</span>
                        </span>
                        {selected && <Check className="mode-menu-check" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
