import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, authorized } from './helpers/db';

useDatabase();

describe('authentication', () => {
  it('registers and returns a token without password hash', async () => {
    const account = await register();
    expect(account.token).toBeTruthy();
    expect(account.user.id).toBeTruthy();
    expect(account.user.passwordHash).toBeUndefined();
  });

  it('rejects a short password', async () => {
    const result = await request(app).post('/auth/register').send({ email: 'a@b.co', password: 'short', name: 'A' });
    expect(result.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const result = await request(app).post('/auth/register').send({ email: 'wrong', password: 'password123', name: 'A' });
    expect(result.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    await register();
    const result = await request(app).post('/auth/register').send({
      email: 'owner@example.com', password: 'password123', name: 'Other'
    });
    expect(result.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    await register();
    const result = await request(app).post('/auth/login').send({ email: 'owner@example.com', password: 'password123' });
    expect(result.status).toBe(200);
    expect(result.body.token).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    await register();
    const result = await request(app).post('/auth/login').send({ email: 'owner@example.com', password: 'wrong' });
    expect(result.status).toBe(401);
  });

  it('returns the signed in user', async () => {
    const account = await register();
    const result = await request(app).get('/auth/me').set(authorized(account.token));
    expect(result.body.user.id).toBe(account.user.id);
  });

  it('rejects an invalid bearer token', async () => {
    const result = await request(app).get('/auth/me').set('Authorization', 'Bearer bad');
    expect(result.status).toBe(401);
  });

  it('reports malformed JSON as 400', async () => {
    const result = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{');
    expect(result.status).toBe(400);
  });
});
