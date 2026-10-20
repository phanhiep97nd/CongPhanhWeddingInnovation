import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, ProtectedRoute, useAuth } from "../lib/auth";
import { setToken } from "../lib/api";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Editor from "../pages/Editor";
import Invitation from "../pages/Invitation";
import SectionsTab from "../components/editor/SectionsTab";
import GuestsTab from "../components/editor/GuestsTab";
import type { Wedding } from "../lib/types";
const wedding: Wedding = { id: "w1", slug: "hoa-minh", published: true, couple: { groom: "Minh", bride: "Hoa", groomFull: "", brideFull: "" }, eventDate: null, dateText: "01 · 02 · 2027", venue: { name: "Villa", address: "", mapUrl: "" }, coverImage: "", ogImage: "", story: { title: "Câu chuyện của chúng mình", body: "Một ngày đẹp trời", image: "" }, timeline: [{ id: "t", time: "10:00", title: "Đón khách", desc: "" }], gallery: [], musicUrl: "", zaloGroupLink: "", dressCode: { note: "", colors: [] }, sections: [{ key: "timeline", enabled: true }, { key: "story", enabled: true }, { key: "gallery", enabled: false }], customSections: [], meta: { title: "", description: "" }, theme: { primary: "#b76e79" }, createdAt: "", updatedAt: "" };
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;
beforeEach(() => {
  setToken(null);
  vi.restoreAllMocks();
});

