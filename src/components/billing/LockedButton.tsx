import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

// A paid feature shown greyed out instead of hidden, so owners see what an upgrade adds. It cannot run the feature;
// pressing it opens the plans instead.
export default function LockedButton({ plan, onUpgrade, children }: { plan: "basic" | "premium"; onUpgrade: () => void; children: ReactNode }) {
  const name = plan === "basic" ? "Cơ bản" : "Cao cấp";
  return <button type="button" className="locked-button" aria-disabled="true" title={`Cần gói ${name}. Bấm để xem gói.`} onClick={onUpgrade}>
    <LockKeyhole size={14} aria-hidden="true" /> {children} <small>{name}</small>
  </button>;
}
