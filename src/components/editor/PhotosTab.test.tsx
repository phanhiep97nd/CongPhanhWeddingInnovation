import { expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PhotosTab from "./PhotosTab";

it("loads owner photos for an unpublished wedding", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => [],
  } as Response);
  render(<PhotosTab weddingId="wedding-1" slug="hidden-day" />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(fetchMock.mock.calls[0][0]).toBe("/api/weddings/wedding-1/photos");
  expect(await screen.findByText(/Chưa có ảnh khách gửi/)).toBeInTheDocument();
  fetchMock.mockRestore();
});
