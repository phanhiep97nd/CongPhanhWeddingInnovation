import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, register, createWedding, authorized, Wedding, Guest } from './helpers/db';
const require = createRequire(import.meta.url);
const library = require('../lib/templateLibrary');
const jwt = require('jsonwebtoken');
useDatabase();

describe('private template library', () => {
  it('publishes metadata for all imported templates without layouts or paths', async () => {
    const result = await request(app).get('/templates');
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(283);
    expect(result.body[0]).not.toHaveProperty('html');
    expect(result.body[0]).not.toHaveProperty('provenance');
    for (const item of result.body) {
      const definition = library.definition(item.id);
      expect(definition.fields.length).toBeGreaterThan(0);
      expect(definition.html).not.toMatch(/<script|<iframe| on(?:click|load)=/i);
    }
  });
  it('requires authentication and scopes owner previews', async () => {
    const id = library.catalog()[0].id;
    expect((await request(app).get(`/templates/${id}/fields`)).status).toBe(401);
    const owner = await register(), other = await register('other@example.com');
    const wedding = (await createWedding(owner.token)).body;
    expect((await request(app).post(`/weddings/${wedding.id}/template-preview`).set(authorized(other.token)).send({ templateId: id, values: {} })).status).toBe(404);
    const preview = await request(app).post(`/weddings/${wedding.id}/template-preview`).set(authorized(owner.token)).send({ templateId: id, values: {} });
    expect(preview.status).toBe(200);
    expect(preview.headers['cache-control']).toBe('no-store');
    expect(preview.body.html).toContain('Content-Security-Policy');
  });
  it('renders a public demo without exposing editable definitions or accepting overrides', async () => {
    const id = library.catalog()[0].id;
    const response = await request(app).get(`/templates/${id}/demo?values=UNTRUSTED_OVERRIDE&opening=false`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Object.keys(response.body)).toEqual(['html']);
    expect(response.body.html).toContain('const editing=false');
    expect(response.body.html).toContain('Content-Security-Policy');
    expect(response.body.html).not.toContain('UNTRUSTED_OVERRIDE');
    expect((await request(app).get('/templates/unknown/demo')).status).toBe(404);
    expect((await request(app).get(`/templates/${id}/fields`)).status).toBe(401);
  });
  it('omits provider branding and retires its fields without shifting saved content keys', () => {
    for (const item of library.catalog()) {
      const layout = library.definition(item.id);
      const visible = library.editableFields(item.id);
      expect(visible.every(field => !field.retired)).toBe(true);
      expect(visible).toHaveLength(item.fieldCount);
      expect(layout.html).not.toMatch(/class="[^"]*\b(?:watermark|phone-container-footer)\b/);
      expect(layout.html).not.toMatch(/id="cinelove-toolbar"|class="[^"]*\btoolbar-toggle-(?:button|pill)\b/);
      expect(item.name).not.toMatch(/\b(?:m-invite|cinelove|chungdoi)\b/i);
      if (layout.provenance.source.includes('m-invite.com')) expect(layout.html).not.toMatch(/class="[^"]*\b(?:invite-preview-bottom-bar|invite-preview-attendance|template-preview-mobile-header|phone-container-chrome)\b/);
      const retired = layout.fields.find(field => field.retired);
      const active = visible.find(field => field.type === 'text');
      if (retired && active) {
        const result = library.selection({ templateId: item.id, values: { [retired.key]: 'Old branding edit', [active.key]: 'Saved invitation text' } });
        expect(result.values).toEqual({ [active.key]: 'Saved invitation text' });
      }
    }
  });
  it('stores edits, escapes markup, personalizes guests, and hides drafts and expired renders', async () => {
    const owner = await register();
    const layout = library.definition(library.catalog()[0].id);
    const field = layout.fields.find(f => f.type === 'text');
    const selected = { templateId: layout.id, values: { [field.key]: 'Xin chào {khach} <script>alert(1)</script>' }, opening: false, motion: false };
    const wedding = (await createWedding(owner.token, { invitationKind: 'birthday', eventTitle: 'Sinh nhật An', importedTemplate: selected, published: false })).body;
    expect(wedding.importedTemplate).toEqual(selected);
    const base = `/public/weddings/${wedding.slug}`;
    expect((await request(app).get(`${base}/template-render`)).status).toBe(404);
    await request(app).put(`/weddings/${wedding.id}`).set(authorized(owner.token)).send({ published: true });
    const guest = await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'Lan', invitationName: 'chị Lan' });
    const rendered = await request(app).get(`${base}/template-render?g=${guest.code}`);
    expect(rendered.status).toBe(200);
    expect(rendered.body.html).toContain('chị Lan &lt;script&gt;');
    expect(rendered.body.html).not.toContain('<script>alert(1)</script>');
    const publicData = (await request(app).get(base)).body;
    expect(publicData.importedTemplate).toBeUndefined();
    expect(publicData.hasImportedTemplate).toBe(true);
    await Wedding.updateOne({ _id: wedding.id }, { $set: { eventDate: new Date('2020-01-01') } });
    expect((await request(app).get(`${base}/template-render`)).status).toBe(410);
  });
  it('rejects injected field names, executable image URLs and invalid flags', () => {
    const layout = library.definition(library.catalog()[0].id);
    const image = layout.fields.find(f => f.type === 'image');
    expect(() => library.selection({ templateId: layout.id, values: { unknown: 'test' } })).toThrow();
    expect(() => library.selection({ templateId: layout.id, values: { [image.key]: 'javascript:alert(1)' } })).toThrow();
    expect(() => library.selection({ templateId: layout.id, values: {}, motion: 'yes' })).toThrow();
  });
  it('recovers a complete typewriter heading while keeping the original editable key', () => {
    const layout = library.definition('tpl-f237f869f469172b');
    const field = layout.fields.find(field => field.key === 'f26');
    expect(field.value).toBe('Our\nWedding Day');
    expect(layout.provenance.restoredTextFields).toContain(field.key);
    const selected = library.selection({ templateId: layout.id, values: { [field.key]: 'Tên riêng đã lưu' } });
    expect(library.render(selected)).toContain('Tên riêng đã lưu');
  });
  it('only serves signed assets belonging to the selected template', async () => {
    const layout = library.definition(library.catalog()[0].id);
    const token = jwt.sign({ scope: 'template-assets', templateId: layout.id }, process.env.JWT_SECRET, { expiresIn: '1h', audience: 'template-assets' });
    const asset = layout.assets[0];
    expect((await request(app).get(`/templates/assets/${token}/${asset}`).set('Origin', 'null')).status).toBe(200);
    expect((await request(app).get(`/templates/assets/invalid/${asset}`)).status).toBe(403);
    const expired = jwt.sign({ scope: 'template-assets', templateId: layout.id }, process.env.JWT_SECRET, { expiresIn: -1, audience: 'template-assets' });
    expect((await request(app).get(`/templates/assets/${expired}/${asset}`)).status).toBe(403);
    expect((await request(app).get(`/templates/assets/${token}/catalog.json`)).status).toBe(404);
    expect((await request(app).get(`/private/templates/layouts/${layout.id}.json`)).status).toBe(404);
  });
  it('serves photos inside SVG frames through the public demo asset route', async () => {
    for (const id of ['tpl-79b09b3ea58a90f7', 'tpl-cbdcbbad0ddd26bf']) {
      const demo = await request(app).get(`/templates/${id}/demo`);
      expect(demo.status).toBe(200);
      const photos = [...demo.body.html.matchAll(/<image\b[^>]*\bhref="([^"]+)"/g)];
      expect(photos.length).toBeGreaterThan(0);
      for (const [, url] of photos) {
        expect(url).toMatch(/^\/api\/templates\/assets\//);
        const photo = await request(app).get(url.replace(/^\/api/, ''));
        expect(photo.status).toBe(200);
        expect(photo.headers['content-type']).toMatch(/^image\//);
      }
    }
  });
});
