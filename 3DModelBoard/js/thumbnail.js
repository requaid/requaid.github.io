import { CONFIG } from './config.js';

export function captureFromRenderer(renderer) {
  try {
    return renderer.domElement.toDataURL('image/png');
  } catch (e) {
    console.warn('thumbnail capture failed', e);
    return null;
  }
}

export async function normalizeImageFile(file, maxDim = CONFIG.THUMB_MAX_DIM) {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  const out = Math.min(size, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const g = canvas.getContext('2d');
  g.drawImage(bitmap, sx, sy, size, size, 0, 0, out, out);
  bitmap.close?.();
  return canvas.toDataURL('image/png');
}

export function resizeDataURL(dataURL, maxDim = CONFIG.THUMB_MAX_DIM) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight, maxDim * 2);
      const out = Math.min(size, maxDim);
      const sx = (img.naturalWidth - size) / 2;
      const sy = (img.naturalHeight - size) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const g = canvas.getContext('2d');
      g.drawImage(img, sx, sy, size, size, 0, 0, out, out);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataURL;
  });
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
