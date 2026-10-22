import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { useDatabase, User, Wedding, Guest, Photo, Order, register, createWedding, app, request } from './helpers/db';
const require = createRequire(import.meta.url);
const db = require('../db');
const { newId } = require('../db/model');
const { applyPaidOrder } = require('../lib/orders');
const { importDocuments } = require('../scripts/import-mongo-export');
useDatabase();

describe('PostgreSQL persistence', () => {
  it('applies migrations once and checks database readiness', async () => {
    await db.migrate();
    expect((await db.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count).toBe(1);
    expect((await request(app).get('/')).body).toEqual({ status: 'ok' });
  });

  it('enforces uniqueness and foreign keys in SQL', async () => {
    const user = await User.create({ email: 'a@example.com', passwordHash: 'hash', name: 'A' });
    await expect(User.create({ email: user.email, passwordHash: 'other', name: 'B' })).rejects.toMatchObject({ code: '23505' });
    await expect(Wedding.create({ owner: newId(), slug: 'orphan' })).rejects.toMatchObject({ code: '23503' });
  });

  it('rolls back paid status if activating the wedding plan fails', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    const order = await Order.create({ orderCode: 777, user: account.user.id, wedding: wedding.id, plan: 'basic', amount: 30000 });
    const original = Wedding.updateOne;
    Wedding.updateOne = async () => { throw new Error('simulate unavailable write'); };
    try { await expect(applyPaidOrder(order)).rejects.toThrow('simulate unavailable write'); }
    finally { Wedding.updateOne = original; }
    expect((await Order.findById(order._id)).status).toBe('pending');
    expect((await Wedding.findById(wedding.id)).plan).toBe('free');
  });

  it('saves only changed editor fields after a concurrent plan upgrade', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    const editor = await Wedding.findById(wedding.id);
    await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
    editor.dateText = 'Ngày mới';
    await editor.save();
    expect((await Wedding.findById(wedding.id)).plan).toBe('premium');
  });

  it('deletes wedding children and retains paid order history', async () => {
    const account = await register();
    const wedding = (await createWedding(account.token)).body;
    await Guest.create({ wedding: wedding.id, name: 'A', invitationName: 'A' });
    await Photo.create({ wedding: wedding.id, url: 'https://example.com/a.jpg' });
    const order = await Order.create({ orderCode: 778, user: account.user.id, wedding: wedding.id, plan: 'basic', amount: 30000 });
    await Wedding.deleteMany({ _id: wedding.id });
    expect(await Guest.countDocuments()).toBe(0);
    expect(await Photo.countDocuments()).toBe(0);
    expect((await Order.findById(order._id)).wedding).toBeNull();
  });

  it('dry-runs Mongo exports and imports IDs, password hashes and dates unchanged', async () => {
    const userId = newId();
    const weddingId = newId();
    const { decode } = require('../scripts/import-mongo-export');
    const exports = decode({
      users: [{ _id: { $oid: userId }, email: 'old@example.com', passwordHash: 'bcrypt-original', name: 'Old', createdAt: { $date: '2025-01-01T00:00:00Z' } }],
      weddings: [{ _id: { $oid: weddingId }, owner: { $oid: userId }, slug: 'old-link', plan: 'premium' }],
      guests: [], photos: [], orders: [], settings: []
    });
    const counts = await importDocuments(exports);
    expect(counts.users).toBe(1);
    expect(await User.countDocuments()).toBe(0);
    await importDocuments(exports, { apply: true });
    const stored = await User.findById(userId);
    expect(stored.passwordHash).toBe('bcrypt-original');
    expect(stored.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect((await Wedding.findById(weddingId)).slug).toBe('old-link');
    await expect(importDocuments(exports, { apply: true })).rejects.toThrow('phải trống');
  });

  it('rolls back the entire import when a foreign key is missing', async () => {
    const exports = { users: [{ _id: newId(), email: 'valid@example.com', passwordHash: 'hash', name: 'A' }], weddings: [{ _id: newId(), owner: newId(), slug: 'broken' }], guests: [], photos: [], orders: [], settings: [] };
    await expect(importDocuments(exports, { apply: true })).rejects.toMatchObject({ code: '23503' });
    expect(await User.countDocuments()).toBe(0);
  });
});
