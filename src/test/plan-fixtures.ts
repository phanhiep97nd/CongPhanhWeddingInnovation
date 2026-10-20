import type { Entitlements, Guest, Pricing, Wedding } from "../lib/types";

export const freeEntitlements: Entitlements = {
  unlimitedGuests: false,
  removeBranding: false,
  largeGallery: false,
  excelExport: false,
  guestQr: false,
  giftBox: false,
  photoWall: false,
  customMusic: false,
  permanent: false,
  premiumTemplates: false,
};

export const premiumEntitlements: Entitlements = Object.fromEntries(
  Object.keys(freeEntitlements).map(key => [key, true]),
) as unknown as Entitlements;

export const wedding: Wedding = {
  id: "w1",
  slug: "hoa-minh",
  published: true,
  couple: { groom: "Minh", bride: "Hoa", groomFull: "", brideFull: "" },
  eventDate: "2027-02-01",
  dateText: "01/02/2027",
  venue: { name: "Villa", address: "Hà Nội", mapUrl: "" },
  coverImage: "",
  ogImage: "",
  story: { title: "Câu chuyện", body: "Gặp nhau", image: "" },
  timeline: [],
  gallery: [],
  musicUrl: "",
  zaloGroupLink: "",
  dressCode: { note: "", colors: ["#c9848b"] },
  sections: [{ key: "giftBox", enabled: true }, { key: "photoWall", enabled: true }],
  customSections: [],
  meta: { title: "", description: "" },
  theme: { primary: "#b76e79" },
  createdAt: "2026-10-20",
  updatedAt: "2026-10-20",
  plan: "free",
  template: "classic",
  giftBox: { note: "Lời chúc", accounts: [{ id: "a", label: "Cô dâu", bankBin: "970436", bankName: "Vietcombank", accountNumber: "12345678", accountName: "NGUYEN THI HOA" }] },
  entitlements: freeEntitlements,
  limits: { guests: 10, gallery: 6 },
  usage: { guests: 0 },
  expiresAt: "2027-03-03",
  prices: { basic: 30000, premium: 99000 },
  showBranding: true,
};

export const pricing: Pricing = {
  prices: { basic: 30000, premium: 99000 },
  freeGuestLimit: 10,
  freeGalleryLimit: 6,
  paidGalleryLimit: 50,
  features: [
    { key: "unlimitedGuests", label: "Khách không giới hạn", plan: "basic" },
    { key: "giftBox", label: "Hộp mừng cưới", plan: "premium" },
  ],
};

export const guest: Guest = {
  id: "g1", code: "abc", invitationName: "Bác Nam", name: "Nam", phone: "0900000000",
  status: "yes", guestCount: 2, joinGroup: true, pickupPoint: "Bến xe", room: "A1",
  note: "Ăn chay", createdAt: "", updatedAt: "",
};

export const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;
