import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { allowedModes, initialMode } from "./viewModes";
import ViewModesSetting from "../../editor/ViewModesSetting";
import Hy3dModes from "./Hy3dModes";
import * as capability from "./capability";
import { premiumEntitlements, wedding } from "../../../test/plan-fixtures";
import type { Wedding } from "../../../lib/types";

const hy3d: Wedding = { ...wedding, template: "hy3d", entitlements: premiumEntitlements, sections: [] };

describe("owner-selected viewing modes", () => {
  it("keeps the owner's modes and drops 3D ones on devices without WebGL", () => {
    expect(allowedModes(["3d", "normal"], true)).toEqual(["3d", "normal"]);
    expect(allowedModes(["3d", "mixed"], false)).toEqual(["normal"]);
    expect(allowedModes(undefined, true)).toEqual(["3d", "mixed", "normal"]);
    expect(allowedModes([], true)).toEqual(["3d", "mixed", "normal"]);
  });

  it("starts on the remembered mode only when it is still allowed", () => {
    expect(initialMode(["mixed", "normal"], "normal")).toBe("normal");
    expect(initialMode(["mixed", "normal"], "3d")).toBe("mixed");
    expect(initialMode(["3d"], null)).toBe("3d");
  });

  it("hides the switcher when the owner keeps a single mode", async () => {
    vi.spyOn(capability, "canRender3d").mockReturnValue(true);
    render(<Hy3dModes wedding={{ ...hy3d, viewModes: ["normal"] }} guest={null} slug="t" />);
    expect(await screen.findByLabelText("Các hạng mục thiệp", undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chế độ xem thiệp/ })).toBeNull();
    vi.restoreAllMocks();
  });

  it("lists only the enabled modes in the switcher", async () => {
    vi.spyOn(capability, "canRender3d").mockReturnValue(true);
    render(<Hy3dModes wedding={{ ...hy3d, viewModes: ["mixed", "normal"] }} guest={null} slug="t" />);
    fireEvent.click(await screen.findByRole("button", { name: /Chế độ xem thiệp/ }));
    expect(screen.getByRole("button", { name: "Trong suốt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thường" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "3D" })).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("editor setting", () => {
  it("toggles modes in display order and never removes the last one", () => {
    const change = vi.fn();
    const { rerender } = render(<ViewModesSetting wedding={{ ...hy3d, viewModes: ["normal"] }} change={change} />);
    const normal = screen.getByRole("switch", { name: /Thường/ });
    expect(normal).toBeChecked();
    expect(normal).toBeDisabled();
    expect(screen.getByText("Cần giữ ít nhất một chế độ.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /^3D/ }));
    expect(change).toHaveBeenLastCalledWith({ viewModes: ["3d", "normal"] });

    rerender(<ViewModesSetting wedding={{ ...hy3d, viewModes: ["3d", "normal"] }} change={change} />);
    fireEvent.click(screen.getByRole("switch", { name: /Thường/ }));
    expect(change).toHaveBeenLastCalledWith({ viewModes: ["3d"] });
  });

  it("treats a wedding without the field as all modes on", () => {
    render(<ViewModesSetting wedding={hy3d} change={vi.fn()} />);
    expect(screen.getAllByRole("switch").every((element) => (element as HTMLInputElement).checked)).toBe(true);
  });
});
