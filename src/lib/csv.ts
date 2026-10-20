import type { Guest } from './types';
import { inviteLink } from './links';

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function guestsCsv(guests: Guest[], origin: string, slug: string) {
  const header = ['Tên trên thiệp', 'Tên thật', 'SĐT', 'Trạng thái', 'Số khách', 'Điểm đón', 'Phòng', 'Ghi chú', 'Liên kết'];
  const rows = guests.map(g => [g.invitationName, g.name, g.phone, g.status, g.guestCount, g.pickupPoint, g.room, g.note, inviteLink(origin, slug, g.code)]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
