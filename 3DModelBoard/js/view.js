import { CONFIG } from './config.js';
import { loadPost } from './post-index.js';
import { createViewer } from './viewer-core.js';
import { loadVRM, loadMMD } from './viewer-vrm.js';
import { createMotionController } from './viewer-motion.js';
import { loadVMDClip, loadBVHClip } from './motion-files.js';
import { attachDropzone } from './drag-drop.js';
import { captureFromRenderer, downloadDataURL } from './thumbnail.js';
import { setText, formatDate, getExt, isMotionExt, checkMagicBytes, formatBytes } from './sanitize.js';
import { toast, toastError, toastOk } from './ui.js';

const params = new URLSearchParams(location.search);
const postId = params.get('id');

const container = document.getElementById('viewer-container');
const canvas = document.getElementById('viewer-canvas');
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

if (!postId) {
  showOverlay('게시물 ID가 없습니다.');
  setText(titleEl, '오류');
} else {
  bootstrap(postId).catch(err => {
    console.error(err);
    showOverlay('로드 실패: ' + (err.message || err));
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

  let modelUrl;
  let revokeUrl = null;
  if (post.source === 'local') {
    modelUrl = URL.createObjectURL(post.modelBlob);
    revokeUrl = () => URL.revokeObjectURL(modelUrl);
  } else {
    modelUrl = post.modelPath;
  }

  try {
    if (post.format === 'vrm') {
      await loadVRM(ctx, modelUrl, { onProgress: p => setText(overlayText, '모델 로딩중... ' + Math.round(p*100) + '%') });
    } else {
      await loadMMD(ctx, modelUrl, { onProgress: p => setText(overlayText, '모델 로딩중... ' + Math.round(p*100) + '%') });
    }
  } catch (e) {
    console.error(e);
    showOverlay('모델 로딩 실패: ' + (e.message || e));
    return;
  } finally {
    if (revokeUrl) revokeUrl();
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
    const dataURL = captureFromRenderer(ctx.renderer);
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
        if (ext === 'vmd') clip = await loadVMDClip(file, ctx.currentModel);
        else clip = await loadBVHClip(file);
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
