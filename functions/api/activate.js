import { enforceAttemptLimit, json, normalizeCode, sha256, signToken } from '../_lib/activation.js';

export async function onRequestPost({ request, env }) {
  if (!env.ACTIVATION_SECRET) return json({ ok: false, reason: 'SERVICE_NOT_CONFIGURED' }, 503);
  if (!await enforceAttemptLimit(request, env)) return json({ ok: false, reason: 'TOO_MANY_ATTEMPTS' }, 429);
  const { code, clientId } = await request.json().catch(() => ({}));
  const normalized = normalizeCode(code);
  if (normalized.length < 10 || !clientId) return json({ ok: false, reason: 'INVALID_CODE' }, 400);
  const codeHash = await sha256(normalized);
  const clientHash = await sha256(clientId);
  const record = await env.DB.prepare('SELECT * FROM activation_codes WHERE code_hash = ?').bind(codeHash).first();
  if (!record) return json({ ok: false, reason: 'INVALID_CODE' }, 400);
  if (record.status === 'revoked') return json({ ok: false, reason: 'REVOKED' }, 400);
  if (record.expires_at && record.expires_at <= Date.now()) return json({ ok: false, reason: 'EXPIRED' }, 400);
  if (record.client_hash && record.client_hash !== clientHash) return json({ ok: false, reason: 'ALREADY_USED' }, 400);

  const now = Date.now();
  if (!record.client_hash) {
    const update = await env.DB.prepare("UPDATE activation_codes SET status = 'active', client_hash = ?, activated_at = ?, last_access_at = ? WHERE id = ? AND client_hash IS NULL").bind(clientHash, now, now, record.id).run();
    if (!update.meta.changes) {
      const latest = await env.DB.prepare('SELECT client_hash FROM activation_codes WHERE id = ?').bind(record.id).first();
      if (latest?.client_hash !== clientHash) return json({ ok: false, reason: 'ALREADY_USED' }, 400);
    }
  } else {
    await env.DB.prepare('UPDATE activation_codes SET last_access_at = ? WHERE id = ?').bind(now, record.id).run();
  }
  const exp = now + 30 * 86400000;
  const token = await signToken({ sub: record.id, client: clientHash, exp }, env.ACTIVATION_SECRET);
  return json({ ok: true, token, expiresAt: new Date(exp).toISOString() });
}
