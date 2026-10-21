import type { ViewMode } from "../../../lib/types";

// One source for the Hỷ 3D viewing modes, shared by the invitation switcher and the editor setting.
// The stored value for "Trong suốt" stays "mixed" so guests' remembered choices keep working.
export const VIEW_MODES: { value: ViewMode; label: string; description: string }[] = [
  { value: "3d", label: "3D", description: "Cô dâu chú rể 3D đi trên con đường hoa" },
  { value: "mixed", label: "Trong suốt", description: "Thiệp thường trên nền 3D chuyển động" },
  { value: "normal", label: "Thường", description: "Thiệp cổ điển, không có 3D" },
];

export const ALL_VIEW_MODES: ViewMode[] = VIEW_MODES.map((mode) => mode.value);

// Modes a guest can actually use: what the owner enabled, minus the 3D ones on devices without WebGL.
// Never empty: the classic invitation is the last resort.
export function allowedModes(enabled: ViewMode[] | undefined, can3d: boolean): ViewMode[] {
  const chosen = (enabled?.length ? enabled : ALL_VIEW_MODES).filter((mode) => ALL_VIEW_MODES.includes(mode));
  const usable = chosen.filter((mode) => can3d || mode === "normal");
  return usable.length ? usable : ["normal"];
}

// First visit: the remembered choice if still allowed, otherwise the first allowed mode in display order.
export function initialMode(allowed: ViewMode[], stored: ViewMode | null): ViewMode {
  return stored && allowed.includes(stored) ? stored : allowed[0];
}
