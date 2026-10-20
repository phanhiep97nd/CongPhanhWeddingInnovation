const crypto = require('node:crypto');

const BASE_URL = 'https://api-merchant.payos.vn';

function isConfigured() {
  return !!(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY && process.env.SITE_ORIGIN);
}

function signature(value) {
  return crypto.createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY || '').update(value).digest('hex');
}

function signCreate(data) {
  return signature(`amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`);
}

function sortedQuery(data) {
  return Object.keys(data).sort().map(key => {
    const value = data[key];
    const formatted = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `${key}=${formatted}`;
  }).join('&');
}

function signData(data) {
  return signature(sortedQuery(data));
}

function verifyWebhook(body) {
  if (!body || !body.data || typeof body.signature !== 'string') return false;
  const expected = Buffer.from(signData(body.data), 'hex');
  const actual = Buffer.from(body.signature, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function requestPayos(path, options = {}) {
  const result = await fetch(`${BASE_URL}${path}`, {
    ...options,
    // Do not let a slow PayOS hold the user's request open indefinitely.
    signal: AbortSignal.timeout(10000),
    headers: {
      'x-client-id': process.env.PAYOS_CLIENT_ID,
      'x-api-key': process.env.PAYOS_API_KEY,
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  const payload = await result.json();
  if (!result.ok || payload.code !== '00') throw new Error('PayOS không khả dụng');
  return payload.data;
}

function createPaymentLink(data) {
  return requestPayos('/v2/payment-requests', {
    method: 'POST',
    body: JSON.stringify({ ...data, signature: signCreate(data) })
  });
}

function getPaymentStatus(orderCode) {
  return requestPayos(`/v2/payment-requests/${orderCode}`);
}

module.exports = { isConfigured, signCreate, signData, verifyWebhook, createPaymentLink, getPaymentStatus };
