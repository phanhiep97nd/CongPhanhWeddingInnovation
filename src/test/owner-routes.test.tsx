import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { setToken } from "../lib/api";
import { response, wedding } from "./plan-fixtures";

afterEach(() => { vi.unstubAllGlobals(); setToken(null); window.history.replaceState({}, "", "/"); });

it("sends old /dashboard links, including payment returns, to the owner's card pages", async () => {
  setToken("token");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => response(url.endsWith("/auth/me") ? { user: { id: "u1", email: "a@b.c", name: "A", role: "user", status: "active" } } : url.includes("/weddings/w1") ? wedding : [])));
  window.history.replaceState({}, "", "/dashboard/w1?payment=success&orderCode=123");
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/thiep-cua-toi/w1"));
  expect(window.location.search).toBe("?payment=success&orderCode=123");
});

it("keeps the owner area apart from /admin", async () => {
  setToken("token");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => response(url.endsWith("/auth/me") ? { user: { id: "u1", email: "a@b.c", name: "A", role: "user", status: "active" } } : [])));
  window.history.replaceState({}, "", "/dashboard");
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/thiep-cua-toi"));
  expect(await screen.findByRole("main")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/thiep-cua-toi");
});
