export type SectionKey = 'story' | 'timeline' | 'gallery' | 'info' | 'rsvp' | 'photoWall' | 'rooms' | 'dressCode';
export interface Section { key: string; enabled: boolean }
export interface CustomSection { id: string; title: string; body: string; image: string }
export interface Wedding {
  id: string; slug: string; published: boolean;
  couple: { groom: string; bride: string; groomFull: string; brideFull: string };
  eventDate: string | null; dateText: string;
  venue: { name: string; address: string; mapUrl: string };
  coverImage: string; ogImage: string;
  story: { title: string; body: string; image: string };
  timeline: { id: string; time: string; title: string; desc: string }[];
  gallery: { id: string; url: string; title: string; desc: string; full: boolean }[];
  musicUrl: string; zaloGroupLink: string;
  dressCode: { note: string; colors: string[] };
  sections: Section[]; customSections: CustomSection[];
  meta: { title: string; description: string }; theme: { primary: string };
  createdAt: string; updatedAt: string;
}
export interface WeddingSummary { id: string; slug: string; couple: Wedding['couple']; dateText: string; coverImage: string; published: boolean; guestCount: number; updatedAt: string }
export interface User { id: string; email: string; name: string }
export interface AuthResponse { token: string; user: User }
export interface Guest { id: string; code: string; name: string; invitationName: string; phone: string; status: 'pending' | 'yes' | 'no'; guestCount: number; joinGroup: boolean; pickupPoint: string; room: string; note: string; createdAt: string; updatedAt: string }
export type PublicGuest = Pick<Guest, 'code' | 'invitationName' | 'status' | 'guestCount' | 'joinGroup' | 'pickupPoint' | 'room'>;
export interface Photo { id: string; url: string; caption: string; author: string; createdAt: string }
export interface Stats { total: number; yes: number; no: number; pending: number; attendees: number }
