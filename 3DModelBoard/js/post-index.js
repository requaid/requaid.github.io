import { CONFIG } from './config.js';
import { localPosts } from './idb.js';
import { isSafeImagePath, isSafeModelPath, clampText, sanitizeTags, normalizeBackground } from './sanitize.js';

function normalizeRemote(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 64);
  if (!id) return null;
  const format = ['vrm','pmx','pmd'].includes(raw.format) ? raw.format : null;
  if (!format) return null;
  const modelPath = String(raw.modelPath || '');
  if (!isSafeModelPath(modelPath)) return null;
  const thumb = raw.thumbnail ? (isSafeImagePath(raw.thumbnail) ? raw.thumbnail : null) : null;
  return {
    id,
    source: 'remote',
    title: clampText(raw.title, 120),
    author: clampText(raw.author || 'anonymous', 40),
    description: clampText(raw.description, 2000),
    tags: sanitizeTags(raw.tags),
    format,
    modelPath,
    thumbnail: thumb,
    background: normalizeBackground(raw.background),
    createdAt: String(raw.createdAt || ''),
  };
}

function normalizeLocal(raw) {
  const bgBlob = raw.backgroundBlob instanceof Blob ? raw.backgroundBlob : null;
  const bgURL = typeof raw.backgroundURL === 'string' ? raw.backgroundURL : null;
  return {
    id: raw.id,
    source: 'local',
    title: clampText(raw.title, 120),
    author: clampText(raw.author || 'anonymous', 40),
    description: clampText(raw.description, 2000),
    tags: sanitizeTags(raw.tags),
    format: raw.format,
    modelBlob: raw.modelBlob,
    modelName: raw.modelName,
    thumbnailDataURL: raw.thumbnailDataURL || null,
    backgroundBlob: bgBlob,
    backgroundExt: raw.backgroundExt || null,
    backgroundURL: bgURL,
    createdAt: raw.createdAt,
  };
}

export async function loadRemoteIndex() {
  try {
    const res = await fetch(CONFIG.POSTS_INDEX, { cache: 'no-cache' });
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeRemote).filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadLocalIndex() {
  try {
    const arr = await localPosts.all();
    return arr.map(normalizeLocal);
  } catch {
    return [];
  }
}

export async function loadAll() {
  const [remote, local] = await Promise.all([loadRemoteIndex(), loadLocalIndex()]);
  const merged = [...remote, ...local];
  merged.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return merged;
}

export async function loadPost(id) {
  const local = await localPosts.get(id);
  if (local) return normalizeLocal(local);
  const remote = await loadRemoteIndex();
  return remote.find(p => p.id === id) || null;
}

export async function deleteLocal(id) {
  return localPosts.delete(id);
}

export async function saveLocal(post) {
  return localPosts.put(post);
}
