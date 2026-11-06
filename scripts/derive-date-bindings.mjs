// Derive soft date bindings for imported templates: text that states the wedding date follows the date entered
// in Thông tin until the owner edits it. Output: api/data/template-date-bindings.json (reviewed and committed).
//
// The sample wedding date of a card is the solar date it states most often (15.12.2026, 15/12/2026,
// "ngày 15 tháng 12 năm 2026", "15 tháng 12, 2026", or "Tháng 12" + "15" + "Năm 2026" side by side).
// Fields stating that date become patterns: {d}/{dd}, {m}/{mm}, {yyyy}; weekday words agreeing with the sample
// date become {wd:<form>:<case>}; a time inside such a field becomes {time}; lunar sentences ("Tức ngày 17 tháng 11
// năm Bính Ngọ", "11/11 âm lịch") become {ld}/{ldd}/{lm}/{lmm}/{lyear}, recomputed from the wedding date.
// Fields already bound to names or calendars, and Our Love Begins (hand-bound), are left alone.
//
// Usage: node scripts/derive-date-bindings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-date-bindings.json');
const names = require(path.join(root, 'api/data/template-name-bindings.json'));
const calendars = require(path.join(root, 'api/data/template-calendar-bindings.json'));
const handBound = new Set(['tpl-07109f7b5da0fc5f']);

