import { json, sha256, verifyToken } from '../../_lib/activation.js';

export async function onRequestPost({ request, env }) {
  const { token, clientId } = await request.json().catch(() => ({}));
  const payload = await verifyToken(token, env.ACTIVATION_SECRET || '');
  if (!payload || payload.client !== await sha256(clientId || '')) return json({ active: false });
  const record = await env.DB.prepare('SELECT status, client_hash FROM activation_codes WHERE id = ?').bind(payload.sub).first();
  return json({ active: Boolean(record && record.status === 'active' && record.client_hash === payload.client) });
}
