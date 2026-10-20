import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DressCode from "./DressCode";
import type { Wedding } from "../../lib/types";

it("uses the wedding palette in the dress code", () => {
  const wedding = { dressCode: { note: "Màu của chúng mình", colors: ["#123456", "#abcdef", "#fedcba", "#111111"] } } as Wedding;
  const { container } = render(<DressCode wedding={wedding} />);
  expect(screen.getByText("Màu của chúng mình")).toBeInTheDocument();
  expect(container.querySelector('[title="#123456"]')).toHaveStyle({ background: "#123456" });
  expect(container.querySelector('svg path[fill="#abcdef"]')).toBeInTheDocument();
});
