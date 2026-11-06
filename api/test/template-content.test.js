import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized } from './helpers/db';
useDatabase();
const templateId = 'tpl-07109f7b5da0fc5f';
const content = {
  couple: { groom: 'Hoàng Nam', bride: 'Minh Anh', groomFull: 'Nguyễn Hoàng Nam', brideFull: 'Trần Minh Anh' },
  eventDate: '2028-02-29', eventTime: '17:45', dateText: 'Thứ Ba, ngày 29 tháng 02 năm 2028',
  venue: { name: 'Trung tâm tiệc cưới Hoa Sen', address: '123 Nguyễn Trãi, Hà Nội', mapUrl: 'https://maps.google.com/?q=123+Nguyen+Trai+Ha+Noi' }
};
describe('couple names in library templates', () => {
  const { createRequire } = require('node:module');
  const load = createRequire(import.meta.url);
  const library = load('../lib/templateLibrary');
  const bindings = load('../data/template-name-bindings.json');
  it('fills bound name fields, pairs and initials from the couple entered when creating the card', async () => {
    const id = 'tpl-93ad6c177a67608d';
    const owner = await register();
    const wedding = (await createWedding(owner.token, { couple: { groom: 'Minh', bride: 'An', groomFull: 'Phan Văn Minh', brideFull: 'Lê Thị An' }, importedTemplate: { templateId: id, values: {}, opening: false, motion: false } })).body;
    const preview = await request(app).post(`/weddings/${wedding.id}/template-preview`).set(authorized(owner.token)).send({ templateId: id, values: {}, opening: false, motion: false });
    const bound = Object.entries(bindings[id].fields);
    const byPattern = pattern => bound.filter(([, field]) => field.pattern === pattern).map(([key]) => preview.body.boundValues[key]);
    expect(byPattern('{groom} VÀ {bride}')).toEqual(['MINH VÀ AN']);
    expect(byPattern('{groomInitial}')).toEqual(['M']);
    expect(byPattern('{brideInitial}')).toEqual(['A']);
    const fields = (await request(app).get(`/templates/${id}/fields`).set(authorized(owner.token))).body;
    expect(fields.find(field => field.key === bound[0][0]).binding).toEqual({ source: 'names', label: 'Tên cô dâu và chú rể' });
    const html = (await request(app).get(`/public/weddings/${wedding.slug}/template-render`)).body.html;
    expect(html).toContain('MINH VÀ AN');
    expect(html).not.toContain('THANH VÀ DUYÊN');
  });
  it('keeps sample names until both partners are named and orients every binding by evidence', () => {
    const id = 'tpl-93ad6c177a67608d';
    expect(library.boundValues(id, { invitationKind: 'wedding', couple: { groom: 'Minh', bride: '' } })).toEqual({});
    for (const entry of Object.values(bindings)) {
      expect(['label', 'pair', 'repeated-pair']).toContain(entry.sample.basis);
      for (const field of Object.values(entry.fields)) expect(field.pattern).toMatch(/\{(?:groom|bride)(?:Full|Initial)?\}/);
    }
  });
  it('rebuilds the calendar for the wedding month and moves the highlighted day', () => {
    const { JSDOM, VirtualConsole } = load('jsdom');
    const id = 'tpl-e0ead20053787a9c';
    const calendar = load('../data/template-calendar-bindings.json')[id][0];
    const wedding = { invitationKind: 'wedding', eventDate: '2027-02-14', couple: { groom: 'Minh', bride: 'An' } };
    expect(library.boundValues(id, wedding)[calendar.labels[0].key]).toBe('Tháng 2');
    const html = library.render(library.selection({ templateId: id, values: {}, opening: false, motion: false }), { wedding });
    const { document } = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() }).window;
    const first = document.querySelector(`[data-ht-fields~="${calendar.days[0]}"]`);
    let grid = first; while (grid && !grid.parentElement.contains(document.querySelector(`[data-ht-fields~="${calendar.days[1]}"]`))) grid = grid.parentElement;
    const cells = [...grid.parentElement.children];
    // February 2027 starts on a Monday and has 28 days; the heart moves from the 15th to the 14th.
    expect(cells.map(cell => cell.textContent.trim())).toEqual(Array.from({ length: 28 }, (_, index) => String(index + 1)));
    expect(cells.find(cell => cell.querySelector('.heart-date')).textContent.trim()).toBe('14');
    expect(library.render(library.selection({ templateId: id, values: {} }), { wedding: { ...wedding, eventDate: null } })).not.toContain('"calendars"');
  }, 30000);
  it('keeps date text in step with the wedding date, including weekday, time and lunar date, until it is edited', () => {
    const id = 'tpl-e0ead20053787a9c';
    const fields = load('../data/template-date-bindings.json')[id].fields;
    const keyOf = pattern => Object.keys(fields).find(key => fields[key].pattern === pattern);
    const wedding = { invitationKind: 'wedding', eventDate: '2027-02-14', eventTime: '17:45', couple: { groom: 'Minh', bride: 'An' } };
    const soft = library.softValues(id, wedding);
    expect(soft[keyOf('Vào lúc {time} {wd:vi:L}')]).toBe('Vào lúc 17:45 chủ nhật');
    // Tết Đinh Mùi falls on 6 February 2027, so 14 February is the 9th day of the first lunar month.
    expect(soft[keyOf('(Tức ngày {ld} tháng {lm} năm {lyear:T})')]).toBe('(Tức ngày 9 tháng 1 năm Đinh Mùi)');
    expect(soft[keyOf('NĂM {yyyy}')]).toBe('NĂM 2027');
    const year = keyOf('NĂM {yyyy}');
    expect(library.render(library.selection({ templateId: id, values: {} }), { wedding })).toContain('"date":"14/02/2027"');
    expect(library.render(library.selection({ templateId: id, values: { [year]: 'Năm đẹp nhất' } }), { wedding })).toContain('Năm đẹp nhất');
    expect(library.softValues(id, { ...wedding, eventDate: null })).toEqual({});
  });
  it('plays the owner music on premium cards and points map buttons at the venue map link', () => {
    const id = 'tpl-e0ead20053787a9c';
    const wedding = { invitationKind: 'wedding', plan: 'premium', musicUrl: 'https://cdn.example.test/song.mp3', venue: { name: '', address: '', mapUrl: 'https://maps.google.com/?q=Hoa+Sen' }, couple: { groom: 'Minh', bride: 'An' } };
    const html = library.render(library.selection({ templateId: id, values: {} }), { wedding });
    expect(html).toContain('const music="https://cdn.example.test/song.mp3"');
    const maps = load('../data/template-venue-bindings.json')[id].map;
    expect(html).toContain(`"maps":${JSON.stringify(maps)}`);
    expect(library.render(library.selection({ templateId: id, values: {} }), { wedding: { ...wedding, plan: 'free' } })).toContain('const music=""');
    expect(library.render(library.selection({ templateId: id, values: {} }), { wedding: { ...wedding, venue: { mapUrl: 'javascript:alert(1)' } } })).not.toContain('"maps"');
  });
  it('shares library cards with the couple photo placed on the card, then the template cover', () => {
    const { buildMeta } = load('../lib/meta');
    const id = 'tpl-e0ead20053787a9c';
    const photo = library.definition(id).fields.find(field => field.type === 'image' && !field.retired);
    const base = { slug: 'minh-an', couple: { groom: 'Minh', bride: 'An' }, venue: {}, meta: {}, importedTemplate: { templateId: id, values: {} } };
    expect(buildMeta(base).image).toMatch(new RegExp(`^/template-thumbnails/${id}\\.webp`));
    expect(buildMeta(base).url).toBe(`${process.env.SITE_ORIGIN || 'https://hythiep.net'}/w/minh-an`);
    expect(buildMeta({ ...base, importedTemplate: { templateId: id, values: { [photo.key]: 'https://cdn.example.test/couple.jpg' } } }).image).toBe('https://cdn.example.test/couple.jpg');
    expect(buildMeta({ ...base, ogImage: 'https://cdn.example.test/share.jpg', importedTemplate: { templateId: id, values: { [photo.key]: 'https://cdn.example.test/couple.jpg' } } }).image).toBe('https://cdn.example.test/share.jpg');
    expect(buildMeta({ ...base, importedTemplate: null }).image).toBe('/brand/og-default.png');
  });
  it('serves link-preview bots a page with the card title, guest and absolute photo', async () => {
    const owner = await register();
    const id = 'tpl-e0ead20053787a9c';
    const wedding = (await createWedding(owner.token, { published: true, couple: { groom: 'Minh', bride: 'An' }, importedTemplate: { templateId: id, values: {}, opening: true, motion: true } })).body;
    const guest = (await request(app).post(`/weddings/${wedding.id}/guests`).set(authorized(owner.token)).send({ invitationName: 'Bác <Nam>' })).body;
    const page = await request(app).get(`/public/weddings/${wedding.slug}/share?g=${guest.code}`);
    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.text).toContain('property="og:title" content="Gửi Bác &lt;Nam&gt; · Thiệp cưới Minh &amp; An"');
    expect(page.text).toMatch(new RegExp(`property="og:image" content="https?://[^"]+/template-thumbnails/${id}\\.webp`));
    expect(page.text).toContain(`/w/${wedding.slug}/${guest.code}"`);
    expect((await request(app).get('/public/weddings/khong-co-thiep/share')).status).toBe(404);
  });
  it('stores owner wording for the shared envelope and rejects unknown parts', async () => {
    const id = 'tpl-e0ead20053787a9c';
    expect(library.selection({ templateId: id, values: {}, envelope: { kicker: 'Thân mời', to: '  ' } }).envelope).toEqual({ kicker: 'Thân mời' });
    expect(() => library.selection({ templateId: id, values: {}, envelope: { script: 'x' } })).toThrow();
    expect(library.render(library.selection({ templateId: id, values: {}, envelope: { button: 'Mở <ngay>' } }))).toContain('"button":"Mở \\u003cngay>"');
    expect(library.openingKind(id)).toBe('shared');
  });
});
describe('Our Love Begins information binding', () => {
  it('renders unsaved information in preview without publishing it, then uses saved information publicly', async () => {
    const owner = await register();
    const selected = { templateId, values: { f33: 'Tên mẫu cũ', f101: 'Địa điểm cũ', f45: 'Lời mời riêng' }, opening: false, motion: false };
    const wedding = (await createWedding(owner.token, { importedTemplate: selected, couple: { groom: 'Tên đang lưu', bride: 'Tên đang lưu khác' } })).body;
    const preview = await request(app).post(`/weddings/${wedding.id}/template-preview`).set(authorized(owner.token)).send({ ...selected, content });
    expect(preview.status).toBe(200);
    expect(preview.body.boundValues).toMatchObject({ f33: 'Nguyễn Hoàng Nam  &  Trần Minh Anh', f57: '17:45, Thứ ba', f58: '29.02.2028', f59: '29.02.2028', f60: content.dateText, f101: content.venue.name, f102: content.venue.address });
    expect(preview.body.html).toContain('Nguyễn Hoàng Nam  &amp;  Trần Minh Anh');
    expect(preview.body.html).toContain('Lời mời riêng');
    const before = await request(app).get(`/public/weddings/${wedding.slug}/template-render`);
    expect(before.body.html).toContain('Tên đang lưu');
    expect(before.body.html).not.toContain('Nguyễn Hoàng Nam');
    const saved = await request(app).put(`/weddings/${wedding.id}`).set(authorized(owner.token)).send(content);
    expect(saved.status).toBe(200);
    const after = await request(app).get(`/public/weddings/${wedding.slug}/template-render`);
    for (const value of ['Nguyễn Hoàng Nam  &amp;  Trần Minh Anh', content.venue.name, content.venue.address, '29.02.2028', '17:45, Thứ ba', content.dateText]) expect(after.body.html).toContain(value);
    expect(after.body.html).not.toContain('Tên mẫu cũ');
    expect(after.body.html).not.toContain('Địa điểm cũ');
    expect(after.body.html).not.toContain('(Tức ngày 18 tháng 04 âm lịch)');
  });
  it('validates draft information and honors clearing rather than restoring sample content', async () => {
    const owner = await register();
    const selected = { templateId, values: {}, opening: false, motion: false };
    const wedding = (await createWedding(owner.token, { importedTemplate: selected, ...content })).body;
    const base = `/weddings/${wedding.id}/template-preview`;
    expect((await request(app).post(base).set(authorized(owner.token)).send({ ...selected, content: { venue: { mapUrl: 'javascript:alert(1)' } } })).status).toBe(400);
    const result = await request(app).post(base).set(authorized(owner.token)).send({ ...selected, content: { couple: { groom: '', bride: '', groomFull: '', brideFull: '' }, eventDate: null, eventTime: '', dateText: '', venue: { name: '', address: '', mapUrl: '' } } });
    expect(result.status).toBe(200);
    expect(result.body.boundValues).toMatchObject({ f33: '', f57: '', f58: '', f59: '', f60: '', f101: '', f102: '' });
    expect(result.body.html).not.toContain('23.05.2026');
  });
  it('marks synchronized fields with their editing source while keeping their historical keys', async () => {
    const owner = await register();
    const result = await request(app).get(`/templates/${templateId}/fields`).set(authorized(owner.token));
    expect(result.body.find(field => field.key === 'f33').binding).toEqual({ source: 'names', label: 'Tên cô dâu và chú rể' });
    expect(result.body.find(field => field.key === 'f102').binding).toEqual({ source: 'venue', label: 'Địa điểm' });
    expect(result.body.find(field => field.key === 'f70').binding).toEqual({ source: 'schedule', label: 'Ngày và giờ cưới' });
    expect(result.body.find(field => field.key === 'f45').binding).toBeUndefined();
  });
});
