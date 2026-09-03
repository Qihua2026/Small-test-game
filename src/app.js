import { quizConfig, dimensions } from './data.js';
import { calculateResult, topDimensions } from './quiz-engine.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const STORAGE_KEY = `xiaozhu_quiz_${quizConfig.quizVersion}`;
const RESULT_KEY = `xiaozhu_result_${quizConfig.algorithmVersion}`;
const ACCESS_TOKEN_KEY = 'xiaozhu_access_token';
const CLIENT_ID_KEY = 'xiaozhu_client_id';
const state = loadState();
state.access = 'checking';

function clientId() {
  let value = localStorage.getItem(CLIENT_ID_KEY);
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(CLIENT_ID_KEY, value);
  }
  return value;
}

async function api(path, payload) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.reason || 'REQUEST_FAILED'), { reason: data.reason });
  return data;
}

async function verifyAccess() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) { state.access = 'inactive'; render(); return; }
  try {
    const result = await api('/api/access/status', { token, clientId: clientId() });
    state.access = result.active ? 'active' : 'inactive';
    if (!result.active) localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch { state.access = 'unavailable'; }
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.quizVersion === quizConfig.quizVersion) return saved;
  } catch { /* non-blocking */ }
  return { quizVersion: quizConfig.quizVersion, sessionId: crypto.randomUUID?.() || String(Date.now()), page: 'home', index: 0, answers: {} };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* continue in memory */ }
}

function setPage(page) {
  state.page = page;
  saveState();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  render();
}

function shell(content, className = '') {
  return `<main class="page ${className}">
    <div class="grain" aria-hidden="true"></div>
    <div class="corner-mark corner-mark--top" aria-hidden="true">性<br>情</div>
    ${content}
    <footer class="site-footer"><span>一纸性情鉴 · ${quizConfig.quizVersion}</span><span>仅供娱乐，不构成专业心理评估</span></footer>
  </main>`;
}

function renderHome() {
  const hasProgress = Object.keys(state.answers).length > 0 && Object.keys(state.answers).length < quizConfig.questions.length;
  const hasAccess = state.access === 'active';
  app.innerHTML = shell(`<section class="home-layout">
    <div class="home-copy reveal">
      <p class="eyebrow"><span></span> 一纸性情鉴 · 仅供娱乐</p>
      <h1>若入宫局<br><em>你是哪位小主？</em></h1>
      <p class="lede">十二道现代处境题，照见你在关系与选择中的<br class="desktop-only">本命人格、隐藏人格与高压人格。</p>
      <div class="home-actions">
        ${hasAccess ? `<div class="access-granted"><span>✓</span><p><strong>性情签已激活</strong><small>本设备 30 天内可重复进入</small></p></div><button class="button button--primary" data-action="start">${hasProgress ? '继续你的性情鉴' : '开始测试'} <span>→</span></button>` : `<form class="activation-form" id="activation-form"><label for="activation-code">输入购买后收到的激活码</label><div><input id="activation-code" name="code" inputmode="text" autocomplete="one-time-code" placeholder="XQ-XXXX-XXXX-XXXX" maxlength="17" ${state.access === 'checking' ? 'disabled' : ''}><button class="button button--primary" type="submit" ${state.access === 'checking' ? 'disabled' : ''}>${state.access === 'checking' ? '正在确认…' : '解锁测试'} <span>→</span></button></div><p class="activation-message" aria-live="polite">${state.access === 'unavailable' ? '暂时无法连接激活服务，请稍后重试。' : '一枚激活码限一台设备使用，激活后 30 天内有效。'}</p></form>`}
        <button class="text-button" data-action="how">先看看怎么玩</button>
      </div>
      <div class="meta-row"><span>拾贰道题</span><i></i><span>约贰分钟</span><i></i><span>无需登录</span></div>
    </div>
    <div class="hero-art reveal reveal--delay" aria-hidden="true">
      <div class="moon"></div><div class="fan fan--1"></div><div class="fan fan--2"></div>
      <svg viewBox="0 0 440 620" role="presentation"><path d="M97 559C188 474 179 376 143 300C108 226 147 131 254 70"/><path d="M155 433c58-23 112-78 126-142"/><path d="M156 434c-50-23-75-60-88-97"/><path d="M232 169c-22-33-16-63 13-78 8 32 2 58-13 78Z"/><path d="M194 333c34-34 70-39 101-18-28 25-60 29-101 18Z"/><path d="M139 383c-36-11-60-3-74 23 31 9 55 1 74-23Z"/></svg>
      <div class="seal">见<br>真<br>章</div><span class="art-index">卷之一</span>
    </div>
  </section>`, 'home-page');
}

