import { ImportMeshAsync, registerSceneLoaderPlugin } from '@babylonjs/core';
import {
  PmxLoader, PmdLoader,
  RegisterDxBmpTextureLoader,
  SdefInjector,
} from 'babylon-mmd';
import { loadVRMFromBlob } from './vrm-adapter.js';
import { buildMMDHumanoidFromBones } from './bone-map.js';

// Plugin registration is idempotent across the whole page (registry is keyed
// by extension), but SDEF injection must run once *per engine instance*.
// Submit/preview disposes and recreates the engine every time the user picks
// a different model, so a single boolean gate would leave the second engine
// without SDEF — manifesting as silent shader-compile hangs on PMX/PMD.
let _pluginsRegistered = false;
const _sdefInjectedEngines = new WeakSet();

function ensureMMDRegistered(engine) {
  if (!_pluginsRegistered) {
    registerSceneLoaderPlugin(new PmxLoader());
    registerSceneLoaderPlugin(new PmdLoader());
    RegisterDxBmpTextureLoader();
    _pluginsRegistered = true;
  }
  if (engine && !_sdefInjectedEngines.has(engine)) {
    SdefInjector.OverrideEngineCreateEffect(engine);
    _sdefInjectedEngines.add(engine);
  }
}

export async function loadVRM(ctx, blob, onProgress) {
  unloadCurrent(ctx);
  const loaded = await loadVRMFromBlob(ctx.scene, blob, onProgress);
  ctx.currentModel = loaded.root;
  ctx.humanoid = loaded.humanoid;
  ctx.modelFormat = 'vrm';
  ctx._loadResult = loaded.raw;
  saveTposeSnapshot(ctx);
  ctx.centerModel(loaded.root);
  return loaded.root;
}

export async function loadMMD(ctx, blob, { ext = 'pmx', onProgress, referenceFiles = [] } = {}) {
  unloadCurrent(ctx);
  ensureMMDRegistered(ctx.engine);

  const fileName = `model.${ext}`;
  const file = new File([blob], fileName);

  // When no texture bundle is provided, suppress fetch attempts for the
  // PMX/PMD's inline texture path table. babylon-mmd's default builder issues
  // `scene._loadFile(rootUrl + texturePath)` per texture; rootUrl is "" for a
  // File source, so each fetch hits the page origin (`/tex/eye.bmp` etc.) and
  // 404s. Passing `materialBuilder: null` short-circuits that path and produces
  // an explicit grey-mesh fallback — the documented behaviour when no bundle
  // is supplied (see AUTHOR.md §9).
  const mmdOptions = { referenceFiles };
  if (referenceFiles.length === 0) {
    mmdOptions.materialBuilder = null;
  }

  const result = await ImportMeshAsync(file, ctx.scene, {
    pluginExtension: '.' + ext,
    onProgress: onProgress
      ? (ev) => onProgress(ev.lengthComputable ? ev.loaded / ev.total : 0)
      : undefined,
    pluginOptions: {
      mmdmodel: mmdOptions,
    },
  });

  const root = pickRoot(result);
  ctx.currentModel = root;
  ctx.humanoid = buildMMDHumanoidFromBones(result.skeletons || []);
  ctx.modelFormat = ext;
  ctx._loadResult = result;
  saveTposeSnapshot(ctx);
  ctx.centerModel(root);
  return root;
}

function pickRoot(result) {
  const all = [...(result.transformNodes || []), ...(result.meshes || [])];
  return all.find(n => n.name === '__root__')
      || all.find(n => !n.parent)
      || result.meshes?.[0]
      || null;
}

function unloadCurrent(ctx) {
  if (ctx.animationGroup) {
    try { ctx.animationGroup.stop(); ctx.animationGroup.dispose(); } catch {}
    ctx.animationGroup = null;
  }
  const r = ctx._loadResult;
  if (r) {
    for (const arr of [r.skeletons, r.animationGroups, r.geometries, r.lights, r.particleSystems]) {
      for (const item of arr || []) try { item.dispose?.(); } catch {}
    }
    for (const m of r.meshes || []) try { m.dispose(false, true); } catch {}
    for (const tn of r.transformNodes || []) try { tn.dispose(); } catch {}
  }
  ctx.currentModel = null;
  ctx.humanoid = null;
  ctx.modelFormat = null;
  ctx.tposeSnapshot = null;
  ctx._loadResult = null;
}

function saveTposeSnapshot(ctx) {
  const snap = new Map();
  if (!ctx.currentModel) { ctx.tposeSnapshot = snap; return; }
  const seen = new Set();
  const visit = (node) => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.rotationQuaternion) snap.set(node, node.rotationQuaternion.clone());
    const kids = node.getChildren ? node.getChildren(undefined, false) : (node.getChildTransformNodes?.(false) || []);
    for (const c of kids) visit(c);
  };
  visit(ctx.currentModel);
  for (const skel of ctx._loadResult?.skeletons || []) {
    for (const bone of skel.bones || []) {
      const tn = bone.getTransformNode?.();
      if (tn?.rotationQuaternion && !snap.has(tn)) snap.set(tn, tn.rotationQuaternion.clone());
    }
  }
  ctx.tposeSnapshot = snap;
}

export function resetToTpose(ctx) {
  if (!ctx.tposeSnapshot) return;
  for (const [node, quat] of ctx.tposeSnapshot) {
    if (node.rotationQuaternion) node.rotationQuaternion = quat.clone();
  }
}
