import type { CustomSection, Section, SectionKey } from "./types";

export const builtInSections: SectionKey[] = [
  "story",
  "timeline",
  "gallery",
  "info",
  "rsvp",
  "photoWall",
  "rooms",
  "dressCode",
];

export const sectionLabels: Record<SectionKey, string> = {
  story: "Câu chuyện",
  timeline: "Lịch trình",
  gallery: "Bộ sưu tập",
  info: "Thông tin",
  rsvp: "Xác nhận tham dự",
  photoWall: "Ảnh khách gửi",
  rooms: "Phòng nghỉ",
  dressCode: "Trang phục",
};

export function sectionLabel(key: string, custom: CustomSection[] = []) {
  if (key.startsWith("custom:")) {
    return custom.find((section) => `custom:${section.id}` === key)?.title || "Hạng mục tùy chỉnh";
  }
  return sectionLabels[key as SectionKey] || key;
}

export function clientId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function toggleSection(sections: Section[], key: string) {
  return sections.map((section) => section.key === key ? { ...section, enabled: !section.enabled } : section);
}

export function moveSection(sections: Section[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return sections;
  const copy = [...sections];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function addCustomSection(sections: Section[], customs: CustomSection[], value: CustomSection) {
  return {
    sections: [...sections, { key: `custom:${value.id}`, enabled: true }],
    customSections: [...customs, value],
  };
}

export function removeCustomSection(sections: Section[], customs: CustomSection[], id: string) {
  return {
    sections: sections.filter((section) => section.key !== `custom:${id}`),
    customSections: customs.filter((section) => section.id !== id),
  };
}
