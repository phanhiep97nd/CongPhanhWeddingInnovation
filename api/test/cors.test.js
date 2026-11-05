import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register } from './helpers/db';
useDatabase();

describe('local preview origins', () => {
  it.each(['http://localhost:3100', 'http://127.0.0.1:3100', 'http://[::1]:3100'])('allows login and preflight from %s', async origin => {
    await register();
    const preflight = await request(app).options('/auth/login').set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    const login = await request(app).post('/auth/login').set('Origin', origin).send({ email: 'owner@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.headers['access-control-allow-origin']).toBe(origin);
  });
  it.each(['http://127.0.0.1.example.com:3100', 'http://localhost.example.com', 'http://192.168.1.1:3100', 'http://localhost:3100/path', 'http://user@localhost:3100', 'null'])('keeps unapproved origins blocked: %s', async origin => {
    const result = await request(app).post('/auth/login').set('Origin', origin).send({ email: 'owner@example.com', password: 'password123' });
    expect(result.status).toBe(403);
    expect(result.body.message).toBe('Nguồn truy cập không được phép');
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
  });
});
