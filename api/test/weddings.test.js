import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized, Guest, Photo } from './helpers/db';

useDatabase();

describe('weddings', () => {
  it('creates a wedding without exposing owner', async () => {
    const account = await register();
    const result = await createWedding(account.token);
    expect(result.status).toBe(201);
    expect(result.body.owner).toBeUndefined();
  });

  it('rejects an invalid slug', async () => {
    const account = await register();
    expect((await createWedding(account.token, { slug: 'X' })).status).toBe(400);
  });

  it('returns invalid from slug availability', async () => {
    const account = await register();
    const result = await request(app).get('/weddings/slug-available?slug=X').set(authorized(account.token));
    expect(result.body).toEqual({ available: false, valid: false });
  });

  it('returns unavailable for an existing slug', async () => {
    const account = await register();
    await createWedding(account.token);
    const result = await request(app).get('/weddings/slug-available?slug=my-wedding').set(authorized(account.token));
    expect(result.body).toEqual({ available: false, valid: true });
  });

  it('rejects duplicate slugs', async () => {
    const first = await register();
    const second = await register('second@example.com');
    await createWedding(first.token);
    expect((await createWedding(second.token)).status).toBe(409);
  });

  it('returns 409 on a PUT slug conflict', async () => {
    const account = await register();
    const first = (await createWedding(account.token)).body;
    await createWedding(account.token, { slug: 'other-wedding' });
    const result = await request(app).put(`/weddings/${first.id}`)
      .set(authorized(account.token)).send({ slug: 'other-wedding' });
    expect(result.status).toBe(409);
  });

  it('preserves bride during a partial couple update', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token, { couple: { groom: 'Old', bride: 'Lan' } })).body;
    const result = await request(app).put(`/weddings/${wedding.id}`)
      .set(authorized(account.token)).send({ couple: { groom: 'New' } });
    expect(result.body.couple).toMatchObject({ groom: 'New', bride: 'Lan' });
  });

  it('normalizes custom sections', async () => {
    const account = await register();
    const result = await createWedding(account.token, {
      customSections: [{ id: 'one', title: 'Extra' }],
      sections: [{ key: 'custom:one', enabled: false }, { key: 'unknown', enabled: true }]
    });
    expect(result.body.sections[0]).toMatchObject({ key: 'custom:one', enabled: false });
    expect(result.body.sections.some(section => section.key === 'unknown')).toBe(false);
  });

  it('keeps weddings private to their owner', async () => {
    const first = await register();
    const second = await register('second@example.com');
    const wedding = (await createWedding(first.token)).body;
    expect((await request(app).get(`/weddings/${wedding.id}`).set(authorized(second.token))).status).toBe(404);
  });

  it('lists each wedding with its guest count', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A' });
    const result = await request(app).get('/weddings').set(authorized(account.token));
    expect(result.body[0].guestCount).toBe(1);
  });

  it('deletes guest and photo records with the wedding', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A' });
    await Photo.create({ wedding: wedding.id, url: 'https://example.com/p.jpg' });
    expect((await request(app).delete(`/weddings/${wedding.id}`).set(authorized(account.token))).status).toBe(204);
    expect(await Guest.countDocuments()).toBe(0);
    expect(await Photo.countDocuments()).toBe(0);
  });

  it('lists photos of an unpublished wedding for its owner only', async () => {
    const account = await register();
    const other = await register('other@example.com');
    const wedding = (await createWedding(account.token, { published: false })).body;
    await Photo.create({ wedding: wedding.id, url: 'https://example.com/old.jpg', createdAt: new Date('2026-01-01') });
    await Photo.create({ wedding: wedding.id, url: 'https://example.com/new.jpg' });

    const result = await request(app).get(`/weddings/${wedding.id}/photos`).set(authorized(account.token));
    expect(result.status).toBe(200);
    expect(result.body.map(photo => photo.url)).toEqual(['https://example.com/new.jpg', 'https://example.com/old.jpg']);
    expect(result.body[0]).toHaveProperty('id');
    expect(result.body[0]).not.toHaveProperty('_id');
    expect(result.body[0]).not.toHaveProperty('wedding');

    const foreign = await request(app).get(`/weddings/${wedding.id}/photos`).set(authorized(other.token));
    expect(foreign.status).toBe(404);
  });

  it('accepts an empty eventDate as null', async () => {
    const account = await register();
    const result = await createWedding(account.token, { eventDate: '' });
    expect(result.status).toBe(201);
    expect(result.body.eventDate).toBeNull();
  });

  it('rejects a malformed eventDate with 400', async () => {
    const account = await register();
    expect((await createWedding(account.token, { eventDate: 'next Friday' })).status).toBe(400);
  });
});
