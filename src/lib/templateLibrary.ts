import type { Wedding } from './types';
export const invitationKinds = [
  { id: 'wedding', label: 'Thiệp cưới' },
  { id: 'birthday', label: 'Sinh nhật' },
  { id: 'housewarming', label: 'Tân gia' },
  { id: 'graduation', label: 'Tốt nghiệp' },
  { id: 'event', label: 'Sự kiện' },
] as const;
export interface LibraryTemplate { id: string; name: string; category: NonNullable<Wedding['invitationKind']>; thumbnail: string; fieldCount: number }
export interface TemplateField { key: string; type: 'text' | 'image'; label: string; value: string; binding?: { source: TemplateBindingSource; label: string } }
export type TemplateBindingSource = 'names' | 'schedule' | 'dateText' | 'venue';
export const templateChoiceKey = 'hy:template-choice';
export function rememberTemplate(item: LibraryTemplate) { try { sessionStorage.setItem(templateChoiceKey, JSON.stringify(item)); } catch { /* selection remains available inside editor */ } }
export function chosenTemplate(): LibraryTemplate | null {
  try { const data = JSON.parse(sessionStorage.getItem(templateChoiceKey) || 'null'); return data && /^tpl-[a-f0-9]{16}$/.test(data.id) && invitationKinds.some(k => k.id === data.category) ? data : null; } catch { return null; }
}
export const invitationTitle = (w: Pick<Wedding, 'eventTitle' | 'couple'>) => w.eventTitle || [w.couple.groom, w.couple.bride].filter(Boolean).join(' & ');
