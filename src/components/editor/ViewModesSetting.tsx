import type { ViewMode, Wedding } from "../../lib/types";
import { ALL_VIEW_MODES, VIEW_MODES } from "../invitation/hy3d/viewModes";

// Owner setting for the Hỷ 3D template: which viewing modes guests can switch between.
// At least one mode stays on; with a single mode the invitation shows no switcher at all.
export default function ViewModesSetting({ wedding, change }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void }) {
  const enabled = wedding.viewModes?.length ? wedding.viewModes : ALL_VIEW_MODES;

  function toggle(mode: ViewMode) {
    const next = enabled.includes(mode)
      ? enabled.filter((value) => value !== mode)
      : ALL_VIEW_MODES.filter((value) => value === mode || enabled.includes(value));
    if (!next.length) return;
    change({ viewModes: next });
  }

  return (
    <fieldset className="view-modes">
      <legend>Chế độ xem cho khách</legend>
      <p className="view-modes-help">
        Khách chuyển giữa các chế độ bằng nút nhỏ ở góc thiệp. Chỉ bật một chế độ thì thiệp không hiện nút chuyển.
      </p>
      {VIEW_MODES.map((mode) => {
        const on = enabled.includes(mode.value);
        const last = on && enabled.length === 1;
        return (
          <label key={mode.value} className="view-modes-row">
            <span className="view-modes-text">
              <span className="view-modes-label">{mode.label}</span>
              <span className="view-modes-description">{mode.description}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={on}
              disabled={last}
              aria-describedby={last ? "view-modes-last" : undefined}
              onChange={() => toggle(mode.value)}
            />
          </label>
        );
      })}
      {enabled.length === 1 && (
        <p id="view-modes-last" className="view-modes-help">Cần giữ ít nhất một chế độ.</p>
      )}
    </fieldset>
  );
}
