import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PhotoWall from "./PhotoWall";

it("rejects a non-image file before upload", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  } as Response);
  render(<PhotoWall slug="day" />);
  fireEvent.click(screen.getByRole("button", { name: /Chia sẻ/ }));
  fireEvent.change(screen.getByLabelText("Chọn ảnh"), {
    target: { files: [new File(["notes"], "notes.txt", { type: "text/plain" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("tệp ảnh");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockRestore();
});
