import { SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders';

const GLB_MAGIC = 0x46546C67;
const GLB_CHUNK_JSON = 0x4E4F534A;

export async function loadVRMFromBlob(scene, blob, onProgress) {
  const arrayBuffer = await blob.arrayBuffer();
  const humanoidInfo = extractVRMHumanoidFromGLB(arrayBuffer);

  const url = URL.createObjectURL(new Blob([arrayBuffer]));
  try {
    const result = await SceneLoader.ImportMeshAsync(
      '', '', url, scene,
      onProgress ? (ev) => onProgress(ev.lengthComputable ? ev.loaded / ev.total : 0) : null,
      '.glb'
    );

    const root = pickRoot(result);
    const humanoid = resolveHumanoid(scene, result, humanoidInfo);

    return { root, humanoid, raw: result };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extractVRMHumanoidFromGLB(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    if (u8.length < 20) return null;
    const dv = new DataView(buffer);
    if (dv.getUint32(0, true) !== GLB_MAGIC) return null;
    const jsonLen = dv.getUint32(12, true);
    const chunkType = dv.getUint32(16, true);
    if (chunkType !== GLB_CHUNK_JSON) return null;
    const text = new TextDecoder('utf-8').decode(u8.subarray(20, 20 + jsonLen));
    const gltf = JSON.parse(text);
    return extractVRMHumanoidFromJson(gltf);
  } catch (e) {
    console.warn('[vrm-adapter] GLB header parse failed', e);
    return null;
  }
}

function extractVRMHumanoidFromJson(gltf) {
  const exts = gltf?.extensions || {};
  const nodes = gltf?.nodes || [];
  if (exts.VRMC_vrm) {
    const humanBones = exts.VRMC_vrm.humanoid?.humanBones || {};
    const map = {};
    for (const [name, def] of Object.entries(humanBones)) {
      const idx = def?.node;
      if (typeof idx === 'number' && nodes[idx]?.name) map[name] = nodes[idx].name;
    }
    return { version: '1.0', map };
  }
  if (exts.VRM) {
    const humanBones = exts.VRM.humanoid?.humanBones || [];
    const map = {};
    for (const def of humanBones) {
      const idx = def?.node;
      if (typeof idx === 'number' && def.bone && nodes[idx]?.name) {
        map[def.bone] = nodes[idx].name;
      }
    }
    return { version: '0.x', map };
  }
  return null;
}

function pickRoot(result) {
  const all = [...(result.transformNodes || []), ...(result.meshes || [])];
  return all.find(n => n.name === '__root__')
      || all.find(n => !n.parent)
      || result.meshes?.[0]
      || null;
}

function resolveHumanoid(scene, result, info) {
  if (!info) return null;
  const cache = new Map();
  // Babylon's GLTF loader creates *both* a TransformNode and a Bone with the
  // same name for every glTF skeletal node. The TransformNode often ends up
  // as a parent of the actual deforming bone, so its world position can land
  // on the chest/neck even when we asked for "head". Prefer the Bone's linked
  // transform node first — that's the one whose absolute position tracks the
  // VRM humanoid joint we care about.
  const findNode = (name) => {
    for (const skel of result.skeletons || []) {
      const bone = skel.bones.find(b => b.name === name);
      if (bone) {
        const tn = bone.getTransformNode?.();
        if (tn) return tn;
      }
    }
    return scene.getTransformNodeByName?.(name) ?? null;
  };
  return {
    version: info.version,
    map: info.map,
    getBoneNode(humanoidName) {
      if (cache.has(humanoidName)) return cache.get(humanoidName);
      const nodeName = info.map[humanoidName];
      const node = nodeName ? findNode(nodeName) : null;
      cache.set(humanoidName, node);
      return node;
    },
  };
}
