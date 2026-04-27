import { Animation, AnimationGroup, Quaternion } from '@babylonjs/core';

const FPS = 30;

function ensureQuat(node) {
  if (!node) return null;
  if (!node.rotationQuaternion) {
    if (node.rotation) {
      node.rotationQuaternion = Quaternion.FromEulerAngles(
        node.rotation.x || 0, node.rotation.y || 0, node.rotation.z || 0
      );
    } else {
      node.rotationQuaternion = Quaternion.Identity();
    }
  }
  return node;
}

function quatAnimationFor(node, name, timesSec, eulerFrames, restQuat) {
  const anim = new Animation(
    name,
    'rotationQuaternion',
    FPS,
    Animation.ANIMATIONTYPE_QUATERNION,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );
  const keys = timesSec.map((t, i) => {
    const e = eulerFrames[i];
    const delta = Quaternion.FromEulerAngles(e[0] || 0, e[1] || 0, e[2] || 0);
    return { frame: Math.round(t * FPS), value: restQuat.multiply(delta) };
  });
  anim.setKeys(keys);
  return anim;
}

function buildGroup(ctx, name, durationSec, defs) {
  const group = new AnimationGroup(name, ctx.scene);
  let added = 0;
  for (const def of defs) {
    if (def.type !== 'quat') continue;
    const node = ctx.humanoid?.getBoneNode?.(def.bone);
    if (!node) continue;
    ensureQuat(node);
    const restQ = ctx.tposeSnapshot?.get(node)?.clone() || node.rotationQuaternion.clone();
    const anim = quatAnimationFor(node, `${name}-${def.bone}`, def.times, def.values, restQ);
    group.addTargetedAnimation(anim, node);
    added++;
  }
  if (added === 0) { group.dispose(); return null; }
  group.normalize(0, Math.round(durationSec * FPS));
  return group;
}

export function createIdleClip(ctx) {
  const d = 2.0;
  const t = [0, 0.5, 1.0, 1.5, 2.0];
  const a = 0.02;
  return buildGroup(ctx, 'idle', d, [
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
  return buildGroup(ctx, 'walk', d, [
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
  return buildGroup(ctx, 'run', d, [
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
  return buildGroup(ctx, 'dance', d, [
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
