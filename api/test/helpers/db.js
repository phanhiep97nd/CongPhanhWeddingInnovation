import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const db = require('../../db');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const app = require('../../app');
const User = require('../../models/User');
const Wedding = require('../../models/Wedding');
const Guest = require('../../models/Guest');
const Photo = require('../../models/Photo');
const Order = require('../../models/Order');
const { Settings, invalidateSettings } = require('../../models/Settings');

export { app, request, User, Wedding, Guest, Photo, Order, Settings };

export function useDatabase() {
  let database;

  beforeAll(async () => {
    database = new PGlite();
    db.useTestDatabase(database);
    await db.migrate();
  }, 60000);

  beforeEach(async () => {
    await db.query('TRUNCATE users, weddings, guests, photos, orders, settings CASCADE');
    invalidateSettings();
  });

  afterAll(async () => {
    db.useTestDatabase(undefined);
    if (database) await database.close();
  });
}

export async function register(email = 'owner@example.com') {
  const response = await request(app).post('/auth/register').send({
    email,
    password: 'password123',
    name: 'Owner'
  });
  return response.body;
}

export async function createWedding(token, body = {}) {
  return request(app).post('/weddings')
    .set('Authorization', `Bearer ${token}`)
    .send({ slug: 'my-wedding', ...body });
}

export function authorized(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function createAdmin(email = 'admin@example.com') {
  const account = await register(email);
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  return account;
}

export async function payOrder(order) {
  const { applyPaidOrder } = require('../../lib/orders');
  return applyPaidOrder(order);
}
