import { CONFIG, TOKEN } from './config.js';
import { settings } from './idb.js';

const API = 'https://api.github.com';

async function gh(path, init = {}) {
  const token = TOKEN.get();
  if (!token) throw new Error('PAT가 설정되지 않았습니다.');
  const headers = Object.assign({
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': 'Bearer ' + token,
  }, init.headers || {});
  const res = await fetch(API + path, { ...init, headers });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const status = res.status;
    const msg = body && body.message ? body.message : 'HTTP ' + status;
    const err = new Error('GitHub API 오류 (' + status + '): ' + msg);
    err.status = status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function getConfig() {
  const owner = await settings.get('githubOwner');
  const repo = (await settings.get('githubRepo')) || CONFIG.REPO_NAME;
  const branchBase = (await settings.get('baseBranch')) || CONFIG.BASE_BRANCH;
  return { owner, repo, branchBase };
}

export async function setConfig({ owner, repo, branchBase }) {
  if (owner != null) await settings.set('githubOwner', owner);
  if (repo != null) await settings.set('githubRepo', repo);
  if (branchBase != null) await settings.set('baseBranch', branchBase);
}

export async function getAuthUser() {
  return gh('/user');
}

export async function ensureFork(owner, repo) {
  const me = await getAuthUser();
  const myLogin = me.login;
  try {
    return await gh(`/repos/${encodeURIComponent(myLogin)}/${encodeURIComponent(repo)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/forks`, { method: 'POST' });
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      return await gh(`/repos/${encodeURIComponent(myLogin)}/${encodeURIComponent(repo)}`);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }
  throw new Error('fork 대기 시간 초과');
}

export async function getBranchSha(owner, repo, branch) {
  const data = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`);
  return data.object.sha;
}

export async function createBranch(owner, repo, branchName, fromSha) {
  return gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: fromSha }),
  });
}

async function getFileSha(owner, repo, path, branch) {
  try {
    const data = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    if (Array.isArray(data)) return null;
    return data.sha;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function putFile(owner, repo, { path, contentBase64, message, branch, sha }) {
  const body = { message, content: contentBase64, branch };
  if (sha) body.sha = sha;
  return gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getFileContent(owner, repo, path, ref) {
  try {
    const data = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    if (Array.isArray(data)) return null;
    return { sha: data.sha, text: data.content ? atob(data.content.replace(/\n/g, '')) : '' };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function createPR(upstreamOwner, repo, { title, body, headOwner, headBranch, baseBranch }) {
  return gh(`/repos/${encodeURIComponent(upstreamOwner)}/${encodeURIComponent(repo)}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      head: headOwner + ':' + headBranch,
      base: baseBranch,
      maintainer_can_modify: true,
    }),
  });
}

export async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function submitPostPR({ postId, title, description, author, tags, format, modelBlob, modelExt, thumbnailDataURL, onLog }) {
  const log = (msg, type) => { if (onLog) onLog(msg, type || 'info'); };

  const cfg = await getConfig();
  if (!cfg.owner || !cfg.repo) throw new Error('설정 페이지에서 리포지토리 owner/repo를 먼저 저장하세요.');

  log('사용자 인증 확인 중...');
  const user = await getAuthUser();
  const login = user.login;
  log('인증됨: ' + login, 'ok');

  log('fork 확인/생성 중...');
  await ensureFork(cfg.owner, cfg.repo);
  log('fork 준비 완료', 'ok');

  log('upstream base 브랜치 SHA 조회...');
  const baseSha = await getBranchSha(cfg.owner, cfg.repo, cfg.branchBase);

  const branchName = CONFIG.BRANCH_PREFIX + postId + '-' + Date.now().toString(36);
  log('새 브랜치 생성: ' + branchName);
  await createBranch(login, cfg.repo, branchName, baseSha);

  const postDir = CONFIG.POSTS_DIR + postId + '/';
  const modelPath = postDir + 'model.' + modelExt;
  const thumbPath = postDir + 'thumbnail.png';
  const metaPath = postDir + 'meta.json';

  const meta = {
    id: postId,
    title,
    author,
    description,
    tags,
    format,
    modelPath,
    thumbnail: thumbPath,
    createdAt: new Date().toISOString(),
  };

  log('모델 업로드...');
  await putFile(login, cfg.repo, {
    path: modelPath,
    contentBase64: await blobToBase64(modelBlob),
    message: `post: add model for ${postId}`,
    branch: branchName,
  });

  if (thumbnailDataURL) {
    log('썸네일 업로드...');
    const base64 = thumbnailDataURL.split(',')[1] || '';
    await putFile(login, cfg.repo, {
      path: thumbPath,
      contentBase64: base64,
      message: `post: add thumbnail for ${postId}`,
      branch: branchName,
    });
    meta.thumbnail = thumbPath;
  } else {
    meta.thumbnail = null;
  }

  log('meta.json 업로드...');
  await putFile(login, cfg.repo, {
    path: metaPath,
    contentBase64: textToBase64(JSON.stringify(meta, null, 2)),
    message: `post: add meta for ${postId}`,
    branch: branchName,
  });

  log('posts.json 업데이트...');
  const existing = await getFileContent(login, cfg.repo, CONFIG.POSTS_INDEX, branchName);
  let index = [];
  let indexSha = null;
  if (existing) {
    indexSha = existing.sha;
    try { index = JSON.parse(existing.text); } catch { index = []; }
    if (!Array.isArray(index)) index = [];
  }
  index.unshift({ ...meta });
  await putFile(login, cfg.repo, {
    path: CONFIG.POSTS_INDEX,
    contentBase64: textToBase64(JSON.stringify(index, null, 2) + '\n'),
    message: `post: index update for ${postId}`,
    branch: branchName,
    sha: indexSha,
  });

  log('PR 생성 중...');
  const pr = await createPR(cfg.owner, cfg.repo, {
    title: `New model: ${title} (${postId})`,
    body: `Submitted via 3DModelBoard UI.\n\n- id: ${postId}\n- format: ${format}\n- author: ${author}`,
    headOwner: login,
    headBranch: branchName,
    baseBranch: cfg.branchBase,
  });
  log('PR 생성 완료: ' + pr.html_url, 'ok');
  return pr;
}