function renderQuiz() {
  const question = quizConfig.questions[state.index];
  const selected = state.answers[question.id];
  app.innerHTML = shell(`<section class="quiz-shell">
    <header class="quiz-header">
      <button class="icon-button" data-action="back" aria-label="${state.index === 0 ? '返回首页' : '上一题'}">←</button>
      <div class="progress-copy"><span>第 ${String(state.index + 1).padStart(2, '0')} 题</span><span>${quizConfig.questions.length}</span></div>
      <button class="text-button text-button--small" data-action="exit">暂离</button>
    </header>
    <div class="progress-track" role="progressbar" aria-label="答题进度" aria-valuemin="1" aria-valuemax="12" aria-valuenow="${state.index + 1}"><i style="width:${((state.index + 1) / 12) * 100}%"></i></div>
    <article class="question-card" aria-labelledby="question-title">
      <p class="question-number">${question.eyebrow}</p>
      <h2 id="question-title" tabindex="-1">${question.prompt}</h2>
      <div class="options" role="radiogroup" aria-label="请选择一个答案">
        ${question.options.map((item, index) => `<button class="option ${selected === item.id ? 'is-selected' : ''}" role="radio" aria-checked="${selected === item.id}" data-option="${item.id}"><span>${String.fromCharCode(65 + index)}</span><strong>${item.text}</strong><i>↗</i></button>`).join('')}
      </div>
      <p class="quiz-hint">凭第一反应即可，没有标准答案</p>
    </article>
  </section>`, 'quiz-page');
  requestAnimationFrame(() => document.querySelector('#question-title')?.focus({ preventScroll: true }));
}

function renderAnalyzing() {
  app.innerHTML = shell(`<section class="analyzing">
    <div class="orbit" aria-hidden="true"><i></i><i></i><i></i><span>鉴</span></div>
    <p class="eyebrow">八维性情 · 正在推演</p>
    <h2 id="analysis-line">正在整理你的性情线索…</h2>
    <p>有些答案藏在选择里，有些藏在犹豫之间。</p>
  </section>`, 'analysis-page');
  const lines = ['正在整理你的性情线索…', '推演你在关系与选择中的模式…', '你的本命人格已经浮现。'];
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    const line = document.querySelector('#analysis-line');
    if (line && lines[step]) line.textContent = lines[step];
    if (step === 2) {
      clearInterval(timer);
      setTimeout(() => setPage('result'), 800);
    }
  }, 850);
}

