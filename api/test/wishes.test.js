import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized, Wedding } from './helpers/db';
useDatabase();

describe('invitation wishes', () => {
  it('stores guest wishes per invitation and returns plain text without private ownership data', async () => {
    const owner = await register();
    const wedding = (await createWedding(owner.token)).body;
    const second = (await createWedding(owner.token, { slug: 'second-event' })).body;
    const base = `/public/weddings/${wedding.slug}/wishes`;
    const posted = await request(app).post(base).send({ author: '  Lan  ', message: 'Chúc mừng <img src=x onerror=alert(1)>', wedding: second.id });
    expect(posted.status).toBe(201);
    expect(posted.body.author).toBe('Lan');
    expect(posted.body.message).toContain('<img');
    expect(posted.body).not.toHaveProperty('wedding');
    expect(posted.body.id).toBeTruthy();
    const list = await request(app).get(base);
    expect(list.headers['cache-control']).toBe('no-store');
    expect(list.body).toEqual([posted.body]);
    expect((await request(app).get(`/public/weddings/${second.slug}/wishes`)).body).toEqual([]);
  });
  it('rejects missing, blank and oversized content without storing it', async () => {
    const owner = await register();
    const wedding = (await createWedding(owner.token)).body;
    const base = `/public/weddings/${wedding.slug}/wishes`;
    for (const body of [{}, { author: ' ', message: 'Hello' }, { author: 'Lan', message: '' }, { author: 'a'.repeat(101), message: 'Hi' }, { author: 'Lan', message: 'x'.repeat(501) }, { author: {}, message: 'Hi' }]) {
      expect((await request(app).post(base).send(body)).status).toBe(400);
    }
    expect((await request(app).get(base)).body).toEqual([]);
  });
  it('does not read or accept wishes for drafts, expired or missing invitations', async () => {
    const owner = await register();
    const wedding = (await createWedding(owner.token, { published: false })).body;
    const base = `/public/weddings/${wedding.slug}/wishes`;
    expect((await request(app).get(base)).status).toBe(404);
    expect((await request(app).post(base).send({ author: 'Lan', message: 'Hi' })).status).toBe(404);
    await request(app).put(`/weddings/${wedding.id}`).set(authorized(owner.token)).send({ published: true });
    await Wedding.updateOne({ _id: wedding.id }, { $set: { eventDate: new Date('2020-01-01') } });
    expect((await request(app).get(base)).status).toBe(410);
    expect((await request(app).post(base).send({ author: 'Lan', message: 'Hi' })).status).toBe(410);
    expect((await request(app).get('/public/weddings/missing/wishes')).status).toBe(404);
  });
});
