import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";
import Invitation from "../pages/Invitation";
import Settings from "../pages/admin/Settings";
import GuestQrPrint from "../pages/GuestQrPrint";
import { exportGuestExcel } from "../lib/excel";
import { guest, pricing, premiumEntitlements, response, wedding } from "./plan-fixtures";
import { BRAND_NAME } from "../lib/brand";

const { toFile } = vi.hoisted(() => ({ toFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("write-excel-file/browser", () => ({ default: vi.fn(() => ({ toFile })) }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,abcd") } }));

beforeEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("payment return", () => {
  it("syncs a paid order and refreshes the wedding", async () => {
    window.history.replaceState({}, "", "/dashboard/w1?payment=success&orderCode=123");
    let weddingReads = 0;
    let syncSeen = false;
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes("/public/pricing")) return response(pricing);
      if (url.endsWith("/orders")) return response([]);
      if (url.includes("/sync") && options?.method === "POST") { syncSeen = true; return response({ status: "paid", plan: "basic" }); }
      if (url.endsWith("/weddings/w1")) {
        weddingReads++;
        return response({ ...wedding, plan: syncSeen ? "basic" : "free" });
      }
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Thanh toán thành công. Gói thiệp đã được cập nhật.")).toBeInTheDocument();
    expect(weddingReads).toBe(1);
    expect(syncSeen).toBe(true);
    expect(window.location.search).toBe("");
  });

  it("treats a cancelled checkout as a neutral notice", async () => {
    window.history.replaceState({}, "", "/dashboard/w1?payment=cancel&orderCode=123");
    const fetchMock = vi.fn().mockImplementation(async (url: string) => response(url.includes("pricing") ? pricing : url.endsWith("/orders") ? [] : wedding));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    // The notice is first shown on the loading screen, then re-rendered inside the editor: wait for the editor.
    await screen.findByRole("button", { name: "Lưu thay đổi" });
    expect(screen.getByText(/Đã hủy thanh toán/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/sync"))).toBe(false);
    expect(window.location.search).toBe("");
  });

  it("keeps pending payment as pending", async () => {
    window.history.replaceState({}, "", "/dashboard/w1?payment=success&orderCode=123");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => response(url.includes("pricing") ? pricing : url.includes("/sync") ? { status: "pending", plan: "free" } : url.endsWith("/orders") ? [] : wedding)));
    render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Thanh toán đang chờ xác nhận/)).toBeInTheDocument();
  });
});

describe("public template and branding", () => {
  function openWedding(next: typeof wedding) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(next)));
    render(<MemoryRouter initialEntries={["/w/hoa-minh"]}><Routes><Route path="/w/:slug" element={<Invitation />} /></Routes></MemoryRouter>);
  }

  it("renders branding for free invitations", async () => {
    openWedding({ ...wedding, sections: [], showBranding: true });
    // The lazily loaded classic shell can take longer than the 1s default when the whole suite runs.
    expect(await screen.findByRole("link", { name: `Tạo bởi ${BRAND_NAME}` }, { timeout: 4000 })).toHaveAttribute("href", "/");
  });

  it("removes branding for paid invitations", async () => {
    openWedding({ ...wedding, sections: [], plan: "basic", showBranding: false });
    await screen.findByText(/Made with love/, undefined, { timeout: 4000 });
    expect(screen.queryByRole("link", { name: `Tạo bởi ${BRAND_NAME}` })).not.toBeInTheDocument();
  });

  it("loads the minimal template from the public response", async () => {
    openWedding({ ...wedding, sections: [], template: "minimal", entitlements: premiumEntitlements, showBranding: false });
    expect(await screen.findByText("Trân trọng kính mời")).toBeInTheDocument();
    expect(document.querySelector(".minimal-invite")).toBeInTheDocument();
  });

  it("keeps classic as the default template", async () => {
    openWedding({ ...wedding, sections: [], template: "classic" });
    await screen.findByText(/Made with love/, undefined, { timeout: 4000 });
    expect(document.querySelector(".minimal-invite")).not.toBeInTheDocument();
  });
});

describe("files and settings", () => {
  it("saves the Excel sheet under the wedding slug", async () => {
    await exportGuestExcel([guest], "https://example.test", "hoa-minh");
    expect(toFile).toHaveBeenCalledWith("khach-moi-hoa-minh.xlsx");
  });

  it("prints an entitled guest QR sheet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => response(url.endsWith("/guests") ? [guest] : { ...wedding, entitlements: premiumEntitlements })));
    render(<MemoryRouter initialEntries={["/dashboard/w1/qr"]}><Routes><Route path="/dashboard/:id/qr" element={<GuestQrPrint />} /></Routes></MemoryRouter>);
    expect(await screen.findByAltText("Mã QR của Bác Nam")).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/w/hoa-minh/abc`)).toBeInTheDocument();
  });

  it("saves valid settings", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => response(options?.method === "PUT" ? JSON.parse(String(options.body)) : { prices: pricing.prices, freeGuestLimit: 10, freeGalleryLimit: 6, paidGalleryLimit: 50, freeExpiryDays: 30 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Settings />);
    fireEvent.change(await screen.findByLabelText("Giá gói Cơ bản"), { target: { value: "35000" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
  });
});
