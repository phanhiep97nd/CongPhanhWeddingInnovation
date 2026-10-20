import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Invitation from "../../../pages/Invitation";
import InvitationShell from "./InvitationShell";
import Hy3dModes from "./Hy3dModes";
import * as capability from "./capability";
import { scrollToProgress } from "./progress";
import { premiumEntitlements, response, wedding } from "../../../test/plan-fixtures";
import type { PublicGuest, Wedding } from "../../../lib/types";

const hy3dWedding: Wedding = {
  ...wedding,
  template: "hy3d",
  entitlements: premiumEntitlements,
  couple: { groom: "Minh Công", bride: "Phương Anh", groomFull: "", brideFull: "" },
  eventDate: "2026-12-12",
  eventTime: "18:00",
  dateText: "12 · 12 · 2026",
  sections: [
    { key: "story", enabled: true },
    { key: "timeline", enabled: true },
    { key: "info", enabled: true },
    { key: "gallery", enabled: false },
  ],
  timeline: [{ id: "t1", time: "18:00", title: "Lễ thành hôn", desc: "" }],
  venue: { name: "Aman Villa", address: "Ba Vì", mapUrl: "https://maps.example/aman" },
};

const guest: PublicGuest = { code: "abc", invitationName: "Chị Thu Hà", status: "pending", guestCount: 1, joinGroup: false, pickupPoint: "", room: "" };

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("scroll to walk progress", () => {
  const stops = [800, 1600, 2400];

  it("starts at 0 and ends at 1", () => {
    expect(scrollToProgress(0, stops, 3200)).toBe(0);
    expect(scrollToProgress(3200, stops, 3200)).toBe(1);
    expect(scrollToProgress(9999, stops, 3200)).toBe(1);
  });

  it("puts each stop exactly on its station progress", () => {
    expect(scrollToProgress(800, stops, 3200)).toBeCloseTo(1 / 4);
    expect(scrollToProgress(1600, stops, 3200)).toBeCloseTo(2 / 4);
    expect(scrollToProgress(2400, stops, 3200)).toBeCloseTo(3 / 4);
  });

  it("interpolates between stops", () => {
    expect(scrollToProgress(1200, stops, 3200)).toBeCloseTo(3 / 8);
  });

  it("handles a page with no stops", () => {
    expect(scrollToProgress(100, [], 200)).toBeCloseTo(0.5);
  });
});

describe("Hỷ 3D mode", () => {
  it("opens with the classic hero facts above the scene", () => {
    render(<InvitationShell wedding={hy3dWedding} guest={guest} slug="pa-mc" onUnavailable={vi.fn()} />);
    expect(screen.getByText("Chị Thu Hà")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Phương Anh");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Minh Công");
    expect(screen.getByText("18:00 · Thứ Bảy · 12 · 12 · 2026")).toBeInTheDocument();
    expect(screen.getByText("Aman Villa, Ba Vì")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cuộn để đi cùng chúng mình/ })).toBeInTheDocument();
  });

  it("invites 'bạn' when there is no guest", () => {
    render(<InvitationShell wedding={hy3dWedding} guest={null} slug="pa-mc" onUnavailable={vi.fn()} />);
    expect(screen.getByText("Trân trọng kính mời bạn")).toBeInTheDocument();
  });

  it("renders only enabled sections, in order", () => {
    const { container } = render(<InvitationShell wedding={hy3dWedding} guest={null} slug="pa-mc" onUnavailable={vi.fn()} />);
    const ids = [...container.querySelectorAll(".hy3d-stop")].map((element) => element.id);
    expect(ids).toEqual(["story", "timeline", "info"]);
  });
});

describe("3D / normal modes", () => {
  it("uses the normal (classic) invitation without a switch when 3D is unavailable", async () => {
    vi.spyOn(capability, "canRender3d").mockReturnValue(false);
    const { container } = render(<Hy3dModes wedding={hy3dWedding} guest={guest} slug="pa-mc" />);
    expect(await screen.findByLabelText("Các hạng mục thiệp")).toBeInTheDocument();
    expect(container.querySelector(".hy3d")).toBeNull();
    expect(screen.queryByRole("group", { name: "Chế độ xem thiệp" })).toBeNull();
  });

  it("starts in 3D and switches to the normal mode, remembering the choice", async () => {
    vi.spyOn(capability, "canRender3d").mockReturnValue(true);
    const { container, unmount } = render(<Hy3dModes wedding={hy3dWedding} guest={guest} slug="pa-mc" />);
    expect(await screen.findByRole("button", { name: /Cuộn để đi cùng chúng mình/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3D" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Thường" }));
    expect(await screen.findByLabelText("Các hạng mục thiệp")).toBeInTheDocument();
    expect(container.querySelector(".hy3d")).toBeNull();
    expect(localStorage.getItem("hy3d-mode")).toBe("normal");
    unmount();

    render(<Hy3dModes wedding={hy3dWedding} guest={guest} slug="pa-mc" />);
    expect(await screen.findByLabelText("Các hạng mục thiệp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thường" })).toHaveAttribute("aria-pressed", "true");
  });

  it("is used by the invitation page for the hy3d template", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(hy3dWedding));
    render(
      <MemoryRouter initialEntries={["/w/pa-mc"]}>
        <Routes>
          <Route path="/w/:slug" element={<Invitation />} />
        </Routes>
      </MemoryRouter>,
    );
    // jsdom has no WebGL, so the page lands on the normal mode.
    expect(await screen.findByLabelText("Các hạng mục thiệp")).toBeInTheDocument();
  });
});
