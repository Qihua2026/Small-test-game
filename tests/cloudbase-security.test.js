import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeCode, plainCode, secretsEqual, sha256, signToken, verifyToken } = require('../cloudbase/functions/activation-api/lib/security.js');

test('CloudBase security helpers normalize and hash activation codes', () => {
  const code = plainCode();
  assert.match(code, /^XQ-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(normalizeCode(` ${code.toLowerCase()} `), code.replaceAll('-', ''));
  assert.equal(sha256('same'), sha256('same'));
  assert.notEqual(sha256('same'), sha256('different'));
});

test('CloudBase access tokens reject tampering, expiry and wrong secrets', () => {
  const now = Date.now();
  const token = signToken({ sub: 'code', client: 'device', exp: now + 1000 }, 'secret');
  assert.equal(verifyToken(token, 'secret', now).sub, 'code');
  assert.equal(verifyToken(token, 'wrong', now), null);
  assert.equal(verifyToken(`${token}x`, 'secret', now), null);
  assert.equal(verifyToken(token, 'secret', now + 1001), null);
  assert.equal(secretsEqual('admin', 'admin'), true);
  assert.equal(secretsEqual('admin', 'other'), false);
});
