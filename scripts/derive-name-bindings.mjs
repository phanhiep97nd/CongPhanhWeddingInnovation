// Derive explicit couple-name bindings for imported templates from evidence inside each layout.
// Output: api/data/template-name-bindings.json, reviewed and committed; the renderer never infers roles at runtime.
//
// For each wedding template we identify the sample groom and bride names using labels in the card
// (Chú rể/Cô dâu, Nhà trai/Nhà gái, Trưởng nam/Út nữ, Groom/Bride, "Chú rể: X"), a name pair repeated on the card,
// or an "X & Y" pair. The orientation must agree with the names themselves: middle names Văn/Thị or a known given
// name. Cards without a confirmed orientation are skipped rather than guessed. Every text field that shows the
// sample names (alone, as a pair, as a full name, in a sentence or as initials) becomes a pattern with
// {groom}/{bride}/{groomFull}/{brideFull}/{groomInitial}/{brideInitial} tokens.
//
// Usage: node scripts/derive-name-bindings.mjs [--report]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-name-bindings.json');
const report = process.argv.includes('--report');

const norm = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
const lower = text => norm(text).toLocaleLowerCase('vi');
const upper = text => text.toLocaleUpperCase('vi');
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isUpper = text => /\p{L}/u.test(text) && text === upper(text);
const word = String.raw`\p{Lu}[\p{L}']*|\p{Lu}+`;
const nameShape = new RegExp(`^(?:${word})(?: (?:${word})){0,3}$`, 'u');

const stop = new Set(['ông bà', 'thân mời', 'mở thiệp', 'mẫu thiệp', 'thiệp của tôi', 'khách mời', 'album ảnh', 'đón khách', 'trưởng nam', 'út nữ', 'thứ nam', 'thứ nữ', 'trưởng nữ', 'út nam', 'chú rể', 'cô dâu', 'nhà trai', 'nhà gái', 'tại', 'vào lúc', 'lễ thành hôn', 'tiệc cưới', 'thiệp mời', 'lời ngỏ', 'ông', 'bà', 'bố', 'mẹ', 'hộp mừng cưới', 'mừng cưới', 'gửi quà mừng', 'xác nhận tham dự', 'hôn lễ', 'báo hỷ', 'song hỷ', 'vu quy', 'tân hôn', 'quý nữ', 'quý nam', 'ái nữ', 'tân lang', 'tân nương']);
const places = ['hà nội', 'hồ chí minh', 'đà nẵng', 'hải phòng', 'cần thơ', 'huế', 'nha trang', 'đà lạt', 'sài gòn', 'quận', 'phường', 'tp ', 'thành phố', 'tỉnh', 'huyện', 'xã ', 'hoàng mai', 'cầu giấy', 'ba đình', 'đống đa', 'thanh xuân', 'long biên', 'tây hồ', 'từ liêm', 'hà đông', 'bình thạnh', 'gò vấp', 'thủ đức', 'tam xuân', 'việt nam', 'plaza', 'palace', 'center', 'hotel', 'restaurant'];
const english = new Set('wedding invitation love our the save date day story forever happy monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december you me my and of to with in is are we us just married together family friends thank thanks welcome party celebration ceremony reception begins journey dear dearest sweet heart hearts couple bride groom mr mrs miss timeline album gallery bank mb vcb techcombank vietcombank bidv agribank acb tpbank vpbank sacombank momo'.split(' '));
// Last syllable of common given names; ambiguous names (Anh, Minh, Thanh, Tú…) are deliberately absent.
const female = new Set('ánh nhi linh lan hương hằng trang ngọc mai hoa thảo vy nhi hà yến duyên quyên my chi thư nga nhung hạnh phương uyên diệp trâm loan thúy thuỷ thủy trinh châu ly vân hiền huyền thu diệu nhàn hồng huệ liên tuyết xuân ngân oanh thơ trúc quỳnh hân hoài thắm vi mỹ nguyệt khuê ý'.split(' '));
const male = new Set('long tài bảo khánh nam hùng dũng tuấn hiếu huy phong sơn thành trí đức quân việt hải kiên thắng cường tùng lâm khoa nghĩa quang vinh hưng phúc lộc thịnh toàn tiến đạt khang khôi hoàng bình hòa hoà tín thiện trung hiển kiệt mạnh luân thiên đăng duy'.split(' '));
// Middle names Văn/Thị are strong evidence; otherwise the last syllable.
const gender = name => {
  const words = lower(name).split(' '), last = words.at(-1);
  if (words.slice(1, -1).includes('thị')) return 'f';
  if (words.slice(1, -1).includes('văn')) return 'm';
  return female.has(last) ? 'f' : male.has(last) ? 'm' : '';
};
// Person names only; a single syllable must itself be a known given name.
function nameLike(text) {
  const value = norm(text), low = lower(value), words = low.split(' ');
  if (value.length < 2 || value.length > 32 || !nameShape.test(value) || stop.has(low)) return false;
  if (places.some(place => low.includes(place)) || /^(?:thứ|chủ nhật|tháng|ngày|năm)(?: |$)/.test(low) || words.some(item => english.has(item))) return false;
  return words.length > 1 || Boolean(gender(value));
}
const groomLabel = /^(?:chú rể|groom|the groom|nhà trai|trưởng nam|thứ nam|út nam|con trai|quý nam|tân lang)$/i;
const brideLabel = /^(?:cô dâu|bride|the bride|nhà gái|trưởng nữ|thứ nữ|út nữ|con gái|ái nữ|quý nữ|tân nương)$/i;
const prefixed = /^(chú rể|cô dâu|groom|bride)\s*[:：]\s*(.+)$/i;
const separators = [' & ', ' và ', ' VÀ ', ' - ', ' – ', ' ♥ ', ' ❤ ', ' ♡ ', ' ＆ ', ' and ', ' AND ', '&'];

