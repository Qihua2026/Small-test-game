const $ = selector => document.querySelector(selector);
let generatedCodes = [];
let secret = sessionStorage.getItem('xiaozhu_admin_secret') || '';

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'REQUEST_FAILED'), { code: data.error });
  return data;
}

function notify(text, error = false) {
  const notice = $('#notice'); notice.textContent = text; notice.className = error ? 'error' : 'success';
  setTimeout(() => { notice.className = ''; }, 2500);
}

const formatDate = value => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(Number(value))) : '—';
const statusCopy = { unused: '未使用', active: '已激活', revoked: '已停用' };
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function loadCodes(query = '') {
  const { codes } = await request(`/api/admin/codes?query=${encodeURIComponent(query)}`);
  const counts = { unused: 0, active: 0, revoked: 0 };
  codes.forEach(item => { counts[item.status] += 1; });
  Object.entries(counts).forEach(([key, value]) => { $(`#${key}`).textContent = value; });
  $('#records').innerHTML = codes.length ? codes.map(item => `<tr><td><strong>${escapeHtml(item.suffix)}</strong></td><td>${escapeHtml(item.order_id || '—')}</td><td>${escapeHtml(item.batch_id)}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(statusCopy[item.status] || item.status)}</span></td><td>${formatDate(item.activated_at)}</td><td>${item.status === 'active' ? `<button class="link" data-reset="${escapeHtml(item.id)}">换设备</button>` : ''}${item.status !== 'revoked' ? `<button class="link danger" data-revoke="${escapeHtml(item.id)}">停用</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">没有找到激活码</td></tr>';
}

async function login() {
  secret = $('#secret').value.trim();
  if (!secret) return notify('请输入管理密钥', true);
  try {
    await loadCodes(); sessionStorage.setItem('xiaozhu_admin_secret', secret);
    $('#auth').hidden = true; $('#workspace').hidden = false;
  } catch { secret = ''; notify('管理密钥不正确', true); }
}

$('#generate-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const orders = String(form.get('orders')).split('\n').map(item => item.trim()).filter(Boolean);
  const payload = { batchId: form.get('batchId'), count: orders.length || Number(form.get('count')), orders: orders.length ? orders : undefined };
  const button = event.submitter; button.disabled = true; button.textContent = '正在生成…';
  try {
    const result = await request('/api/admin/codes', { method: 'POST', body: JSON.stringify(payload) });
    generatedCodes = result.codes;
    $('#generated').className = 'code-list';
    $('#generated').innerHTML = result.codes.map(item => `<div><code>${escapeHtml(item.code)}</code><span>${escapeHtml(item.orderId || '未关联订单')}</span></div>`).join('');
    $('#download').hidden = false; await loadCodes(); notify(`已生成 ${result.codes.length} 枚激活码`);
  } catch { notify('生成失败，请检查配置后重试', true); }
  finally { button.disabled = false; button.textContent = '生成激活码'; }
});

document.addEventListener('click', async event => {
  const action = event.target.dataset.action;
  if (action === 'login') login();
  if (action === 'search') loadCodes($('#query').value).catch(() => notify('查询失败', true));
  if (action === 'download' && generatedCodes.length) {
    const csv = `订单号,激活码\n${generatedCodes.map(item => `"${item.orderId || ''}","${item.code}"`).join('\n')}`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv' })); link.download = `activation-codes-${Date.now()}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  const id = event.target.dataset.reset || event.target.dataset.revoke;
  if (id) {
    const actionName = event.target.dataset.reset ? 'reset' : 'revoke';
    const confirmed = window.confirm(actionName === 'reset' ? '确认解除原设备绑定？原设备会立即失去访问权限。' : '确认停用这枚激活码？已激活的用户会立即失去访问权限。');
    if (!confirmed) return;
    try { await request('/api/admin/codes', { method: 'PATCH', body: JSON.stringify({ id, action: actionName }) }); await loadCodes($('#query').value); notify(actionName === 'reset' ? '设备绑定已重置' : '激活码已停用'); }
    catch { notify('操作失败，请稍后重试', true); }
  }
});

if (secret) { $('#secret').value = secret; login(); }
