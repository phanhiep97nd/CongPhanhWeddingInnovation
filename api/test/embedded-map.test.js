import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const library = require('../lib/templateLibrary');
const { JSDOM, VirtualConsole } = require('jsdom');
process.env.JWT_SECRET = 'embedded-map-test';
function render(mapUrl, id = 'tpl-07109f7b5da0fc5f', editing = false) {
  const html = library.render(library.selection({ templateId: id, values: {}, opening: false, motion: false }), { editing, wedding: { venue: { name: 'Hồ Hoàn Kiếm', address: 'Hà Nội', mapUrl } } });
  return new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
}
describe('maps inside imported invitation layouts', () => {
  it.each(['tpl-07109f7b5da0fc5f', 'tpl-e0ead20053787a9c'])('replaces the original map link at its reserved position in %s', id => {
    const url = 'https://www.google.com/maps/embed?pb=unchanged';
    const dom = render(url, id);
    try {
      const document = dom.window.document;
      const map = document.querySelector('.simple-map-container [data-ht-map] iframe');
      expect(map).not.toBeNull();
      expect(map.getAttribute('src')).toBe(url);
      expect(map.title).toBe('Bản đồ địa điểm tổ chức');
      expect(map.closest('.simple-map-container').querySelector('.offline-embed')).toBeNull();
      expect(document.querySelectorAll('[data-ht-map]')).toHaveLength(1);
      expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain('https://www.google.com/maps/');
    } finally { dom.window.close(); }
  });
  it('lets taps select the map in the editor while keeping the public map interactive', () => {
    for (const editing of [true, false]) {
      const dom = render('https://www.google.com/maps/embed?pb=unchanged', undefined, editing);
      try {
        const map = dom.window.document.querySelector('[data-ht-map] iframe');
        expect(map.style.pointerEvents).toBe(editing ? 'none' : 'auto');
        expect(map.parentElement.getAttribute('data-ht-fields')).toBe('f103');
      } finally { dom.window.close(); }
    }
  });
  it('keeps ordinary links navigable and does not allow arbitrary iframe hosts', () => {
    for (const url of ['https://maps.app.goo.gl/example', 'https://www.google.com.evil.example/maps/embed', 'javascript:alert(1)', '']) {
      const dom = render(url);
      try {
        expect(dom.window.document.querySelector('[data-ht-map]')).toBeNull();
        expect(dom.window.document.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain("frame-src 'none'");
        if (url === 'https://maps.app.goo.gl/example') expect(dom.window.document.querySelector('[data-ht-fields~="f103"]').getAttribute('data-ht-href')).toBe(url);
      } finally { dom.window.close(); }
    }
  });
});
