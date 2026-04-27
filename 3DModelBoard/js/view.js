import { CONFIG } from './config.js';
import { loadPost } from './post-index.js';
import { createViewer } from './viewer-core.js';
import { loadVRM, loadMMD } from './viewer-models.js';
import { createMotionController } from './viewer-motion.js';
import { loadVMDClip, loadBVHClip } from './motion-files.js';
import { attachDropzone } from './drag-drop.js';
import { captureFromViewer, downloadDataURL } from './thumbnail.js';
import { setText, formatDate, getExt, isMotionExt, checkMagicBytes, formatBytes } from './sanitize.js';
import { toast, toastError, toastOk } from './ui.js';
import { installErrorLog, withTimeout } from './error-log.js';
import { showErrorModal } from './error-modal.js';

installErrorLog();

const MODEL_LOAD_TIMEOUT_MS = 45000;

const params = new URLSearchParams(location.search);
const postId = params.get('id');

const container = document.getElementById('viewer-container');
const canvas = document.getElementById('viewer-canvas');
const bgLayer = document.getElementById('viewer-bg');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('motion-status');
const titleEl = document.getElementById('v-title');
const metaEl = document.getElementById('v-meta');
const motionBtns = document.querySelectorAll('.motion-btn[data-motion]');
const stopBtn = document.getElementById('btn-stop');
const snapshotBtn = document.getElementById('btn-snapshot');

function showOverlay(text) {
  overlay.classList.add('active');
  setText(overlayText, text);
}
function hideOverlay() { overlay.classList.remove('active'); }

function setActiveMotionButton(name) {
  motionBtns.forEach(b => b.classList.toggle('active', b.dataset.motion === name));
}

let bgObjectUrl = null;
window.addEventListener('beforeunload', () => {
  if (bgObjectUrl) { try { URL.revokeObjectURL(bgObjectUrl); } catch {} bgObjectUrl = null; }
});

