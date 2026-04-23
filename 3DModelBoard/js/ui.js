let host;
function ensureHost() {
  if (host) return host;
  host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, { type = 'info', ttl = 3500 } = {}) {
  const h = ensureHost();
  const el = document.createElement('div');
  el.className = 'toast' + (type && type !== 'info' ? ' ' + type : '');
  el.textContent = String(message);
  h.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.remove(), 320);
  }, ttl);
}

export function toastError(message, ttl = 5000) { toast(message, { type: 'error', ttl }); }
export function toastOk(message, ttl = 3000) { toast(message, { type: 'ok', ttl }); }
