import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharingFields } from "../components/editor/Fields";
import DressColors from "../components/editor/DressColors";
import Editor from "../pages/Editor";
import { premiumEntitlements, response, wedding } from "./plan-fixtures";

beforeEach(() => { vi.restoreAllMocks(); });
async function openPanel(title: string) {
  const panel = (await screen.findByText(title)).closest("details")!;
  panel.open = true;
  fireEvent(panel, new Event("toggle"));
}
const editorFetch = (current: unknown) => vi.fn(async (input: RequestInfo | URL) => String(input).includes("/guests") ? response([]) : response(current));

describe("premium editor gates", () => {
  it("names the plan required for custom music", () => {
    render(<SharingFields wedding={wedding} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/Nhạc nền riêng cần gói Cao cấp/)).toBeInTheDocument();
  });

  it("names the plan required for a custom slug", () => {
    render(<SharingFields wedding={wedding} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/Đổi đường dẫn thiệp cần gói Cao cấp/)).toBeInTheDocument();
    expect(screen.getByLabelText("Đường dẫn thiệp")).toBeDisabled();
  });

  it("enables the custom slug for premium", () => {
    render(<SharingFields wedding={{ ...wedding, entitlements: premiumEntitlements }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByLabelText("Đường dẫn thiệp")).toBeEnabled();
    expect(screen.getByText(/Đường dẫn cũ vẫn tiếp tục hoạt động/)).toBeInTheDocument();
  });

  it("shows a preview player for saved music", () => {
    render(<SharingFields wedding={{ ...wedding, musicUrl: "https://example.test/song.mp3", entitlements: premiumEntitlements }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(document.querySelector("audio")).toHaveAttribute("src", "https://example.test/song.mp3");
  });

  it("disables the minimal template for free", async () => {
    vi.stubGlobal("fetch", editorFetch(wedding));
    render(<MemoryRouter initialEntries={["/thiep-cua-toi/w1"]}><Routes><Route path="/thiep-cua-toi/:id" element={<Editor />} /></Routes></MemoryRouter>);
    await openPanel("Mẫu thiệp");
    expect(screen.getByRole("button", { name: /Tối giản/ })).toBeDisabled();
    expect(screen.getByText(/Mẫu Tối giản cần gói Cao cấp/)).toBeInTheDocument();
  });

  it("allows the minimal template for premium", async () => {
    const change = { ...wedding, entitlements: premiumEntitlements, plan: "premium" as const };
    vi.stubGlobal("fetch", editorFetch(change));
    render(<MemoryRouter initialEntries={["/thiep-cua-toi/w1"]}><Routes><Route path="/thiep-cua-toi/:id" element={<Editor />} /></Routes></MemoryRouter>);
    await openPanel("Mẫu thiệp");
    fireEvent.click(screen.getByRole("button", { name: /Tối giản/ }));
    expect(screen.getByRole("button", { name: /Tối giản/ })).toHaveClass("selected");
  });

  it("keeps the hex field in sync with the color picker", () => {
    render(<DressColors colors={["#c9848b"]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Chọn màu 1"), { target: { value: "#123456" } });
    expect(screen.getByLabelText("Mã màu 1")).toHaveValue("#123456");
  });
});
