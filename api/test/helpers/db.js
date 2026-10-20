import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const app = require('../../app');
const User = require('../../models/User');
const Wedding = require('../../models/Wedding');
const Guest = require('../../models/Guest');
const Photo = require('../../models/Photo');

export { app, request, User, Wedding, Guest, Photo };

export function useDatabase() {
  let mongo;

  beforeAll(async () => {
    if (process.env.MONGOMS_EXTERNAL_URI) {
      await mongoose.connect(process.env.MONGOMS_EXTERNAL_URI);
    } else {
      mongo = await MongoMemoryServer.create();
      await mongoose.connect(mongo.getUri());
    }
    await Promise.all([User.init(), Wedding.init(), Guest.init(), Photo.init()]);
  }, 60000);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      Guest.deleteMany({}),
      Photo.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
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
