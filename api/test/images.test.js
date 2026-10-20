import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, register, createWedding, authorized, Photo, Wedding } from './helpers/db';

const require = createRequire(import.meta.url);
const { ogImageUrl, personalizedOgImage } = require('../lib/images');

afterEach(() => {
  delete process.env.OG_GUEST_OVERLAY;
  delete process.env.OG_FONT;
});

describe('preview images', () => {
  it('converts Cloudinary image URLs for social previews', () => {
    expect(ogImageUrl('https://res.cloudinary.com/demo/image/upload/photo.jpg'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/photo.jpg');
  });

  it('adds a personalized overlay with encoded Vietnamese text', () => {
    expect(personalizedOgImage('https://res.cloudinary.com/demo/image/upload/photo.jpg', 'Anh An'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/l_text:Roboto_58_bold:Th%C3%A2n%20m%E1%BB%9Di%20Anh%20An,co_rgb:FFFFFF/e_shadow:60,x_0,y_3,co_rgb:000000/fl_layer_apply,g_south,y_60/photo.jpg');
  });

  it('double encodes commas and slashes inside the overlay text', () => {
    process.env.OG_FONT = 'Arial';
    expect(personalizedOgImage('https://res.cloudinary.com/demo/image/upload/p.jpg', 'An, Bình/Chi'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/l_text:Arial_58_bold:Th%C3%A2n%20m%E1%BB%9Di%20An%252C%20B%C3%ACnh%252FChi,co_rgb:FFFFFF/e_shadow:60,x_0,y_3,co_rgb:000000/fl_layer_apply,g_south,y_60/p.jpg');
  });

  it('omits the overlay when disabled and preserves non-Cloudinary URLs', () => {
    process.env.OG_GUEST_OVERLAY = 'off';
    expect(personalizedOgImage('https://res.cloudinary.com/demo/image/upload/p.jpg', 'An'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/p.jpg');
    expect(personalizedOgImage('https://example.com/p.jpg', 'An')).toBe('https://example.com/p.jpg');
    expect(personalizedOgImage('/cover.jpg', 'An')).toBe('/cover.jpg');
  });

  it('truncates long guest names to 40 characters', () => {
    const image = personalizedOgImage('https://res.cloudinary.com/demo/image/upload/p.jpg', 'a'.repeat(41));
    expect(image).toContain(`m%E1%BB%9Di%20${'a'.repeat(40)},`);
    expect(image).not.toContain('a'.repeat(41));
  });
});

describe('photos', () => {
  useDatabase();

  it('rejects an insecure photo URL', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    expect((await request(app).post(`/public/weddings/${wedding.slug}/photos`)
      .send({ url: 'http://example.com/p.jpg' })).status).toBe(400);
  });

  it('lists at most 200 photos newest first', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    const baseTime = Date.UTC(2026, 0, 1);
    await Photo.insertMany(Array.from({ length: 205 }, (_, index) => ({
      wedding: wedding.id,
      url: `https://example.com/${index}.jpg`,
      createdAt: new Date(baseTime + index * 1000)
    })));
    const result = await request(app).get(`/public/weddings/${wedding.slug}/photos`);
    expect(result.body).toHaveLength(200);
    expect(result.body[0].url).toBe('https://example.com/204.jpg');
    expect(result.body[199].url).toBe('https://example.com/5.jpg');
  });

  it('deletes only the owner wedding photo', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    const photo = await Photo.create({ wedding: wedding.id, url: 'https://example.com/p.jpg' });
    const other = await register('other@example.com');
    const path = `/weddings/${wedding.id}/photos/${photo.id}`;
    expect((await request(app).delete(path).set(authorized(other.token))).status).toBe(404);
    expect((await request(app).delete(path).set(authorized(account.token))).status).toBe(204);
  });

  it('requires a wedding on the photo model', async () => {
    await expect(Photo.create({ url: 'https://example.com/p.jpg' })).rejects.toMatchObject({ name: 'ValidationError' });
  });
});