function radarSvg(userVector, role) {
  const center = 160, radius = 112;
  const point = (value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index / dimensions.length);
    const r = radius * value / 100;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  };
  const rings = [25, 50, 75, 100].map(level => `<polygon points="${dimensions.map((_, i) => point(level, i)).join(' ')}"/>`).join('');
  const axes = dimensions.map((_, i) => `<line x1="160" y1="160" x2="${point(100, i).split(',')[0]}" y2="${point(100, i).split(',')[1]}"/>`).join('');
  const labels = dimensions.map((dim, i) => {
    const [x, y] = point(124, i).split(',');
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${dim.name}</text>`;
  }).join('');
  return `<svg class="radar" viewBox="0 0 320 320" role="img" aria-label="八维人格雷达图"><g class="radar-grid">${rings}${axes}</g><polygon class="radar-role" points="${dimensions.map((d,i)=>point(role.vector[d.id],i)).join(' ')}"/><polygon class="radar-user" points="${dimensions.map((d,i)=>point(userVector[d.id],i)).join(' ')}"/>${labels}</svg>`;
}

function resultCard(item, kind) {
  const copy = kind === 'hidden' ? item.role.hiddenCopy : item.role.darkCopy;
  return `<details class="persona-card"><summary><span class="persona-index">${kind === 'hidden' ? '其二' : '其三'}</span><div><small>${kind === 'hidden' ? '你的隐藏人格' : '你的高压人格'}</small><strong>${item.role.name} · ${item.role.archetype}</strong></div><b>${item.displayMatch}%</b><i>＋</i></summary><div class="persona-body"><p>${copy}</p>${kind === 'dark' ? '<small>这是压力下可能出现的防御模式，不是你的真实品德。</small>' : ''}</div></details>`;
}

function renderResult() {
  let result;
  try { result = calculateResult(quizConfig, state.answers, state.sessionId); }
  catch { state.answers = {}; state.index = 0; setPage('home'); return; }
  state.result = { primary: result.primary.role.id, hidden: result.hidden.role.id, dark: result.dark.role.id };
  saveState();
  try { localStorage.setItem(RESULT_KEY, JSON.stringify(state.result)); } catch { /* non-blocking */ }
  const role = result.primary.role;
  const top = topDimensions(result.userVector, dimensions);
  app.innerHTML = shell(`<section class="result-hero" style="--role-accent:${role.visual.accent}">
    <div class="result-kicker"><span>性情鉴定 · 壹</span><span>PERSONA PORTRAIT</span></div>
    <div class="result-grid">
      <div class="role-art" aria-hidden="true"><span class="giant-character">${role.name[0]}</span><div class="role-orb"></div><div class="botanical">${role.visual.motif}</div><div class="match-seal"><strong>${result.primary.displayMatch}</strong><small>% 契合</small></div></div>
      <div class="role-copy"><p class="eyebrow">你的本命人格</p><h1>${role.name}</h1><h2>${role.archetype}</h2><div class="tags">${role.tags.map(tag=>`<span>${tag}</span>`).join('')}</div><blockquote>“${role.quote}”</blockquote><p>${role.summary}</p><div class="result-actions"><button class="button button--primary" data-action="share">生成我的人格卡 <span>↗</span></button><button class="button button--quiet" data-action="restart">再测一次</button></div></div>
    </div>
  </section>
  <section class="result-content">
    <div class="section-heading"><span>01</span><div><p>WHY HER</p><h2>为何是她</h2></div></div>
    <div class="why-grid">${top.map(dim => `<article><span>${dim.name}</span><strong>${result.userVector[dim.id]}</strong><div class="score-line"><i style="width:${result.userVector[dim.id]}%"></i></div><p>${result.userVector[dim.id] >= 67 ? dim.high : result.userVector[dim.id] <= 33 ? dim.low : `在${dim.low}与${dim.high}间自由切换`}</p></article>`).join('')}</div>
    <div class="profile-grid"><div><div class="section-heading"><span>02</span><div><p>YOUR SPECTRUM</p><h2>八维性情</h2></div></div><div class="radar-wrap">${radarSvg(result.userVector, role)}<div class="legend"><span><i></i>你的性情</span><span><i></i>角色侧写</span></div></div></div><div class="insights"><article><small>你的高光</small><ul>${role.strengths.map(x=>`<li>${x}</li>`).join('')}</ul></article><article><small>容易困住你的地方</small><ul>${role.blindSpots.map(x=>`<li>${x}</li>`).join('')}</ul></article><article class="advice"><small>给你的提醒</small><p>${role.advice}</p></article></div></div>
    <div class="section-heading"><span>03</span><div><p>OTHER SELVES</p><h2>你的另外两面</h2></div></div>
    <div class="persona-list">${resultCard(result.hidden, 'hidden')}${resultCard(result.dark, 'dark')}</div>
    <section class="share-panel"><p class="eyebrow">一签既定 · 欢迎认领</p><h2>把你的性情签<br>递给懂你的人</h2><button class="button button--light" data-action="share">生成分享卡 <span>↗</span></button></section>
  </section>`, 'result-page');
}

function showModal() {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal';
  dialog.innerHTML = `<button class="modal-close" aria-label="关闭">×</button><p class="eyebrow">玩法说明</p><h2>无需揣测角色，<br>只需选择真实的你。</h2><ol><li><span>01</span>完成 12 道现代生活处境题</li><li><span>02</span>从 8 个维度生成你的性情向量</li><li><span>03</span>匹配本命、隐藏与高压人格</li></ol><p class="modal-note">测试仅供娱乐，不构成专业心理评估。</p>`;
  document.body.append(dialog); dialog.showModal();
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.querySelector('.modal-close').onclick = close;
  dialog.onclick = event => { if (event.target === dialog) close(); };
}

function shareResult() {
  const role = quizConfig.roles.find(item => item.id === state.result?.primary);
  const text = `我的本命人格是「${role?.name || '小主'}」——${role?.quote || ''}`;
  if (navigator.share) {
    navigator.share({ title: '一纸性情鉴', text, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(`${text}\n${location.href}`);
    notify('结果文案与链接已复制');
  }
}

function notify(message) {
  toast.textContent = message; toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function render() {
  if (state.page === 'quiz') renderQuiz();
  else if (state.page === 'analyzing') renderAnalyzing();
  else if (state.page === 'result') renderResult();
  else renderHome();
}

app.addEventListener('click', event => {
  const option = event.target.closest('[data-option]');
  if (option) {
    const question = quizConfig.questions[state.index];
    state.answers[question.id] = option.dataset.option;
    saveState(); renderQuiz();
    setTimeout(() => {
      if (state.index === quizConfig.questions.length - 1) setPage('analyzing');
      else { state.index += 1; saveState(); renderQuiz(); }
    }, 220);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start') {
    if (state.access !== 'active') { notify('请先输入激活码解锁测试'); return; }
    state.index = Math.min(Object.keys(state.answers).length, 11); setPage('quiz');
  }
  if (action === 'how') showModal();
  if (action === 'back') { if (state.index === 0) setPage('home'); else { state.index -= 1; saveState(); renderQuiz(); } }
  if (action === 'exit') setPage('home');
  if (action === 'restart') { state.answers = {}; state.index = 0; state.sessionId = crypto.randomUUID?.() || String(Date.now()); setPage('quiz'); }
  if (action === 'share') shareResult();
});

app.addEventListener('submit', async event => {
  if (event.target.id !== 'activation-form') return;
  event.preventDefault();
  const form = event.target;
  const input = form.elements.code;
  const button = form.querySelector('button');
  const message = form.querySelector('.activation-message');
  const code = input.value.trim();
  if (!code) { message.textContent = '请输入订单消息中的激活码。'; input.focus(); return; }
  button.disabled = true; input.disabled = true; button.firstChild.textContent = '正在激活… ';
  try {
    const result = await api('/api/activate', { code, clientId: clientId() });
    localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
    state.access = 'active'; render(); notify('激活成功，可以开始测试了');
  } catch (error) {
    const copy = {
      INVALID_CODE: '没有找到这个激活码，请检查后重试。',
      ALREADY_USED: '这个激活码已绑定其他设备，请联系卖家处理。',
      EXPIRED: '这个激活码已过期，请联系卖家处理。',
      REVOKED: '这个激活码已停用，请联系卖家处理。',
      TOO_MANY_ATTEMPTS: '尝试次数过多，请 10 分钟后再试。'
    };
    message.textContent = copy[error.reason] || '暂时无法激活，请检查网络后重试。';
    button.disabled = false; input.disabled = false; button.firstChild.textContent = '解锁测试 ';
  }
});

render();
verifyAccess();
