import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ActivationStore, normalizeCode, verifyAccessToken } from '../server/activation-store.js';

async function fixture(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'xiaozhu-activation-'));
  return new ActivationStore(join(directory, 'codes.json'), { secret: 'test-secret', ...options });
}

test('generates unique human-readable codes but stores only hashes', async () => {
  const store = await fixture();
  const codes = await store.generate(25, { batchId: 'order-test' });
  assert.equal(new Set(codes).size, 25);
  assert.match(codes[0], /^XQ-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const stored = await readFile(store.filePath, 'utf8');
  assert.equal(stored.includes(codes[0]), false);
  assert.equal(JSON.parse(stored).codes[0].batchId, 'order-test');
});

test('binds a code to the first device and permits same-device reactivation', async () => {
  const store = await fixture();
  const [code] = await store.generate(1);
  const first = await store.activate(code, 'device-a');
  const again = await store.activate(code.toLowerCase().replaceAll('-', ' '), 'device-a');
  const other = await store.activate(code, 'device-b');
  assert.equal(first.ok, true);
  assert.equal(again.ok, true);
  assert.deepEqual(other, { ok: false, reason: 'ALREADY_USED' });
  assert.equal(await store.verify(first.token, 'device-a'), true);
  assert.equal(await store.verify(first.token, 'device-b'), false);
});

test('rejects invalid, expired, and tampered access', async () => {
  const store = await fixture();
  assert.deepEqual(await store.activate('XQ-NOT-REAL-CODE', 'device'), { ok: false, reason: 'INVALID_CODE' });
  const expiredStore = await fixture();
  const [expired] = await expiredStore.generate(1, { expiresAt: '2020-01-01T00:00:00.000Z' });
  assert.deepEqual(await expiredStore.activate(expired, 'device'), { ok: false, reason: 'EXPIRED' });
  assert.equal(verifyAccessToken('bad.token', 'test-secret'), null);
});

test('normalizes pasted activation codes', () => {
  assert.equal(normalizeCode(' xq-abcd 2345-efgh '), 'XQABCD2345EFGH');
});

test('seller can search, reset and revoke a code', async () => {
  const store = await fixture();
  const [code] = await store.generate(1, { batchId: 'launch', orders: ['ORDER-42'] });
  const [record] = await store.list('order-42');
  assert.equal(record.orderId, 'ORDER-42');
  const activated = await store.activate(code, 'device-a');
  assert.equal(await store.verify(activated.token, 'device-a'), true);
  assert.equal(await store.update(record.id, 'reset'), true);
  assert.equal(await store.verify(activated.token, 'device-a'), false);
  assert.equal((await store.activate(code, 'device-b')).ok, true);
  assert.equal(await store.update(record.id, 'revoke'), true);
  assert.equal((await store.activate(code, 'device-b')).reason, 'REVOKED');
});
