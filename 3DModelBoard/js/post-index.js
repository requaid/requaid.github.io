import { CONFIG } from './config.js';
import { localPosts } from './idb.js';
import { isSafeImagePath, isSafeModelPath, clampText, sanitizeTags, normalizeBackground, normalizeThumbnail } from './sanitize.js';

function normalizeTextureBundlePaths(raw, postId) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const r of raw) {
    if (typeof r !== 'string' || r.length > 200) continue;
    if (r.includes('..') || r.startsWith('/')) continue;
    if (!/^textures\/[A-Za-z0-9_\-./]+\.(?:bmp|png|jpg|jpeg|tga|dds|spa|sph)$/i.test(r)) continue;
    out.push(r);
    if (out.length >= 100) break;
  }
  return out;
}

function normalizeRemote(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 64);
  if (!id) return null;
  const format = ['vrm','pmx','pmd'].includes(raw.format) ? raw.format : null;
  if (!format) return null;
  const modelPath = String(raw.modelPath || '');
  if (!isSafeModelPath(modelPath)) return null;
  return {
    id,
    source: 'remote',
    title: clampText(raw.title, 120),
    author: clampText(raw.author || 'anonymous', 40),
    description: clampText(raw.description, 2000),
    tags: sanitizeTags(raw.tags),
    format,
    modelPath,
    textureBundlePaths: normalizeTextureBundlePaths(raw.textureBundlePaths, id),
    thumbnail: normalizeThumbnail(raw.thumbnail),
    background: normalizeBackground(raw.background),
    createdAt: String(raw.createdAt || ''),
  };
}

function normalizeLocal(raw) {
  const bgBlob = raw.backgroundBlob instanceof Blob ? raw.backgroundBlob : null;
  const bgURL = typeof raw.backgroundURL === 'string' ? raw.backgroundURL : null;
  const thumbMeta = resolveLocalThumbnail(raw);
  const textureBundle = Array.isArray(raw.textureBundle)
    ? raw.textureBundle.filter(t => t && t.blob instanceof Blob && typeof t.name === 'string')
    : [];
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
    textureBundle,
    thumbnailDataURL: raw.thumbnailDataURL || null,
    thumbnail: thumbMeta,
    backgroundBlob: bgBlob,
    backgroundExt: raw.backgroundExt || null,
    backgroundURL: bgURL,
    createdAt: raw.createdAt,
  };
}

function resolveLocalThumbnail(raw) {
  const aspect = raw.thumbnailAspect === 'portrait' ? 'portrait' : 'square';
  const modeSet = new Set(['auto-full', 'auto-head', 'upload', 'url', 'legacy', 'unknown']);
  const mode = modeSet.has(raw.thumbnailMode) ? raw.thumbnailMode : 'unknown';
  if (raw.thumbnailDataURL) {
    return { type: 'dataurl', dataURL: raw.thumbnailDataURL, aspect, mode };
  }
  if (raw.thumbnailURL && typeof raw.thumbnailURL === 'string') {
    return { type: 'url', url: raw.thumbnailURL, aspect, mode };
  }
  return null;
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
