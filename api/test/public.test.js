import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, Guest } from './helpers/db';

useDatabase();

async function setup(body = {}) {
  const account = await register();
  const wedding = (await createWedding(account.token, body)).body;
  return { wedding, base: `/public/weddings/${wedding.slug}` };
}

describe('public wedding routes', () => {
  it('omits owner and Mongo fields from public wedding', async () => {
    const { base } = await setup();
    const result = await request(app).get(base);
    expect(result.body.owner).toBeUndefined();
    expect(result.body._id).toBeUndefined();
    expect(result.body.__v).toBeUndefined();
  });

  it('hides unpublished weddings', async () => {
    const { base } = await setup({ published: false });
    expect((await request(app).get(base)).status).toBe(404);
  });

  it('looks up a guest by code and id', async () => {
    const { wedding, base } = await setup();
    const guest = await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A' });
    expect((await request(app).get(`${base}/guests/${guest.code}`)).status).toBe(200);
    expect((await request(app).get(`${base}/guests/${guest.id}`)).status).toBe(200);
  });

  it('returns 404 for unknown RSVP code', async () => {
    const { base } = await setup();
    expect((await request(app).put(`${base}/guests/missing/rsvp`).send({ status: 'yes' })).status).toBe(404);
  });

  it('rejects RSVP guestCount 21', async () => {
    const { wedding, base } = await setup();
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A' });
    expect((await request(app).put(`${base}/guests/abcdefgh/rsvp`).send({ guestCount: 21 })).status).toBe(400);
  });

  it('updates RSVP', async () => {
    const { wedding, base } = await setup();
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'A', invitationName: 'A' });
    const result = await request(app).put(`${base}/guests/abcdefgh/rsvp`).send({ status: 'yes', guestCount: 2 });
    expect(result.body).toMatchObject({ status: 'yes', guestCount: 2 });
  });

  it('registers a walk-in with a code', async () => {
    const { base } = await setup();
    const result = await request(app).post(`${base}/register`).send({ invitationName: 'Walk in' });
    expect(result.status).toBe(201);
    expect(result.body.code).toMatch(/^[a-z0-9]{8}$/);
  });

  it('sorts rooms with assigned rooms first', async () => {
    const { wedding, base } = await setup();
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'No room', invitationName: 'No room', status: 'yes' });
    await Guest.create({ wedding: wedding.id, code: 'ijklmnop', name: 'Room', invitationName: 'Room', status: 'yes', room: 'A' });
    const result = await request(app).get(`${base}/rooms`);
    expect(result.body.map(guest => guest.invitationName)).toEqual(['Room', 'No room']);
  });

  it('personalizes default meta description', async () => {
    const { wedding, base } = await setup({ couple: { groom: 'Minh', bride: 'Lan' } });
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'An', invitationName: 'Anh An' });
    const result = await request(app).get(`${base}/meta?g=abcdefgh`);
    expect(result.body.title).toBe('Gửi Anh An · Thiệp cưới Minh & Lan');
    expect(result.body.description).toBe('Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan.');
  });

  it('returns distinct titles and images for two guests', async () => {
    const { wedding, base } = await setup({
      couple: { groom: 'Minh', bride: 'Lan' },
      coverImage: 'https://res.cloudinary.com/demo/image/upload/cover.jpg'
    });
    await Guest.create({ wedding: wedding.id, code: 'abcdefgh', name: 'An', invitationName: 'Anh An' });
    await Guest.create({ wedding: wedding.id, code: 'ijklmnop', name: 'Bình', invitationName: 'Chị Bình' });
    const first = await request(app).get(`${base}/meta?g=abcdefgh`);
    const second = await request(app).get(`${base}/meta?g=ijklmnop`);
    expect(first.body.title).toBe('Gửi Anh An · Thiệp cưới Minh & Lan');
    expect(second.body.title).toBe('Gửi Chị Bình · Thiệp cưới Minh & Lan');
    expect(first.body.image).toContain('Anh%20An');
    expect(second.body.image).toContain('Ch%E1%BB%8B%20B%C3%ACnh');
    expect(first.body.image).not.toBe(second.body.image);
  });

  it('uses explicit meta title and description overrides', async () => {
    const { base } = await setup({ meta: { title: 'Our day', description: 'Join us' } });
    const result = await request(app).get(`${base}/meta`);
    expect(result.body).toMatchObject({ title: 'Our day', description: 'Join us' });
  });
});
