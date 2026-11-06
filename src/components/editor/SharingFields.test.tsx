import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SharingFields } from "./Fields";
import { premiumEntitlements, response, wedding } from "../../test/plan-fixtures";

afterEach(() => { vi.unstubAllGlobals(); });

it("applies a new card address only when it is valid and free, and suggests one from the couple's names", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("slug-available") ? response({ valid: true, available: !url.includes("da-dung") }) : response([])));
  const change = vi.fn();
  render(<SharingFields wedding={{ ...wedding, entitlements: premiumEntitlements, slug: "thiep-cu" }} change={change} onUpgrade={vi.fn()} />);
  const input = screen.getByLabelText("Đường dẫn thiệp");
  fireEvent.change(input, { target: { value: "Đã Dùng" } });
  expect(input).toHaveValue("da-dung");
  expect(await screen.findByText(/đã có thiệp khác dùng/)).toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Dùng theo tên: /w/minh-hoa" }));
  await waitFor(() => expect(change).toHaveBeenCalledWith({ slug: "minh-hoa" }));
  expect(screen.getByText(/Đường dẫn còn trống/)).toBeInTheDocument();
});

it("keeps the share photo optional, defaulting to the card banner", () => {
  vi.stubGlobal("fetch", vi.fn(async () => response([])));
  render(<SharingFields wedding={{ ...wedding, ogImage: "", importedTemplate: { templateId: "tpl-0000000000000001", values: {}, opening: true, motion: true } }} change={vi.fn()} onUpgrade={vi.fn()} />);
  const option = screen.getByText("Tuỳ chọn: dùng ảnh khác khi chia sẻ link").closest("details")!;
  expect(option.open).toBe(false);
  expect(option).toHaveTextContent("Mặc định, tin nhắn chia sẻ dùng ảnh đầu thiệp");
});
