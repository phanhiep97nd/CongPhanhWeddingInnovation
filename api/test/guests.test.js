import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, register, createWedding, authorized, Guest, Wedding } from './helpers/db';

const require = createRequire(import.meta.url);
const { createGuests } = require('../lib/guestCodes');

useDatabase();

async function setup() {
  const account = await register();
  const wedding = (await createWedding(account.token)).body;
  const base = `/weddings/${wedding.id}/guests`;
  return { account, wedding, base };
}

describe('owner guest routes', () => {
  it('creates a guest with a unique code', async () => {
    const { account, base } = await setup();
    const result = await request(app).post(base).set(authorized(account.token)).send({ invitationName: 'A' });
    expect(result.status).toBe(201);
    expect(result.body.code).toMatch(/^[a-z0-9]{8}$/);
    expect(result.body.name).toBe('A');
  });

  it('rejects a missing invitation name', async () => {
    const { account, base } = await setup();
    expect((await request(app).post(base).set(authorized(account.token)).send({})).status).toBe(400);
  });

  it('rejects empty bulk input', async () => {
    const { account, base } = await setup();
    expect((await request(app).post(`${base}/bulk`).set(authorized(account.token)).send({ guests: [] })).status).toBe(400);
  });

  it('rejects 501 bulk guests', async () => {
    const { account, base } = await setup();
    const guests = Array.from({ length: 501 }, (_, index) => ({ invitationName: `Guest ${index}` }));
    expect((await request(app).post(`${base}/bulk`).set(authorized(account.token)).send({ guests })).status).toBe(400);
  });

  it('inserts 200 guests with unique codes in input order', async () => {
    const { account, wedding, base } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    const guests = Array.from({ length: 200 }, (_, index) => ({ invitationName: `Guest ${index}` }));
    const result = await request(app).post(`${base}/bulk`).set(authorized(account.token)).send({ guests });
    expect(result.status).toBe(201);
    expect(result.body).toHaveLength(200);
    expect(new Set(result.body.map(guest => guest.code)).size).toBe(200);
    expect(result.body.map(guest => guest.invitationName)).toEqual(guests.map(guest => guest.invitationName));
  });

  it('retries an atomic bulk insert when a guest code collides', async () => {
    const { wedding } = await setup();
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'Existing', invitationName: 'Existing' });

    const insertMany = Guest.insertMany.bind(Guest);
    const spy = vi.spyOn(Guest, 'insertMany').mockImplementationOnce((documents, options) => {
      documents[0].code = 'abcdefgh';
      return insertMany(documents, options);
    });

    try {
      const guests = await createGuests(wedding.id, [
        { name: 'First', invitationName: 'First' },
        { name: 'Second', invitationName: 'Second' }
      ]);
      expect(guests.map(guest => guest.invitationName)).toEqual(['First', 'Second']);
      expect(guests[0].code).not.toBe('abcdefgh');
      expect(await Guest.countDocuments()).toBe(3);
    } finally {
      spy.mockRestore();
    }
  });

  it('updates a guest but ignores code and wedding changes', async () => {
    const { account, wedding, base } = await setup();
    const guest = (await request(app).post(base).set(authorized(account.token)).send({ invitationName: 'A' })).body;
    const result = await request(app).put(`${base}/${guest.id}`).set(authorized(account.token))
      .send({ note: 'Updated', code: 'changed', wedding: '000000000000000000000000' });
    expect(result.body.note).toBe('Updated');
    expect(result.body.code).toBe(guest.code);
    expect(String((await Guest.findById(guest.id)).wedding)).toBe(wedding.id);
  });

  it('reports aggregate guest stats', async () => {
    const { account, wedding, base } = await setup();
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A', status: 'yes', guestCount: 2 });
    await Guest.create({ wedding: wedding.id, code: 'ijklmnop', name: 'B', invitationName: 'B' });
    const result = await request(app).get(`/weddings/${wedding.id}/stats`).set(authorized(account.token));
    expect(result.body).toEqual({ total: 2, yes: 1, no: 0, pending: 1, attendees: 2 });
  });

  it('cannot update a guest in another wedding', async () => {
    const { account, base } = await setup();
    const other = await register('other@example.com');
    const guest = (await request(app).post(base).set(authorized(account.token)).send({ invitationName: 'A' })).body;
    expect((await request(app).put(`${base}/${guest.id}`).set(authorized(other.token)).send({ note: 'Bad' })).status).toBe(404);
  });

  it('deletes a guest', async () => {
    const { account, base } = await setup();
    const guest = (await request(app).post(base).set(authorized(account.token)).send({ invitationName: 'A' })).body;
    expect((await request(app).delete(`${base}/${guest.id}`).set(authorized(account.token))).status).toBe(204);
    expect(await Guest.countDocuments()).toBe(0);
  });

  it('requires wedding on a guest model', async () => {
    await expect(Guest.create({ name: 'A', invitationName: 'A' })).rejects.toMatchObject({ status: 400 });
  });
});
