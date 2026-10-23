import designs from "../../api/data/invitation-designs.json";

// Shared data has one owner; the API validates the same keys it serves to the UI.
export const invitationDesigns = designs;
export type InvitationDesignKey = (typeof designs)[number]["key"];

export function findInvitationDesign(key?: string) {
  return invitationDesigns.find(design => design.key === key);
}
