import { CONFIG } from './config.js';

export function captureFromRenderer(renderer) {
  try {
    return renderer.domElement.toDataURL('image/png');
  } catch (e) {
    console.warn('thumbnail capture failed', e);
    return null;
  }
}

function targetSize(aspect) {
  if (aspect === 'portrait') return { w: CONFIG.THUMB_PORTRAIT_W, h: CONFIG.THUMB_PORTRAIT_H };
  return { w: CONFIG.THUMB_MAX_DIM, h: CONFIG.THUMB_MAX_DIM };
}

function cropToAspect(imgW, imgH, outW, outH) {
  const targetRatio = outW / outH;
  const srcRatio = imgW / imgH;
  let sW, sH;
  if (srcRatio > targetRatio) {
    sH = imgH;
    sW = imgH * targetRatio;
  } else {
    sW = imgW;
    sH = imgW / targetRatio;
  }
  const sX = (imgW - sW) / 2;
  const sY = (imgH - sH) / 2;
  return { sX, sY, sW, sH };
}

export async function captureWithAspect(renderer, aspect = 'square', ctx = null) {
  if (ctx && ctx.scene && ctx.camera) {
    try { renderer.render(ctx.scene, ctx.camera); } catch (_) {}
  }
  const src = captureFromRenderer(renderer);
  if (!src) return null;
  return cropAndResizeDataURL(src, aspect);
}

export function cropAndResizeDataURL(dataURL, aspect = 'square') {
  const { w, h } = targetSize(aspect);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { sX, sY, sW, sH } = cropToAspect(img.naturalWidth, img.naturalHeight, w, h);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, sX, sY, sW, sH, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataURL;
  });
}

export async function normalizeImageFile(file, aspect = 'square') {
  const bitmap = await createImageBitmap(file);
  const { w, h } = targetSize(aspect);
  const { sX, sY, sW, sH } = cropToAspect(bitmap.width, bitmap.height, w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, sX, sY, sW, sH, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/png');
}

export function resizeDataURL(dataURL, aspect = 'square') {
  return cropAndResizeDataURL(dataURL, aspect);
}

export function dataURLToBlob(dataURL) {
  const [header, b64] = dataURL.split(',');
  const mime = (header.match(/data:(.*?);/) || [, 'image/png'])[1];
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function dataURLToBase64(dataURL) {
  return dataURL.split(',')[1] || '';
}

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
