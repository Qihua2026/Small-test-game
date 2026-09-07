const express = require('express');
const cloudbase = require('@cloudbase/node-sdk');
const { randomUUID } = require('node:crypto');
const { normalizeCode, plainCode, secretsEqual, sha256, signToken, verifyToken } = require('./lib/security');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

const ACCESS_DAYS = Number(process.env.ACCESS_DAYS || 30);
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_LIMIT = 10;
const required = ['ACTIVATION_SECRET', 'ADMIN_SECRET', 'CLOUDBASE_APIKEY'];
const missing = required.filter(name => !process.env[name]);

const cloud = cloudbase.init({
  env: process.env.TCB_ENV || cloudbase.SYMBOL_DEFAULT_ENV,
  accessKey: process.env.CLOUDBASE_APIKEY
});
const db = cloud.database();
const codes = db.collection('activation_codes');
const attempts = db.collection('activation_attempts');

function documentData(result) {
  if (Array.isArray(result?.data)) return result.data[0] || null;
  return result?.data || null;
}

function send(res, status, payload) {
  res.set('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function requireAdmin(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secretsEqual(token, process.env.ADMIN_SECRET)) return send(res, 401, { error: 'UNAUTHORIZED' });
  return next();
}

async function enforceAttemptLimit(req) {
  const source = String(req.ip || req.socket.remoteAddress || 'unknown');
  const sourceHash = sha256(`${source}:${process.env.RATE_LIMIT_SALT || process.env.ACTIVATION_SECRET}`);
  const cutoff = new Date(Date.now() - ATTEMPT_WINDOW_MS);
  const recent = await attempts.where({ sourceHash, createdAt: db.command.gte(cutoff) }).count();
  if ((recent.total || 0) >= ATTEMPT_LIMIT) return false;
  await attempts.add({ sourceHash, createdAt: new Date() });
  return true;
}

app.get('/api/health', (_req, res) => {
  send(res, missing.length ? 503 : 200, {
    ok: missing.length === 0,
    service: 'activation-api',
    missing
  });
});

app.post('/api/activate', async (req, res, next) => {
  try {
    if (missing.length) return send(res, 503, { ok: false, reason: 'SERVICE_NOT_CONFIGURED' });
    if (!await enforceAttemptLimit(req)) return send(res, 429, { ok: false, reason: 'TOO_MANY_ATTEMPTS' });
    const normalized = normalizeCode(req.body?.code);
    const clientId = req.body?.clientId;
    if (normalized.length < 10 || !clientId) return send(res, 400, { ok: false, reason: 'INVALID_CODE' });
    const codeHash = sha256(normalized);
    const clientHash = sha256(clientId);
    const now = Date.now();

    const transactionResult = await db.runTransaction(async transaction => {
      const result = await transaction.collection('activation_codes').doc(codeHash).get();
      const record = documentData(result);
      if (!record) return { ok: false, reason: 'INVALID_CODE' };
      if (record.status === 'revoked') return { ok: false, reason: 'REVOKED' };
      if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) return { ok: false, reason: 'EXPIRED' };
      if (record.clientHash && record.clientHash !== clientHash) return { ok: false, reason: 'ALREADY_USED' };
      await transaction.collection('activation_codes').doc(codeHash).update({
        status: 'active', clientHash,
        activatedAt: record.activatedAt || new Date(now), lastAccessAt: new Date(now)
      });
      return { ok: true };
    });
    const outcome = transactionResult?.result || transactionResult;

    if (!outcome.ok) return send(res, 400, outcome);
    const exp = now + ACCESS_DAYS * 86400000;
    return send(res, 200, {
      ok: true,
      token: signToken({ sub: codeHash, client: clientHash, exp }, process.env.ACTIVATION_SECRET),
      expiresAt: new Date(exp).toISOString()
    });
  } catch (error) { return next(error); }
});

app.post('/api/access/status', async (req, res, next) => {
  try {
    if (missing.length) return send(res, 200, { active: false });
    const payload = verifyToken(req.body?.token, process.env.ACTIVATION_SECRET);
    if (!payload || payload.client !== sha256(req.body?.clientId || '')) return send(res, 200, { active: false });
    const result = await codes.doc(payload.sub).get();
    const record = documentData(result);
    return send(res, 200, { active: Boolean(record && record.status === 'active' && record.clientHash === payload.client) });
  } catch (error) { return next(error); }
});

app.get('/api/admin/codes', requireAdmin, async (req, res, next) => {
  try {
    const query = String(req.query.query || '').trim().toLowerCase();
    const result = await codes.orderBy('createdAt', 'desc').limit(100).get();
    const list = (result.data || []).filter(item => !query || [item.suffix, item.orderId, item.batchId]
      .some(value => String(value || '').toLowerCase().includes(query)));
    return send(res, 200, { codes: list.map(item => ({
      id: item._id, suffix: item.suffix, order_id: item.orderId || null, batch_id: item.batchId,
      status: item.status, activated_at: item.activatedAt ? new Date(item.activatedAt).getTime() : null
    })) });
  } catch (error) { return next(error); }
});

app.post('/api/admin/codes', requireAdmin, async (req, res, next) => {
  try {
    const orders = Array.isArray(req.body?.orders) ? req.body.orders.map(value => String(value).trim()).filter(Boolean) : [];
    const count = orders.length || Number(req.body?.count);
    if (!Number.isInteger(count) || count < 1 || count > 500) return send(res, 400, { error: 'INVALID_COUNT' });
    const batchId = String(req.body?.batchId || `batch-${new Date().toISOString().slice(0, 10)}`).slice(0, 100);
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return send(res, 400, { error: 'INVALID_EXPIRY' });
    const generated = [];

    for (let index = 0; index < count; index += 1) {
      let stored = false;
      for (let retry = 0; retry < 5 && !stored; retry += 1) {
        const code = plainCode();
        const codeHash = sha256(normalizeCode(code));
        try {
          await codes.add({
            _id: codeHash, id: randomUUID(), suffix: code.slice(-4), orderId: orders[index] || null,
            batchId, status: 'unused', createdAt: new Date(), expiresAt,
            activatedAt: null, clientHash: null, lastAccessAt: null
          });
          generated.push({ code, orderId: orders[index] || null });
          stored = true;
        } catch (error) {
          if (retry === 4) throw error;
        }
      }
    }
    return send(res, 201, { ok: true, batchId, codes: generated });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/codes', requireAdmin, async (req, res, next) => {
  try {
    const { id, action } = req.body || {};
    if (!id || !['revoke', 'reset'].includes(action)) return send(res, 400, { error: 'INVALID_ACTION' });
    const existing = await codes.doc(id).get();
    if (!documentData(existing)) return send(res, 404, { error: 'NOT_FOUND' });
    if (action === 'revoke') await codes.doc(id).update({ status: 'revoked' });
    else await codes.doc(id).update({ status: 'unused', clientHash: null, activatedAt: null, lastAccessAt: null });
    return send(res, 200, { ok: true });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  console.error('activation-api request failed', error?.message || error);
  if (!res.headersSent) send(res, 500, { error: 'REQUEST_FAILED' });
});

const port = Number(process.env.PORT || 9000);
app.listen(port, error => {
  if (error) {
    console.error('activation-api failed to start', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`activation-api listening on ${port}`);
});
