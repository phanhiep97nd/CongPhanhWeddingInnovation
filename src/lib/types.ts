export type SectionKey = "story" | "timeline" | "gallery" | "info" | "rsvp" | "photoWall" | "rooms" | "dressCode" | "giftBox";
export type Plan = "free" | "basic" | "premium";
export type Template = "classic" | "minimal" | "hy3d";
export type ViewMode = "3d" | "mixed" | "normal";
export type FeatureKey = "unlimitedGuests" | "removeBranding" | "largeGallery" | "excelExport" | "guestQr" | "giftBox" | "photoWall" | "customMusic" | "permanent" | "premiumTemplates";
export type Entitlements = Record<FeatureKey, boolean>;

export interface GiftAccount {
  id: string;
  label: string;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface GiftBox {
  note: string;
  accounts: GiftAccount[];
}

export interface Prices { basic: number; premium: number; }
export interface Limits { guests: number | null; gallery: number; }
export interface Usage { guests: number; }
export interface Settings extends PricesLike {
  freeGuestLimit: number;
  freeGalleryLimit: number;
  paidGalleryLimit: number;
  freeExpiryDays: number;
}
interface PricesLike { prices: Prices; }

export interface Pricing extends Omit<Settings, "freeExpiryDays"> {
  features: { key: FeatureKey; label: string; plan: "basic" | "premium" }[];
}

export interface Order {
  id: string;
  orderCode: number;
  wedding: string;
  user: string;
  plan: "basic" | "premium";
  amount: number;
  status: "pending" | "paid" | "cancelled" | "expired";
  method: "payos" | "manual";
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  paidAt: string | null;
  createdAt: string;
  userEmail?: string;
  weddingSlug?: string;
}

export interface AdminStats {
  users: number;
  lockedUsers: number;
  weddings: number;
  guests: number;
  paidWeddings: number;
  revenue: number;
  revenueByMonth: { month: string; amount: number; orders: number }[];
  planCounts: Record<Plan, number>;
}

export interface AdminUser extends User {
  status: "active" | "locked";
  createdAt: string;
  weddingCount: number;
  paidAmount: number;
}

export interface PageResult<T> { items: T[]; total: number; page: number; limit: number; }

export interface Section {
  key: string;
  enabled: boolean;
}

export interface CustomSection {
  id: string;
  title: string;
  body: string;
  image: string;
}

export interface Wedding {
  id: string;
  slug: string;
  published: boolean;
  couple: { groom: string; bride: string; groomFull: string; brideFull: string };
  eventDate: string | null;
  eventTime?: string;
  dateText: string;
  venue: { name: string; address: string; mapUrl: string };
  coverImage: string;
  ogImage: string;
  story: { title: string; body: string; image: string };
  timeline: { id: string; time: string; title: string; desc: string }[];
  gallery: { id: string; url: string; title: string; desc: string; full: boolean }[];
  musicUrl: string;
  zaloGroupLink: string;
  dressCode: { note: string; colors: string[] };
  sections: Section[];
  customSections: CustomSection[];
  meta: { title: string; description: string };
  theme: { primary: string };
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
  planActivatedAt?: string | null;
  template?: Template;
  viewModes?: ViewMode[];
  giftBox?: GiftBox;
  slugAliases?: string[];
  entitlements?: Entitlements;
  limits?: Limits;
  usage?: Usage;
  expiresAt?: string | null;
  prices?: Prices;
  showBranding?: boolean;
}

export interface WeddingSummary {
  id: string;
  slug: string;
  couple: Wedding["couple"];
  dateText: string;
  coverImage: string;
  published: boolean;
  guestCount: number;
  updatedAt: string;
  plan?: Plan;
  expiresAt?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: "user" | "admin";
  status?: "active" | "locked";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Guest {
  id: string;
  code: string;
  name: string;
  invitationName: string;
  phone: string;
  status: "pending" | "yes" | "no";
  guestCount: number;
  joinGroup: boolean;
  pickupPoint: string;
  room: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicGuest = Pick<Guest, "code" | "invitationName" | "status" | "guestCount" | "joinGroup" | "pickupPoint" | "room">;

export interface Photo {
  id: string;
  url: string;
  caption: string;
  author: string;
  createdAt: string;
}

export interface Stats {
  total: number;
  yes: number;
  no: number;
  pending: number;
  attendees: number;
}
