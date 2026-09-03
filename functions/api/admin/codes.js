import { json, normalizeCode, plainCode, requireAdmin, sha256 } from '../../_lib/activation.js';

export async function onRequestGet({ request, env }) {
  if (!requireAdmin(request, env)) return json({ error: 'UNAUTHORIZED' }, 401);
  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim() || '';
  const statement = query
    ? env.DB.prepare('SELECT id, suffix, order_id, batch_id, status, created_at, expires_at, activated_at, last_access_at FROM activation_codes WHERE order_id LIKE ? OR batch_id LIKE ? OR suffix = ? ORDER BY created_at DESC LIMIT 100').bind(`%${query}%`, `%${query}%`, query.slice(-4).toUpperCase())
    : env.DB.prepare('SELECT id, suffix, order_id, batch_id, status, created_at, expires_at, activated_at, last_access_at FROM activation_codes ORDER BY created_at DESC LIMIT 100');
  return json({ codes: (await statement.all()).results });
}

export async function onRequestPost({ request, env }) {
  if (!requireAdmin(request, env)) return json({ error: 'UNAUTHORIZED' }, 401);
  const body = await request.json().catch(() => ({}));
  const count = Number(body.count || body.orders?.length || 0);
  if (!Number.isInteger(count) || count < 1 || count > 500) return json({ error: 'INVALID_COUNT' }, 400);
  const batchId = String(body.batchId || `batch-${new Date().toISOString().slice(0, 10)}`).slice(0, 100);
  const expiresAt = body.expiresAt ? Date.parse(body.expiresAt) : null;
  if (body.expiresAt && !Number.isFinite(expiresAt)) return json({ error: 'INVALID_EXPIRY' }, 400);
  const codes = [];
  const statements = [];
  for (let index = 0; index < count; index += 1) {
    const code = plainCode();
    const id = crypto.randomUUID();
    const orderId = body.orders?.[index] ? String(body.orders[index]).slice(0, 100) : null;
    codes.push({ code, orderId });
    statements.push(env.DB.prepare("INSERT INTO activation_codes (id, code_hash, suffix, order_id, batch_id, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, 'unused', ?, ?)").bind(id, await sha256(normalizeCode(code)), code.slice(-4), orderId, batchId, Date.now(), expiresAt));
  }
  await env.DB.batch(statements);
  return json({ ok: true, batchId, codes }, 201);
}

export async function onRequestPatch({ request, env }) {
  if (!requireAdmin(request, env)) return json({ error: 'UNAUTHORIZED' }, 401);
  const { id, action } = await request.json().catch(() => ({}));
  if (!id || !['revoke', 'reset'].includes(action)) return json({ error: 'INVALID_ACTION' }, 400);
  const statement = action === 'revoke'
    ? env.DB.prepare("UPDATE activation_codes SET status = 'revoked' WHERE id = ?")
    : env.DB.prepare("UPDATE activation_codes SET status = 'unused', client_hash = NULL, activated_at = NULL, last_access_at = NULL WHERE id = ? AND status != 'revoked'");
  const result = await statement.bind(id).run();
  return json({ ok: Boolean(result.meta.changes) }, result.meta.changes ? 200 : 404);
}
