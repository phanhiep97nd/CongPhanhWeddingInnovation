export function inviteLink(origin: string, slug: string, code?: string) {
  return `${origin.replace(/\/$/, '')}/w/${encodeURIComponent(slug)}${code ? '/' + encodeURIComponent(code) : ''}`;
}

// The card address suggested from the couple's names (or the event title): "Phương Anh & Minh Công" → "phuong-anh-minh-cong".
export function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
}

// The couple's own area: their cards, the card editor and the QR print sheet. Kept apart from /admin.
export const CARDS_PATH = "/thiep-cua-toi";
export const editorPath = (id: string) => `${CARDS_PATH}/${encodeURIComponent(id)}`;
export const qrPrintPath = (id: string) => `${editorPath(id)}/qr`;
