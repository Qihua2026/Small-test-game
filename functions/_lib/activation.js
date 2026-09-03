const encoder = new TextEncoder();
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const json = (payload, status = 200) => Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
export const normalizeCode = (value = '') => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(String(value)));
  return [...new Uint8Array(bytes)].map(item => item.toString(16).padStart(2, '0')).join('');
}

const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const fromBase64url = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function signToken(payload, secret) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${base64url(await hmac(body, secret))}`;
}

export async function verifyToken(token, secret) {
  try {
    const [body, signature] = String(token).split('.');
    if (!body || !signature) return null;
    const expected = await hmac(body, secret);
    const actual = fromBase64url(signature);
    if (actual.length !== expected.length) return null;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    if (difference !== 0) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

export function plainCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const value = [...bytes].map(item => alphabet[item % alphabet.length]).join('');
  return `XQ-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

export function requireAdmin(request, env) {
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(env.ADMIN_SECRET && provided && provided === env.ADMIN_SECRET);
}

export async function enforceAttemptLimit(request, env) {
  const now = Date.now();
  const cutoff = now - 10 * 60 * 1000;
  const source = request.headers.get('CF-Connecting-IP') || 'local';
  const sourceHash = await sha256(`${source}:${env.RATE_LIMIT_SALT || env.ACTIVATION_SECRET}`);
  await env.DB.prepare('DELETE FROM activation_attempts WHERE created_at < ?').bind(cutoff).run();
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM activation_attempts WHERE source_hash = ? AND created_at >= ?').bind(sourceHash, cutoff).first();
  if ((row?.count || 0) >= 10) return false;
  await env.DB.prepare('INSERT INTO activation_attempts (source_hash, created_at) VALUES (?, ?)').bind(sourceHash, now).run();
  return true;
}
