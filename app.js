const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/comments'
  : 'https://byulkicomments.onrender.com/comments';

async function apiGet() {
  const r = await fetch(API);
  if (!r.ok) throw new Error('Error al obtener comentarios');
  return r.json();
}

async function apiPost(data) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('Error al publicar');
  return r.json();
}

async function apiDelete(id) {
  const r = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Error al eliminar');
}

function heartColor(name) {
  const f = (name || '').trim()[0]?.toUpperCase() || 'A';
  return 'AEIOUCFHJLPTVX'.includes(f) ? 'blue' : 'green';
}

function heart(name) {
  return heartColor(name) === 'blue' ? '💙' : '💚';
}

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'Hace un momento';
  if (s < 3600)  return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  return `Hace ${Math.floor(s / 86400)} d`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg, type) {
  const t = document.getElementById('bk-toast');
  t.textContent = msg;
  t.className = `bk-toast ${type}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'bk-toast', 3000);
}

function renderStats(comments) {
  const stats = document.getElementById('bk-stats');
  if (!stats) return;
  const counts = {};
  comments.forEach(c => {
    counts[c.username] = (counts[c.username] || 0) + 1;
  });
  stats.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `
      <div class="bk-stat-pill">
        ${heart(name)} ${esc(name)} <span>${count}</span>
      </div>`)
    .join('');
}

function renderList(comments) {
  const list  = document.getElementById('bk-list');
  const count = document.getElementById('bk-count');
  if (!comments.length) {
    list.innerHTML = `<div class="bk-empty"><div class="bk-empty-icon">🐾</div><div>No hay comentarios aún</div></div>`;
    count.textContent = '0';
    renderStats([]);
    return;
  }
  const sorted = [...comments].sort((a, b) => new Date(b.date) - new Date(a.date));
  count.textContent = sorted.length;
  renderStats(comments);
  list.innerHTML = sorted.map(c => `
    <div class="bk-card" id="bk-card-${c.id}">
      <div class="bk-avatar ${heartColor(c.username)}">${heart(c.username)}</div>
      <div class="bk-meta">
        <span class="bk-uname">${esc(c.username)}</span>
        <span class="bk-time" title="${formatDate(c.date)}">${timeAgo(c.date)}</span>
      </div>
      <button class="bk-del" onclick="window.bkDelete('${c.id}')">× eliminar</button>
      <div class="bk-msg">${esc(c.message)}</div>
    </div>`).join('');
}

function renderLoading() {
  document.getElementById('bk-list').innerHTML = `<div class="bk-loading"><div class="bk-spinner"></div>Cargando...</div>`;
}

async function bkLoad() {
  renderLoading();
  try {
    renderList(await apiGet());
  } catch(e) {
    document.getElementById('bk-list').innerHTML = `<div class="bk-empty"><div class="bk-empty-icon">⚠️</div><div>${e.message}</div></div>`;
    document.getElementById('bk-count').textContent = '0';
  }
}

async function bkPublish() {
  const uEl = document.getElementById('bk-user');
  const mEl = document.getElementById('bk-msg');
  const eu  = document.getElementById('bk-eu');
  const em  = document.getElementById('bk-em');
  let ok = true;
  [uEl, mEl].forEach(el => el.classList.remove('err'));
  [eu, em].forEach(el => el.classList.remove('show'));
  if (!uEl.value.trim()) { uEl.classList.add('err'); eu.classList.add('show'); ok = false; }
  if (mEl.value.trim().length < 5) { mEl.classList.add('err'); em.classList.add('show'); ok = false; }
  if (!ok) return;
  const btn = document.getElementById('bk-btn');
  btn.disabled = true;
  btn.textContent = 'publicando...';
  try {
    await apiPost({ username: uEl.value.trim(), message: mEl.value.trim(), date: new Date().toISOString() });
    mEl.value = '';
    document.getElementById('bk-char').textContent = '0 / 300';
    toast('✓ comentario publicado', 'ok');
    await bkLoad();
  } catch(e) {
    toast(e.message, 'bad');
  } finally {
    btn.disabled = false;
    btn.textContent = 'publicar 🐾';
  }
}

async function bkDelete(id) {
  if (!confirm('¿Eliminar este comentario?')) return;
  const card = document.getElementById(`bk-card-${id}`);
  if (card) card.classList.add('removing');
  try {
    await apiDelete(id);
    toast('✓ comentario eliminado', 'ok');
    await bkLoad();
  } catch(e) {
    if (card) card.classList.remove('removing');
    toast(e.message, 'bad');
  }
}

document.getElementById('bk-btn').addEventListener('click', bkPublish);
document.getElementById('bk-msg').addEventListener('input', function() {
  document.getElementById('bk-char').textContent = `${this.value.length} / 300`;
});
document.getElementById('bk-user').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('bk-msg').focus();
});

window.bkDelete = bkDelete;
window.bkLoad = bkLoad;

bkLoad();
