const baseUrl = String(process.env.BASE_URL || '').replace(/\/$/, '');
const adminSecret = process.env.ADMIN_SECRET;

if (!baseUrl) {
  console.error('Set BASE_URL to the deployed site, for example https://example.com');
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const health = await request('/api/health');
if (!health.ok) throw new Error('Activation API health check did not return ok=true');
console.log('Public health check passed.');

if (!adminSecret) {
  console.log('Set ADMIN_SECRET as well to run the full activation lifecycle smoke test.');
  process.exit(0);
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` };
const batchId = `smoke-${Date.now()}`;
const generated = await request('/api/admin/codes', {
  method: 'POST', headers, body: JSON.stringify({ count: 1, batchId })
});
const code = generated.codes?.[0]?.code;
if (!code) throw new Error('Admin API did not return a plaintext activation code');

const clientId = `smoke-client-${Date.now()}`;
const activated = await request('/api/activate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, clientId })
});
const status = await request('/api/access/status', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: activated.token, clientId })
});
if (!status.active) throw new Error('Activated token was not accepted by the status endpoint');

const listed = await request(`/api/admin/codes?query=${encodeURIComponent(batchId)}`, { headers });
const id = listed.codes?.[0]?.id;
if (!id) throw new Error('Generated activation code was not found in admin listing');
await request('/api/admin/codes', {
  method: 'PATCH', headers, body: JSON.stringify({ id, action: 'revoke' })
});
console.log(`Full activation lifecycle passed; test batch ${batchId} was revoked.`);
