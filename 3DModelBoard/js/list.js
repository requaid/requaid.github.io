import './config.js';
import { loadAll, deleteLocal } from './post-index.js';
import { makeEl, setText, formatDate } from './sanitize.js';
import { mountHeader } from './header.js';
import { toast, toastOk } from './ui.js';
import { installErrorLog } from './error-log.js';
import { showErrorModal } from './error-modal.js';

installErrorLog();
mountHeader('list');

const grid = document.getElementById('card-grid');
const emptyEl = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterChips = document.getElementById('filter-chips');

let state = { all: [], filterFormat: 'all', search: '' };

function thumbUrl(post) {
  const t = post.thumbnail;
  if (t) {
    if (t.type === 'dataurl' && t.dataURL) return t.dataURL;
    if (t.type === 'url' && t.url) return t.url;
    if (t.type === 'path' && t.path) return t.path;
  }
  if (post.source === 'local' && post.thumbnailDataURL) return post.thumbnailDataURL;
  return 'assets/placeholder.svg';
}

function thumbAspect(post) {
  const t = post.thumbnail;
  if (t && t.aspect === 'portrait') return 'portrait';
  return 'square';
}

function matches(post) {
  if (state.filterFormat !== 'all' && post.format !== state.filterFormat) return false;
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [post.title, post.author, ...(post.tags || [])].join(' ').toLowerCase();
  return hay.includes(q);
}

function render() {
  grid.textContent = '';
  const filtered = state.all.filter(matches);
  if (filtered.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  for (const post of filtered) {
    const card = makeEl('article', { className: 'card' });

    const badges = makeEl('div', { className: 'card-badges' });
    const fmtBadge = makeEl('span', { className: 'badge badge-' + post.format, text: post.format.toUpperCase() });
    badges.appendChild(fmtBadge);
    if (post.source === 'local') badges.appendChild(makeEl('span', { className: 'badge badge-local', text: '로컬' }));
    for (const tag of (post.tags || []).slice(0, 2)) badges.appendChild(makeEl('span', { className: 'badge', text: '#' + tag }));

    const aspectCls = thumbAspect(post) === 'portrait' ? ' aspect-portrait' : ' aspect-square';
    const thumb = makeEl('a', { className: 'card-thumb card-link' + aspectCls });
    thumb.href = 'view.html?id=' + encodeURIComponent(post.id) + (post.source === 'local' ? '&source=local' : '');
    thumb.setAttribute('aria-label', post.title || post.id);
    thumb.style.backgroundImage = 'url(' + JSON.stringify(thumbUrl(post)) + ')';

    const body = makeEl('div', { className: 'card-body' });
    const title = makeEl('div', { className: 'card-title' });
    setText(title, post.title || '(제목 없음)');
    const meta = makeEl('div', { className: 'card-meta' });
    const author = makeEl('span');
    setText(author, post.author || 'anonymous');
    const date = makeEl('span');
    setText(date, formatDate(post.createdAt));
    meta.appendChild(author);
    meta.appendChild(date);
    body.appendChild(title);
    body.appendChild(meta);

    card.appendChild(thumb);
    card.appendChild(badges);
    card.appendChild(body);

    if (post.source === 'local') {
      const actions = makeEl('div', { className: 'card-actions' });
      const del = makeEl('button', { className: 'btn-danger', text: '삭제' });
      del.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm('로컬 게시물을 삭제할까요? (브라우저에서만 삭제됩니다)')) return;
        try {
          await deleteLocal(post.id);
          state.all = state.all.filter(p => p.id !== post.id || p.source !== 'local');
          render();
          toastOk('삭제했습니다.');
        } catch {
          toast('삭제 실패', { type: 'error' });
        }
      });
      actions.appendChild(del);
      card.appendChild(actions);
    }

    grid.appendChild(card);
  }
}

searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  render();
});

filterChips.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-chip');
  if (!btn) return;
  filterChips.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.filterFormat = btn.dataset.format;
  render();
});

(async () => {
  try {
    state.all = await loadAll();
    render();
  } catch (e) {
    console.error(e);
    showErrorModal({
      title: '게시물 목록 로드 실패',
      summary: e.message || String(e),
      detail: e.stack || '',
    });
  }
})();
