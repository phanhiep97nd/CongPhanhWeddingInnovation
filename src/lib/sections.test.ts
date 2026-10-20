import { describe, expect, it } from "vitest";
import { addCustomSection, moveSection, removeCustomSection, sectionLabel, toggleSection } from "./sections";
import type { Section } from "./types";
const sections: Section[] = [{ key: "story", enabled: true }, { key: "timeline", enabled: false }];
describe("section editing", () => {
  it("finds a built-in label", () => {
    expect(sectionLabel("story")).toBe("Câu chuyện");
  });
  it("finds a custom title", () => {
    expect(sectionLabel("custom:x", [{ id: "x", title: "Lời nhắn", body: "", image: "" }])).toBe("Lời nhắn");
  });
  it("keeps order when toggling", () => {
    expect(toggleSection(sections, "story")).toEqual([{ key: "story", enabled: false }, sections[1]]);
    expect(sections[0].enabled).toBe(true);
  });
  it("ignores a move beyond the beginning", () => {
    expect(moveSection(sections, 0, -1)).toBe(sections);
  });
  it("moves a section down without changing the input", () => {
    expect(moveSection(sections, 0, 1)[0].key).toBe("timeline");
    expect(sections[0].key).toBe("story");
  });
  it("adds and removes a custom section", () => {
    const custom = { id: "x", title: "Lời nhắn", body: "", image: "" };
    const added = addCustomSection(sections, [], custom);
    expect(added.sections.at(-1)).toEqual({ key: "custom:x", enabled: true });
    expect(removeCustomSection(added.sections, added.customSections, "x")).toEqual({ sections, customSections: [] });
  });
});