function State() {
  const { user, logout } = useAuth();
  return <>
    <p>
      {user?.name || "Ẩn danh"}
    </p>
    <button onClick={logout}>Đăng xuất
    </button>
  </>;
}
describe("authentication UI", () => {
  it("validates registration fields in order", () => {
    render(<MemoryRouter><AuthProvider><Register /></AuthProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(screen.getByRole("alert")).toHaveTextContent("tên");
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Lan" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(screen.getByRole("alert")).toHaveTextContent("email");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "lan@test.vn" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(screen.getByRole("alert")).toHaveTextContent("8 ký tự");
  });
  it("logs in and logs out through context", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ token: "jwt", user: { id: "u", name: "Lan", email: "lan@test.vn" } }));
    render(<MemoryRouter>
      <AuthProvider>
        <Login />
        <State />
      </AuthProvider>
    </MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "lan@test.vn" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(screen.getByText("Lan")).toBeInTheDocument());
    expect(localStorage.getItem("wi_token")).toBe("jwt");
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(screen.getByText("Ẩn danh")).toBeInTheDocument();
    expect(localStorage.getItem("wi_token")).toBeNull();
  });
  it("redirects protected routes", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute>
            <p>Bảng điều khiển
            </p>
          </ProtectedRoute>} />
          <Route path="/login" element={<p>Vui lòng đăng nhập
          </p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>);
    expect(await screen.findByText("Vui lòng đăng nhập")).toBeInTheDocument();
  });
  it("returns to the protected page after login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ token: "jwt", user: { id: "u", name: "Lan", email: "lan@test.vn" } }));
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><p>Danh sách thiệp</p></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "lan@test.vn" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Danh sách thiệp")).toBeInTheDocument();
  });
  it("validates login and displays server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ message: "Sai thông tin" }, 401));
    render(<MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("email hợp lệ");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@test.vn" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sai thông tin");
  });
});
describe("invitation UI", () => {
  it("shows couple, guest and enabled sections in order", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => String(input).includes("/guests/") ? response({ code: "abc", invitationName: "Bác Nam", status: "pending", guestCount: 1, joinGroup: false, pickupPoint: "", room: "" }) : response(wedding));
    render(<MemoryRouter initialEntries={["/w/hoa-minh/abc"]}>
      <Routes>
        <Route path="/w/:slug/:code" element={<Invitation />} />
      </Routes>
    </MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: /Hoa.*Minh/ })).toBeInTheDocument();
    expect(screen.getByText("Bác Nam")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading").map(h => h.textContent);
    expect(headings.indexOf("Ngày chung đôi")).toBeLessThan(headings.indexOf("Câu chuyện của chúng mình"));
    expect(screen.queryByText("Bộ sưu tập ảnh")).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Các hạng mục thiệp" });
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Xác nhận tham dự" })).not.toBeInTheDocument();
    expect(document.title).toContain("Minh & Hoa");
  });
  it("shows a friendly 404 for an unknown slug", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ message: "Không có" }, 404));
    render(<MemoryRouter initialEntries={["/w/missing"]}>
      <Routes>
        <Route path="/w/:slug" element={<Invitation />} />
      </Routes>
    </MemoryRouter>);
    expect(await screen.findByText("Không tìm thấy thiệp cưới này.")).toBeInTheDocument();
  });
  it("hides a disabled custom section", async () => {
    const customWedding = {
      ...wedding,
      sections: [{ key: "custom:note", enabled: false }],
      customSections: [{ id: "note", title: "Lời nhắn riêng", body: "Hẹn gặp nhau", image: "" }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(customWedding));
    render(<MemoryRouter initialEntries={["/w/hoa-minh"]}><Routes><Route path="/w/:slug" element={<Invitation />} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { level: 1, name: /Hoa.*Minh/ });
    expect(screen.queryByText("Lời nhắn riêng")).not.toBeInTheDocument();
  });
  it("shows an enabled custom section in content and nav", async () => {
    const customWedding = {
      ...wedding,
      sections: [{ key: "custom:note", enabled: true }],
      customSections: [{ id: "note", title: "Lời nhắn riêng", body: "Hẹn gặp nhau", image: "" }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(customWedding));
    render(<MemoryRouter initialEntries={["/w/hoa-minh"]}><Routes><Route path="/w/:slug" element={<Invitation />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Lời nhắn riêng" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Các hạng mục thiệp" }).querySelector('a[href="#custom-note"]')).toBeInTheDocument();
  });
});
describe("editor UI", () => {
  it("sends only changed fields when saving", async () => {
    const updated = { ...wedding, dateText: "02 · 02 · 2027" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, options) => response(options?.method === "PUT" ? updated : wedding));
    render(<MemoryRouter initialEntries={["/dashboard/w1"]}><Routes><Route path="/dashboard/:id" element={<Editor />} /></Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Ngày hiển thị"), { target: { value: updated.dateText } });
    expect(screen.getByText("Chưa lưu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
    const put = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT");
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ dateText: updated.dateText });
  });
  it("adds a custom section with its contract key", () => {
    const change = vi.fn();
    render(<SectionsTab wedding={wedding} change={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm hạng mục tùy chỉnh" }));
    expect(change.mock.calls[0][0].sections.at(-1).key).toMatch(/^custom:/);
    expect(change.mock.calls[0][0].customSections).toHaveLength(1);
  });
  it("toggles and moves sections", () => {
    const change = vi.fn();
    render(<SectionsTab wedding={wedding} change={change} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Lịch trình" }));
    expect(change).toHaveBeenCalledWith({ sections: [{ key: "timeline", enabled: false }, ...wedding.sections.slice(1)] });
    fireEvent.click(screen.getByRole("button", { name: "Chuyển Lịch trình xuống" }));
    expect(change.mock.calls[1][0].sections[0].key).toBe("story");
  });
  it("copies the personal guest link", async () => {
    setToken("jwt");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => String(input).endsWith("/stats") ? response({ total: 1, yes: 0, no: 0, pending: 1, attendees: 0 }) : response([{ id: "g", code: "abc123", invitationName: "Bác Nam", name: "", phone: "", status: "pending", guestCount: 1, joinGroup: false, pickupPoint: "", room: "", note: "", createdAt: "", updatedAt: "" }]));
    render(<GuestsTab weddingId="w1" slug="hoa-minh" />);
    await screen.findByText("Bác Nam");
    fireEvent.click(screen.getByRole("button", { name: "Sao chép liên kết" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/w/hoa-minh/abc123`));
  });
  it("previews the parsed bulk guest count", async () => {
    setToken("jwt");
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => String(input).endsWith("/stats")
      ? response({ total: 0, yes: 0, no: 0, pending: 0, attendees: 0 })
      : response([]));
    render(<GuestsTab weddingId="w1" slug="hoa-minh" />);
    fireEvent.change(screen.getByLabelText(/Mỗi dòng/), { target: { value: "Lan | Lan Anh\nMinh\n | blank" } });
    expect(screen.getByText("2 khách hợp lệ trong danh sách")).toBeInTheDocument();
  });
});
