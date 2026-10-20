import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, register, createWedding, authorized, Photo, Wedding } from './helpers/db';

const require = createRequire(import.meta.url);
const { ogImageUrl } = require('../lib/images');
useDatabase();

describe('photos and preview images', () => {
  it('converts Cloudinary image URLs for social previews', () => {
    expect(ogImageUrl('https://res.cloudinary.com/demo/image/upload/photo.jpg'))
      .toContain('/upload/c_fill,w_1200,h_630,f_jpg,q_auto/');
  });

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
