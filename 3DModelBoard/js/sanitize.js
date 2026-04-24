import { CONFIG } from './config.js';

export function setText(el, value) {
  if (!el) return;
  el.textContent = value == null ? '' : String(value);
}

export function makeEl(tag, opts = {}) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.text != null) el.textContent = String(opts.text);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, String(v));
  if (opts.children) for (const c of opts.children) if (c) el.appendChild(c);
  return el;
}

export function getExt(name) {
  const i = String(name || '').lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function isModelExt(ext) { return CONFIG.MODEL_EXT.includes(ext); }
export function isMotionExt(ext) { return CONFIG.MOTION_EXT.includes(ext); }
export function isImageExt(ext) { return CONFIG.IMAGE_EXT.includes(ext); }

export function isSafeImagePath(path) {
  return typeof path === 'string' && CONFIG.IMAGE_PATH_WHITELIST.test(path);
}

export function isSafeModelPath(path) {
  return typeof path === 'string' && CONFIG.PATH_WHITELIST.test(path);
}

export function isSafeBgPath(path) {
  return typeof path === 'string' && CONFIG.BG_PATH_WHITELIST.test(path);
}

export function isValidHttpsImageURL(s) {
  if (typeof s !== 'string' || s.length > 2000) return false;
  let u;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

export const isValidHttpsBgURL = isValidHttpsImageURL;

export function normalizeBackground(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.type === 'image' && isSafeBgPath(raw.path)) {
    return { type: 'image', path: raw.path };
  }
  if (raw.type === 'url' && isValidHttpsImageURL(raw.url)) {
    return { type: 'url', url: raw.url };
  }
  return null;
}

export function normalizeThumbnail(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    if (!isSafeImagePath(raw)) return null;
    return { type: 'path', path: raw, aspect: 'square', mode: 'legacy' };
  }
  if (typeof raw !== 'object') return null;
  const aspect = raw.aspect === 'portrait' ? 'portrait' : 'square';
  const modeSet = new Set(['auto-full', 'auto-head', 'upload', 'url', 'legacy', 'unknown']);
  const mode = modeSet.has(raw.mode) ? raw.mode : 'unknown';
  if (raw.type === 'path' && isSafeImagePath(raw.path)) {
    return { type: 'path', path: raw.path, aspect, mode };
  }
  if (raw.type === 'url' && isValidHttpsImageURL(raw.url)) {
    return { type: 'url', url: raw.url, aspect, mode };
  }
  return null;
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || ('post-' + Date.now().toString(36));
}

export function sanitizeTags(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : String(input).split(',');
  const out = [];
  for (const t of raw) {
    const v = String(t).trim().replace(/[^\w가-힣\- ]/g, '').slice(0, 24);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= 8) break;
  }
  return out;
}

export function clampText(s, max) {
  s = String(s == null ? '' : s);
  return s.length > max ? s.slice(0, max) : s;
}

export async function checkMagicBytes(file, ext) {
  try {
    const buf = await file.slice(0, 32).arrayBuffer();
    const u8 = new Uint8Array(buf);
    const asc = new TextDecoder('ascii', { fatal: false }).decode(u8);
    switch (ext) {
      case 'vrm':
        return u8[0] === 0x67 && u8[1] === 0x6C && u8[2] === 0x54 && u8[3] === 0x46;
      case 'pmx':
        return asc.startsWith('PMX ');
      case 'pmd':
        return asc.startsWith('Pmd');
      case 'vmd':
        return asc.startsWith('Vocaloid Motion Data');
      case 'bvh':
        return /^\s*HIERARCHY/i.test(asc);
      case 'png':
        return u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47;
      case 'jpg': case 'jpeg':
        return u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF;
      case 'webp':
        return asc.startsWith('RIFF') && asc.slice(8, 12) === 'WEBP';
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '-';
  const u = ['B','KB','MB','GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10).replace(/-/g, '.');
  } catch { return ''; }
}
