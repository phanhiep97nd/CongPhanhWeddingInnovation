import { describe, expect, it } from "vitest";
import { inviteLink } from "./links";
describe("inviteLink", () => {
  it("creates a public wedding link", () => {
    expect(inviteLink("https://example.test", "our-day")).toBe("https://example.test/w/our-day");
  });
  it("adds a personal guest code", () => {
    expect(inviteLink("https://example.test", "our-day", "abc")).toBe("https://example.test/w/our-day/abc");
  });
  it("encodes non-ASCII slugs and guest codes", () => {
    expect(inviteLink("https://example.test", "đám cưới", "a/b")).toContain("%C4%91%C3%A1m%20c%C6%B0%E1%BB%9Bi/a%2Fb");
  });
  it("removes a trailing slash from the origin", () => {
    expect(inviteLink("https://example.test/", "day")).toBe("https://example.test/w/day");
  });
});
