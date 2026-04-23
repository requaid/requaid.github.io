import * as THREE from 'three';
import { getBoneTrackName } from './viewer-vrm.js';

function quatTrack(boneName, times, eulerFrames) {
  if (!boneName) return null;
  const values = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const ef of eulerFrames) {
    e.set(ef[0], ef[1], ef[2]);
    q.setFromEuler(e);
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
}

function buildClip(ctx, name, duration, defs) {
  const tracks = [];
  for (const def of defs) {
    const boneName = getBoneTrackName(ctx, def.bone);
    if (!boneName) continue;
    if (def.type === 'quat') {
      const t = quatTrack(boneName, def.times, def.values);
      if (t) tracks.push(t);
    }
  }
  if (!tracks.length) return null;
  return new THREE.AnimationClip(name, duration, tracks);
}

export function createIdleClip(ctx) {
  const d = 2.0;
  const t = [0, 0.5, 1.0, 1.5, 2.0];
  const a = 0.02;
  return buildClip(ctx, 'idle', d, [
    { bone: 'spine', type: 'quat', times: t, values: [
      [a, 0, 0], [0, 0, 0], [-a*0.5, 0, 0], [0, 0, 0], [a, 0, 0],
    ] },
    { bone: 'head', type: 'quat', times: t, values: [
      [0, a*0.5, 0], [0, 0, a*0.3], [0, -a*0.5, 0], [0, 0, -a*0.3], [0, a*0.5, 0],
    ] },
    { bone: 'leftUpperArm', type: 'quat', times: t, values: [
      [0, 0, 0.05], [0, 0, 0.03], [0, 0, 0.05], [0, 0, 0.07], [0, 0, 0.05],
    ] },
    { bone: 'rightUpperArm', type: 'quat', times: t, values: [
      [0, 0, -0.05], [0, 0, -0.07], [0, 0, -0.05], [0, 0, -0.03], [0, 0, -0.05],
    ] },
  ]);
}

export function createWalkClip(ctx) {
  const d = 1.0;
  const t = [0, 0.25, 0.5, 0.75, 1.0];
  const legAmp = 0.4, armAmp = 0.25, kneeAmp = 0.5;
  return buildClip(ctx, 'walk', d, [
    { bone: 'leftUpperLeg', type: 'quat', times: t, values: [
      [-legAmp, 0, 0], [0, 0, 0], [legAmp*0.5, 0, 0], [0, 0, 0], [-legAmp, 0, 0],
    ] },
    { bone: 'leftLowerLeg', type: 'quat', times: t, values: [
      [-kneeAmp*0.2, 0, 0], [-kneeAmp, 0, 0], [-kneeAmp*0.1, 0, 0], [-kneeAmp*0.3, 0, 0], [-kneeAmp*0.2, 0, 0],
    ] },
    { bone: 'rightUpperLeg', type: 'quat', times: t, values: [
      [legAmp*0.5, 0, 0], [0, 0, 0], [-legAmp, 0, 0], [0, 0, 0], [legAmp*0.5, 0, 0],
    ] },
    { bone: 'rightLowerLeg', type: 'quat', times: t, values: [
      [-kneeAmp*0.1, 0, 0], [-kneeAmp*0.3, 0, 0], [-kneeAmp*0.2, 0, 0], [-kneeAmp, 0, 0], [-kneeAmp*0.1, 0, 0],
    ] },
    { bone: 'leftUpperArm', type: 'quat', times: t, values: [
      [armAmp, 0, 0], [0, 0, 0], [-armAmp*0.5, 0, 0], [0, 0, 0], [armAmp, 0, 0],
    ] },
    { bone: 'rightUpperArm', type: 'quat', times: t, values: [
      [-armAmp*0.5, 0, 0], [0, 0, 0], [armAmp, 0, 0], [0, 0, 0], [-armAmp*0.5, 0, 0],
    ] },
    { bone: 'spine', type: 'quat', times: t, values: [
      [0.02, 0, 0.02], [0.01, 0, 0], [0.02, 0, -0.02], [0.01, 0, 0], [0.02, 0, 0.02],
    ] },
  ]);
}

export function createRunClip(ctx) {
  const d = 0.6;
  const t = [0, 0.15, 0.3, 0.45, 0.6];
  const legAmp = 0.65, armAmp = 0.5, kneeAmp = 0.9;
  return buildClip(ctx, 'run', d, [
    { bone: 'leftUpperLeg', type: 'quat', times: t, values: [
      [-legAmp, 0, 0], [0, 0, 0], [legAmp*0.4, 0, 0], [0, 0, 0], [-legAmp, 0, 0],
    ] },
    { bone: 'leftLowerLeg', type: 'quat', times: t, values: [
      [-kneeAmp*0.2, 0, 0], [-kneeAmp, 0, 0], [-kneeAmp*0.1, 0, 0], [-kneeAmp*0.5, 0, 0], [-kneeAmp*0.2, 0, 0],
    ] },
    { bone: 'rightUpperLeg', type: 'quat', times: t, values: [
      [legAmp*0.4, 0, 0], [0, 0, 0], [-legAmp, 0, 0], [0, 0, 0], [legAmp*0.4, 0, 0],
    ] },
    { bone: 'rightLowerLeg', type: 'quat', times: t, values: [
      [-kneeAmp*0.1, 0, 0], [-kneeAmp*0.5, 0, 0], [-kneeAmp*0.2, 0, 0], [-kneeAmp, 0, 0], [-kneeAmp*0.1, 0, 0],
    ] },
    { bone: 'leftUpperArm', type: 'quat', times: t, values: [
      [armAmp, 0, 0.1], [0, 0, 0.1], [-armAmp*0.5, 0, 0.1], [0, 0, 0.1], [armAmp, 0, 0.1],
    ] },
    { bone: 'rightUpperArm', type: 'quat', times: t, values: [
      [-armAmp*0.5, 0, -0.1], [0, 0, -0.1], [armAmp, 0, -0.1], [0, 0, -0.1], [-armAmp*0.5, 0, -0.1],
    ] },
    { bone: 'spine', type: 'quat', times: t, values: [
      [0.08, 0, 0.03], [0.06, 0, 0], [0.08, 0, -0.03], [0.06, 0, 0], [0.08, 0, 0.03],
    ] },
    { bone: 'head', type: 'quat', times: t, values: [
      [-0.04, 0, 0], [-0.02, 0, 0], [-0.04, 0, 0], [-0.02, 0, 0], [-0.04, 0, 0],
    ] },
  ]);
}