function textFields(layout) {
  const fields = new Map(layout.fields.filter(field => field.type === 'text' && !field.retired).map(field => [field.key, field]));
  const seen = new Set(), order = [];
  for (const match of layout.html.matchAll(/%%HT_(f\d+)%%/g)) if (fields.has(match[1]) && !seen.has(match[1])) { seen.add(match[1]); order.push(fields.get(match[1])); }
  return order.map(field => ({ key: field.key, raw: field.value, value: norm(field.value) }));
}
// A pair is two names around a separator; once the couple is known, parts related to it count as names too.
function splitPair(value, couple) {
  const known = part => couple && [couple.groom, couple.bride].some(name => related(norm(part), name));
  for (const sep of separators) {
    const parts = value.split(sep);
    if (parts.length === 2 && parts.every(part => nameLike(part) || known(part))) return { a: norm(parts[0]), b: norm(parts[1]), sep };
  }
  return null;
}
const same = (a, b) => lower(a) === lower(b);
// A short name may appear inside a full name ("Lê Hoàng Long") or the other way round.
const related = (short, other) => same(short, other) || lower(other).endsWith(' ' + lower(short)) || lower(short).endsWith(' ' + lower(other));

function candidate(fields) {
  const votes = { groom: new Map(), bride: new Map() };
  const vote = (role, name, weight) => { if (!nameLike(name)) return; const key = norm(name); votes[role].set(key, (votes[role].get(key) || 0) + weight); };
  fields.forEach((field, index) => {
    const pre = field.value.match(prefixed);
    if (pre) vote(/chú rể|groom/i.test(pre[1]) ? 'groom' : 'bride', pre[2], 5);
    const role = groomLabel.test(field.value) ? 'groom' : brideLabel.test(field.value) ? 'bride' : '';
    if (!role) return;
    for (const offset of [1, -1, 2, -2]) {
      const near = fields[index + offset];
      if (near && nameLike(near.value)) { vote(role, near.value, 3 - Math.min(Math.abs(offset), 2)); break; }
    }
  });
  const pairs = fields.map(field => splitPair(field.value)).filter(Boolean);
  const top = role => [...votes[role]].sort((x, y) => y[1] - x[1])[0]?.[0];
  const groom = top('groom'), bride = top('bride');
  for (const pair of pairs) {
    if (groom && related(pair.a, groom) || bride && related(pair.b, bride)) return { groom: pair.a, bride: pair.b, basis: 'label' };
    if (groom && related(pair.b, groom) || bride && related(pair.a, bride)) return { groom: pair.b, bride: pair.a, basis: 'label' };
  }
  if (groom && bride && !same(groom, bride)) return { groom, bride, basis: 'label' };
  // Two names shown side by side and repeated later (Chung Đôi envelopes and headers).
  for (let index = 0; index + 1 < fields.length; index++) {
    const [a, b] = [fields[index].value, fields[index + 1].value];
    if (!nameLike(a) || !nameLike(b) || same(a, b)) continue;
    if (fields.some((field, at) => at > index + 1 && same(field.value, a) && fields[at + 1] && same(fields[at + 1].value, b))) return { groom: a, bride: b, basis: 'repeated-pair' };
  }
  if (pairs[0]) return { groom: pairs[0].a, bride: pairs[0].b, basis: 'pair' };
  return null;
}
// Accept an orientation only when the names agree with it; swap when they clearly say the opposite.
function sampleCouple(fields) {
  const found = candidate(fields);
  if (!found) return null;
  let { groom, bride, basis } = found;
  const [g, b] = [gender(groom), gender(bride)];
  if (g === 'f' || b === 'm') { if (g === 'm' || b === 'f') return null; [groom, bride] = [bride, groom]; }
  const confirmed = gender(groom) === 'm' || gender(bride) === 'f';
  if (!confirmed) return null;
  return { groom, bride, basis };
}

