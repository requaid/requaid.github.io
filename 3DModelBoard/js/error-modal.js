import { formatForClipboard } from './error-log.js';
import { toastOk, toastError } from './ui.js';

let openBackdrop = null;

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('execCommand copy 실패'));
    } catch (e) {
      reject(e);
    }
  });
}

export function closeErrorModal() {
  if (openBackdrop && openBackdrop.parentNode) {
    openBackdrop.parentNode.removeChild(openBackdrop);
  }
  openBackdrop = null;
}

export function showErrorModal({ title = '오류', summary, detail, hint, onClose } = {}) {
  closeErrorModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'error-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'error-modal';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-modal', 'true');

  const h = document.createElement('h3');
  h.textContent = String(title);
  modal.appendChild(h);

  if (summary) {
    const p = document.createElement('p');
    p.className = 'summary';
    p.textContent = String(summary);
    modal.appendChild(p);
  }

  if (hint) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = String(hint);
    modal.appendChild(p);
  }

  if (detail) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = '자세히';
    det.appendChild(sum);
    const pre = document.createElement('pre');
    pre.className = 'error-stack';
    pre.textContent = String(detail);
    det.appendChild(pre);
    modal.appendChild(det);
  }

  const guide = document.createElement('p');
  guide.className = 'hint';
  guide.textContent = '문제가 반복되면 아래 [로그 복사] 버튼을 누른 뒤 관리자에게 붙여넣어 주세요.';
  modal.appendChild(guide);

  const footer = document.createElement('footer');

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-secondary';
  copyBtn.textContent = '📋 로그 복사';
  copyBtn.addEventListener('click', async () => {
    const text = formatForClipboard({ summary, detail });
    try {
      await copyToClipboard(text);
      toastOk('로그를 복사했습니다.');
    } catch (e) {
      toastError('복사 실패: ' + (e.message || e));
    }
  });
  footer.appendChild(copyBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-primary';
  closeBtn.textContent = '닫기';
  closeBtn.addEventListener('click', () => {
    closeErrorModal();
    if (typeof onClose === 'function') {
      try { onClose(); } catch (e) { console.error(e); }
    }
  });
  footer.appendChild(closeBtn);

  modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  openBackdrop = backdrop;

  setTimeout(() => closeBtn.focus(), 0);
}