const norm = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
const isUpper = text => /\p{L}/u.test(text) && text === text.toLocaleUpperCase('vi');
const lunarWords = /âm lịch|tức ngày|nhằm ngày|\b(?:giáp|ất|bính|đinh|mậu|kỷ|canh|tân|nhâm|quý) (?:tý|sửu|dần|mão|thìn|tỵ|ngọ|mùi|thân|dậu|tuất|hợi)\b/iu;
const viWeek = ['chủ nhật', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy'];
const numWeek = ['chủ nhật', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7'];
const enWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const valid = (d, m, y) => { const date = new Date(Date.UTC(y, m - 1, d)); return y >= 2020 && y <= 2060 && date.getUTCMonth() === m - 1 && date.getUTCDate() === d; };
const caseOf = text => text === text.toLocaleUpperCase('vi') ? 'U' : text === text.toLocaleLowerCase('vi') ? 'L' : text.split(' ').every(word => word[0] === word[0].toLocaleUpperCase('vi')) ? 'T' : 'S';
const num = (sample, short, long) => sample.length === 2 && sample[0] === '0' ? long : short;

// Solar dates stated inside one text (with their positions), for choosing the sample date.
const solarPatterns = [
  { re: /(\d{1,2})(\s*([./-])\s*)(\d{1,2})(\s*\3\s*)(\d{4})/gu, parts: m => [m[1], m[4], m[6]], build: (m, d, mo, y) => `${d}${m[2]}${mo}${m[5]}${y}` },
  { re: /(\d{4})(\s*([./-])\s*)(\d{1,2})(\s*\3\s*)(\d{1,2})(?!\d)/gu, parts: m => [m[6], m[4], m[1]], build: (m, d, mo, y) => `${y}${m[2]}${mo}${m[5]}${d}` },
  { re: /(ngày\s*)(\d{1,2})(\s*tháng\s*)(\d{1,2})(\s*,?\s*(?:năm\s*)?)(\d{4})/giu, parts: m => [m[2], m[4], m[6]], build: (m, d, mo, y) => `${m[1]}${d}${m[3]}${mo}${m[5]}${y}` },
  { re: /(?<![\p{L}\d])(\d{1,2})(\s*tháng\s*)(\d{1,2})(\s*,\s*|\s+năm\s+)(\d{4})/giu, parts: m => [m[1], m[3], m[5]], build: (m, d, mo, y) => `${d}${m[2]}${mo}${m[4]}${y}` },
];
function solarDates(text) {
  if (lunarWords.test(text) || /\d{1,2}:\d{2}:\d{2}/.test(text)) return [];
  const found = [];
  for (const pattern of solarPatterns) for (const match of text.matchAll(pattern.re)) {
    const [d, m, y] = pattern.parts(match).map(Number);
    if (valid(d, m, y)) found.push({ d, m, y, match, pattern });
  }
  return found;
}

function derive(fields) {
  // 1. The sample date: the solar date stated most often, or Tháng m / d / Năm y cells side by side.
  const votes = new Map();
  const vote = (d, m, y, weight) => { const key = `${y}-${m}-${d}`; votes.set(key, (votes.get(key) || 0) + weight); };
  // A date whose day and month are both ≤ 12 may be written month first ("5.12.2027" for 12 May); the other
  // cells on the card decide which reading wins.
  for (const field of fields) for (const date of solarDates(field.value)) {
    vote(date.d, date.m, date.y, 2);
    if (date.d <= 12 && date.m <= 12 && date.d !== date.m) vote(date.m, date.d, date.y, 1.5);
  }
  fields.forEach((field, index) => {
    const month = field.value.match(/^tháng\s*0?(\d{1,2})$/iu);
    if (!month) return;
    const near = fields.slice(Math.max(0, index - 3), index + 4).map(other => other.value);
    const year = near.map(value => value.match(/^(?:năm\s*)?(\d{4})$/iu)).find(Boolean);
    const day = near.map(value => value.match(/^0?(\d{1,2})$/)).find(Boolean);
    if (year && day && valid(Number(day[1]), Number(month[1]), Number(year[1]))) vote(Number(day[1]), Number(month[1]), Number(year[1]), 1);
  });
  // "Tháng m" next to "Năm y" confirms the full date that has that month and year.
  fields.forEach((field, index) => {
    const month = field.value.match(/^tháng\s*0?(\d{1,2})$/iu);
    const year = month && fields.slice(Math.max(0, index - 3), index + 4).map(other => other.value.match(/^(?:năm\s*)?(\d{4})$/iu)).find(Boolean);
    if (!year) return;
    for (const other of fields) for (const date of solarDates(other.value)) {
      if (date.y !== Number(year[1])) continue;
      if (date.m === Number(month[1])) vote(date.d, date.m, date.y, 2);
      else if (date.d === Number(month[1]) && date.m <= 31) vote(date.m, date.d, date.y, 2);
    }
  });
  const best = [...votes].filter(([key]) => { const [y, m, d] = key.split('-').map(Number); return valid(d, m, y); }).sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  const [y, m, d] = best[0].split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const out = {};

  // Replace the weekday words that agree with the sample date (any weekday word when the same text states the
  // date, since some samples name the wrong day); returns the new text or null.
  const weekdays = (text, any = false) => {
    let changed = false;
    let next = text.replace(/thứ\s+(?:hai|ba|tư|năm|sáu|bảy)|chủ\s+nhật|thứ\s*[2-7](?!\d)|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/giu, word => {
      const low = word.toLocaleLowerCase('vi').replace(/\s+/g, ' ');
      const at = { vi: viWeek.indexOf(low), num: numWeek.indexOf(low.replace(/thứ(\d)/, 'thứ $1')), en: enWeek.indexOf(low) };
      const form = Object.keys(at).find(key => at[key] >= 0 && (any || at[key] === weekday)) || '';
      if (!form) return word;
      changed = true; return `{wd:${form}:${caseOf(word)}}`;
    });
    return changed ? next : null;
  };
  // The time of day in the sample's style: separator, padding and a 12-hour clock when it says AM/PM.
  const time = (text, entry) => text.replace(/(?<![\d:])(\d{1,2})\s*([:hH])\s*(\d{2})(?![\d:])(\s*(?:AM|PM|am|pm))?/u, (match, hours, sep, minutes, meridiem) => { entry.time = { sep, pad: hours.length === 2, sample: match, ...(meridiem ? { meridiem: meridiem.trim() === meridiem.trim().toUpperCase() ? 'upper' : 'lower', gap: meridiem.length - meridiem.trim().length > 0 } : {}) }; return '{time}'; });

  fields.forEach((field, index) => {
    const value = field.value;
    // Lunar sentences: numbers and the can-chi year follow the wedding date.
    if (/âm lịch|tức ngày|nhằm ngày/iu.test(value)) {
      let pattern = value, hit = false;
      pattern = pattern.replace(/(ngày\s*:?\s*)(\d{1,2})(\s*tháng\s*)(\d{1,2})(?!\d)/iu, (all, a, ld, b, lm) => { hit = true; return `${a}${num(ld, '{ld}', '{ldd}')}${b}${num(lm, '{lm}', '{lmm}')}`; });
      if (!hit) pattern = pattern.replace(/(?<!\d)(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/u, (all, ld, lm) => { hit = true; return `${num(ld, '{ld}', '{ldd}')}/${num(lm, '{lm}', '{lmm}')}`; });
      pattern = pattern.replace(/(?<!\p{L})(?:giáp|ất|ât|bính|đinh|mậu|kỷ|canh|tân|nhâm|quý) (?:tý|sửu|dần|mão|thìn|tỵ|ngọ|mùi|thân|dậu|tuất|hợi)(?!\p{L})/iu, word => { hit = true; return `{lyear:${caseOf(word)}}`; });
      const entry = {};
      if (hit) out[field.key] = { pattern: time(pattern, entry), ...entry };
      return;
    }
    // Solar dates equal to the sample, rewritten with tokens that keep the sample's padding and separators.
    let pattern = value, dated = false;
    for (const date of solarDates(value)) {
      const [ds, ms] = date.pattern.parts(date.match);
      if (date.y !== y) continue;
      if (date.d === d && date.m === m) pattern = pattern.replace(date.match[0], date.pattern.build(date.match, num(ds, '{d}', '{dd}'), num(ms, '{m}', '{mm}'), '{yyyy}'));
      else if (date.d === m && date.m === d) pattern = pattern.replace(date.match[0], date.pattern.build(date.match, num(ds, '{m}', '{mm}'), num(ms, '{d}', '{dd}'), '{yyyy}'));
      else continue;
      dated = true;
    }
    const entry = {};
    const withDays = weekdays(pattern, dated);
    if (withDays) pattern = withDays;
    if (dated || withDays) {
      pattern = time(pattern, entry);
      out[field.key] = { pattern, ...entry };
      return;
    }
    // Month, year and day cells of the sample date placed side by side ("THÁNG 12", "15", "NĂM 2026").
    const near = fields.slice(Math.max(0, index - 3), index + 4).filter(other => other !== field).map(other => other.value);
    const nearDate = near.some(other => new RegExp(`^(?:tháng\\s*0?${m}|(?:năm\\s*)?${y})$`, 'iu').test(other));
    let match = value.match(/^(tháng\s*)(0?)(\d{1,2})$/iu);
    if (match && Number(match[3]) === m && near.some(other => new RegExp(`^(?:(?:năm\\s*)?${y}|0?${d})$`, 'iu').test(other))) { out[field.key] = { pattern: `${match[1]}${match[2] ? '{mm}' : '{m}'}` }; return; }
    match = value.match(/^(năm\s*)?(\d{4})$/iu);
    if (match && Number(match[2]) === y && nearDate) { out[field.key] = { pattern: `${match[1] || ''}{yyyy}` }; return; }
    match = value.match(/^(0?)(\d{1,2})$/);
    if (match && Number(match[2]) === d && nearDate) { out[field.key] = { pattern: match[1] ? '{dd}' : '{d}' }; return; }
  });
  return Object.keys(out).length ? { sample: { day: d, month: m, year: y }, fields: out } : null;
}

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
const result = {};
let fieldsBound = 0;
for (const item of catalog) {
  if (handBound.has(item.id)) continue;
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const taken = new Set([...Object.keys(names[item.id]?.fields || {}), ...(calendars[item.id] || []).flatMap(entry => [...entry.days, ...(entry.labels || []).map(label => label.key)])]);
  const byKey = new Map(layout.fields.filter(field => field.type === 'text' && !field.retired && !taken.has(field.key)).map(field => [field.key, field]));
  const fields = [...new Set([...layout.html.matchAll(/%%HT_(f\d+)%%/g)].map(match => match[1]))].filter(key => byKey.has(key)).map(key => ({ key, value: norm(byKey.get(key).value) }));
  const derived = derive(fields);
  if (!derived) continue;
  for (const [key, field] of Object.entries(derived.fields)) if (isUpper(fields.find(item => item.key === key).value)) field.upper = true;
  result[item.id] = derived; fieldsBound += Object.keys(derived.fields).length;
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ templates: Object.keys(result).length, fields: fieldsBound }, null, 1));
