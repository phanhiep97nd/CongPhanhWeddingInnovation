import writeXlsxFile from "write-excel-file/browser";
import type { Guest } from "./types";
import { inviteLink } from "./links";

export function guestExcelRows(guests: Guest[], origin: string, slug: string) {
  const headers = ["Tên trên thiệp", "Tên thật", "SĐT", "Trạng thái", "Số người", "Đi xe", "Điểm đón", "Phòng", "Ghi chú", "Link riêng"];
  const rows = guests.map(guest => [
    guest.invitationName, guest.name, guest.phone, guest.status,
    guest.guestCount, guest.joinGroup ? "Có" : "Không", guest.pickupPoint,
    guest.room, guest.note, inviteLink(origin, slug, guest.code),
  ]);
  return [headers, ...rows].map(row => row.map(value => ({ value })));
}

export async function exportGuestExcel(guests: Guest[], origin: string, slug: string) {
  await writeXlsxFile(guestExcelRows(guests, origin, slug)).toFile(`khach-moi-${slug}.xlsx`);
}
