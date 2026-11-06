// Derive the map buttons of imported templates: links labelled "Chỉ đường", "Xem bản đồ", "Google Maps"…
// captured with href="#". Output: api/data/template-venue-bindings.json (reviewed and committed); the renderer
// points these links at the map link entered in Thông tin.
//
// Usage: node scripts/derive-venue-bindings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-venue-bindings.json');
const mapLabel = /^\s*(?:[^\p{L}]*\s*)?(?:chỉ đường|xem chỉ đường|xem bản đồ|bản đồ|mở bản đồ(?: trực tuyến)?|google ?maps?|xem map|map|directions?|get directions|view map)\b/iu;

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
const result = {};
let links = 0;
for (const item of catalog) {
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const keys = [];
  for (const field of layout.fields) {
    if (field.type !== 'text' || field.retired || String(field.value).length > 40 || !mapLabel.test(String(field.value))) continue;
    // The label must sit inside a link that goes nowhere yet.
    const at = layout.html.indexOf(`%%HT_${field.key}%%`), before = layout.html.slice(Math.max(0, at - 1500), at);
    const open = before.lastIndexOf('<a '), close = before.lastIndexOf('</a>');
    if (open < 0 || close > open || !/^<a [^>]*href="#"/.test(before.slice(open))) continue;
    keys.push(field.key);
  }
  if (keys.length) { result[item.id] = { map: keys }; links += keys.length; }
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ templates: Object.keys(result).length, mapLinks: links }, null, 1));
