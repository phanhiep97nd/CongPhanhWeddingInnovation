import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Invitation from "../../../pages/Invitation";
import InvitationShell from "./InvitationShell";
import { scrollToProgress } from "./progress";
import { premiumEntitlements, response, wedding } from "../../../test/plan-fixtures";
import type { Wedding } from "../../../lib/types";

const hy3dWedding: Wedding = {
  ...wedding,
  template: "hy3d",
  entitlements: premiumEntitlements,
  sections: [
    { key: "story", enabled: true },
    { key: "timeline", enabled: true },
    { key: "info", enabled: true },
    { key: "gallery", enabled: false },
  ],
  timeline: [{ id: "t1", time: "18:00", title: "Lễ thành hôn", desc: "" }],
  venue: { name: "Aman Villa", address: "Ba Vì", mapUrl: "https://maps.example/aman" },
};

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

describe("Hỷ 3D template", () => {
  it("falls back to a readable 2D page without WebGL", () => {
    // jsdom has no WebGL context, which is exactly the fallback path.
    const { container } = render(<InvitationShell wedding={hy3dWedding} guest={{ code: "abc", invitationName: "Chị Thu Hà", status: "pending", guestCount: 1, joinGroup: false, pickupPoint: "", room: "" }} slug="hoa-minh" />);
    expect(container.querySelector(".hy3d.is-flat")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getByText("Thân mời Chị Thu Hà")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Câu chuyện" })).toBeInTheDocument();
    expect(screen.getByText("Lễ thành hôn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem bản đồ" })).toHaveAttribute("href", "https://maps.example/aman");
  });

  it("renders only enabled sections, in order", () => {
    const { container } = render(<InvitationShell wedding={hy3dWedding} guest={null} slug="hoa-minh" />);
    const ids = [...container.querySelectorAll(".hy3d-stop")].map((element) => element.id);
    expect(ids).toEqual(["story", "timeline", "info"]);
  });

  it("is chosen by the invitation page when the template is hy3d", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(hy3dWedding));
    const { container } = render(
      <MemoryRouter initialEntries={["/w/hoa-minh"]}>
        <Routes>
          <Route path="/w/:slug" element={<Invitation />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Câu chuyện" })).toBeInTheDocument();
    expect(container.querySelector(".hy3d")).not.toBeNull();
  });
});
