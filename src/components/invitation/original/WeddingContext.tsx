import { createContext, useContext } from "react";
import type { PublicGuest, Wedding } from "../../../lib/types";

export interface InvitationData {
  wedding: Wedding;
  guest: PublicGuest | null;
  slug: string;
}

export const WeddingContext = createContext<InvitationData | null>(null);

export function useWedding() {
  const value = useContext(WeddingContext);
  if (!value) throw new Error("Invitation components require WeddingContext");
  return value;
}

export function publicPath(slug: string, suffix: string) {
  return `/public/weddings/${encodeURIComponent(slug)}${suffix}`;
}
