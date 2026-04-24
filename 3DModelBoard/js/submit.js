import { CONFIG, TOKEN } from './config.js';
import { settings } from './idb.js';
import { saveLocal } from './post-index.js';
import { createViewer } from './viewer-core.js';
import { loadVRM, loadMMD } from './viewer-vrm.js';
import { captureFromRenderer, normalizeImageFile, cropAndResizeDataURL, captureWithAspect } from './thumbnail.js';
import { mountHeader } from './header.js';
import { toast, toastOk, toastError } from './ui.js';
import { setText, getExt, isModelExt, isImageExt, checkMagicBytes, slugify, sanitizeTags, clampText, formatBytes, isValidHttpsImageURL } from './sanitize.js';
import { submitPostPR } from './github-api.js';
import { installErrorLog, withTimeout } from './error-log.js';
import { showErrorModal } from './error-modal.js';

installErrorLog();

const PREVIEW_LOAD_TIMEOUT_MS = 45000;

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
const thumbModeRadios = document.querySelectorAll('input[name="thumb-mode"]');
const thumbFieldAuto = document.getElementById('thumb-field-auto');
const thumbFieldUpload = document.getElementById('thumb-field-upload');
const thumbFieldUrl = document.getElementById('thumb-field-url');
const thumbUrlInput = document.getElementById('thumb-url-input');
const thumbAspectUpload = document.getElementById('thumb-aspect-upload');
const thumbAspectUrl = document.getElementById('thumb-aspect-url');
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
  thumb: {
    mode: 'auto-full',   // 'auto-full' | 'auto-head' | 'upload' | 'url'
    aspect: 'portrait',  // 'square' | 'portrait'
    dataURL: null,
    url: '',
  },
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
  btnSaveLocal.disabled = !ready;
  btnSubmitPR.disabled = !ready;
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

  const magicOk = await checkMagicBytes(file, ext);
  if (!magicOk) {
    toastError('파일 헤더 검증 실패: 올바른 ' + ext.toUpperCase() + ' 파일이 아닙니다.');
    return;
  }

  state.file = file;
  state.ext = ext;
  state.format = ext;
  setText(modelInfo, file.name + ' · ' + formatBytes(file.size));

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

  try {
    if (state.ext === 'vrm') {
      // VRM: Blob 직접 전달 → GLTFLoader.parse() 사용, fetch(blob:) CSP 우회
      await withTimeout(loadVRM(viewer, file), PREVIEW_LOAD_TIMEOUT_MS, '모델');
    } else {
      // PMX/PMD: Blob 직접 전달 → fetch(blob:) CSP 우회
      await withTimeout(loadMMD(viewer, file, { ext: state.ext }), PREVIEW_LOAD_TIMEOUT_MS, '모델');
    }
    state.modelLoaded = true;
    previewOverlay.classList.remove('active');
    applyBgToPreview();
    setTimeout(() => captureAuto(), 350);
  } catch (e) {
    console.error(e);
    state.modelLoaded = false;
    previewOverlay.firstElementChild.textContent = '로딩 실패: ' + (e.message || e);
    const isPmxLike = state.ext === 'pmx' || state.ext === 'pmd';
    showErrorModal({
      title: '미리보기 로딩 실패',
      summary: e.message || String(e),
      detail: e.stack || '',
      hint: isPmxLike
        ? 'PMX/PMD 파일은 같은 폴더의 텍스처(.bmp/.png/.tga 등)를 참조합니다. 현재는 단일 파일 업로드만 지원하므로 텍스처 없이 로드됩니다.'
        : undefined,
    });
  }
}

function setThumbPreview(src, aspect) {
  thumbPreview.classList.toggle('aspect-portrait', aspect === 'portrait');
  thumbPreview.classList.toggle('aspect-square', aspect !== 'portrait');
  thumbPreview.style.backgroundImage = src ? 'url(' + JSON.stringify(src) + ')' : '';
}

async function captureAuto() {
  if (!state.viewer || !state.modelLoaded) return;
  const mode = state.thumb.mode;
  let aspect = 'portrait';
  if (mode === 'auto-head') {
    const ok = state.viewer.frameHead();
    if (!ok) {
      toast('헤드 본을 찾지 못해 전신 프레이밍으로 대체합니다.');
      state.viewer.frameFullBody();
      aspect = 'portrait';
      setActiveMode('auto-full');
    } else {
      aspect = 'square';
    }
  } else {
    state.viewer.frameFullBody();
    aspect = 'portrait';
  }
  try {
    const data = await captureWithAspect(state.viewer.renderer, aspect, state.viewer);
    if (!data) return;
    state.thumb.dataURL = data;
    state.thumb.aspect = aspect;
    state.thumb.url = '';
    setThumbPreview(data, aspect);
  } catch (e) {
    console.warn(e);
  }
}

function setActiveMode(mode) {
  state.thumb.mode = mode;
  for (const r of thumbModeRadios) r.checked = (r.value === mode);
  thumbFieldAuto.classList.toggle('hidden', !(mode === 'auto-full' || mode === 'auto-head'));
  thumbFieldUpload.classList.toggle('hidden', mode !== 'upload');
  thumbFieldUrl.classList.toggle('hidden', mode !== 'url');
}

