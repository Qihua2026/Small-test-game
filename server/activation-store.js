import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export function normalizeCode(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createPlainCode(prefix = 'XQ') {
  const bytes = randomBytes(12);
  let value = '';
  for (let index = 0; index < 12; index += 1) value += ALPHABET[bytes[index] % ALPHABET.length];
  return `${prefix}-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
}

export function signAccessToken(payload, secret) {
  const body = encode(payload);
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyAccessToken(token, secret, now = Date.now()) {
  try {
    const [body, signature] = String(token).split('.');
    if (!body || !signature) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch { return null; }
}

export class ActivationStore {
  constructor(filePath, { secret, accessDays = 30 } = {}) {
    if (!secret) throw new Error('Activation secret is required');
    this.filePath = filePath;
    this.secret = secret;
    this.accessDays = accessDays;
    this.writeQueue = Promise.resolve();
  }

  async readData() {
    try { return JSON.parse(await readFile(this.filePath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { version: 1, codes: [] };
    }
  }

  async writeData(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  async mutate(operation) {
    const queued = this.writeQueue.then(async () => {
      const data = await this.readData();
      const result = await operation(data);
      await this.writeData(data);
      return result;
    });
    this.writeQueue = queued.catch(() => {});
    return queued;
  }

  async generate(count, { batchId = new Date().toISOString().slice(0, 10), expiresAt = null, orders = [] } = {}) {
    if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Count must be between 1 and 10000');
    return this.mutate(data => {
      const plainCodes = [];
      for (let index = 0; index < count; index += 1) {
        let code;
        do { code = createPlainCode(); } while (data.codes.some(item => item.codeHash === hash(normalizeCode(code))));
        data.codes.push({
          id: randomBytes(12).toString('hex'), codeHash: hash(normalizeCode(code)), suffix: code.slice(-4),
          batchId, orderId: orders[index] || null, status: 'unused', createdAt: new Date().toISOString(), expiresAt,
          activatedAt: null, clientHash: null, lastAccessAt: null
        });
        plainCodes.push(code);
      }
      return plainCodes;
    });
  }

  async activate(code, clientId, now = Date.now()) {
    const normalized = normalizeCode(code);
    if (normalized.length < 10 || !clientId) return { ok: false, reason: 'INVALID_CODE' };
    return this.mutate(data => {
      const record = data.codes.find(item => item.codeHash === hash(normalized));
      if (!record) return { ok: false, reason: 'INVALID_CODE' };
      if (record.status === 'revoked') return { ok: false, reason: 'REVOKED' };
      if (record.expiresAt && Date.parse(record.expiresAt) <= now) return { ok: false, reason: 'EXPIRED' };
      const clientHash = hash(clientId);
      if (record.clientHash && record.clientHash !== clientHash) return { ok: false, reason: 'ALREADY_USED' };
      if (!record.clientHash) {
        record.clientHash = clientHash;
        record.status = 'active';
        record.activatedAt = new Date(now).toISOString();
      }
      record.lastAccessAt = new Date(now).toISOString();
      const exp = now + this.accessDays * 86400000;
      return { ok: true, token: signAccessToken({ sub: record.id, client: clientHash, exp }, this.secret), expiresAt: new Date(exp).toISOString() };
    });
  }

  async verify(token, clientId, now = Date.now()) {
    const payload = verifyAccessToken(token, this.secret, now);
    if (!payload || payload.client !== hash(clientId)) return false;
    const data = await this.readData();
    const record = data.codes.find(item => item.id === payload.sub);
    return Boolean(record && record.status === 'active' && record.clientHash === payload.client);
  }

  async list(query = '') {
    const needle = String(query).trim().toLowerCase();
    const data = await this.readData();
    return data.codes
      .filter(item => !needle || [item.suffix, item.orderId, item.batchId].some(value => String(value || '').toLowerCase().includes(needle)))
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }

  async update(id, action) {
    return this.mutate(data => {
      const record = data.codes.find(item => item.id === id);
      if (!record) return false;
      if (action === 'revoke') record.status = 'revoked';
      else if (action === 'reset') {
        record.status = 'unused'; record.clientHash = null; record.activatedAt = null; record.lastAccessAt = null;
      } else return false;
      return true;
    });
  }
}
