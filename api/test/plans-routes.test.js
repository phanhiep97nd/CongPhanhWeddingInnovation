import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized, Guest, Wedding, Settings } from './helpers/db';

useDatabase();

async function setup(body = {}) {
  const account = await register();
  const wedding = (await createWedding(account.token, body)).body;
  return { account, wedding, owner: `/weddings/${wedding.id}`, publicPath: `/public/weddings/${wedding.slug}` };
}

describe('plan routes', () => {
  it('adds a four character suffix on free create', async () => {
    const { wedding } = await setup();
    expect(wedding.slug).toMatch(/^my-wedding-[a-z0-9]{4}$/);
  });

  it('returns all owner plan metadata', async () => {
    const { wedding } = await setup();
    expect(wedding).toMatchObject({ plan: 'free', limits: { guests: 10, gallery: 6 }, usage: { guests: 0 }, prices: { basic: 30000, premium: 99000 } });
    expect(wedding.entitlements.customMusic).toBe(false);
    expect(wedding.expiresAt).toBeTruthy();
  });

  it('returns plan and expiry on list items', async () => {
    const { account } = await setup();
    const result = await request(app).get('/weddings').set(authorized(account.token));
    expect(result.body[0]).toMatchObject({ plan: 'free' });
    expect(result.body[0].expiresAt).toBeTruthy();
  });

  it('allows the tenth free guest', async () => {
    const { account, wedding, owner } = await setup();
    await Guest.insertMany(Array.from({ length: 9 }, (_, index) => ({ wedding: wedding.id, code: `guest${index}`, name: 'A', invitationName: 'A' })));
    const result = await request(app).post(`${owner}/guests`).set(authorized(account.token)).send({ invitationName: 'Tenth' });
    expect(result.status).toBe(201);
  });

  it('paywalls the eleventh free guest', async () => {
    const { account, wedding, owner } = await setup();
    await Guest.insertMany(Array.from({ length: 10 }, (_, index) => ({ wedding: wedding.id, code: `guest${index}`, name: 'A', invitationName: 'A' })));
    const result = await request(app).post(`${owner}/guests`).set(authorized(account.token)).send({ invitationName: 'Eleventh' });
    expect(result.status).toBe(402);
    expect(result.body).toMatchObject({ code: 'PLAN_REQUIRED', feature: 'unlimitedGuests', requiredPlan: 'basic' });
  });

  it('rejects an oversized bulk import without creating guests', async () => {
    const { account, wedding, owner } = await setup();
    const guests = Array.from({ length: 11 }, (_, index) => ({ invitationName: `Guest ${index}` }));
    const result = await request(app).post(`${owner}/guests/bulk`).set(authorized(account.token)).send({ guests });
    expect(result.status).toBe(402);
    expect(await Guest.countDocuments({ wedding: wedding.id })).toBe(0);
  });

  it('allows six free gallery photos', async () => {
    const { account, owner } = await setup();
    const gallery = Array.from({ length: 6 }, (_, index) => ({ url: `https://example.com/${index}.jpg` }));
    const result = await request(app).put(owner).set(authorized(account.token)).send({ gallery });
    expect(result.status).toBe(200);
  });

  it('paywalls the seventh free gallery photo', async () => {
    const { account, owner } = await setup();
    const gallery = Array.from({ length: 7 }, (_, index) => ({ url: `https://example.com/${index}.jpg` }));
    const result = await request(app).put(owner).set(authorized(account.token)).send({ gallery });
    expect(result.status).toBe(402);
    expect(result.body.feature).toBe('largeGallery');
  });

  it('paywalls minimal template on free', async () => {
    const { account, owner } = await setup();
    const result = await request(app).put(owner).set(authorized(account.token)).send({ template: 'minimal' });
    expect(result.status).toBe(402);
    expect(result.body.feature).toBe('premiumTemplates');
  });

  it('paywalls free slug rename', async () => {
    const { account, owner } = await setup();
    const result = await request(app).put(owner).set(authorized(account.token)).send({ slug: 'new-wedding' });
    expect(result.status).toBe(402);
    expect(result.body.feature).toBe('permanent');
  });

  it('premium rename preserves the old public slug', async () => {
    const { account, wedding, owner, publicPath } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    const result = await request(app).put(owner).set(authorized(account.token)).send({ slug: 'new-wedding' });
    expect(result.status).toBe(200);
    expect(result.body.slugAliases).toContain(wedding.slug);
    expect((await request(app).get(publicPath)).status).toBe(200);
    expect((await request(app).get('/public/weddings/new-wedding')).status).toBe(200);
  });

  it('shows the gift box on every plan, including the free plan, with uploaded QR codes for e-wallets', async () => {
    const { account, owner, publicPath } = await setup();
    const momo = { label: 'MoMo', bankBin: '', bankName: '', accountNumber: '', accountName: 'Lan', qrImage: 'https://cdn.example.test/momo.png' };
    expect((await request(app).put(owner).set(authorized(account.token)).send({ giftBox: { note: '', accounts: [{ ...momo, qrImage: '' }] } })).status).toBe(400);
    expect((await request(app).put(owner).set(authorized(account.token)).send({ giftBox: { note: 'Cảm ơn', accounts: [momo] } })).status).toBe(200);
    const result = await request(app).get(publicPath);
    expect(result.body.plan).toBe('free');
    expect(result.body.entitlements).not.toHaveProperty('giftBox');
    expect(result.body.giftBox).toMatchObject({ note: 'Cảm ơn', accounts: [{ label: 'MoMo', qrImage: 'https://cdn.example.test/momo.png' }] });
  });

  it('hides prepared custom music on free', async () => {
    const { account, owner, publicPath } = await setup();
    await request(app).put(owner).set(authorized(account.token)).send({ musicUrl: 'https://example.com/song.mp3' });
    expect((await request(app).get(publicPath)).body.musicUrl).toBe('');
  });

  it('shows custom music on premium', async () => {
    const { account, wedding, owner, publicPath } = await setup();
    await request(app).put(owner).set(authorized(account.token)).send({ musicUrl: 'https://example.com/song.mp3' });
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    expect((await request(app).get(publicPath)).body.musicUrl).toBe('https://example.com/song.mp3');
  });

  it('hides photo wall section on free', async () => {
    const { publicPath } = await setup();
    const result = await request(app).get(publicPath);
    expect(result.body.sections.find(section => section.key === 'photoWall').enabled).toBe(false);
  });

  it('records a voice invitation per guest on premium only and plays it on that guest card', async () => {
    const { account, wedding, owner, publicPath } = await setup();
    const voiceUrl = 'https://res.cloudinary.com/demo/video/upload/voice.webm';
    const locked = await request(app).post(`${owner}/guests`).set(authorized(account.token)).send({ invitationName: 'Cô Lan', voiceUrl });
    expect(locked.status).toBe(402);
    expect(locked.body).toMatchObject({ feature: 'voiceInvite', requiredPlan: 'premium' });
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    const guest = (await request(app).post(`${owner}/guests`).set(authorized(account.token)).send({ invitationName: 'Cô Lan', voiceUrl })).body;
    expect(guest.voiceUrl).toBe(voiceUrl);
    expect((await request(app).get(`${publicPath}/guests/${guest.code}`)).body.voiceUrl).toBe(voiceUrl);
    expect((await request(app).post(`${owner}/guests`).set(authorized(account.token)).send({ invitationName: 'Bác Hai', voiceUrl: 'http://example.com/a.mp3' })).status).toBe(400);
    // After a downgrade the recording is no longer played, other details still save, and a new recording is refused.
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    expect((await request(app).get(`${publicPath}/guests/${guest.code}`)).body.voiceUrl).toBeUndefined();
    expect((await request(app).put(`${owner}/guests/${guest.id}`).set(authorized(account.token)).send({ invitationName: 'Cô Lan Anh', voiceUrl })).status).toBe(200);
    expect((await request(app).put(`${owner}/guests/${guest.id}`).set(authorized(account.token)).send({ voiceUrl: voiceUrl + '?v=2' })).status).toBe(402);
    expect((await request(app).put(`${owner}/guests/${guest.id}`).set(authorized(account.token)).send({ voiceUrl: '' })).body.voiceUrl).toBe('');
  });

  it('shows photo wall section on premium', async () => {
    const { wedding, publicPath } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    const result = await request(app).get(publicPath);
    expect(result.body.sections.find(section => section.key === 'photoWall').enabled).toBe(true);
  });

  it('shows branding on free and hides it on basic', async () => {
    const { wedding, publicPath } = await setup();
    expect((await request(app).get(publicPath)).body.showBranding).toBe(true);
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    expect((await request(app).get(publicPath)).body.showBranding).toBe(false);
  });

  it('gates a stored premium template on free', async () => {
    const { wedding, publicPath } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { template: 'minimal' } });
    expect((await request(app).get(publicPath)).body.template).toBe('classic');
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    expect((await request(app).get(publicPath)).body.template).toBe('minimal');
  });

  it('expires a free public invitation and meta', async () => {
    const { wedding, publicPath } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { eventDate: new Date('2020-01-01') } });
    for (const path of [publicPath, `${publicPath}/meta`, `${publicPath}/photos`]) {
      const result = await request(app).get(path);
      expect(result.status).toBe(410);
      expect(result.body.code).toBe('EXPIRED');
    }
  });

  it('never expires premium', async () => {
    const { wedding, publicPath } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium', eventDate: new Date('2020-01-01') } });
    expect((await request(app).get(publicPath)).status).toBe(200);
  });

  it('forbids free photo uploads', async () => {
    const { publicPath } = await setup();
    expect((await request(app).post(`${publicPath}/photos`).send({ url: 'https://example.com/p.jpg' })).status).toBe(403);
  });

  it('returns current pricing and ten labelled features, without the free gift box', async () => {
    const result = await request(app).get('/public/pricing');
    expect(result.body.prices).toEqual({ basic: 30000, premium: 99000 });
    expect(result.body.features).toHaveLength(10);
    expect(result.body.features.map(feature => feature.key)).not.toContain('giftBox');
    expect(result.body.features.find(feature => feature.key === 'voiceInvite')).toEqual({ key: 'voiceInvite', label: 'Lời mời ghi âm cho từng khách', plan: 'premium' });
  });

  it('uses admin settings for free limits', async () => {
    await Settings.create({ _id: 'global', freeGuestLimit: 2 });
    const { account, owner } = await setup();
    const result = await request(app).get(owner).set(authorized(account.token));
    expect(result.body.limits.guests).toBe(2);
  });
});