thumbModeRadios.forEach(r => r.addEventListener('change', async () => {
  if (!r.checked) return;
  const mode = r.value;
  setActiveMode(mode);

  if (mode === 'auto-full' || mode === 'auto-head') {
    if (state.modelLoaded) await captureAuto();
    else { state.thumb.dataURL = null; setThumbPreview(null, 'portrait'); }
    return;
  }
  if (mode === 'upload') {
    const aspect = thumbAspectUpload.checked ? 'square' : 'portrait';
    state.thumb.aspect = aspect;
    state.thumb.url = '';
    if (state.thumb.dataURL) setThumbPreview(state.thumb.dataURL, aspect);
    return;
  }
  if (mode === 'url') {
    const aspect = thumbAspectUrl.checked ? 'square' : 'portrait';
    state.thumb.aspect = aspect;
    state.thumb.dataURL = null;
    applyUrlPreview();
    return;
  }
}));

btnRecapture.addEventListener('click', async () => {
  if (!state.modelLoaded) { toast('먼저 모델을 로드하세요.'); return; }
  await captureAuto();
  toastOk('썸네일 갱신');
});

thumbInput.addEventListener('change', async () => {
  const file = thumbInput.files?.[0];
  if (!file) return;
  const ext = getExt(file.name);
  if (!isImageExt(ext)) { toastError('이미지 형식만 가능합니다.'); thumbInput.value = ''; return; }
  if (file.size > CONFIG.MAX_THUMB_SIZE) { toastError('이미지가 너무 큽니다.'); thumbInput.value = ''; return; }
  const magicOk = await checkMagicBytes(file, ext);
  if (!magicOk) { toastError('이미지 헤더 검증 실패.'); thumbInput.value = ''; return; }
  const aspect = thumbAspectUpload.checked ? 'square' : 'portrait';
  try {
    const dataURL = await normalizeImageFile(file, aspect);
    state.thumb.mode = 'upload';
    state.thumb.dataURL = dataURL;
    state.thumb.aspect = aspect;
    state.thumb.url = '';
    setThumbPreview(dataURL, aspect);
    toastOk('썸네일 교체됨');
  } catch (e) {
    console.error(e);
    toastError('이미지 처리 실패');
  }
});

thumbAspectUpload.addEventListener('change', async () => {
  if (state.thumb.mode !== 'upload' || !thumbInput.files?.[0]) {
    state.thumb.aspect = thumbAspectUpload.checked ? 'square' : 'portrait';
    if (state.thumb.dataURL) {
      const newData = await cropAndResizeDataURL(state.thumb.dataURL, state.thumb.aspect);
      state.thumb.dataURL = newData;
      setThumbPreview(newData, state.thumb.aspect);
    } else {
      setThumbPreview(null, state.thumb.aspect);
    }
    return;
  }
  const file = thumbInput.files[0];
  const aspect = thumbAspectUpload.checked ? 'square' : 'portrait';
  try {
    const dataURL = await normalizeImageFile(file, aspect);
    state.thumb.dataURL = dataURL;
    state.thumb.aspect = aspect;
    setThumbPreview(dataURL, aspect);
  } catch (e) { console.error(e); }
});

thumbUrlInput.addEventListener('input', () => {
  const v = thumbUrlInput.value.trim();
  state.thumb.url = v;
  applyUrlPreview();
});

thumbAspectUrl.addEventListener('change', () => {
  state.thumb.aspect = thumbAspectUrl.checked ? 'square' : 'portrait';
  applyUrlPreview();
});

function applyUrlPreview() {
  const v = state.thumb.url;
  if (v && isValidHttpsImageURL(v)) {
    setThumbPreview(v, state.thumb.aspect);
  } else {
    setThumbPreview(null, state.thumb.aspect);
  }
}

function applyBgToPreview() {
  let url = null;
  if (state.bg.mode === 'image' && state.bg.dataURL) url = state.bg.dataURL;
  else if (state.bg.mode === 'url' && isValidHttpsImageURL(state.bg.url)) url = state.bg.url;

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
  if (!isValidHttpsImageURL(v)) {
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
  const thumb = resolveThumb();
  return { id, title, author, tags, description, format: state.format, modelBlob: state.file, modelExt: state.ext, bg, thumb };
}

function resolveThumb() {
  const { mode, aspect, dataURL, url } = state.thumb;
  if (mode === 'url') {
    if (isValidHttpsImageURL(url)) return { mode, aspect, url };
    return { mode: 'unknown', aspect, dataURL: null };
  }
  return { mode, aspect, dataURL };
}

function resolveBg() {
  if (state.bg.mode === 'image' && state.bg.blob && state.bg.ext) {
    return { mode: 'image', blob: state.bg.blob, ext: state.bg.ext, dataURL: state.bg.dataURL };
  }
  if (state.bg.mode === 'url' && isValidHttpsImageURL(state.bg.url)) {
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
      thumbnailDataURL: data.thumb.dataURL || null,
      thumbnailURL: data.thumb.mode === 'url' ? data.thumb.url : null,
      thumbnailAspect: data.thumb.aspect,
      thumbnailMode: data.thumb.mode,
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
      thumb: data.thumb,
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