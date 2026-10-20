import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, register, createWedding, authorized, createAdmin, User, Wedding, Order } from './helpers/db';

const require = createRequire(import.meta.url);
const { signData, signCreate } = require('../lib/payos');
useDatabase();

function payosResponse(data) {
  return { ok: true, json: async () => ({ code: '00', data }) };
}

async function setup() {
  const account = await register();
  const wedding = (await createWedding(account.token)).body;
  return { account, wedding, base: `/weddings/${wedding.id}/orders` };
}

beforeEach(() => {
  process.env.PAYOS_CLIENT_ID = 'client';
  process.env.PAYOS_API_KEY = 'api-key';
  process.env.PAYOS_CHECKSUM_KEY = 'checksum';
  process.env.SITE_ORIGIN = 'https://example.com';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PAYOS_CLIENT_ID;
  delete process.env.PAYOS_API_KEY;
  delete process.env.PAYOS_CHECKSUM_KEY;
  delete process.env.SITE_ORIGIN;
});

describe('orders and PayOS webhook', () => {
  it('returns 503 when PayOS configuration is absent', async () => {
    const { account, base } = await setup();
    delete process.env.PAYOS_API_KEY;
    const result = await request(app).post(base).set(authorized(account.token)).send({ plan: 'basic' });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('PAYMENT_UNAVAILABLE');
  });

  it('creates a PayOS link with signed body and short description', async () => {
    const { account, base } = await setup();
    const fetchMock = vi.fn(async () => payosResponse({ checkoutUrl: 'https://pay.example/1', qrCode: 'qr', paymentLinkId: 'link' }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await request(app).post(base).set(authorized(account.token)).send({ plan: 'basic' });
    expect(result.status).toBe(201);
    expect(result.body.amount).toBe(30000);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-merchant.payos.vn/v2/payment-requests');
    expect(options.headers).toMatchObject({ 'x-client-id': 'client', 'x-api-key': 'api-key' });
    const body = JSON.parse(options.body);
    expect(body.description.length).toBeLessThanOrEqual(25);
    expect(body.signature).toBe(signCreate(body));
  });

  it('reuses a recent pending order', async () => {
    const { account, base } = await setup();
    const fetchMock = vi.fn(async () => payosResponse({ checkoutUrl: 'https://pay.example/1', qrCode: 'qr', paymentLinkId: 'link' }));
    vi.stubGlobal('fetch', fetchMock);
    const first = await request(app).post(base).set(authorized(account.token)).send({ plan: 'basic' });
    const second = await request(app).post(base).set(authorized(account.token)).send({ plan: 'basic' });
    expect(second.body.orderCode).toBe(first.body.orderCode);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('charges only the difference from basic to premium', async () => {
    const { account, wedding, base } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    vi.stubGlobal('fetch', vi.fn(async () => payosResponse({ checkoutUrl: 'https://pay.example/1', qrCode: 'qr', paymentLinkId: 'link' })));
    const result = await request(app).post(base).set(authorized(account.token)).send({ plan: 'premium' });
    expect(result.body.amount).toBe(69000);
  });

  it('rejects a same-plan order', async () => {
    const { account, wedding, base } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    expect((await request(app).post(base).set(authorized(account.token)).send({ plan: 'basic' })).status).toBe(400);
  });

  it('lists owner orders', async () => {
    const { account, wedding, base } = await setup();
    await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    const result = await request(app).get(base).set(authorized(account.token));
    expect(result.body).toHaveLength(1);
    expect(result.body[0].orderCode).toBe(12345);
  });

  it('webhook applies a paid plan only once', async () => {
    const { account, wedding } = await setup();
    await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    const data = { orderCode: 12345, amount: 30000, code: '00' };
    const body = { code: '00', desc: 'ok', success: true, data, signature: signData(data) };
    expect((await request(app).post('/payos/webhook').send(body)).status).toBe(200);
    const firstPaidAt = (await Order.findOne({ orderCode: 12345 })).paidAt;
    expect((await request(app).post('/payos/webhook').send(body)).status).toBe(200);
    expect((await Order.findOne({ orderCode: 12345 })).paidAt).toEqual(firstPaidAt);
    expect((await Wedding.findById(wedding.id)).plan).toBe('basic');
  });

  it('ignores a signed amount mismatch', async () => {
    const { account, wedding } = await setup();
    await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'premium', amount: 99000 });
    const data = { orderCode: 12345, amount: 1, code: '00' };
    expect((await request(app).post('/payos/webhook').send({ data, signature: signData(data) })).status).toBe(200);
    expect((await Wedding.findById(wedding.id)).plan).toBe('free');
  });

  it('acknowledges unknown order codes', async () => {
    const data = { orderCode: 123, amount: 30000, code: '00' };
    const result = await request(app).post('/payos/webhook').send({ data, signature: signData(data) });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true });
  });

  it('rejects a bad webhook signature', async () => {
    const result = await request(app).post('/payos/webhook').send({ data: { orderCode: 123 }, signature: 'bad' });
    expect(result.status).toBe(400);
  });

  it('does not reuse a pending order whose amount no longer matches', async () => {
    const { account, wedding, base } = await setup();
    const fetchMock = vi.fn(async () => payosResponse({ checkoutUrl: 'https://pay.example/1', qrCode: 'qr', paymentLinkId: 'link' }));
    vi.stubGlobal('fetch', fetchMock);
    const premiumFromFree = await request(app).post(base).set(authorized(account.token)).send({ plan: 'premium' });
    expect(premiumFromFree.body.amount).toBe(99000);

    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'basic' } });
    const premiumFromBasic = await request(app).post(base).set(authorized(account.token)).send({ plan: 'premium' });
    expect(premiumFromBasic.body.amount).toBe(69000);
    expect(premiumFromBasic.body.orderCode).not.toBe(premiumFromFree.body.orderCode);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('applies a plan once when webhook and sync race on the same order', async () => {
    const { account, wedding } = await setup();
    const { applyPaidOrder } = require('../lib/orders');
    const order = await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    const results = await Promise.all([applyPaidOrder(order), applyPaidOrder(order), applyPaidOrder(order)]);
    expect(results.every(result => result.status === 'paid')).toBe(true);
    const paidAt = new Set(results.map(result => result.paidAt.getTime()));
    expect(paidAt.size).toBe(1);
    expect((await Wedding.findById(wedding.id)).plan).toBe('basic');
  });

  it('applies a paid plan without overwriting other wedding fields', async () => {
    const { account, wedding } = await setup();
    const order = await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    await Wedding.updateOne({ _id: wedding.id }, { $set: { dateText: 'Ngày mới' } });
    const { applyPaidOrder } = require('../lib/orders');
    await applyPaidOrder(order);
    const stored = await Wedding.findById(wedding.id);
    expect(stored.plan).toBe('basic');
    expect(stored.dateText).toBe('Ngày mới');
  });

  it('syncs a paid order from PayOS', async () => {
    const { account, wedding, base } = await setup();
    await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    const fetchMock = vi.fn(async () => payosResponse({ status: 'PAID', amountPaid: 30000 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await request(app).post(`${base}/12345/sync`).set(authorized(account.token));
    expect(result.body).toEqual({ status: 'paid', plan: 'basic' });
    expect(fetchMock.mock.calls[0][0]).toContain('/v2/payment-requests/12345');
  });
});

describe('admin routes and locked users', () => {
  it('promotes listed admin emails at registration', async () => {
    process.env.ADMIN_EMAILS = 'first@example.com, ADMIN@EXAMPLE.COM';
    try {
      const admin = await register('admin@example.com');
      expect(admin.user.role).toBe('admin');
      expect((await request(app).get('/admin/stats').set(authorized(admin.token))).status).toBe(200);
    } finally {
      delete process.env.ADMIN_EMAILS;
    }
  });

  it('promotes listed admin emails at login', async () => {
    await register('future@example.com');
    process.env.ADMIN_EMAILS = 'future@example.com';
    try {
      const result = await request(app).post('/auth/login').send({ email: 'future@example.com', password: 'password123' });
      expect(result.body.user.role).toBe('admin');
    } finally {
      delete process.env.ADMIN_EMAILS;
    }
  });

  it('denies admin stats to normal users', async () => {
    const account = await register();
    expect((await request(app).get('/admin/stats').set(authorized(account.token))).status).toBe(403);
  });

  it('returns stats and monthly revenue', async () => {
    const admin = await createAdmin();
    const result = await request(app).get('/admin/stats').set(authorized(admin.token));
    expect(result.body.users).toBe(1);
    expect(result.body.revenueByMonth).toHaveLength(12);
    expect(result.body.planCounts).toEqual({ free: 0, basic: 0, premium: 0 });
  });

  it('searches and paginates users', async () => {
    const admin = await createAdmin();
    await register('alice@example.com');
    await register('bob@example.com');
    const result = await request(app).get('/admin/users?q=alice&page=1&limit=1').set(authorized(admin.token));
    expect(result.body).toMatchObject({ total: 1, page: 1, limit: 1 });
    expect(result.body.items[0].email).toBe('alice@example.com');
  });

  it('escapes regex in user search', async () => {
    const admin = await createAdmin();
    const result = await request(app).get('/admin/users?q=%5B').set(authorized(admin.token));
    expect(result.status).toBe(200);
    expect(result.body.total).toBe(0);
  });

  it('returns a user detail with weddings', async () => {
    const admin = await createAdmin();
    const owner = await register();
    await createWedding(owner.token);
    const result = await request(app).get(`/admin/users/${owner.user.id}`).set(authorized(admin.token));
    expect(result.body.weddings).toHaveLength(1);
    expect(result.body.user.email).toBe('owner@example.com');
  });

  it('locks a user and rejects login and authenticated requests', async () => {
    const admin = await createAdmin();
    const owner = await register();
    const result = await request(app).patch(`/admin/users/${owner.user.id}`).set(authorized(admin.token)).send({ status: 'locked' });
    expect(result.body.status).toBe('locked');
    const login = await request(app).post('/auth/login').send({ email: 'owner@example.com', password: 'password123' });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('LOCKED');
    expect((await request(app).get('/auth/me').set(authorized(owner.token))).status).toBe(403);
  });

  it('cannot lock or demote yourself', async () => {
    const admin = await createAdmin();
    const path = `/admin/users/${admin.user.id}`;
    expect((await request(app).patch(path).set(authorized(admin.token)).send({ status: 'locked' })).status).toBe(400);
    expect((await request(app).patch(path).set(authorized(admin.token)).send({ role: 'user' })).status).toBe(400);
  });

  it('grants a plan manually with a zero amount order', async () => {
    const admin = await createAdmin();
    const { wedding } = await setup();
    const result = await request(app).patch(`/admin/weddings/${wedding.id}/plan`).set(authorized(admin.token)).send({ plan: 'premium' });
    expect(result.body.plan).toBe('premium');
    expect(await Order.countDocuments({ wedding: wedding.id, method: 'manual', amount: 0, status: 'paid' })).toBe(1);
  });

  it('marks an order paid without lowering the wedding plan', async () => {
    const admin = await createAdmin();
    const { account, wedding } = await setup();
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    await Order.create({ orderCode: 12345, wedding: wedding.id, user: account.user.id, plan: 'basic', amount: 30000 });
    const result = await request(app).post('/admin/orders/12345/mark-paid').set(authorized(admin.token));
    expect(result.body.status).toBe('paid');
    expect((await Wedding.findById(wedding.id)).plan).toBe('premium');
  });

  it('validates and updates settings', async () => {
    const admin = await createAdmin();
    const path = '/admin/settings';
    expect((await request(app).put(path).set(authorized(admin.token)).send({ prices: { basic: 999 } })).status).toBe(400);
    const result = await request(app).put(path).set(authorized(admin.token)).send({ prices: { basic: 40000 } });
    expect(result.status).toBe(200);
    expect((await request(app).get('/public/pricing')).body.prices.basic).toBe(40000);
  });
});
