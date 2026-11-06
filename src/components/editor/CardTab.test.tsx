import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CardTab from "./CardTab";
import { response, wedding } from "../../test/plan-fixtures";

afterEach(() => { vi.unstubAllGlobals(); });
const library = { ...wedding, importedTemplate: { templateId: "tpl-0000000000000001", values: {}, opening: true, motion: true } };
const panels = () => [...document.querySelectorAll(".card-panel")].map(panel => ({ title: panel.querySelector("strong")?.textContent, open: (panel as HTMLDetailsElement).open, hint: panel.querySelector("small")?.textContent }));

it("puts basic information first, folded to a summary once complete, and sharing last", () => {
  vi.stubGlobal("fetch", vi.fn(async () => response([])));
  render(<CardTab wedding={{ ...library, eventTime: "17:45" }} change={vi.fn()} onUpgrade={vi.fn()} />);
  expect(panels()).toEqual([
    { title: "Thông tin cơ bản", open: false, hint: "Minh & Hoa · 01/02/2027 · 17:45 · Villa" },
    { title: "Hộp mừng cưới", open: false, hint: "1 tài khoản / mã QR · nút Hộp quà trên thiệp" },
    { title: "Chia sẻ & cài đặt", open: false, hint: "Đã xuất bản · đường dẫn, nhạc nền, nội dung khi chia sẻ" },
  ]);
  expect(document.querySelector(".card-panel + .imported-studio, .card-panel ~ .imported-studio")).not.toBeNull();
});

it("opens basic information and says what is missing before the card can fill itself", () => {
  vi.stubGlobal("fetch", vi.fn(async () => response([])));
  render(<CardTab wedding={{ ...library, eventDate: null }} change={vi.fn()} onUpgrade={vi.fn()} />);
  expect(panels()[0]).toMatchObject({ title: "Thông tin cơ bản", open: true, hint: "Còn thiếu ngày cưới" });
  expect(screen.getByText(/Nhập ngày cưới để thiệp tự điền/)).toBeInTheDocument();
});
