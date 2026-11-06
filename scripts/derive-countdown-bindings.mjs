// Derive the countdowns of imported templates. Their original scripts were not captured, so every countdown
// shows frozen sample numbers. Output: api/data/template-countdown-bindings.json (reviewed and committed); the
// renderer counts down to the wedding date and time entered in Thông tin (api/lib/templateContent.js).
//
// Three layouts exist:
// - split: number and unit fields in card order, "36 | ngày | 5 | giờ | 31 | phút | 18 | giây" (seconds optional);
// - text: one field "258 ngày 0 giờ 44 phút 35 giây", kept as a pattern with {d}/{h}/{m}/{s};
// - placeholder: "Đang tính toán..." / "Calculating..." right after a countdown heading, filled by the lost script.
// Our Love Begins (tpl-07109f7b5da0fc5f) is bound by hand and left alone.
//
// Usage: node scripts/derive-countdown-bindings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-countdown-bindings.json');
const handBound = 'tpl-07109f7b5da0fc5f';
const norm = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
const number = /^\d{1,4}$/;
const units = [/^ngày$/i, /^giờ$/i, /^phút$/i, /^giây$/i];
const single = /^(\d{1,4})( ngày )(\d{1,2})( giờ )(\d{1,2})( phút )(\d{1,2})( giây)$/i;
const heading = /(đếm ngược|countdown|倒計時)/i;
const placeholders = { 'đang tính toán...': '{d} ngày {h} giờ {m} phút {s} giây', 'calculating...': '{d} days {h} hours {m} minutes {s} seconds' };

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
const result = {};
const counts = { split: 0, text: 0, placeholder: 0 };
for (const item of catalog) {
  if (item.id === handBound) continue;
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const fields = new Map(layout.fields.filter(field => !field.retired).map(field => [field.key, field]));
  const order = [...new Set([...layout.html.matchAll(/%%HT_(f\d+)%%/g)].map(match => match[1]))].filter(key => fields.get(key)?.type === 'text');
  const values = order.map(key => norm(fields.get(key).value));
  const found = [];
  for (let at = 0; at < values.length; at++) {
    const unitAt = index => units[index].test(values[at + index * 2 + 1] || '') && number.test(values[at + index * 2] || '');
    if (unitAt(0) && unitAt(1) && unitAt(2)) {
      const parts = unitAt(3) ? 4 : 3;
      const keys = Array.from({ length: parts }, (_, index) => order[at + index * 2]);
      // Keep zero padding when the sample shows it ("05").
      const pad = keys.slice(1).some(key => /^0\d$/.test(norm(fields.get(key).value)));
      found.push({ kind: 'split', keys, ...(pad ? { pad: true } : {}) });
      counts.split++; at += parts * 2 - 1; continue;
    }
    const match = values[at].match(single);
    if (match) {
      found.push({ kind: 'text', key: order[at], pattern: `{d}${match[2]}{h}${match[4]}{m}${match[6]}{s}${match[8]}` });
      counts.text++; continue;
    }
    const pattern = placeholders[values[at].toLowerCase()];
    if (pattern && at > 0 && heading.test(values[at - 1])) {
      found.push({ kind: 'text', key: order[at], pattern });
      counts.placeholder++;
    }
  }
  if (found.length) result[item.id] = found;
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ templates: Object.keys(result).length, ...counts }, null, 1));
