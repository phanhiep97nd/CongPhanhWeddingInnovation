// Derive explicit calendar bindings for imported templates from evidence inside each layout.
// Output: api/data/template-calendar-bindings.json, reviewed and committed; the renderer rebuilds the
// marked grid for the wedding's month (api/lib/templateContent.js) and never searches for calendars itself.
//
// A calendar is a run of text fields showing 1, 2, 3 … 28–31 in card order (image fields such as a
// heart marker may sit between them). The week starts on the day named by the weekday header right
// before it, or right after it when a layout lists the header after the days (Monday unless the header starts
// with Sunday). A month label within the few fields before the header (or a month/year pair of cells), and one
// within the few fields after the grid, become patterns with {m}/{mm}/{yyyy}/{Month}/{MONTH}/{Mon} tokens.
//
// Usage: node scripts/derive-calendar-bindings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-calendar-bindings.json');
const norm = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const weekday = /^(?:t[2-7]|cn|thứ ?[2-7]|thứ (?:hai|ba|tư|năm|sáu|bảy)|chủ nhật|mon|tue|wed|thu|fri|sat|sun|mo|tu|we|th|fr|sa|su|m|t|w|f|s)$/i;
const sundayFirst = /^(?:cn|chủ nhật|sun|su|s)$/i;

// Turn a sample month label into a pattern, or null when it is not one.
function monthPattern(value) {
  const text = norm(value);
  let match = text.match(/^(tháng|THÁNG|Tháng)\s*(0?)(\d{1,2})(\s*[\/.,-]\s*(?:năm\s*)?)?(\d{4})?$/u);
  if (match && Number(match[3]) <= 12) return `${match[1]} ${match[2] ? '{mm}' : '{m}'}${match[5] ? (match[4] || ' ') + '{yyyy}' : ''}`;
  match = text.match(/^(0?)(\d{1,2})\s*([./])\s*(\d{4})$/);
  if (match && Number(match[2]) <= 12) return `${match[1] ? '{mm}' : '{m}'}${text.slice(match[1].length + match[2].length, text.length - 4)}{yyyy}`;
  match = text.match(/^([A-Za-z]+)\s*,?\s*(\d{4})?$/);
  if (match) {
    const word = match[1], index = months.findIndex(name => name === word.toLowerCase() || name.slice(0, 3) === word.toLowerCase());
    if (index >= 0) {
      const token = word.length <= 3 ? '{Mon}' : '{Month}';
      const cased = word === word.toUpperCase() ? token.toUpperCase().replace('{MON}', '{MON}').replace('{MONTH}', '{MONTH}') : token;
      return match[2] ? `${cased}${text.slice(word.length, text.length - 4)}{yyyy}` : cased;
    }
  }
  return null;
}

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
const result = {};
let calendars = 0, labels = 0;
for (const item of catalog) {
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const fields = new Map(layout.fields.filter(field => !field.retired).map(field => [field.key, field]));
  const order = [...new Set([...layout.html.matchAll(/%%HT_(f\d+)%%/g)].map(match => match[1]))].filter(key => fields.get(key)?.type === 'text');
  const values = order.map(key => norm(fields.get(key).value));
  const found = [];
  for (let start = 0; start < values.length; start++) {
    if (values[start] !== '1') continue;
    let end = start;
    while (end + 1 < values.length && values[end + 1] === String(end - start + 2)) end++;
    // A countdown can follow the grid ("… 29 | 30 | 31 | ngày | 21 | giờ"): its day count is not a calendar day.
    if (/^ngày$/i.test(values[end + 1] || '') && end - start + 1 > 28) end--;
    const length = end - start + 1;
    if (length < 28 || length > 31) continue;
    const isHeader = list => list.length === 7 && list.every(value => weekday.test(value));
    const headers = values.slice(Math.max(0, start - 7), start), trailing = values.slice(end + 1, end + 8);
    const hasHeader = isHeader(headers), hasTrailing = !hasHeader && isHeader(trailing);
    const before = hasHeader ? start - 7 : start, after = hasTrailing ? end + 8 : end + 1;
    // A month label ("Tháng 5 / 2026", "11.2026", "November 2026") within a few fields before the grid, or a
    // bare month number and year shown as two cells right above the weekday header.
    const labels = [];
    for (let at = before - 1; at >= Math.max(0, before - 4); at--) {
      const pattern = monthPattern(values[at]);
      if (pattern) { labels.push({ key: order[at], pattern }); break; }
    }
    if (!labels.length && before >= 2 && /^[0-9]{1,2}$/.test(values[before - 2]) && Number(values[before - 2]) <= 12 && /^[0-9]{4}$/.test(values[before - 1])) {
      labels.push({ key: order[before - 2], pattern: values[before - 2].length === 2 ? '{mm}' : '{m}' }, { key: order[before - 1], pattern: '{yyyy}' });
    }
    for (let at = after; at < Math.min(values.length, after + 3); at++) {
      const pattern = monthPattern(values[at]);
      if (pattern) { labels.push({ key: order[at], pattern }); break; }
    }
    const header = hasHeader ? headers : hasTrailing ? trailing : null;
    found.push({ days: order.slice(start, end + 1), weekStart: header && sundayFirst.test(header[0]) ? 0 : 1, ...(labels.length ? { labels } : {}) });
    start = end;
  }
  if (!found.length) continue;
  result[item.id] = found;
  calendars += found.length; labels += found.filter(entry => entry.labels).length;
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ templates: Object.keys(result).length, calendars, monthLabels: labels }, null, 1));
