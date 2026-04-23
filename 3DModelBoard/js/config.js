// Frame-busting: 외부 iframe 감지 즉시 이탈
if (window.top !== window.self) {
  try { window.top.location = window.self.location; }
  catch (_) { document.body && (document.body.innerHTML = ''); throw new Error('framed'); }
}

export const CONFIG = Object.freeze({
  REPO_OWNER: '',
  REPO_NAME: '3DModelBoard',
  BASE_BRANCH: 'main',
  BRANCH_PREFIX: 'post/',

  MAX_REPO_SIZE:   25 * 1024 * 1024,
  MAX_LOCAL_SIZE: 100 * 1024 * 1024,
  MAX_MOTION_SIZE: 10 * 1024 * 1024,
  MAX_THUMB_SIZE:   2 * 1024 * 1024,
  MAX_BG_SIZE:      5 * 1024 * 1024,

  MODEL_EXT:  ['vrm', 'pmx', 'pmd'],
  MOTION_EXT: ['vmd', 'bvh'],
  IMAGE_EXT:  ['png', 'jpg', 'jpeg', 'webp'],

  THUMB_MAX_DIM: 512,

  POSTS_INDEX: 'posts/posts.json',
  POSTS_DIR: 'posts/',

  IDB_NAME: '3DModelBoard',
  IDB_VERSION: 1,

  PATH_WHITELIST: /^posts\/[A-Za-z0-9_\-]+\/[A-Za-z0-9_\-.]+$/,
  IMAGE_PATH_WHITELIST: /^(posts\/[A-Za-z0-9_\-]+\/[A-Za-z0-9_\-.]+\.(?:png|jpg|jpeg|webp)|assets\/[A-Za-z0-9_\-.]+\.(?:png|jpg|jpeg|webp))$/i,
  BG_PATH_WHITELIST: /^posts\/[A-Za-z0-9_\-]+\/background\.(?:png|jpg|jpeg|webp)$/i,
});

export const TOKEN = {
  get() { return window.__tokenMem || null; },
  set(v) { window.__tokenMem = v || null; },
  clear() { window.__tokenMem = null; },
  has() { return !!window.__tokenMem; },
};