async function loadTextureBundle(post) {
  if (post.format !== 'pmx' && post.format !== 'pmd') return [];
  if (post.source === 'local') {
    const items = post.textureBundle || [];
    return items.map(it => {
      const f = new File([it.blob], it.name.split('/').pop());
      Object.defineProperty(f, 'webkitRelativePath', { value: it.name });
      return f;
    });
  }
  const paths = post.textureBundlePaths || [];
  if (paths.length === 0) return [];
  const baseUrl = post.modelPath.replace(/[^/]+$/, '');
  const out = [];
  for (const rel of paths) {
    try {
      const res = await fetch(baseUrl + rel);
      if (!res.ok) continue;
      const blob = await res.blob();
      const relUnderTex = rel.replace(/^textures\//, '');
      const f = new File([blob], relUnderTex.split('/').pop());
      Object.defineProperty(f, 'webkitRelativePath', { value: relUnderTex });
      out.push(f);
    } catch (e) {
      console.warn('[view] texture fetch failed', rel, e);
    }
  }
  return out;
}

function applyBackground(post, ctx) {
  let url = null;
  if (post.source === 'local' && post.backgroundBlob) {
    bgObjectUrl = URL.createObjectURL(post.backgroundBlob);
    url = bgObjectUrl;
  } else if (post.source === 'local' && post.backgroundURL) {
    url = post.backgroundURL;
  } else if (post.background && post.background.type === 'image' && post.background.path) {
    url = post.background.path;
  } else if (post.background && post.background.type === 'url' && post.background.url) {
    url = post.background.url;
  }
  if (url) {
    bgLayer.style.backgroundImage = 'url(' + JSON.stringify(url) + ')';
    ctx.scene.background = null;
  }
}

if (!postId) {
  showOverlay('게시물 ID가 없습니다.');
  setText(titleEl, '오류');
} else {
  bootstrap(postId).catch(err => {
    console.error(err);
    hideOverlay();
    showErrorModal({
      title: '게시물 로드 실패',
      summary: err.message || String(err),
      detail: err.stack || '',
      onClose: () => { location.href = 'index.html'; },
    });
  });
}

async function bootstrap(id) {
  const post = await loadPost(id);
  if (!post) { showOverlay('게시물을 찾을 수 없습니다.'); return; }

  setText(titleEl, post.title || '(제목 없음)');
  const metaParts = [post.format.toUpperCase()];
  if (post.author) metaParts.push(post.author);
  if (post.createdAt) metaParts.push(formatDate(post.createdAt));
  setText(metaEl, metaParts.join(' · '));

  const ctx = createViewer({ canvas, container });

  applyBackground(post, ctx);

  try {
    const modelBlob = post.source === 'local'
      ? post.modelBlob
      : await fetch(post.modelPath).then(r => r.blob());
    const onProgress = p => setText(overlayText, '모델 로딩중... ' + Math.round(p*100) + '%');
    if (post.format === 'vrm') {
      await withTimeout(loadVRM(ctx, modelBlob, onProgress), MODEL_LOAD_TIMEOUT_MS, '모델');
    } else {
      const referenceFiles = await loadTextureBundle(post);
      await withTimeout(
        loadMMD(ctx, modelBlob, { onProgress, ext: post.format, referenceFiles }),
        MODEL_LOAD_TIMEOUT_MS, '모델'
      );
    }
  } catch (e) {
    console.error(e);
    hideOverlay();
    const isPmxLike = post.format === 'pmx' || post.format === 'pmd';
    showErrorModal({
      title: '모델 로딩 실패',
      summary: e.message || String(e),
      detail: e.stack || '',
      hint: isPmxLike
        ? 'PMX/PMD 파일은 같은 폴더의 텍스처(.bmp/.png/.tga 등)를 참조합니다. 텍스처 번들이 없으면 회색으로 표시되며, 타임아웃이 발생한 경우 다른 원인일 수 있습니다.'
        : undefined,
      onClose: () => { location.href = 'index.html'; },
    });
    return;
  }
  hideOverlay();

  const motion = createMotionController(ctx, {
    onStatusChange: (s) => setText(statusEl, s),
  });

  motionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.motion;
      if (motion.getCurrent() === name && motion.isPlaying()) {
        motion.reset();
        setActiveMotionButton(null);
      } else {
        const ok = motion.playBuiltIn(name);
        setActiveMotionButton(ok ? name : null);
      }
    });
  });

  stopBtn.addEventListener('click', () => {
    motion.reset();
    setActiveMotionButton(null);
  });

  snapshotBtn.addEventListener('click', () => {
    const dataURL = captureFromViewer(ctx);
    if (!dataURL) { toastError('스냅샷 실패'); return; }
    downloadDataURL(dataURL, (post.id || 'snapshot') + '.png');
    toastOk('저장했습니다.');
  });

  attachDropzone(container, dropzone, {
    accept: CONFIG.MOTION_EXT,
    onFile: async (file, info) => {
      if (!file) { toast('지원하지 않는 파일 형식입니다 (.vmd, .bvh만)'); return; }
      const ext = info.ext;
      if (!isMotionExt(ext)) { toast('지원하지 않는 파일'); return; }
      if (file.size > CONFIG.MAX_MOTION_SIZE) {
        toastError('모션 파일이 너무 큽니다 (' + formatBytes(file.size) + ' > ' + formatBytes(CONFIG.MAX_MOTION_SIZE) + ')');
        return;
      }
      const magicOk = await checkMagicBytes(file, ext);
      if (!magicOk) { toastError('파일 헤더 검증 실패 (올바른 ' + ext.toUpperCase() + ' 파일이 아닙니다)'); return; }
      setText(statusEl, ext.toUpperCase() + ' 로딩중...');
      try {
        let clip;
        if (ext === 'vmd') clip = await loadVMDClip(file, ctx);
        else clip = await loadBVHClip(file, ctx);
        const ok = motion.playClip(clip, file.name);
        if (ok) setActiveMotionButton(null);
      } catch (e) {
        console.error(e);
        toastError(ext.toUpperCase() + ' 적용 실패');
        setText(statusEl, '모션 적용 실패');
      }
    },
  });
}