export function createDanceClip(ctx) {
  const d = 4.0;
  const t = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
  return buildClip(ctx, 'dance', d, [
    { bone: 'spine', type: 'quat', times: t, values: [
      [0, 0.05, 0.06], [0, -0.05, -0.06], [0, 0.05, 0.06], [0, -0.05, -0.06],
      [0.05, 0, 0.04], [-0.05, 0, -0.04], [0.05, 0, 0.04], [-0.05, 0, -0.04],
      [0, 0.05, 0.06],
    ] },
    { bone: 'chest', type: 'quat', times: t, values: [
      [0, -0.03, -0.04], [0, 0.03, 0.04], [0, -0.03, -0.04], [0, 0.03, 0.04],
      [-0.03, 0, 0], [0.03, 0, 0], [-0.03, 0, 0], [0.03, 0, 0],
      [0, -0.03, -0.04],
    ] },
    { bone: 'head', type: 'quat', times: t, values: [
      [0, 0.06, 0], [0, -0.06, 0], [0, 0.06, 0], [0, -0.06, 0],
      [0.04, 0, 0], [-0.04, 0, 0], [0.04, 0, 0], [-0.04, 0, 0],
      [0, 0.06, 0],
    ] },
    { bone: 'leftUpperArm', type: 'quat', times: t, values: [
      [0, 0, 0.3], [-0.4, 0, -0.5], [0, 0, 0.3], [-0.4, 0, -0.5],
      [0, 0, -0.8], [0, 0, 0.3], [0, 0, -0.8], [0, 0, 0.3],
      [0, 0, 0.3],
    ] },
    { bone: 'leftLowerArm', type: 'quat', times: t, values: [
      [0, 0, 0], [-0.6, 0, 0], [0, 0, 0], [-0.6, 0, 0],
      [-0.8, 0, 0], [-0.2, 0, 0], [-0.8, 0, 0], [-0.2, 0, 0],
      [0, 0, 0],
    ] },
    { bone: 'rightUpperArm', type: 'quat', times: t, values: [
      [-0.4, 0, 0.5], [0, 0, -0.3], [-0.4, 0, 0.5], [0, 0, -0.3],
      [0, 0, 0.8], [0, 0, -0.3], [0, 0, 0.8], [0, 0, -0.3],
      [-0.4, 0, 0.5],
    ] },
    { bone: 'rightLowerArm', type: 'quat', times: t, values: [
      [0.6, 0, 0], [0, 0, 0], [0.6, 0, 0], [0, 0, 0],
      [0.8, 0, 0], [0.2, 0, 0], [0.8, 0, 0], [0.2, 0, 0],
      [0.6, 0, 0],
    ] },
    { bone: 'leftUpperLeg', type: 'quat', times: t, values: [
      [-0.1, 0, 0], [0, 0, 0], [-0.2, 0, 0], [0, 0, 0],
      [-0.1, 0, -0.1], [0, 0, 0], [-0.1, 0, 0.1], [0, 0, 0],
      [-0.1, 0, 0],
    ] },
    { bone: 'rightUpperLeg', type: 'quat', times: t, values: [
      [0, 0, 0], [-0.1, 0, 0], [0, 0, 0], [-0.2, 0, 0],
      [0, 0, 0], [-0.1, 0, 0.1], [0, 0, 0], [-0.1, 0, -0.1],
      [0, 0, 0],
    ] },
    { bone: 'leftLowerLeg', type: 'quat', times: t, values: [
      [-0.15, 0, 0], [0, 0, 0], [-0.3, 0, 0], [0, 0, 0],
      [-0.15, 0, 0], [0, 0, 0], [-0.15, 0, 0], [0, 0, 0],
      [-0.15, 0, 0],
    ] },
    { bone: 'rightLowerLeg', type: 'quat', times: t, values: [
      [0, 0, 0], [-0.15, 0, 0], [0, 0, 0], [-0.3, 0, 0],
      [0, 0, 0], [-0.15, 0, 0], [0, 0, 0], [-0.15, 0, 0],
      [0, 0, 0],
    ] },
  ]);
}

export const MOTION_BUILDERS = {
  idle: createIdleClip,
  walk: createWalkClip,
  run: createRunClip,
  dance: createDanceClip,
};

export const MOTION_LABELS = {
  idle: '대기',
  walk: '걷기',
  run: '달리기',
  dance: '춤추기',
};
