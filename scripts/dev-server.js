import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { ActivationStore } from '../server/activation-store.js';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.ACTIVATION_SECRET) throw new Error('ACTIVATION_SECRET is required in production');
const secret = process.env.ACTIVATION_SECRET || 'development-only-secret-change-before-deploy';
const adminSecret = process.env.ADMIN_SECRET || 'development-admin';
const store = new ActivationStore(resolve(process.env.ACTIVATION_DATA_FILE || '.data/activation-codes.json'), { secret });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const attempts = new Map();

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let value = '';
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 8192) throw new Error('Body too large');
  }
  return JSON.parse(value || '{}');
}

function rateLimited(request) {
  const address = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(address) || []).filter(time => now - time < 10 * 60 * 1000);
  recent.push(now); attempts.set(address, recent);
  return recent.length > 10;
}

function isAdmin(request) {
  return request.headers.authorization === `Bearer ${adminSecret}`;
}

function adminRecord(item) {
  return {
    id: item.id, suffix: item.suffix, order_id: item.orderId, batch_id: item.batchId,
    status: item.status, activated_at: item.activatedAt ? Date.parse(item.activatedAt) : null
  };
}

async function serveStatic(request, response) {
  const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\//, '');
  let path = normalize(join(root, relative));
  if (!path.startsWith(root) || path.includes(join(root, '.data'))) throw new Error('Invalid path');
  try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); } catch { path = join(root, 'index.html'); }
  const content = await readFile(path);
  response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  response.end(content);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/api/activate') {
      if (rateLimited(request)) return json(response, 429, { ok: false, reason: 'TOO_MANY_ATTEMPTS' });
      const { code, clientId } = await readBody(request);
      const result = await store.activate(code, clientId);
      return json(response, result.ok ? 200 : 400, result);
    }
    if (request.method === 'POST' && url.pathname === '/api/access/status') {
      const { token, clientId } = await readBody(request);
      return json(response, 200, { active: await store.verify(token, clientId) });
    }
    if (url.pathname === '/api/admin/codes') {
      if (!isAdmin(request)) return json(response, 401, { error: 'UNAUTHORIZED' });
      if (request.method === 'GET') {
        const codes = await store.list(url.searchParams.get('query') || '');
        return json(response, 200, { codes: codes.map(adminRecord) });
      }
      if (request.method === 'POST') {
        const body = await readBody(request);
        const orders = Array.isArray(body.orders) ? body.orders.map(value => String(value).trim()).filter(Boolean) : [];
        const count = orders.length || Number(body.count);
        const plainCodes = await store.generate(count, { batchId: String(body.batchId || new Date().toISOString().slice(0, 10)), orders });
        return json(response, 201, { codes: plainCodes.map((code, index) => ({ code, orderId: orders[index] || null })) });
      }
      if (request.method === 'PATCH') {
        const { id, action } = await readBody(request);
        const updated = await store.update(id, action);
        return json(response, updated ? 200 : 404, updated ? { ok: true } : { error: 'NOT_FOUND' });
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    return await serveStatic(request, response);
  } catch {
    if (!response.headersSent) json(response, 500, { error: 'REQUEST_FAILED' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://localhost:${port}`);
  if (!isProduction) console.log('Seller console: /admin.html (use ADMIN_SECRET; default: development-admin)');
});
