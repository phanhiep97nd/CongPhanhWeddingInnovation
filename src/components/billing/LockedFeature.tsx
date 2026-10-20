import { LockKeyhole } from "lucide-react";

export default function LockedFeature({ plan, onUpgrade, label }: {
  plan: "basic" | "premium";
  onUpgrade: () => void;
  label?: string;
}) {
  return <div className="locked-feature" role="note">
    <LockKeyhole size={17} aria-hidden="true" />
    <span>{label ? `${label} cần gói ${plan === "basic" ? "Cơ bản" : "Cao cấp"}.` : `Cần gói ${plan === "basic" ? "Cơ bản" : "Cao cấp"} để sử dụng.`}</span>
    <button type="button" className="text-button" onClick={onUpgrade}>Nâng cấp</button>
  </div>;
}
