import type { CustomSection, Section, SectionKey } from './types';
export const builtInSections: SectionKey[] = ['story', 'timeline', 'gallery', 'info', 'rsvp', 'photoWall', 'rooms', 'dressCode'];
export const sectionLabels: Record<SectionKey, string> = { story: 'Câu chuyện', timeline: 'Lịch trình', gallery: 'Bộ sưu tập', info: 'Thông tin', rsvp: 'Xác nhận tham dự', photoWall: 'Ảnh khách gửi', rooms: 'Phòng nghỉ', dressCode: 'Trang phục' };
export const sectionLabel = (key: string, custom: CustomSection[] = []) => key.startsWith('custom:') ? custom.find(c => `custom:${c.id}` === key)?.title || 'Hạng mục tùy chỉnh' : sectionLabels[key as SectionKey] || key;
export const clientId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const toggleSection = (sections: Section[], key: string) => sections.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s);
export const moveSection = (sections: Section[], index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= sections.length) return sections; const copy = [...sections]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; };
export const addCustomSection = (sections: Section[], customs: CustomSection[], value: CustomSection) => ({ sections: [...sections, { key: `custom:${value.id}`, enabled: true }], customSections: [...customs, value] });
export const removeCustomSection = (sections: Section[], customs: CustomSection[], id: string) => ({ sections: sections.filter(s => s.key !== `custom:${id}`), customSections: customs.filter(c => c.id !== id) });
