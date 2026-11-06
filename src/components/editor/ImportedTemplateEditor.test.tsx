import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import ImportedTemplateEditor from "./ImportedTemplateEditor";
import type { Wedding } from "../../lib/types";
import { wedding as base } from "../../test/plan-fixtures";

const fields = [
  { key: "f1", type: "image", label: "Ảnh 1", value: "" },
  { key: "f2", type: "text", label: "Trân trọng kính mời", value: "Trân trọng kính mời" },
  { key: "f3", type: "text", label: "Lời mời", value: "Rất mong bạn đến chung vui" },
  { key: "f4", type: "text", label: "01", value: "01", binding: { source: "schedule", label: "Ngày và giờ cưới" } },
  { key: "f5", type: "text", label: "02", value: "02", binding: { source: "schedule", label: "Ngày và giờ cưới" } },
];

function Studio({ onChange }: { onChange?: (wedding: Wedding) => void }) {
  const [wedding, setWedding] = useState<Wedding>({ ...base, importedTemplate: { templateId: "tpl-0000000000000001", values: {}, opening: true, motion: true } });
  return <ImportedTemplateEditor wedding={wedding} change={patch => setWedding(current => { const next = { ...current, ...patch }; onChange?.(next); return next; })} />;
}
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
function mockApi() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(url);
    if (url.endsWith("/fields")) return ok(fields);
    if (url.endsWith("/template-preview")) return ok({ html: "<html><body>card</body></html>", boundValues: { f4: "20", f5: "21" }, images: { f1: "/api/templates/assets/token/a.webp" } });
    return ok([]);
  }));
  return calls;
}
async function fromCard(data: Record<string, unknown>) {
  const frame = await screen.findByTitle("Chỉnh sửa trực tiếp mẫu thiệp") as HTMLIFrameElement;
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, source: frame.contentWindow })); });
  return frame;
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("follows the card order, collapses synchronized groups and opens the field clicked on the card", async () => {
  mockApi();
  render(<Studio />);
  const frame = await fromCard({ type: "ht:ready", order: ["f3", "f5", "f4", "f1", "f2"] });
  const rows = () => screen.getAllByRole("button", { expanded: false }).filter(button => button.classList.contains("studio-row")).map(button => button.textContent);
  await waitFor(() => expect(rows()).toEqual([expect.stringContaining("Rất mong bạn"), expect.stringContaining("Ngày và giờ cưới"), expect.stringContaining("Ảnh 1"), expect.stringContaining("Trân trọng")]));
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  await fromCard({ type: "ht:field", keys: ["f4"] });
  expect(screen.getByLabelText("Ngày cưới")).toHaveValue("01/02/2027");
  expect(post).toHaveBeenCalledWith({ type: "ht:select", key: "f5", keys: ["f5"], scroll: false }, "*");
  await fromCard({ type: "ht:field", keys: ["f2"] });
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Nội dung" })).toHaveFocus());
  expect(screen.getByRole("textbox", { name: "Nội dung" })).toHaveValue("Trân trọng kính mời");
});

it("edits the same information once for every copy on the card and can split the copies apart", async () => {
  const repeated = [
    { key: "f1", type: "text", label: "Nhà hàng Forever", value: "Nhà hàng Forever" },
    { key: "f2", type: "text", label: "NHÀ HÀNG FOREVER", value: "NHÀ HÀNG FOREVER" },
    { key: "f3", type: "text", label: "12", value: "12" },
    { key: "f4", type: "text", label: "12", value: "12" },
  ];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/fields") ? ok(repeated) : url.endsWith("/template-preview") ? ok({ html: "<html></html>", boundValues: {} }) : ok([])));
  let latest: Wedding | undefined;
  render(<Studio onChange={next => { latest = next; }} />);
  await fromCard({ type: "ht:ready", order: ["f1", "f2", "f3", "f4"] });
  const rowTitles = () => [...document.querySelectorAll(".studio-row strong")].map(node => node.textContent);
  await waitFor(() => expect(rowTitles()).toEqual(["Nhà hàng Forever", "12", "12"]));
  expect(screen.getByText(/Giống nhau ở 2 chỗ/)).toBeInTheDocument();
  await fromCard({ type: "ht:field", keys: ["f2"] });
  fireEvent.change(await screen.findByRole("textbox", { name: "Nội dung" }), { target: { value: "Trung tâm Hoa Sen" } });
  expect(latest?.importedTemplate?.values).toEqual({ f1: "Trung tâm Hoa Sen", f2: "TRUNG TÂM HOA SEN" });
  fireEvent.click(screen.getByRole("button", { name: "Tách để sửa riêng" }));
  await waitFor(() => expect(rowTitles()).toEqual(["Trung tâm Hoa Sen", "TRUNG TÂM HOA SEN", "12", "12"]));
});

it("patches typed text into the open card without another server render and undoes a typing burst at once", async () => {
  const calls = mockApi();
  let latest: Wedding | undefined;
  render(<Studio onChange={next => { latest = next; }} />);
  const frame = await fromCard({ type: "ht:ready", order: ["f2", "f3"] });
  await waitFor(() => expect(calls.filter(url => url.endsWith("/template-preview"))).toHaveLength(1));
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  await fromCard({ type: "ht:field", keys: ["f3"] });
  const input = await screen.findByRole("textbox", { name: "Nội dung" });
  fireEvent.change(input, { target: { value: "Mời bạn" } });
  fireEvent.change(input, { target: { value: "Mời bạn nhé" } });
  expect(post).toHaveBeenCalledWith({ type: "ht:text", key: "f3", value: "Mời bạn nhé" }, "*");
  await fromCard({ type: "ht:text-applied", key: "f3", value: "Mời bạn nhé", ok: true });
  await new Promise(resolve => setTimeout(resolve, 700));
  expect(calls.filter(url => url.endsWith("/template-preview"))).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Hoàn tác/ }));
  expect(latest?.importedTemplate?.values).toEqual({});
});
