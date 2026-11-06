import { forwardRef, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

// Dates are typed as dd/mm/yyyy whatever the browser's locale; the wedding keeps ISO yyyy-mm-dd.
const toText = (iso?: string | null) => { const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return match ? `${match[3]}/${match[2]}/${match[1]}` : ""; };
export function toIso(text: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match, date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? `${year}-${month}-${day}` : null;
}
// Keep digits only and place the slashes: "15122026" → "15/12/2026".
const mask = (raw: string) => { const digits = raw.replace(/\D/g, "").slice(0, 8); return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/"); };

type Props = { value?: string | null; onChange: (iso: string | null) => void; id?: string; "aria-label"?: string };
const DateInput = forwardRef<HTMLInputElement, Props>(function DateInput({ value, onChange, id, "aria-label": label }, ref) {
  const [text, setText] = useState(toText(value));
  const picker = useRef<HTMLInputElement>(null);
  // Follow changes made elsewhere (calendar picker, another form) without disturbing a date being typed.
  useEffect(() => { if (toIso(text) !== (value?.slice(0, 10) || null)) setText(toText(value)); }, [value]);
  const invalid = text.length === 10 && !toIso(text);
  return <span className="date-input">
    <input ref={ref} id={id} aria-label={label} inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" value={text} aria-invalid={invalid || undefined}
      onChange={event => { const next = mask(event.target.value); setText(next); if (!next) onChange(null); else { const iso = toIso(next); if (iso) onChange(iso); } }} />
    <button type="button" aria-label="Chọn ngày trên lịch" onClick={() => { const native = picker.current as (HTMLInputElement & { showPicker?: () => void }) | null; try { native?.showPicker?.(); } catch { native?.focus(); } }}><CalendarDays size={16} aria-hidden="true" /></button>
    <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" className="date-input-native" value={value?.slice(0, 10) || ""} onChange={event => onChange(event.target.value || null)} />
    {invalid && <small role="alert">Ngày không hợp lệ</small>}
  </span>;
});
export default DateInput;
