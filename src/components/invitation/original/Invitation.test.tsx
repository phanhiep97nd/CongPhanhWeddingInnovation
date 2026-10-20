import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Wedding } from "../../../lib/types";
import { navItems, themeVariables } from "./shared";
import { WeddingContext } from "./WeddingContext";
import { StorySection } from "./StorySection";
import { TimelineSection } from "./TimelineSection";
import { GallerySection } from "./GallerySection";
import { InvitePopup } from "./InvitePopup";
import { InfoSection } from "./InfoSection";
import { DressCodePopup } from "./DressCodePopup";

const wedding: Wedding = {
  id: "w1",
  slug: "mai-an",
  published: true,
  couple: { bride: "Mai", groom: "An", brideFull: "Mai", groomFull: "An" },
  eventDate: "2028-02-03",
  dateText: "03 · 02 · 2028",
  venue: { name: "Vườn Mây", address: "Hà Nội", mapUrl: "" },
  coverImage: "/cover.jpg",
  ogImage: "",
  story: { title: "Mùa mình gặp nhau", body: "Chúng mình gặp nhau dưới mưa.", image: "/story.jpg" },
  timeline: [{ id: "t1", time: "17:30", title: "Đón khách tại vườn", desc: "Gặp nhau ở Vườn Mây" }],
  gallery: [{ id: "p1", url: "/photo.jpg", title: "Nắng tháng ba", desc: "Một buổi chiều", full: false }],
  musicUrl: "",
  zaloGroupLink: "",
  dressCode: { note: "Xin mặc màu xanh", colors: ["#123456", "#abcdef"] },
  sections: [
    { key: "timeline", enabled: true },
    { key: "story", enabled: true },
    { key: "gallery", enabled: true },
    { key: "rooms", enabled: true },
    { key: "photoWall", enabled: true },
    { key: "dressCode", enabled: true },
    { key: "rsvp", enabled: false },
  ],
  customSections: [{ id: "note", title: "Lời nhắn", body: "Hẹn gặp nhé", image: "" }],
  meta: { title: "", description: "" },
  theme: { primary: "#987654" },
  createdAt: "",
  updatedAt: "",
};

function withWedding(children: ReactNode) {
  return render(
    <WeddingContext.Provider value={{ wedding, guest: null, slug: wedding.slug }}>
      {children}
    </WeddingContext.Provider>,
  );
}

describe("restored invitation", () => {
  it("builds navigation from enabled sections in wedding order", () => {
    // rooms / photoWall / dressCode are sub-blocks of "info" and never get their own nav entry.
    expect(navItems(wedding).map((item) => item.id)).toEqual(["timeline", "story", "gallery"]);
  });

  it("keeps the original rose tones for the default theme and derives three tones otherwise", () => {
    expect(themeVariables("#b76e79")).toEqual({});
    expect(themeVariables("not-a-colour")).toEqual({});
    const derived = themeVariables("#336699");
    expect(derived["--color-primary-dark"]).toBe("#336699");
    expect(derived["--color-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(derived["--color-primary"]).not.toBe(derived["--color-primary-deep"]);
  });

  it("adds enabled custom sections to navigation", () => {
    const custom = { ...wedding, sections: [...wedding.sections, { key: "custom:note", enabled: true }] };
    expect(navItems(custom).at(-1)).toMatchObject({ id: "custom-note", label: "Lời nhắn" });
  });

  it("shows wedding story and hides the disabled RSVP action", () => {
    withWedding(<StorySection onRSVP={vi.fn()} />);
    expect(screen.getByText("Mùa mình gặp nhau")).toBeInTheDocument();
    expect(screen.getByText("Chúng mình gặp nhau dưới mưa.")).toBeInTheDocument();
    expect(screen.queryByText("XÁC NHẬN THAM DỰ")).not.toBeInTheDocument();
  });

  it("uses the wedding timeline instead of sample times", () => {
    withWedding(<TimelineSection />);
    expect(screen.getByText("17:30")).toBeInTheDocument();
    expect(screen.getByText("Đón khách tại vườn")).toBeInTheDocument();
  });

  it("uses the wedding gallery photo", () => {
    withWedding(<GallerySection />);
    expect(screen.getByAltText("Nắng tháng ba")).toHaveAttribute("src", "/photo.jpg");
  });

  it("greets a guest with the wedding couple and venue", () => {
    withWedding(<InvitePopup invitationName="Cô Thu" onConfirm={vi.fn()} />);
    expect(screen.getByText("Cô Thu")).toBeInTheDocument();
    expect(screen.getByText(/Vườn Mây/)).toBeInTheDocument();
    expect(screen.getByText(/cô dâu Mai/)).toBeInTheDocument();
  });

  it("fetches rooms from the slug-scoped endpoint", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => [] } as Response);
    withWedding(<InfoSection mode="rooms" />);
    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/public/weddings/mai-an/rooms", expect.anything()));
    request.mockRestore();
  });

  it("fetches shared photos from the slug-scoped endpoint", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => [] } as Response);
    withWedding(<InfoSection mode="photoWall" />);
    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/public/weddings/mai-an/photos", expect.anything()));
    request.mockRestore();
  });

  it("uses the wedding dress code colors and note", () => {
    const { container } = withWedding(<DressCodePopup onClose={vi.fn()} />);
    expect(container.querySelector('[style*="rgb(18, 52, 86)"]')).toBeInTheDocument();
    expect(screen.getByText("Xin mặc màu xanh")).toBeInTheDocument();
  });
});
