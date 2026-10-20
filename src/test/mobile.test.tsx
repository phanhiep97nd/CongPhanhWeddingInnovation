import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { wedding } from "./plan-fixtures";
import type { Guest } from "../lib/types";
import { ShareField } from "../components/editor/Fields";
import SharePreview from "../components/editor/SharePreview";
import DressColors from "../components/editor/DressColors";
import { useConfirmSheet } from "../components/ConfirmSheet";
import { BRAND_NAME } from "../lib/brand";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";
import InvitationShell from "../components/invitation/original/InvitationShell";
import Users from "../pages/admin/Users";

const guest: Guest = { id: "g1", code: "guestcode", name: "Lan", invitationName: "Chị Lan", phone: "", status: "pending", guestCount: 1, joinGroup: false, pickupPoint: "", room: "", note: "", createdAt: "", updatedAt: "" };

afterEach(() => vi.restoreAllMocks());

function ConfirmHarness() {
  const { confirm, sheet } = useConfirmSheet();
  return <><button onClick={() => void confirm("Đổi gói thiệp?")}>Mở xác nhận</button>{sheet}</>;
}

describe("phone editing controls", () => {
  it("keeps text controls at 16px and a 44px row target", () => {
    const css = readFileSync("src/styles/app-base.css", "utf8");
    expect(css).toContain("font-size: max(16px, 1rem)");
    expect(css).toMatch(/\.checkbox-row\s*\{[^}]*min-height:\s*44px/s);
  });

  it("inserts a sharing placeholder at the cursor", () => {
    const change = vi.fn();
    render(<ShareField label="Tiêu đề chia sẻ" value="Xin mời dự lễ" onChange={change} />);
    const input = screen.getByLabelText("Tiêu đề chia sẻ") as HTMLInputElement;
    input.setSelectionRange(4, 4);
    fireEvent.click(screen.getByRole("button", { name: "{khach}" }));
    expect(change).toHaveBeenCalledWith("Xin {khach}mời dự lễ");
  });

  it("fetches the chosen guest preview and shows title, description and image", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ title: "Lan: Minh & Hoa", description: "Mời Chị Lan đến dự lễ", image: "/preview.jpg", url: "https://example.com/w/hoa-minh/guestcode", siteName: BRAND_NAME }) } as Response);
    render(<SharePreview wedding={wedding} guests={[guest]} />);
    fireEvent.change(screen.getByLabelText("Khách nhận thiệp"), { target: { value: "guestcode" } });
    expect(await screen.findByText("Lan: Minh & Hoa")).toBeInTheDocument();
    expect(screen.getByText("Mời Chị Lan đến dự lễ")).toBeInTheDocument();
    expect(screen.getByAltText("Ảnh xem trước thiệp")).toHaveAttribute("src", "/preview.jpg");
    expect(request.mock.calls.some(([url]) => String(url).includes("preview-meta?g=guestcode"))).toBe(true);
    request.mockRestore();
  });

  it("adds a preset, changes a native swatch, and stops at twelve colours", () => {
    const change = vi.fn();
    const { rerender } = render(<DressColors colors={["#c9848b"]} onChange={change} wedding={wedding} />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm màu có sẵn 1" }));
    expect(change).toHaveBeenCalledWith(["#c9848b", "#e8b4ba"]);
    fireEvent.change(screen.getByLabelText("Chọn màu 1"), { target: { value: "#123456" } });
    expect(change).toHaveBeenCalledWith(["#123456"]);
    rerender(<DressColors colors={Array(12).fill("#c9848b")} onChange={change} wedding={wedding} />);
    expect(screen.getByRole("button", { name: "Thêm màu có sẵn 1" })).toBeDisabled();
  });

  it("samples a pixel from a wedding photo", () => {
    const change = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray([18, 52, 86, 255]) }) } as unknown as CanvasRenderingContext2D);
    render(<DressColors colors={[]} onChange={change} wedding={{ ...wedding, coverImage: "/cover.jpg" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Lấy màu từ ảnh" }));
    const image = screen.getByAltText("Ảnh bìa");
    Object.defineProperty(image, "naturalWidth", { value: 100 });
    Object.defineProperty(image, "naturalHeight", { value: 100 });
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100 } as DOMRect);
    fireEvent.click(image, { clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByRole("button", { name: "Dùng màu này" }));
    expect(change).toHaveBeenCalledWith(["#123456"]);
  });

  it("uses a focus trapping native dialog that closes on Escape", async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Mở xác nhận" }));
    const dialog = screen.getByRole("dialog", { name: "Xác nhận thao tác" });
    await waitFor(() => expect(dialog).toHaveAttribute("open"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("uses the single brand constant", () => {
    expect(BRAND_NAME).toBe(import.meta.env.VITE_BRAND_NAME || "Hỷ Thiệp");
  });

  it("shows an enabled bottom save button after a mobile edit", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(query => ({ matches: query.includes("768px"), media: query, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => ({ ok: true, status: 200, json: async () => String(input).endsWith("/guests") ? [] : String(input).includes("preview-meta") ? { title: "Thiệp", description: "Lời mời", image: "", url: "https://example.com/w/hoa-minh", siteName: BRAND_NAME } : wedding } as Response));
    const { container } = render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Tên chú rể"), { target: { value: "Minh mới" } });
    const save = container.querySelector<HTMLButtonElement>(".editor-save-bar button");
    expect(save).toBeEnabled();
    expect(save).toHaveTextContent("Lưu thay đổi");
    window.matchMedia = original;
  });

  it("renders admin card actions as controls", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [{ id: "u1", name: "An", email: "an@test.vn", status: "active", weddingCount: 1, paidAmount: 30000 }], total: 1, limit: 20, page: 1 }) } as Response);
    render(<MemoryRouter><Users /></MemoryRouter>);
    const card = await screen.findByText("an@test.vn");
    expect(card.closest("article")?.querySelector("a")).toHaveTextContent("Chi tiết");
    expect(card.closest("article")?.querySelector("button")).toHaveTextContent("Khoá");
  });

  it("starts invitation music on the first gesture", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    render(<InvitationShell wedding={{ ...wedding, sections: [] }} guest={null} slug={wedding.slug} />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.pointerDown(document);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    play.mockRestore();
  });
});
