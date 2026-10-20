import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api, getToken, PlanRequiredError, setToken } from "../lib/api";
import { freeEntitlements, guest, premiumEntitlements, pricing, response, wedding } from "./plan-fixtures";
import UpgradePanel from "../components/billing/UpgradePanel";
import LockedFeature from "../components/billing/LockedFeature";
import GiftBoxEditor from "../components/editor/GiftBoxEditor";
import GiftBoxSection from "../components/invitation/original/GiftBoxSection";
import ImagesTab from "../components/editor/ImagesTab";
import SectionsTab from "../components/editor/SectionsTab";
import DressColors from "../components/editor/DressColors";
import { guestExcelRows } from "../lib/excel";
import { banks, vietQrUrl } from "../lib/banks";
import { openCheckout } from "../lib/checkout";

vi.mock("../lib/checkout", () => ({ openCheckout: vi.fn() }));

beforeEach(() => {
  vi.restoreAllMocks();
  setToken(null);
  sessionStorage.clear();
});

describe("API plan and account responses", () => {
  it("parses PLAN_REQUIRED with its feature and required plan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ code: "PLAN_REQUIRED", feature: "guestQr", requiredPlan: "basic", message: "Cần nâng cấp" }, 402)));
    await expect(api("/weddings/w1/guests", {}, true)).rejects.toMatchObject({ name: "PlanRequiredError", feature: "guestQr", requiredPlan: "basic", status: 402 });
  });

  it("uses PlanRequiredError rather than a generic API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ code: "PLAN_REQUIRED", feature: "giftBox", requiredPlan: "premium" }, 402)));
    await expect(api("/test", {}, true)).rejects.toBeInstanceOf(PlanRequiredError);
  });

  it("clears a locked owner's token", async () => {
    setToken("jwt");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ code: "LOCKED", message: "Tài khoản đã bị khoá" }, 403)));
    await expect(api("/auth/me", {}, true)).rejects.toThrow("Tài khoản đã bị khoá");
    expect(getToken()).toBeNull();
    expect(sessionStorage.getItem("wi:login-message")).toBe("Tài khoản đã bị khoá");
  });
});

describe("upgrade panel", () => {
  it("renders current plan, expiry and usage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string) => response(path.includes("pricing") ? pricing : [])));
    render(<UpgradePanel wedding={wedding} />);
    expect(await screen.findByText("30.000đ")).toBeInTheDocument();
    expect(screen.getByText("0/10 khách")).toBeInTheDocument();
    expect(screen.getByText(/Hết hạn/)).toBeInTheDocument();
  });

  it("renders the live premium price and feature list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string) => response(path.includes("pricing") ? pricing : [])));
    render(<UpgradePanel wedding={wedding} />);
    expect(await screen.findByText("99.000đ")).toBeInTheDocument();
    expect(screen.getByText("Hộp mừng cưới")).toBeInTheDocument();
  });

  it("shows only the price difference for basic to premium", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string) => response(path.includes("pricing") ? pricing : [])));
    render(<UpgradePanel wedding={{ ...wedding, plan: "basic" }} />);
    expect(await screen.findByText(/69.000đ/)).toBeInTheDocument();
  });

  it("posts the chosen plan before checkout", async () => {
    const calls: { path: string; options?: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string, options?: RequestInit) => {
      calls.push({ path, options });
      return response(path.includes("pricing") ? pricing : path.endsWith("/orders") && options?.method === "POST" ? { checkoutUrl: "https://pay.example/checkout" } : []);
    }));
    render(<UpgradePanel wedding={wedding} />);
    fireEvent.click(await screen.findByRole("button", { name: "Chọn gói Cơ bản" }));
    await waitFor(() => expect(calls.some(call => call.options?.method === "POST" && call.options.body === JSON.stringify({ plan: "basic" }))).toBe(true));
    expect(openCheckout).toHaveBeenCalledWith("https://pay.example/checkout");
  });

  it("shows a payment service error without leaving", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string, options?: RequestInit) => response(path.includes("pricing") ? pricing : options?.method === "POST" ? { message: "PayOS chưa sẵn sàng" } : [], options?.method === "POST" ? 503 : 200)));
    render(<UpgradePanel wedding={wedding} />);
    fireEvent.click(await screen.findByRole("button", { name: "Chọn gói Cơ bản" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PayOS chưa sẵn sàng");
  });

  it("shows an empty order history", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string) => response(path.includes("pricing") ? pricing : [])));
    render(<UpgradePanel wedding={wedding} />);
    expect(await screen.findByText("Chưa có đơn hàng.")).toBeInTheDocument();
  });

  it("shows an order status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (path: string) => response(path.includes("pricing") ? pricing : [{ id: "o1", orderCode: 123, plan: "basic", amount: 30000, status: "pending" }])));
    render(<UpgradePanel wedding={wedding} />);
    expect(await screen.findByText("Chờ thanh toán")).toBeInTheDocument();
  });
});

