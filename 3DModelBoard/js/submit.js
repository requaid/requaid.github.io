import { CONFIG, TOKEN } from './config.js';
import { settings } from './idb.js';
import { saveLocal } from './post-index.js';
import { createViewer } from './viewer-core.js';
import { loadVRM, loadMMD } from './viewer-vrm.js';
import { captureFromRenderer, normalizeImageFile, resizeDataURL, dataURLToBase64 } from './thumbnail.js';
import { mountHeader } from './header.js';
import { toast, toastOk, toastError } from './ui.js';
import { setText, getExt, isModelExt, isImageExt, checkMagicBytes, slugify, sanitizeTags, clampText, formatBytes, isValidHttpsBgURL } from './sanitize.js';
import { submitPostPR } from './github-api.js';

mountHeader('submit');

const modelInput = document.getElementById('model-input');
const modelDrop = document.getElementById('model-drop');
const modelInfo = document.getElementById('model-info');
const titleInput = document.getElementById('f-title');
const authorInput = document.getElementById('f-author');
const tagsInput = document.getElementById('f-tags');
const descInput = document.getElementById('f-desc');
const thumbPreview = document.getElementById('thumb-preview');
const thumbInput = document.getElementById('thumb-input');
const btnRecapture = document.getElementById('btn-recapture');
const btnSaveLocal = document.getElementById('btn-save-local');
const btnSubmitPR = document.getElementById('btn-submit-pr');
const logBox = document.getElementById('log');

const previewCanvas = document.getElementById('preview-canvas');
const previewContainer = document.querySelector('.preview-viewer');
const previewOverlay = document.getElementById('preview-overlay');
const previewBg = document.getElementById('preview-bg');

const bgModeRadios = document.querySelectorAll('input[name="bg-mode"]');
const bgImageField = document.getElementById('bg-image-field');
const bgUrlField = document.getElementById('bg-url-field');
const bgImageInput = document.getElementById('bg-image-input');
const bgUrlInput = document.getElementById('bg-url-input');
const bgPreview = document.getElementById('bg-preview');

(async () => {
  authorInput.value = (await settings.get('authorName')) || '';
})();

let state = {
  file: null,
  ext: null,
  format: null,
  viewer: null,
  thumbDataURL: null,
  modelLoaded: false,
  bg: { mode: 'none', blob: null, ext: null, url: '', dataURL: null },
};

function log(msg, type) {
  logBox.classList.remove('hidden');
  const line = document.createElement('div');
  if (type && type !== 'info') line.className = type;
  line.textContent = msg;
  logBox.appendChild(line);
  logBox.scrollTop = logBox.scrollHeight;
}

function updateSaveButtons() {
  const hasTitle = titleInput.value.trim().length > 0;
  const ready = state.modelLoaded && hasTitle;
  btnSaveLocal.disabled = !ready || state.file.size > CONFIG.MAX_LOCAL_SIZE;
  btnSubmitPR.disabled = !ready || state.file.size > CONFIG.MAX_REPO_SIZE;
}

titleInput.addEventListener('input', updateSaveButtons);

modelDrop.addEventListener('click', (e) => {
  if (e.target.tagName !== 'INPUT') modelInput.click();
});
modelDrop.addEventListener('dragover', (e) => { e.preventDefault(); modelDrop.classList.add('dragover'); });
modelDrop.addEventListener('dragleave', () => modelDrop.classList.remove('dragover'));
modelDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  modelDrop.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleModelFile(file);
});
modelInput.addEventListener('change', () => {
  if (modelInput.files && modelInput.files[0]) handleModelFile(modelInput.files[0]);
});

async function handleModelFile(file) {
  const ext = getExt(file.name);
  if (!isModelExt(ext)) { toastError('지원하지 않는 모델 형식입니다.'); return; }

  if (file.size > CONFIG.MAX_LOCAL_SIZE) {
    toastError('모델 파일이 너무 큽니다 (' + formatBytes(file.size) + ' > ' + formatBytes(CONFIG.MAX_LOCAL_SIZE) + ')');
    return;
  }
  const magicOk = await checkMagicBytes(file, ext);
  if (!magicOk) {
    toastError('파일 헤더 검증 실패: 올바른 ' + ext.toUpperCase() + ' 파일이 아닙니다.');
    return;
  }

  state.file = file;
  state.ext = ext;
  state.format = ext;
  setText(modelInfo, file.name + ' · ' + formatBytes(file.size));

  const sizeWarn = document.createElement('span');
  if (file.size > CONFIG.MAX_REPO_SIZE) {
    sizeWarn.textContent = ' · ⚠ 25MB 초과 → PR 불가, 로컬 저장만 가능';
    sizeWarn.style.color = 'var(--warn)';
    modelInfo.appendChild(sizeWarn);
  }

  if (!titleInput.value.trim()) {
    const base = file.name.replace(/\.[^.]+$/, '');
    titleInput.value = base.slice(0, 120);
  }

  await loadIntoPreview(file);
  updateSaveButtons();
}

