// Derive the photo album of each imported template so the owner uploads the album once instead of replacing
// photos one by one. Output: api/data/template-album-bindings.json (reviewed and committed).
//
// An album slot is a photo field (JPEG/WebP sample; PNG samples are frames and ornaments) that sits either
// - in the run of photos right after an album heading ("Album", "Gallery", "Khoảnh khắc"…) in card order, until
//   the next text other than a counter ("+3", "1 / 15"), which covers grids, sliders and hand-placed collages; or
// - in a slider track (swiper-wrapper, slick-track) of three or more photo slides without text.
// Ornaments, gift box pictures and backgrounds elsewhere on the card are often JPEG too, so photos are never
// collected from other containers.
// Slots that show the same sample photo (a slider and its thumbnails) show the same album photo, so each entry of
// `photos` lists the slots of one album position in card order. The number of positions is the album limit.
//
// Usage: node scripts/derive-album-bindings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(root, 'api/private/templates');
const output = path.join(root, 'api/data/template-album-bindings.json');
const heading = /^(?:album(?: ảnh| cưới| hình)?|gallery|photo ?album|our (?:album|gallery|moments|memories)|khoảnh khắc(?: hạnh phúc| của chúng (?:mình|tôi))?|kỷ niệm|wedding (?:album|gallery|photos))\b/iu;
const isPhoto = field => field?.type === 'image' && /\.(?:jpe?g|webp)$/i.test(String(field.value));
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value || '';
const keysOf = node => attr(node, 'data-ht-fields').split(' ').filter(Boolean);

const catalog = JSON.parse(fs.readFileSync(path.join(library, 'catalog.json'), 'utf8'));
const result = {};
let slots = 0, positions = 0;
for (const item of catalog) {
  const layout = JSON.parse(fs.readFileSync(path.join(library, 'layouts', `${item.id}.json`), 'utf8'));
  const fields = new Map(layout.fields.filter(field => !field.retired).map(field => [field.key, field]));
  const order = [...new Set([...layout.html.matchAll(/%%HT_(f\d+)%%/g)].map(match => match[1]))].filter(key => fields.has(key));
  const album = new Set();

  // Slider tracks.
  const parent = new Map(), photoCount = new Map(), textCount = new Map();
  const photoKey = new Map();
  (function walk(node) {
    for (const child of [...(node.childNodes || []), ...(node.content ? [node.content] : [])]) {
      parent.set(child, node);
      const keys = keysOf(child);
      const photo = keys.find(key => isPhoto(fields.get(key))), text = keys.some(key => fields.get(key)?.type === 'text');
      for (let at = child; at; at = parent.get(at)) {
        if (photo) photoCount.set(at, (photoCount.get(at) || 0) + 1);
        if (text) textCount.set(at, (textCount.get(at) || 0) + 1);
      }
      if (photo) photoKey.set(child, photo);
      walk(child);
    }
  })(parse(layout.html));
  for (const [node] of photoCount) {
    const children = (node.childNodes || []).filter(child => child.tagName);
    if (!/(?:^|s)(?:swiper-wrapper|slick-track)(?:s|$)/.test(attr(node, 'class'))) continue;
    const photoItems = children.filter(child => photoCount.get(child) === 1 && !textCount.get(child));
    if (photoItems.length < 3 || photoItems.length < children.length * 0.6) continue;
    for (const child of photoItems) {
      const queue = [child];
      while (queue.length) { const at = queue.shift(); if (photoKey.has(at)) album.add(photoKey.get(at)); queue.push(...(at.childNodes || []).filter(next => next.tagName)); }
    }
  }

  // Photo runs after an album heading.
  for (let at = 0; at < order.length; at++) {
    const field = fields.get(order[at]);
    if (field.type !== 'text' || !heading.test(String(field.value).trim())) continue;
    const run = [];
    for (let next = at + 1; next < order.length; next++) {
      const candidate = fields.get(order[next]);
      if (candidate.type === 'text' && !/^[+ds/.]*$/.test(String(candidate.value).trim())) break;
      if (isPhoto(candidate)) run.push(candidate.key);
    }
    if (run.length >= 3) run.forEach(key => album.add(key));
  }

  if (album.size < 3) continue;
  // One position per distinct sample photo, in card order.
  const byPhoto = new Map();
  for (const key of order) if (album.has(key)) {
    const sample = String(fields.get(key).value);
    if (!byPhoto.has(sample)) byPhoto.set(sample, []);
    byPhoto.get(sample).push(key);
  }
  if (byPhoto.size < 3) continue;
  result[item.id] = { photos: [...byPhoto.values()] };
  slots += album.size; positions += byPhoto.size;
}
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ templates: Object.keys(result).length, slots, positions }, null, 1));
