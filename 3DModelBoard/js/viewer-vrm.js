import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { HUMANOID_BONES, PMX_BONE_MAP } from './bone-map.js';

export async function loadVRM(ctx, url, { onProgress } = {}) {
  const loader = new GLTFLoader();
  loader.register(parser => new VRMLoaderPlugin(parser));

  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, (p) => {
      if (p.total > 0 && onProgress) onProgress(p.loaded / p.total);
    }, reject);
  });

  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error('VRM 데이터를 찾을 수 없습니다.');
  VRMUtils.removeUnnecessaryJoints(vrm.scene);
  ctx.scene.add(vrm.scene);
  ctx.currentVRM = vrm;
  ctx.currentModel = vrm.scene;
  ctx.modelFormat = 'vrm';
  ctx.mixer = new THREE.AnimationMixer(vrm.scene);
  ctx.centerModel(vrm.scene);
  saveTpose(ctx);
  return vrm;
}

export async function loadMMD(ctx, urlOrBlob, { onProgress, ext } = {}) {
  const { MMDLoader } = await import('three/addons/loaders/MMDLoader.js');
  const loader = new MMDLoader();

  let mesh;
  if (urlOrBlob instanceof Blob) {
    // Blob/File 직접 전달 — fetch(blob:) 없이 arrayBuffer()로 읽어 내부 API로 파싱
    // MMDLoader 공개 API에 parsePMX/parsePMD 없음 → _getParser() + meshBuilder.build() 사용
    // meshBuilder.build()는 동기 함수로 SkinnedMesh를 직접 반환
    const buffer = await urlOrBlob.arrayBuffer();
    const fmt = ext || (urlOrBlob.name ? urlOrBlob.name.split('.').pop().toLowerCase() : '');
    const parser = loader._getParser();
    const data = (fmt === 'pmd') ? parser.parsePmd(buffer, true) : parser.parsePmx(buffer, true);
    mesh = loader.meshBuilder.setCrossOrigin(loader.crossOrigin).build(data, '', onProgress, () => {});
    ctx.scene.add(mesh);
  } else {
    // 일반 URL (원격 게시물) — MMDLoader.load() 사용
    mesh = await new Promise((resolve, reject) => {
      loader.load(urlOrBlob, resolve,
        (p) => { if (p.total > 0 && onProgress) onProgress(p.loaded / p.total); },
        reject);
    });
    ctx.scene.add(mesh);
  }
  
  ctx.currentModel = mesh;
  ctx.modelFormat = 'mmd';
  ctx.mixer = new THREE.AnimationMixer(mesh);
  ctx.centerModel(mesh);
  saveTpose(ctx);
  return mesh;
}

export function getBoneNode(ctx, humanoidBone) {
  if (ctx.modelFormat === 'vrm' && ctx.currentVRM) {
    return ctx.currentVRM.humanoid.getRawBoneNode(humanoidBone) || null;
  }
  if (ctx.currentModel) {
    const mmdName = PMX_BONE_MAP[humanoidBone];
    if (!mmdName) return null;
    let found = null;
    ctx.currentModel.traverse(obj => {
      if (obj.isBone && obj.name === mmdName) found = obj;
    });
    return found;
  }
  return null;
}

export function getBoneTrackName(ctx, humanoidBone) {
  const node = getBoneNode(ctx, humanoidBone);
  return node ? node.name : null;
}

export function saveTpose(ctx) {
  ctx.defaultBoneQuats = {};
  HUMANOID_BONES.forEach(bone => {
    const node = getBoneNode(ctx, bone);
    if (node) ctx.defaultBoneQuats[bone] = node.quaternion.clone();
  });
}

export function restoreTpose(ctx) {
  if (!ctx.defaultBoneQuats) return;
  HUMANOID_BONES.forEach(bone => {
    const node = getBoneNode(ctx, bone);
    if (node && ctx.defaultBoneQuats[bone]) node.quaternion.copy(ctx.defaultBoneQuats[bone]);
  });
}
