import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { Home } from "./App";

function Destination() {
  const { slug, code } = useParams();
  return <p>{slug}:{code}</p>;
}

it("redirects legacy guest links to the slug route", async () => {
  render(
    <MemoryRouter initialEntries={["/?id=guest%201"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/w/:slug/:code" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/:guest 1$/)).toBeInTheDocument();
});