async function loadIntoPreview(file) {
  previewOverlay.classList.add('active');
  setText(previewOverlay.firstElementChild, '로딩 중...');

  if (state.viewer) {
    state.viewer.dispose();
    state.viewer = null;
  }

  const viewer = createViewer({ canvas: previewCanvas, container: previewContainer });
  state.viewer = viewer;

  const url = URL.createObjectURL(file);
  try {
    if (state.ext === 'vrm') await loadVRM(viewer, url);
    else await loadMMD(viewer, url);
    state.modelLoaded = true;
    previewOverlay.classList.remove('active');
    applyBgToPreview();
    setTimeout(() => captureAutoThumb(), 300);
  } catch (e) {
    console.error(e);
    state.modelLoaded = false;
    previewOverlay.firstElementChild.textContent = '로딩 실패: ' + (e.message || e);
    toastError('모델 로딩 실패');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function captureAutoThumb() {
  if (!state.viewer) return;
  const dataURL = captureFromRenderer(state.viewer.renderer);
  if (!dataURL) return;
  resizeDataURL(dataURL, CONFIG.THUMB_MAX_DIM).then(resized => {
    state.thumbDataURL = resized;
    thumbPreview.style.backgroundImage = 'url(' + JSON.stringify(resized) + ')';
  }).catch(() => {
    state.thumbDataURL = dataURL;
    thumbPreview.style.backgroundImage = 'url(' + JSON.stringify(dataURL) + ')';
  });
}

btnRecapture.addEventListener('click', () => {
  if (!state.modelLoaded) { toast('먼저 모델을 로드하세요.'); return; }
  captureAutoThumb();
  toastOk('썸네일 갱신');
});

thumbInput.addEventListener('change', async () => {
  const file = thumbInput.files?.[0];
  if (!file) return;
  const ext = getExt(file.name);
  if (!isImageExt(ext)) { toastError('이미지 형식만 가능합니다.'); return; }
  if (file.size > CONFIG.MAX_THUMB_SIZE) { toastError('이미지가 너무 큽니다.'); return; }
  const magicOk = await checkMagicBytes(file, ext);
  if (!magicOk) { toastError('이미지 헤더 검증 실패.'); return; }
  try {
    const dataURL = await normalizeImageFile(file);
    state.thumbDataURL = dataURL;
    thumbPreview.style.backgroundImage = 'url(' + JSON.stringify(dataURL) + ')';
    toastOk('썸네일 교체됨');
  } catch (e) {
    console.error(e);
    toastError('이미지 처리 실패');
  }
});

function applyBgToPreview() {
  let url = null;
  if (state.bg.mode === 'image' && state.bg.dataURL) url = state.bg.dataURL;
  else if (state.bg.mode === 'url' && isValidHttpsBgURL(state.bg.url)) url = state.bg.url;

  if (url) {
    const css = 'url(' + JSON.stringify(url) + ')';
    previewBg.style.backgroundImage = css;
    bgPreview.style.backgroundImage = css;
    bgPreview.classList.remove('hidden');
    if (state.viewer) state.viewer.scene.background = null;
  } else {
    previewBg.style.backgroundImage = '';
    bgPreview.style.backgroundImage = '';
    bgPreview.classList.add('hidden');
  }
}

bgModeRadios.forEach(r => r.addEventListener('change', () => {
  state.bg.mode = r.value;
  bgImageField.classList.toggle('hidden', r.value !== 'image');
  bgUrlField.classList.toggle('hidden', r.value !== 'url');
  applyBgToPreview();
}));

bgImageInput.addEventListener('change', async () => {
  const file = bgImageInput.files?.[0];
  if (!file) return;
  const ext = getExt(file.name);
  if (!isImageExt(ext)) { toastError('이미지 형식만 가능합니다.'); bgImageInput.value = ''; return; }
  if (file.size > CONFIG.MAX_BG_SIZE) {
    toastError('배경 이미지가 너무 큽니다 (' + formatBytes(file.size) + ' > ' + formatBytes(CONFIG.MAX_BG_SIZE) + ')');
    bgImageInput.value = '';
    return;
  }
  const magicOk = await checkMagicBytes(file, ext);
  if (!magicOk) { toastError('배경 이미지 헤더 검증 실패.'); bgImageInput.value = ''; return; }
  try {
    const dataURL = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
    state.bg.blob = file;
    state.bg.ext = ext === 'jpeg' ? 'jpg' : ext;
    state.bg.dataURL = dataURL;
    applyBgToPreview();
    toastOk('배경 이미지 적용');
  } catch (e) {
    console.error(e);
    toastError('배경 이미지 처리 실패');
  }
});

bgUrlInput.addEventListener('input', () => {
  const v = bgUrlInput.value.trim();
  state.bg.url = v;
  if (!v) { applyBgToPreview(); return; }
  if (!isValidHttpsBgURL(v)) {
    previewBg.style.backgroundImage = '';
    bgPreview.style.backgroundImage = '';
    bgPreview.classList.add('hidden');
    return;
  }
  applyBgToPreview();
});

function gatherPostData() {
  const title = clampText(titleInput.value.trim(), 120);
  const author = clampText(authorInput.value.trim() || 'anonymous', 40);
  const tags = sanitizeTags(tagsInput.value);
  const description = clampText(descInput.value, 2000);
  const id = slugify(title) + '-' + Date.now().toString(36);
  const bg = resolveBg();
  return { id, title, author, tags, description, format: state.format, modelBlob: state.file, modelExt: state.ext, bg };
}

function resolveBg() {
  if (state.bg.mode === 'image' && state.bg.blob && state.bg.ext) {
    return { mode: 'image', blob: state.bg.blob, ext: state.bg.ext, dataURL: state.bg.dataURL };
  }
  if (state.bg.mode === 'url' && isValidHttpsBgURL(state.bg.url)) {
    return { mode: 'url', url: state.bg.url };
  }
  return { mode: 'none' };
}

btnSaveLocal.addEventListener('click', async () => {
  if (!state.modelLoaded || !state.file) return;
  try {
    const data = gatherPostData();
    await saveLocal({
      id: data.id,
      title: data.title,
      author: data.author,
      description: data.description,
      tags: data.tags,
      format: data.format,
      modelBlob: state.file,
      modelName: state.file.name,
      thumbnailDataURL: state.thumbDataURL,
      backgroundBlob: data.bg.mode === 'image' ? data.bg.blob : null,
      backgroundExt:  data.bg.mode === 'image' ? data.bg.ext  : null,
      backgroundURL:  data.bg.mode === 'url'   ? data.bg.url  : null,
      createdAt: new Date().toISOString(),
    });
    await settings.set('authorName', data.author);
    toastOk('내 브라우저에 저장했습니다.');
    setTimeout(() => { location.href = 'index.html'; }, 600);
  } catch (e) {
    console.error(e);
    toastError('로컬 저장 실패: ' + (e.message || e));
  }
});

btnSubmitPR.addEventListener('click', async () => {
  if (!state.modelLoaded || !state.file) return;
  if (state.file.size > CONFIG.MAX_REPO_SIZE) { toastError('25MB 초과 — PR 불가'); return; }

  if (!TOKEN.has()) {
    if (!confirm('세션에 PAT가 없습니다. 설정 페이지로 이동할까요?')) return;
    location.href = 'settings.html';
    return;
  }

  btnSaveLocal.disabled = true;
  btnSubmitPR.disabled = true;
  logBox.textContent = '';
  logBox.classList.remove('hidden');

  try {
    const data = gatherPostData();
    const pr = await submitPostPR({
      postId: data.id,
      title: data.title,
      description: data.description,
      author: data.author,
      tags: data.tags,
      format: data.format,
      modelBlob: data.modelBlob,
      modelExt: data.modelExt,
      thumbnailDataURL: state.thumbDataURL,
      bgBlob: data.bg.mode === 'image' ? data.bg.blob : null,
      bgExt:  data.bg.mode === 'image' ? data.bg.ext  : null,
      bgURL:  data.bg.mode === 'url'   ? data.bg.url  : null,
      onLog: log,
    });
    await settings.set('authorName', data.author);
    toastOk('PR 생성 완료');
    const a = document.createElement('a');
    a.href = pr.html_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'PR 열기 →';
    const line = document.createElement('div');
    line.className = 'ok';
    line.appendChild(a);
    logBox.appendChild(line);
  } catch (e) {
    console.error(e);
    log('실패: ' + (e.message || e), 'err');
    toastError('PR 생성 실패');
  } finally {
    updateSaveButtons();
  }
});
