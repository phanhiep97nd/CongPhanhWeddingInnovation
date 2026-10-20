import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Gallery from "./Gallery";
import type { Wedding } from "../../lib/types";

it("toggles an active gallery card and spans full-width items", () => {
  const wedding = {
    gallery: [{ id: "1", url: "/images/DSCF7944.jpg", title: "Buổi chiều", desc: "Bên nhau", full: true }],
  } as Wedding;
  render(<Gallery wedding={wedding} />);
  const card = screen.getByRole("button", { name: "Xem ảnh Buổi chiều" });
  expect(card).toHaveClass("gallery-wide");
  fireEvent.click(card);
  expect(card).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(card);
  expect(card).toHaveAttribute("aria-pressed", "false");
});
