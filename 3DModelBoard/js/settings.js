import { CONFIG, TOKEN } from './config.js';
import { settings } from './idb.js';
import { mountHeader } from './header.js';
import { setText } from './sanitize.js';
import { toast, toastOk, toastError } from './ui.js';
import { getAuthUser, getConfig, setConfig } from './github-api.js';

mountHeader('settings');

const ownerInput = document.getElementById('f-owner');
const repoInput = document.getElementById('f-repo');
const branchInput = document.getElementById('f-branch');
const authorInput = document.getElementById('f-author');
const tokenInput = document.getElementById('f-token');
const tokenStatus = document.getElementById('token-status');

(async () => {
  const cfg = await getConfig();
  ownerInput.value = cfg.owner || '';
  repoInput.value = cfg.repo || CONFIG.REPO_NAME;
  branchInput.value = cfg.branchBase || CONFIG.BASE_BRANCH;
  authorInput.value = (await settings.get('authorName')) || '';
  updateTokenStatus();
})();

function updateTokenStatus() {
  if (TOKEN.has()) {
    setText(tokenStatus, '현재 세션에 토큰이 보관되어 있습니다.');
    tokenStatus.style.color = 'var(--ok)';
  } else {
    setText(tokenStatus, '현재 세션에 토큰 없음.');
    tokenStatus.style.color = 'var(--text-muted)';
  }
}

document.getElementById('save-repo').addEventListener('click', async () => {
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim() || CONFIG.REPO_NAME;
  const branch = branchInput.value.trim() || CONFIG.BASE_BRANCH;
  if (!/^[A-Za-z0-9][\w\-]*$/.test(owner)) { toastError('owner 형식이 잘못되었습니다.'); return; }
  if (!/^[\w\-.]+$/.test(repo)) { toastError('repo 형식이 잘못되었습니다.'); return; }
  await setConfig({ owner, repo, branchBase: branch });
  toastOk('저장했습니다.');
});

document.getElementById('save-author').addEventListener('click', async () => {
  const v = authorInput.value.trim().slice(0, 40);
  await settings.set('authorName', v);
  toastOk('저장했습니다.');
});

document.getElementById('verify-token').addEventListener('click', async () => {
  const v = tokenInput.value.trim();
  if (!v) { toastError('토큰을 입력하세요.'); return; }
  TOKEN.set(v);
  try {
    const me = await getAuthUser();
    toastOk('연결 성공: ' + me.login);
    setText(tokenStatus, '세션에 토큰 보관됨 · 사용자: ' + me.login);
    tokenStatus.style.color = 'var(--ok)';
    tokenInput.value = '';
  } catch (e) {
    TOKEN.clear();
    toastError('연결 실패: ' + (e.message || e));
    updateTokenStatus();
  }
});

document.getElementById('clear-token').addEventListener('click', () => {
  TOKEN.clear();
  tokenInput.value = '';
  updateTokenStatus();
  toast('토큰을 지웠습니다.');
});

window.addEventListener('beforeunload', () => {
  tokenInput.value = '';
});
