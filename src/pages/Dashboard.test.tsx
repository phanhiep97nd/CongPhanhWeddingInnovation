import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../lib/auth";
import Dashboard from "./Dashboard";
import { slugify } from "./Dashboard";
describe("wedding slug suggestion", () => {
  it("removes Vietnamese diacritics", () => {
    expect(slugify("Phương Anh & Minh Công")).toBe("phuong-anh-minh-cong");
  });
  it("converts đ and trims punctuation", () => {
    expect(slugify("  Đám cưới đẹp!  ")).toBe("dam-cuoi-dep");
  });
});

it("shows an empty state that points to the create form", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  } as Response);
  render(<MemoryRouter><AuthProvider><Dashboard /></AuthProvider></MemoryRouter>);
  expect(await screen.findByText("Thiệp đầu tiên của hai bạn bắt đầu ở đây")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tạo thiệp" })).toBeInTheDocument();
  fetchMock.mockRestore();
});

it("waits for the slug debounce before checking availability", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => ({
    ok: true,
    status: 200,
    json: async () => String(input).includes("slug-available") ? { available: true, valid: true } : [],
  } as Response));
  render(<MemoryRouter><AuthProvider><Dashboard /></AuthProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Tên chú rể"), { target: { value: "Minh Công" } });
  fireEvent.change(screen.getByLabelText("Tên cô dâu"), { target: { value: "Phương Anh" } });
  await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(349); });
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("slug-available"))).toBe(false);
  await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); });
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("slug-available"))).toBe(true);
  fetchMock.mockRestore();
  vi.useRealTimers();
});

it("creates a wedding with the suggested slug", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => ({
    ok: true,
    status: 200,
    json: async () => options?.method === "POST"
      ? { id: "new" }
      : String(input).includes("slug-available")
        ? { available: true, valid: true }
        : [],
  } as Response));
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:id" element={<p>Thiệp đã tạo</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Tên chú rể"), { target: { value: "Minh Công" } });
  fireEvent.change(screen.getByLabelText("Tên cô dâu"), { target: { value: "Phương Anh" } });
  expect(screen.getByLabelText("Đường dẫn thiệp")).toHaveValue("minh-cong-phuong-anh");
  await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
  vi.useRealTimers();
  fireEvent.click(screen.getByRole("button", { name: "Tạo thiệp" }));
  expect(await screen.findByText("Thiệp đã tạo")).toBeInTheDocument();
  const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(post?.[1]?.body)).slug).toBe("minh-cong-phuong-anh");
  fetchMock.mockRestore();
});
