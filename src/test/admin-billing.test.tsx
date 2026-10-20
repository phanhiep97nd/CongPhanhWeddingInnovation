import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../lib/auth";
import { setToken } from "../lib/api";
import Editor from "../pages/Editor";
import AdminLayout from "../pages/admin/AdminLayout";
import Overview from "../pages/admin/Overview";
import Users from "../pages/admin/Users";
import Orders from "../pages/admin/Orders";
import Settings from "../pages/admin/Settings";
import GuestQrPrint from "../pages/GuestQrPrint";
import GuestQrDialog from "../components/editor/GuestQrDialog";
import GuestsTab from "../components/editor/GuestsTab";
import { freeEntitlements, guest, pricing, response, wedding } from "./plan-fixtures";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,abcd") } }));

beforeEach(() => {
  vi.restoreAllMocks();
  setToken(null);
  window.history.replaceState({}, "", "/");
});

function adminRoutes(role: "user" | "admin", path: string) {
  setToken("jwt");
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("/auth/me")) return response({ user: { id: "u1", email: "a@test.vn", name: "Lan", role } });
    if (url.includes("/admin/stats")) return response({ users: 2, lockedUsers: 1, weddings: 3, guests: 4, paidWeddings: 1, revenue: 30000, planCounts: { free: 2, basic: 1, premium: 0 }, revenueByMonth: [{ month: "2026-10", orders: 1, amount: 30000 }] });
    return response({ items: [], total: 0, page: 1, limit: 20 });
  }));
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route path="/dashboard" element={<p>Danh sách thiệp</p>} />
    <Route path="/admin" element={<AdminLayout />}><Route index element={<Overview />} /><Route path="users" element={<Users />} /></Route>
  </Routes></AuthProvider></MemoryRouter>);
}

describe("admin access and overview", () => {
  it("redirects a regular user to dashboard", async () => {
    adminRoutes("user", "/admin");
    expect(await screen.findByText("Danh sách thiệp")).toBeInTheDocument();
  });

  it("allows an admin into the overview", async () => {
    adminRoutes("admin", "/admin");
    expect(await screen.findByText("Doanh thu theo tháng")).toBeInTheDocument();
  });

  it("shows real plan counts from the API", async () => {
    adminRoutes("admin", "/admin");
    expect(await screen.findByText("Số thiệp theo gói")).toBeInTheDocument();
    expect(screen.getByText("2026-10")).toBeInTheDocument();
  });

  it("keeps the admin header in the sticky shell", async () => {
    adminRoutes("admin", "/admin");
    expect(await screen.findByRole("navigation", { name: "Quản trị" })).toBeInTheDocument();
    expect(document.querySelector(".admin-header")).toBeInTheDocument();
  });
});

describe("admin users", () => {
  const item = { id: "u2", name: "Minh", email: "minh@test.vn", role: "user", status: "active", createdAt: "", weddingCount: 2, paidAmount: 30000 };
  function mount() {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => response(options?.method === "PATCH" ? { ...item, status: "locked" } : { items: [item], total: 25, page: 1, limit: 20 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><Users /></MemoryRouter>);
    return fetchMock;
  }

  it("shows searchable user rows", async () => {
    mount();
    expect(await screen.findByText("minh@test.vn")).toBeInTheDocument();
    expect(screen.getByText("2 thiệp · 30.000đ")).toBeInTheDocument();
  });

  it("sends a search query", async () => {
    const fetchMock = mount();
    fireEvent.change(screen.getByLabelText("Tìm email hoặc tên"), { target: { value: "minh" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("q=minh"))).toBe(true));
  });

  it("moves to the next page", async () => {
    const fetchMock = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Sau" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("page=2"))).toBe(true));
  });

  it("asks before locking an account", async () => {
    const fetchMock = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Khoá" }));
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });

  it("patches a confirmed lock", async () => {
    const fetchMock = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Khoá" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(true));
  });
});

describe("admin orders and settings", () => {
  it("confirms before marking an order paid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [{ id: "o1", orderCode: 123, plan: "basic", amount: 30000, status: "pending", userEmail: "a@test.vn", weddingSlug: "hoa-minh" }], total: 1, page: 1, limit: 20 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Orders />);
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận đã thanh toán" }));
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("posts a confirmed mark-paid action", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [{ id: "o1", orderCode: 123, plan: "basic", amount: 30000, status: "pending" }], total: 1, page: 1, limit: 20 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Orders />);
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận đã thanh toán" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => String(url).includes("/123/mark-paid") && options?.method === "POST")).toBe(true));
  });

  it("filters orders by status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [], total: 0, page: 1, limit: 20 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Orders />);
    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "paid" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("status=paid"))).toBe(true));
  });

  it("disables saving unchanged settings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ prices: pricing.prices, freeGuestLimit: 10, freeGalleryLimit: 6, paidGalleryLimit: 50, freeExpiryDays: 30 })));
    render(<Settings />);
    expect(await screen.findByRole("button", { name: "Lưu cài đặt" })).toBeDisabled();
  });

  it("rejects a premium price below basic", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ prices: pricing.prices, freeGuestLimit: 10, freeGalleryLimit: 6, paidGalleryLimit: 50, freeExpiryDays: 30 })));
    render(<Settings />);
    fireEvent.change(await screen.findByLabelText("Giá gói Cao cấp"), { target: { value: "1000" } });
    expect(screen.getByRole("button", { name: "Lưu cài đặt" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("giá Cao cấp phải cao hơn Cơ bản");
  });
});

describe("editor and guests", () => {
  it("shows the sticky editor save header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(wedding)));
    render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Lưu thay đổi" })).toBeInTheDocument();
    expect(document.querySelector(".editor-sticky-header")).toBeInTheDocument();
  });

  it("warns before a bulk add exceeds the guest limit", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => response(url.endsWith("/stats") ? { total: 9, yes: 0, no: 0, pending: 9, attendees: 0 } : Array.from({ length: 9 }, (_, index) => ({ ...guest, id: String(index) }))));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><GuestsTab wedding={{ ...wedding, limits: { guests: 10, gallery: 6 } }} onUpgrade={vi.fn()} /></MemoryRouter>);
    await screen.findByText("9/10 khách");
    fireEvent.change(screen.getByLabelText(/Mỗi dòng/), { target: { value: "Lan\nMinh" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm danh sách" }));
    expect(screen.getByText(/vượt giới hạn 10 khách/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/bulk"))).toBe(false);
  });

  it("shows free Excel and QR locks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => response(url.endsWith("/stats") ? { total: 0, yes: 0, no: 0, pending: 0, attendees: 0 } : [])));
    render(<MemoryRouter><GuestsTab wedding={wedding} onUpgrade={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText(/Xuất Excel cần gói Cơ bản/)).toBeInTheDocument();
    expect(screen.getByText(/Mã QR khách mời cần gói Cơ bản/)).toBeInTheDocument();
  });

  it("renders a QR image for a personal link", async () => {
    render(<GuestQrDialog name="Bác Nam" link="https://example.test/w/hoa-minh/abc" onClose={vi.fn()} />);
    expect(await screen.findByAltText("Mã QR mở thiệp của Bác Nam")).toHaveAttribute("src", "data:image/png;base64,abcd");
  });

  it("locks the QR print page on a free wedding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => response(url.endsWith("/guests") ? [guest] : { ...wedding, entitlements: freeEntitlements })));
    render(<MemoryRouter initialEntries={["/dashboard/w1/qr"]}><Routes><Route path="/dashboard/:id/qr" element={<GuestQrPrint />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Cần gói Cơ bản để in mã QR.")).toBeInTheDocument();
  });
});
