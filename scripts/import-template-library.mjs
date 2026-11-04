// Compile captured DOM into private, inert layouts with explicit editable slots.
// No original application JavaScript, Flight data or remote form endpoints are shipped.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse, serialize } from 'parse5';
import sharp from 'sharp';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || path.join(project, '..'));
const output = path.join(project, 'api/private/templates');
await fs.mkdir(path.join(output, 'assets'), { recursive: true });
await fs.mkdir(path.join(output, 'layouts'), { recursive: true });
await fs.mkdir(path.join(project, 'public/template-thumbnails'), { recursive: true });
const catalog = JSON.parse(await fs.readFile(path.join(source, 'catalog.json'), 'utf8'));
const coverManifest = await fs.readFile(path.join(output, 'covers/manifest.json'), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return {}; throw error; });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const renderingCodeSha256 = digest(await fs.readFile(path.join(project, 'api/lib/templateLibrary.js')));
const imported = new Map();
const dependencies = new Map();
const missing = new Set();
const allowed = new Set(['.css', '.png', '.jpg', '.jpeg', '.jfif', '.webp', '.gif', '.avif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm']);
function localPath(value, base) {
  if (!value || /^(?:https?:|data:|blob:|#|javascript:|\/\/)/i.test(value)) return null;
  const clean = decodeURIComponent(value.split(/[?#]/)[0]);
  const resolved = path.resolve(path.dirname(base), clean);
  return resolved.startsWith(source + path.sep) ? resolved : null;
}
async function asset(value, base, used) {
  if (value.startsWith('data:') || value.startsWith('#')) return value;
  const file = localPath(value, base);
  if (!file || !allowed.has(path.extname(file).toLowerCase())) { missing.add(value); return ''; }
  if (!imported.has(file)) {
    let data;
    try { data = await fs.readFile(file); } catch { missing.add(file); return ''; }
    const extension = path.extname(file).toLowerCase();
    const name = digest(data).slice(0, 32) + extension;
    imported.set(file, name);
    const nested = new Set();
    if (extension === '.css') data = Buffer.from(await css(data.toString(), file, nested));
    dependencies.set(name, nested);
    await fs.writeFile(path.join(output, 'assets', name), data);
  }
  const name = imported.get(file);
  used.add(name);
  for (const dependency of dependencies.get(name) || []) used.add(dependency);
  return name;
}
async function css(text, base, used) {
  const matches = [...text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)];
  for (const match of matches) {
    const target = await asset(match[2], base, used);
    text = text.replace(match[0], `url("${target || 'data:,'}")`);
  }
  return text.replace(/@import\s+(?:url\([^)]*\)|['"][^'"]*['"])[^;]*;/gi, '').replace(/\/\*[#@]\s*sourceMappingURL=.*?\*\//g, '');
}
const attr = (node, name) => node?.attrs?.find(a => a.name === name)?.value || '';
function set(node, name, value) { const a = node.attrs.find(a => a.name === name); if (a) a.value = value; else node.attrs.push({ name, value }); }
function* walk(node) { yield node; for (const child of node.childNodes || []) yield* walk(child); }
function remove(node) { const list = node.parentNode?.childNodes; if (list) list.splice(list.indexOf(node), 1); }
const textOf = node => [...walk(node)].filter(n => n.nodeName === '#text').map(n => n.value).join(' ').trim();
const hasClass = (node, name) => attr(node, 'class').split(/\s+/).includes(name);
function removedChromeNodes(doc) {
  const nodes = new Set();
  for (const node of walk(doc)) {
    if (hasClass(node, 'watermark') || hasClass(node, 'phone-container-footer')) nodes.add(node);
    if (attr(node, 'id') === 'cinelove-toolbar' || hasClass(node, 'toolbar-toggle-button') || hasClass(node, 'toolbar-toggle-pill')) nodes.add(node);
    if (['invite-preview-bottom-bar', 'invite-preview-attendance', 'template-preview-mobile-header', 'phone-container-chrome'].some(name => hasClass(node, name))) nodes.add(node);
    if (node.tagName !== 'a') continue;
    let url;
    try { url = new URL(attr(node, 'href')); } catch { continue; }
    const provider = ['cinelove.me', 'chungdoi.com', 'm-invite.com'].includes(url.hostname.replace(/^www\./, ''));
    const logo = [...walk(node)].some(child => ['img', 'svg'].includes(child.tagName) && /logo|brand/i.test(['alt', 'src', 'class', 'aria-label'].map(key => attr(child, key)).join(' ')));
    if ((provider && /^\/(?:vi\/?)?$/.test(url.pathname)) || logo) nodes.add(node);
  }
  return nodes;
}
const categories = title => /sinh nh[aậ]t|birthday/i.test(title) ? 'birthday' : /t[aâ]n gia|housewarming/i.test(title) ? 'housewarming' : /k[yỷ] y[eế]u|t[oố]t nghi[eệ]p|graduation/i.test(title) ? 'graduation' : /s[uự] ki[eệ]n|khai tr[uươ]ng|event|party|h[oộ]i ngh[iị]/i.test(title) ? 'event' : 'wedding';
const displayTitle = title => title.replace(/\s*[|–—-]\s*(?:m[-\s]?invite(?:\.com)?|cinelove(?:\.me)?|chung\s*đôi|chungdoi(?:\.com)?)\s*$/i, '').trim();
const manifests = [];
for (const [index, entry] of catalog.entries()) {
  const id = `tpl-${digest(entry.host + '/' + entry.slug).slice(0, 16)}`;
  const file = path.join(source, entry.preview);
  const used = new Set(), fields = [], scripts = [];
  const addField = (node, type, value, context) => {
    const key = `f${fields.length}`;
    fields.push({ key, type, label: type === 'text' ? value.slice(0, 85) : `${context === 'css-url' ? 'Ảnh nền' : 'Ảnh'} ${fields.filter(f => f.type === 'image').length + 1}`, value, ...(context ? { context } : {}) });
    set(node, 'data-ht-fields', [attr(node, 'data-ht-fields'), key].filter(Boolean).join(' '));
    return `%%HT_${key}%%`;
  };
  const doc = parse(await fs.readFile(file, 'utf8'));
  const typewriterWidgets = [];
  if (entry.host === 'm-invite.com') {
    const design = JSON.parse(await fs.readFile(path.join(source, entry.host, 'source/designs', entry.slug + '.json'), 'utf8'));
    const byId = new Map([...walk(doc)].filter(node => hasClass(node, 'widget-wrapper')).map(node => [attr(node, 'id'), node]));
    for (const widget of design.widgets || []) {
      if (widget.type !== 'text' || widget.style?.textEffect !== 'typewriter' || typeof widget.content !== 'string') continue;
      const node = byId.get(widget.id);
      const content = node && [...walk(node)].find(child => attr(child, 'contenteditable') === 'false');
      if (content) typewriterWidgets.push({ node: content, value: widget.content });
    }
  }
  // Merge the saved envelope with its opened page, avoiding nested frames.
  if (entry.host === 'chungdoi.com') {
    for (const n of [...walk(doc)]) if (attr(n, 'id') === 'offline-envelope-stage') remove(n);
    const coverPath = path.join(source, entry.host, 'rendered', entry.slug + '.html');
    const cover = parse(await fs.readFile(coverPath, 'utf8'));
    const head = [...walk(doc)].find(n => n.tagName === 'head');
    const body = [...walk(doc)].find(n => n.tagName === 'body');
    for (const n of [...walk(cover)]) if (n.tagName === 'style') { head.childNodes.push(n); n.parentNode = head; }
    const envelope = [...walk(cover)].find(n => attr(n, 'data-landing-screenshot-id') === 'invite-envelope');
    if (envelope) {
      set(envelope, 'id', 'ht-envelope');
      set(envelope, 'style', attr(envelope, 'style') + ';position:fixed;inset:0;z-index:2147483000;overflow:auto');
      body.childNodes.unshift(envelope); envelope.parentNode = body;
    }
    const script = [...walk(cover)].find(n => attr(n, 'id') === 'offline-chungdoi-cover-script');
    if (script) scripts.push(textOf(script).replace(/const embedded=.*?;/, 'const embedded=false;').replace(/if\(embedded&&window.parent!==window\)[\s\S]*?else location.href=[^;]+;/, "document.querySelector('#ht-envelope')?.remove();"));
  }
  const removedChrome = removedChromeNodes(doc);
  for (const node of [...walk(doc)]) {
    if (!node.tagName) continue;
    const tag = node.tagName;
    if (tag === 'script') {
      if (['offline-cinelove-fit-script', 'offline-minvite-motion'].includes(attr(node, 'id'))) scripts.push(textOf(node));
      remove(node); continue;
    }
    if (['iframe', 'object', 'embed', 'base', 'noscript', 'meta', 'title'].includes(tag) || attr(node, 'class').includes('offline-preview-nav')) { remove(node); continue; }
    node.attrs = (node.attrs || []).filter(a => !a.name.startsWith('on') && !['srcdoc', 'srcset', 'integrity', 'crossorigin', 'action', 'formaction', 'contenteditable'].includes(a.name));
    if (tag === 'link' && attr(node, 'rel') !== 'stylesheet') { remove(node); continue; }
    if (tag === 'a') {
      const opening = attr(node, 'href') === '?open=1';
      set(node, 'href', opening ? '?open=1' : '#');
      node.attrs = node.attrs.filter(a => !['target', 'download', 'ping'].includes(a.name));
    }
    if (tag === 'form') { node.tagName = 'div'; node.nodeName = 'div'; set(node, 'data-ht-rsvp', 'true'); }
    // SVG <image href> is an asset reference too. Keep it out of slot allocation
    // so recovering these photos does not shift existing saved field keys.
    for (const name of ['src', 'poster', ...(['link', 'image'].includes(tag) ? ['href'] : [])]) {
      const original = attr(node, name);
      if (!original) continue;
      const local = await asset(original, file, used);
      const value = local ? (local.startsWith('data:') ? local : `%%HT_ASSETS%%${local}`) : 'data:,';
      set(node, name, tag === 'img' && name === 'src' ? addField(node, 'image', value) : value);
    }
    if (attr(node, 'style')) {
      let style = await css(attr(node, 'style'), file, used);
      style = style.replace(/url\("([a-f0-9]{32}\.[^"]+)"\)/g, (_, name) => `url("${addField(node, 'image', '%%HT_ASSETS%%' + name, 'css-url')}")`);
      set(node, 'style', style);
    }
    if (tag === 'style') {
      const content = await css(textOf(node), file, used);
      node.childNodes = [{ nodeName: '#text', value: content.replace(/url\("([a-f0-9]{32}\.[^"]+)"\)/g, 'url("%%HT_ASSETS%%$1")'), parentNode: node }];
    }
  }
  for (const node of [...walk(doc)]) {
    if (node.nodeName !== '#text' || !node.value.trim() || !/[\p{L}\p{N}]/u.test(node.value)) continue;
    const parent = node.parentNode;
    if (!parent?.tagName || ['style', 'script', 'svg', 'path', 'option', 'button'].includes(parent.tagName)) continue;
    if (attr(parent, 'href') === '?open=1') continue;
    node.value = addField(parent, 'text', node.value);
  }
  // A snapshot can stop midway through typing. Recover the default from its matching
  // design widget after allocating historical slots, without shifting saved edits.
  const restoredTextFields = [];
  for (const widget of typewriterWidgets) {
    const slots = [...walk(widget.node)].filter(node => node.nodeName === '#text' && /^%%HT_f\d+%%$/.test(node.value));
    if (slots.length >= 1) {
      const key = slots[0].value.slice(5, -2), field = fields.find(field => field.key === key);
      if (field && field.value !== widget.value) { field.value = widget.value; field.label = widget.value.slice(0, 85); restoredTextFields.push(key); }
      // Typewriter captures split visible text and an invisible remainder/caret.
      for (const slot of slots.slice(1)) { const field = fields.find(field => field.key === slot.value.slice(5, -2)); if (field) field.retired = true; }
      widget.node.childNodes = [{ nodeName: '#text', value: slots[0].value, parentNode: widget.node }];
      set(widget.node, 'data-ht-fields', key);
    } else if (!slots.length && widget.value.trim()) {
      const value = addField(widget.node, 'text', widget.value);
      widget.node.childNodes = [{ nodeName: '#text', value, parentNode: widget.node }];
      restoredTextFields.push(value.slice(5, -2));
    }
  }
  // Allocate slots before removing provider chrome so saved field keys never shift.
  const retired = new Set();
  for (const node of removedChrome) {
    for (const child of walk(node)) for (const key of attr(child, 'data-ht-fields').split(' ')) if (key) retired.add(key);
    if (node.parentNode?.childNodes.includes(node)) remove(node);
  }
  for (const field of fields) if (retired.has(field.key)) field.retired = true;
  // The captured blessing box is owned by the shared display, not the content editor.
  // Keep its DOM for reuse and retain historical slots for already-saved invitations.
  for (const node of walk(doc)) if (attr(node, 'id') === 'blessing-box') {
    for (const child of walk(node)) {
      for (const key of attr(child, 'data-ht-fields').split(' ')) {
        const field = fields.find(field => field.key === key);
        if (field) field.retired = true;
      }
      if (child.attrs) child.attrs = child.attrs.filter(attribute => attribute.name !== 'data-ht-fields');
    }
  }
  // Captured loading masks are siblings of the actual canvas, not design content.
  for (const node of [...walk(doc)]) if (hasClass(node.parentNode, 'styles_customScroll__X5r6w') && ['absolute', 'inset-0', 'bg-white', 'z-50'].every(name => hasClass(node, name)) && ![...walk(node)].some(child => attr(child, 'data-node-id'))) remove(node);
  const thumbnail = `/template-thumbnails/${id}.webp`;
  const snapshotSha256 = digest(await fs.readFile(file));
  const compiledHtml = serialize(doc);
  const layoutSignature = digest(JSON.stringify({ html: compiledHtml, fields, scripts, renderingCodeSha256 }));
  const cover = coverManifest[id];
  const validCover = cover?.layoutSignature === layoutSignature;
  if (validCover || entry.host === 'm-invite.com') {
    // Reuse content screenshots for every provider; never restore M-Invite marketing covers.
    if (validCover) await fs.copyFile(path.join(output, 'covers', `${id}.webp`), path.join(project, 'public', thumbnail));
    else await sharp({ create: { width: 480, height: 640, channels: 3, background: '#f8f1ed' } }).webp().toFile(path.join(project, 'public', thumbnail));
  } else await sharp(path.join(source, entry.thumbnail), { failOn: 'none' }).resize({ width: 480, height: 640, fit: 'cover', position: 'top', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(project, 'public', thumbnail));
  const item = { id, name: displayTitle(entry.title), category: categories(entry.title + ' ' + entry.slug), thumbnail: validCover ? `${thumbnail}?v=${cover.sha256.slice(0, 12)}` : thumbnail, fieldCount: fields.filter(field => !field.retired).length };
  const definition = { ...item, fields, html: compiledHtml, scripts, assets: [...used], provenance: { source: entry.source, title: entry.title, snapshot: entry.preview, sha256: snapshotSha256, layoutSignature, restoredTextFields, importedAt: new Date().toISOString() } };
  await fs.writeFile(path.join(output, 'layouts', id + '.json'), JSON.stringify(definition));
  manifests.push(item);
  if (index % 30 === 0) console.log(`Imported ${index + 1}/${catalog.length}`);
}
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify(manifests, null, 2));
await fs.writeFile(path.join(output, 'import-report.json'), JSON.stringify({ count: manifests.length, assets: imported.size, missing: [...missing] }, null, 2));
console.log(JSON.stringify({ count: manifests.length, assets: imported.size, unresolved: missing.size }));
