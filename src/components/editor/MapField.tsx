import { useEffect, useId, useRef } from 'react';
import { parseMapInput } from '../../lib/mapInput';

export default function MapField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null), id = useId();
  const result = parseMapInput(value);
  const error = 'error' in result ? result.error : '';
  useEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  return <div className="map-field">
    <label htmlFor={id}>Liên kết bản đồ</label>
    <input id={id} ref={input} data-map-input type="text" value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} placeholder="https://… hoặc <iframe src=…></iframe>" onChange={event => {
      const raw = event.target.value, parsed = parseMapInput(raw);
      onChange(parsed.ok ? parsed.url : raw);
    }} />
    {error && <p id={`${id}-error`} role="alert" className="error">{error}</p>}
  </div>;
}
