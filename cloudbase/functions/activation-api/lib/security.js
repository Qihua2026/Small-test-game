const { createHash, createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function normalizeCode(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function plainCode(prefix = 'XQ') {
  const bytes = randomBytes(12);
  let value = '';
  for (let index = 0; index < bytes.length; index += 1) value += ALPHABET[bytes[index] % ALPHABET.length];
  return `${prefix}-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token, secret, now = Date.now()) {
  try {
    const [body, signature] = String(token).split('.');
    if (!body || !signature || !secret) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp > now ? payload : null;
  } catch { return null; }
}

function secretsEqual(left, right) {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

module.exports = { normalizeCode, plainCode, secretsEqual, sha256, signToken, verifyToken };