function bindings(fields, couple) {
  const out = {};
  const { groom, bride } = couple;
  // Full names shown on the card ("Phạm Quỳnh Anh"), so sentences replace them before the short names.
  const fullNames = fields.filter(field => nameLike(field.value)).flatMap(field => [[groom, 'groom'], [bride, 'bride']].filter(([name]) => field.value.split(' ').length > name.split(' ').length && lower(field.value).endsWith(' ' + lower(name))).map(([, role]) => [field.value, role + 'Full']));
  const short = [[groom, 'groom'], [bride, 'bride']];
  const initialsOf = name => [norm(name)[0], norm(name).split(' ').at(-1)[0]].map(upper);
  const shape = (value, pattern, extra = {}) => ({ pattern, ...(isUpper(value) ? { upper: true } : {}), ...extra });
  // The full name only when the card shows more than the short sample name ("Lê Hoàng Long" vs "Hoàng Long").
  const token = (shown, name, role) => `{${norm(shown).split(' ').length > norm(name).split(' ').length ? role + 'Full' : role}}`;
  fields.forEach((field, index) => {
    const value = field.value;
    for (const [name, role] of short) if (same(value, name)) { out[field.key] = shape(value, `{${role}}`); return; }
    const pair = splitPair(value, couple);
    if (pair) {
      if (related(pair.a, groom) && related(pair.b, bride)) { out[field.key] = shape(value, `${token(pair.a, groom, 'groom')}${pair.sep}${token(pair.b, bride, 'bride')}`); return; }
      if (related(pair.a, bride) && related(pair.b, groom)) { out[field.key] = shape(value, `${token(pair.a, bride, 'bride')}${pair.sep}${token(pair.b, groom, 'groom')}`); return; }
    }
    const pre = value.match(prefixed);
    if (pre) {
      const role = /chú rể|groom/i.test(pre[1]) ? 'groom' : 'bride', name = role === 'groom' ? groom : bride;
      if (related(pre[2], name)) { out[field.key] = shape(value, value.slice(0, value.length - pre[2].length) + token(pre[2], name, role)); return; }
    }
    for (const [name, role] of short) if (nameLike(value) && value.split(' ').length > name.split(' ').length && lower(value).endsWith(' ' + lower(name))) { out[field.key] = shape(value, `{${role}Full}`); return; }
    // Initials: one letter matching exactly one partner, next to another single-letter field.
    if (/^\p{L}$/u.test(value)) {
      const letter = upper(value);
      const roles = short.filter(([name]) => initialsOf(name).includes(letter));
      const near = fields.slice(Math.max(0, index - 3), index + 4).some(other => other !== field && /^\p{L}$/u.test(other.value));
      if (roles.length === 1 && near) { const [name, role] = roles[0]; out[field.key] = { pattern: `{${role}Initial}`, upper: true, initial: initialsOf(name)[0] === letter ? 'first' : 'last' }; return; }
    }
    // Sentences that name the couple; only multi-syllable names, matched as whole words.
    if (value.length > 12 && short.every(([name]) => name.includes(' '))) {
      let pattern = value, replaced = false;
      for (const [name, role] of [...fullNames, ...short]) {
        const re = new RegExp(`(?<!\\p{L})${escapeRegExp(name)}(?!\\p{L})`, 'giu');
        if (re.test(pattern)) { pattern = pattern.replace(re, () => `{${role}}`); replaced = true; }
      }
      if (replaced) out[field.key] = { pattern };
    }
  });
  return out;
}

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
// Our Love Begins keeps its hand-verified bindings in api/lib/templateContent.js.
const handBound = new Set(['tpl-07109f7b5da0fc5f']);
const result = {}, skipped = [];
const stats = { weddingTemplates: 0, bound: 0, fields: 0, byBasis: {} };
for (const item of catalog) {
  if (item.category !== 'wedding' || handBound.has(item.id)) continue;
  stats.weddingTemplates++;
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const fields = textFields(layout);
  const couple = sampleCouple(fields);
  if (!couple) { skipped.push(`${item.id} ${item.name}`); continue; }
  const bound = bindings(fields, couple);
  if (!Object.keys(bound).length) { skipped.push(`${item.id} ${item.name} (no fields)`); continue; }
  result[item.id] = { sample: couple, fields: bound };
  stats.bound++; stats.fields += Object.keys(bound).length; stats.byBasis[couple.basis] = (stats.byBasis[couple.basis] || 0) + 1;
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ ...stats, skipped: skipped.length }, null, 1));
if (report) console.log(skipped.join('\n'));
