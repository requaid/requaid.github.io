const RING_MAX = 50;
const buf = [];
let installed = false;

function push(level, args) {
  try {
    const msg = args.map(a => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    buf.push({ t: new Date().toISOString(), level, msg });
    if (buf.length > RING_MAX) buf.shift();
  } catch (_) {}
}

export function installErrorLog() {
  if (installed) return;
  installed = true;
  const origErr = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...a) => { push('error', a); origErr(...a); };
  console.warn = (...a) => { push('warn', a); origWarn(...a); };
  window.addEventListener('error', (e) => {
    push('error', [e.message || 'error', (e.filename || '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0)]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    push('error', ['unhandledrejection', (r && r.stack) || (r && r.message) || String(r)]);
  });
}

export function getLog() { return buf.slice(); }

export function formatForClipboard({ summary, detail } = {}) {
  const lines = [
    '## 3DModelBoard 오류 로그',
    '시간: ' + new Date().toISOString(),
    'UA: ' + navigator.userAgent,
    'URL: ' + location.href,
    '',
  ];
  if (summary) { lines.push('### 요약'); lines.push(String(summary)); lines.push(''); }
  if (detail)  { lines.push('### 상세'); lines.push(String(detail));  lines.push(''); }
  lines.push('### 최근 콘솔 로그 (최대 ' + RING_MAX + ')');
  for (const e of buf) lines.push('[' + e.t + '] ' + e.level + ': ' + e.msg);
  return lines.join('\n');
}

export function withTimeout(promise, ms, label = '로딩') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' 타임아웃 (' + Math.round(ms / 1000) + '초 초과)')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
