import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const payos = require('../lib/payos');

describe('PayOS signatures', () => {
  beforeEach(() => {
    process.env.PAYOS_CHECKSUM_KEY = 'known-secret';
  });

  afterEach(() => {
    delete process.env.PAYOS_CHECKSUM_KEY;
  });

  it('signs create request in PayOS field order', () => {
    const data = { amount: 30000, cancelUrl: 'https://example.com/cancel', description: 'TC123', orderCode: 123, returnUrl: 'https://example.com/return' };
    const independent = crypto.createHmac('sha256', 'known-secret')
      .update('amount=30000&cancelUrl=https://example.com/cancel&description=TC123&orderCode=123&returnUrl=https://example.com/return')
      .digest('hex');
    expect(payos.signCreate(data)).toBe(independent);
  });

  it('sorts webhook fields and stringifies nested values', () => {
    const data = { z: null, b: [1, 2], a: 'yes' };
    const expected = crypto.createHmac('sha256', 'known-secret').update('a=yes&b=[1,2]&z=').digest('hex');
    expect(payos.signData(data)).toBe(expected);
  });

  it('accepts a valid webhook signature', () => {
    const data = { amount: 30000, orderCode: 123, code: '00' };
    expect(payos.verifyWebhook({ data, signature: payos.signData(data) })).toBe(true);
  });

  it('rejects a tampered webhook', () => {
    const data = { amount: 30000, orderCode: 123 };
    expect(payos.verifyWebhook({ data: { ...data, amount: 1 }, signature: payos.signData(data) })).toBe(false);
  });

  it('rejects a malformed signature', () => {
    expect(payos.verifyWebhook({ data: {}, signature: 'bad' })).toBe(false);
  });
});
