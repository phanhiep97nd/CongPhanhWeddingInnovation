import { describe, expect, it } from "vitest";
import { csvCell, guestsCsv } from "./csv";
import type { Guest } from "./types";
describe("CSV export", () => {
  it("escapes commas", () => {
    expect(csvCell("Lan, Minh")).toBe('"Lan, Minh"');
  });
  it("doubles quotation marks", () => {
    expect(csvCell('Lan "M"')).toBe('"Lan ""M"""');
  });
  it("quotes line breaks", () => {
    expect(csvCell("one\ntwo")).toBe('"one\ntwo"');
  });
  it("handles null values", () => {
    expect(csvCell(null)).toBe("");
  });
  it("writes BOM, CRLF and a personal URL", () => {
    const guest = { invitationName: "Lan", code: "a b", status: "yes", guestCount: 2 } as Guest;
    const csv = guestsCsv([guest], "https://example.test", "day");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\nLan");
    expect(csv).toContain("https://example.test/w/day/a%20b");
  });
});
