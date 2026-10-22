import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, app, request, authorized, register, createWedding, User, Wedding, Order } from './helpers/db';
const require = createRequire(import.meta.url);
const { provisionAccounts } = require('../scripts/provision-accounts');
useDatabase();

async function login(account) {
  const response = await request(app).post('/auth/login').send({ email: account.email, password: account.password });
  expect(response.status).toBe(200);
  return response.body;
}

describe('privileged account provisioning', () => {
  it('creates separate admin and creator credentials with distinct admin access', async () => {
    const accounts = await provisionAccounts();
    expect(accounts).toHaveLength(2);
    expect(accounts.every(account => account.created && account.password.length >= 24)).toBe(true);
    expect(accounts[0].password).not.toBe(accounts[1].password);
    const admin = await login(accounts[0]);
    const creator = await login(accounts[1]);
    expect(admin.user.role).toBe('admin');
    expect(creator.user.role).toBe('user');
    expect((await request(app).get('/admin/stats').set(authorized(admin.token))).status).toBe(200);
    expect((await request(app).get('/admin/stats').set(authorized(creator.token))).status).toBe(403);
  });

  it('lets both accounts create premium invitations with all entitlements', async () => {
    const accounts = await provisionAccounts();
    for (const [index, account] of accounts.entries()) {
      const signedIn = await login(account);
      const slug = `full-access-${index}`;
      const response = await createWedding(signedIn.token, { slug, template: 'minimal' });
      expect(response.status).toBe(201);
      expect(response.body.plan).toBe('premium');
      expect(response.body.slug).toBe(slug);
      expect(Object.values(response.body.entitlements).every(Boolean)).toBe(true);
      expect(response.body.limits.guests).toBeNull();
      expect(response.body.expiresAt).toBeNull();
      const second = await createWedding(signedIn.token, { slug: `${slug}-second`, template: 'hy3d' });
      expect(second.status).toBe(201);
      expect(second.body.plan).toBe('premium');
    }
  });

  it('preserves existing passwords and upgrades existing invitations only once', async () => {
    const owner = await register('creator@hythiep.net');
    const wedding = (await createWedding(owner.token)).body;
    const oldHash = (await User.findById(owner.user.id)).passwordHash;
    const accounts = await provisionAccounts();
    expect(accounts[1].created).toBe(false);
    expect(accounts[1].password).toBeNull();
    expect((await User.findById(owner.user.id)).passwordHash).toBe(oldHash);
    expect((await Wedding.findById(wedding.id)).plan).toBe('premium');
    expect(await Order.countDocuments({ wedding: wedding.id, method: 'manual', amount: 0 })).toBe(1);
    await provisionAccounts();
    expect(await User.countDocuments()).toBe(2);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('does not let registration or invitation payloads grant premium rights', async () => {
    const response = await request(app).post('/auth/register').send({ email: 'ordinary@example.com', password: 'password123', name: 'Ordinary', role: 'admin', defaultWeddingPlan: 'premium' });
    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('user');
    expect(response.body.user.defaultWeddingPlan).toBe('free');
    const wedding = await createWedding(response.body.token, { plan: 'premium', defaultWeddingPlan: 'premium' });
    expect(wedding.body.plan).toBe('free');
    expect(wedding.body.slug).toMatch(/^my-wedding-[a-z0-9]{4}$/);
    expect((await createWedding(response.body.token, { template: 'minimal' })).status).toBe(402);
  });

  it('rejects duplicate premium slugs without changing the requested URL', async () => {
    const accounts = await provisionAccounts();
    const owner = await login(accounts[1]);
    expect((await createWedding(owner.token, { slug: 'premium-link' })).status).toBe(201);
    expect((await createWedding(owner.token, { slug: 'premium-link' })).status).toBe(409);
  });

  it('rolls back all provisioning if the creator account is locked', async () => {
    const creator = await register('creator@hythiep.net');
    await User.updateOne({ _id: creator.user.id }, { $set: { status: 'locked' } });
    await expect(provisionAccounts()).rejects.toThrow('đang bị khóa');
    expect(await User.exists({ email: 'admin@hythiep.net' })).toBe(false);
    expect((await User.findById(creator.user.id)).defaultWeddingPlan).toBe('free');
  });
});
