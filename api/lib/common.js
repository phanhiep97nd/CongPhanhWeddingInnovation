const crypto = require('crypto');

function fail(message = 'Dữ liệu không hợp lệ') {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function string(value, max = 100, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail();
  return value.trim();
}

function bool(value) {
  if (typeof value !== 'boolean') fail();
  return value;
}

function count(value) {
  if (!Number.isInteger(value) || value < 0 || value > 20) fail('Số khách không hợp lệ');
  return value;
}

function url(value) {
  const result = string(value, 2048);
  if (result && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(result)) fail('URL phải bắt đầu bằng https://');
  return result;
}

function color(value) {
  const result = string(value, 7);
  if (!/^#[0-9a-fA-F]{6}$/.test(result)) fail('Màu không hợp lệ');
  return result;
}

function id() {
  return crypto.randomBytes(6).toString('base64url');
}

function code() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let index = 0; index < 8; index++) result += characters[crypto.randomInt(characters.length)];
  return result;
}

function pick(body, fields) {
  const result = {};
  for (const [key, validator] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) result[key] = validator(body[key]);
  }
  return result;
}

function shape(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return pick(value, fields);
}

function items(value, max, fields) {
  if (!Array.isArray(value) || value.length > max) fail();
  return value.map(item => ({ id: id(), ...shape(item, fields) }));
}

module.exports = { fail, string, bool, count, url, color, id, code, pick, shape, items };
