import { describe, expect, it } from "vitest";
import { parseBulkGuests } from "./guests";
describe("parseBulkGuests", () => {
  it("ignores empty lines", () => {
    expect(parseBulkGuests("\n \nLan\n")).toEqual([{ invitationName: "Lan" }]);
  });
  it("trims each field", () => {
    expect(parseBulkGuests(" Lan | Linh | 090 ")).toEqual([{ invitationName: "Lan", name: "Linh", phone: "090" }]);
  });
  it("handles Windows line endings", () => {
    expect(parseBulkGuests("Lan\r\nMinh")).toHaveLength(2);
  });
  it("ignores rows without an invitation name", () => {
    expect(parseBulkGuests(" | Name | 090")).toEqual([]);
  });
  it("omits optional empty columns", () => {
    expect(parseBulkGuests("Lan | | ")).toEqual([{ invitationName: "Lan" }]);
  });
});
