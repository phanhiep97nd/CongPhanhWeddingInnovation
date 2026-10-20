import { describe, expect, it, vi } from "vitest";
import { timeAgo } from "./PhotoDialogs";

describe("timeAgo", () => {
  it("describes a recent photo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    expect(timeAgo("2026-10-20T11:59:50Z")).toBe("Vừa xong");
    vi.useRealTimers();
  });

  it("handles invalid timestamps", () => {
    expect(timeAgo("not-a-date")).toBe("");
  });
});
