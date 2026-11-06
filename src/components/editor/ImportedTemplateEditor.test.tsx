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

vi.mock("../../lib/images", () => ({ uploadImage: vi.fn(async (file: File) => `https://img.example/${file.name}`) }));
it("uploads album photos together into one album row, up to the album positions of the template", async () => {
  const album = [
    { key: "a1", type: "image", label: "Ảnh 4", value: "", album: 0 },
    { key: "a2", type: "image", label: "Ảnh 5", value: "", album: 1 },
    { key: "a3", type: "image", label: "Ảnh 6", value: "", album: 1 },
    { key: "a4", type: "image", label: "Ảnh 7", value: "", album: 2 },
    { key: "f1", type: "image", label: "Ảnh 1", value: "" },
  ];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/fields") ? ok(album) : url.endsWith("/template-preview") ? ok({ html: "<html></html>", boundValues: {} }) : ok([])));
  let latest: Wedding | undefined;
  render(<Studio onChange={next => { latest = next; }} />);
  const frame = await fromCard({ type: "ht:ready", order: ["f1", "a1", "a2", "a3", "a4"] });
  await waitFor(() => expect(screen.getByText("Album ảnh")).toBeInTheDocument());
  expect(screen.getByText("Ảnh mẫu · tối đa 3 ảnh")).toBeInTheDocument();
  expect(screen.queryByText("Ảnh 5")).not.toBeInTheDocument();
  // Clicking any album photo on the card opens the album and highlights all of its slots.
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  await fromCard({ type: "ht:field", keys: ["a3"] });
  expect(post).toHaveBeenCalledWith({ type: "ht:select", key: "a1", keys: ["a1", "a2", "a3", "a4"], scroll: false }, "*");
  const input = document.querySelector<HTMLInputElement>(".studio-upload input[multiple]")!;
  const files = ["1.jpg", "2.jpg", "3.jpg", "4.jpg"].map(name => new File(["x"], name, { type: "image/jpeg" }));
  fireEvent.change(input, { target: { files } });
  await waitFor(() => expect(latest?.importedTemplate?.album).toEqual(["https://img.example/1.jpg", "https://img.example/2.jpg", "https://img.example/3.jpg"]));
  expect(screen.getByRole("alert")).toHaveTextContent("Album của mẫu này có 3 khung ảnh nên chỉ thêm được 3 ảnh.");
  expect(screen.getByText("3/3 ảnh")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Đưa ảnh 1 ra sau" }));
  expect(latest?.importedTemplate?.album?.slice(0, 2)).toEqual(["https://img.example/2.jpg", "https://img.example/1.jpg"]);
  fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 3" }));
  expect(latest?.importedTemplate?.album).toHaveLength(2);
}, 30000);
