import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { HUMANOID_BONES, PMX_BONE_MAP } from './bone-map.js';

// 로컬 업로드 PMX/PMD는 텍스처가 함께 올라오지 않아 상대경로 요청이 404가 되고,
// 실패가 MMDLoader 내부 pending 카운터에 남아 "무한 로딩"처럼 보인다.
// 로컬 분기 전용 LoadingManager의 setURLModifier로 상대경로만 투명 1px PNG로 치환한다.
const TRANSPARENT_1PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function createLocalPmxManager() {
  const m = new THREE.LoadingManager();
  m.setURLModifier((url) => {
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return TRANSPARENT_1PX_PNG;
  });
  return m;
}

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

  let mesh;
  if (urlOrBlob instanceof Blob) {
    // 로컬 Blob/File — 텍스처 상대경로 404 방지용 전용 LoadingManager 주입.
    const mgr = createLocalPmxManager();
    const loader = new MMDLoader(mgr);
    if (loader.meshBuilder) {
      loader.meshBuilder.manager = mgr;
      if (loader.meshBuilder.textureLoader) loader.meshBuilder.textureLoader.manager = mgr;
      if (loader.meshBuilder.tgaLoader) loader.meshBuilder.tgaLoader.manager = mgr;
    }
    // MMDLoader 공개 API에 parsePMX/parsePMD 없음 → _getParser() + meshBuilder.build() 사용.
    // 향후 three.js 버전 업 시 내부 API 이름이 바뀌면 아래 가드가 명확한 에러로 안내.
    if (typeof loader._getParser !== 'function') {
      throw new Error('MMDLoader 내부 API 변경 감지 — three.js 버전 확인 필요');
    }
    const buffer = await urlOrBlob.arrayBuffer();
    const fmt = ext || (urlOrBlob.name ? urlOrBlob.name.split('.').pop().toLowerCase() : '');
    const parser = loader._getParser();
    const data = (fmt === 'pmd') ? parser.parsePmd(buffer, true) : parser.parsePmx(buffer, true);
    mesh = loader.meshBuilder.setCrossOrigin(loader.crossOrigin).build(data, '', onProgress, () => {});
    ctx.scene.add(mesh);
  } else {
    // 일반 URL (원격 게시물) — MMDLoader.load() 사용. 기본 DefaultLoadingManager 유지.
    const loader = new MMDLoader();
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
