import * as THREE from 'three';

export async function loadVMDClip(file, model) {
  const buffer = await file.arrayBuffer();
  const { MMDLoader } = await import('three/addons/loaders/MMDLoader.js');
  const loader = new MMDLoader();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      loader.loadAnimation(
        blobUrl,
        model,
        (clip) => resolve(clip),
        undefined,
        (err) => reject(err),
      );
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function loadBVHClip(file) {
  const text = await file.text();
  const { BVHLoader } = await import('three/addons/loaders/BVHLoader.js');
  const loader = new BVHLoader();
  const result = loader.parse(text);
  if (!result || !result.clip) throw new Error('BVH 파싱 실패');
  return result.clip;
}