describe("gated editor controls", () => {
  it("offers the required plan in a keyboard button", () => {
    const upgrade = vi.fn();
    render(<LockedFeature plan="premium" label="Hộp mừng cưới" onUpgrade={upgrade} />);
    expect(screen.getByText(/Cao cấp/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nâng cấp" }));
    expect(upgrade).toHaveBeenCalledOnce();
  });

  it("locks gallery additions at the free limit", () => {
    const six = Array.from({ length: 6 }, (_, index) => ({ id: String(index), url: "", title: "", desc: "", full: false }));
    render(<ImagesTab wedding={{ ...wedding, gallery: six }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText("6/6 ảnh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm ảnh" })).toBeDisabled();
    expect(screen.getByText(/Thêm ảnh vào bộ sưu tập cần gói Cơ bản/)).toBeInTheDocument();
  });

  it("uses the paid gallery limit", () => {
    render(<ImagesTab wedding={{ ...wedding, plan: "premium", limits: { guests: null, gallery: 50 }, entitlements: premiumEntitlements }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText("0/50 ảnh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm ảnh" })).toBeEnabled();
  });

  it("shows photo wall and gift box locks in section controls", () => {
    render(<SectionsTab wedding={wedding} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/Ảnh khách gửi cần gói Cao cấp/)).toBeInTheDocument();
    expect(screen.getByText(/Hộp mừng cưới cần gói Cao cấp/)).toBeInTheDocument();
  });

  it("removes section locks when premium", () => {
    render(<SectionsTab wedding={{ ...wedding, entitlements: premiumEntitlements }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.queryByText(/cần gói Cao cấp/)).not.toBeInTheDocument();
  });

  it("lets free owners prepare a gift account", () => {
    const change = vi.fn();
    render(<GiftBoxEditor wedding={wedding} change={change} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/Hiển thị hộp mừng cưới trên thiệp cần gói Cao cấp/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Số tài khoản"), { target: { value: "abc123" } });
    expect(change).toHaveBeenCalled();
  });

  it("limits gift accounts to four", () => {
    const accounts = Array.from({ length: 4 }, (_, index) => ({ ...wedding.giftBox!.accounts[0], id: String(index) }));
    render(<GiftBoxEditor wedding={{ ...wedding, giftBox: { note: "", accounts } }} change={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Thêm tài khoản" })).toBeDisabled();
  });
});

describe("invitation additions and data", () => {
  it("hides gift accounts without entitlement", () => {
    render(<GiftBoxSection wedding={wedding} />);
    expect(screen.queryByText("Lời chúc")).not.toBeInTheDocument();
  });

  it("shows VietQR for premium gift accounts", () => {
    render(<GiftBoxSection wedding={{ ...wedding, entitlements: premiumEntitlements }} />);
    expect(screen.getByAltText("Mã chuyển khoản Vietcombank")).toHaveAttribute("src", expect.stringContaining("970436-12345678-compact2.png"));
  });

  it("encodes account name and couple in VietQR", () => {
    expect(vietQrUrl("970436", "1234", "NGUYEN THI HOA", "Minh Hoa")).toContain("accountName=NGUYEN%20THI%20HOA&addInfo=Mung%20cuoi%20Minh%20Hoa");
  });

  it("provides all contract banks", () => {
    expect(banks).toHaveLength(20);
    expect(banks.some(([bin]) => bin === "970454")).toBe(true);
  });

  it("exports the requested ten columns", () => {
    const rows = guestExcelRows([guest], "https://example.test", "hoa-minh");
    expect(rows[0].map(cell => cell.value)).toEqual(["Tên trên thiệp", "Tên thật", "SĐT", "Trạng thái", "Số người", "Đi xe", "Điểm đón", "Phòng", "Ghi chú", "Link riêng"]);
  });

  it("includes personal links and ride values in Excel rows", () => {
    const rows = guestExcelRows([guest], "https://example.test", "hoa-minh");
    expect(rows[1][5].value).toBe("Có");
    expect(rows[1][9].value).toBe("https://example.test/w/hoa-minh/abc");
  });

  it("syncs a color swatch change to the form", () => {
    const change = vi.fn();
    render(<DressColors colors={["#c9848b"]} onChange={change} />);
    fireEvent.change(screen.getByLabelText("Chọn màu 1"), { target: { value: "#123456" } });
    expect(change).toHaveBeenCalledWith(["#123456"]);
  });

  it("rejects an invalid hex text value", () => {
    const change = vi.fn();
    render(<DressColors colors={["#c9848b"]} onChange={change} />);
    fireEvent.change(screen.getByLabelText("Mã màu 1"), { target: { value: "bad" } });
    expect(screen.getByLabelText("Mã màu 1")).toHaveAttribute("aria-invalid", "true");
    expect(change).not.toHaveBeenCalled();
  });

  it("adds a dress color up to the limit", () => {
    const change = vi.fn();
    render(<DressColors colors={["#c9848b"]} onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm màu" }));
    expect(change).toHaveBeenCalledWith(["#c9848b", "#c9848b"]);
  });

  it("disables adding a thirteenth dress color", () => {
    render(<DressColors colors={Array.from({ length: 12 }, () => "#c9848b")} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Thêm màu" })).toBeDisabled();
  });
});
