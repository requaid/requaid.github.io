import { Animation, AnimationGroup, Quaternion, Vector3 } from '@babylonjs/core';
import { VmdLoader } from 'babylon-mmd';

const FPS = 30;

function ensureQuat(node) {
  if (!node.rotationQuaternion) node.rotationQuaternion = Quaternion.Identity();
}

function collectBoneNodes(ctx) {
  const map = new Map();
  for (const skel of ctx?._loadResult?.skeletons || []) {
    for (const bone of skel.bones || []) {
      const tn = bone.getTransformNode?.() || bone;
      if (tn && bone.name && !map.has(bone.name)) map.set(bone.name, tn);
    }
  }
  return map;
}

export async function loadVMDClip(file, ctx) {
  if (!ctx?.currentModel) throw new Error('모델이 로드되지 않았습니다');
  if (ctx.modelFormat !== 'pmx' && ctx.modelFormat !== 'pmd') {
    throw new Error('VMD는 PMX/PMD 모델에서만 적용됩니다 (VRM 미지원)');
  }
  const boneNodes = collectBoneNodes(ctx);
  if (boneNodes.size === 0) throw new Error('스켈레톤을 찾지 못했습니다');

  const buf = new Uint8Array(await file.arrayBuffer());
  const vmdLoader = new VmdLoader(ctx.scene);
  const anim = await vmdLoader.loadAsync(file.name, buf);

  const group = new AnimationGroup(file.name, ctx.scene);
  let added = 0;
  let maxFrame = 0;

  for (const track of anim.boneTracks || []) {
    const node = boneNodes.get(track.name);
    if (!node) continue;
    ensureQuat(node);
    const restQ = ctx.tposeSnapshot?.get(node)?.clone() || node.rotationQuaternion.clone();
    const restPos = node.position?.clone() || Vector3.Zero();
    const frames = track.frameNumbers;
    if (!frames || frames.length === 0) continue;

    if (track.rotations && track.rotations.length >= frames.length * 4) {
      const keys = [];
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        if (f > maxFrame) maxFrame = f;
        const x = track.rotations[i * 4];
        const y = track.rotations[i * 4 + 1];
        const z = track.rotations[i * 4 + 2];
        const w = track.rotations[i * 4 + 3];
        keys.push({ frame: f, value: restQ.multiply(new Quaternion(x, y, z, w)) });
      }
      const rotAnim = new Animation(`${track.name}-rot`, 'rotationQuaternion', FPS,
        Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE);
      rotAnim.setKeys(keys);
      group.addTargetedAnimation(rotAnim, node);
      added++;
    }

    if (track.positions && track.positions.length >= frames.length * 3) {
      const keys = [];
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const px = track.positions[i * 3];
        const py = track.positions[i * 3 + 1];
        const pz = track.positions[i * 3 + 2];
        keys.push({ frame: f, value: restPos.add(new Vector3(px, py, pz)) });
      }
      const posAnim = new Animation(`${track.name}-pos`, 'position', FPS,
        Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
      posAnim.setKeys(keys);
      group.addTargetedAnimation(posAnim, node);
      added++;
    }
  }

  if (added === 0) {
    group.dispose();
    throw new Error('VMD에 매칭되는 본을 찾지 못했습니다');
  }
  group.normalize(0, Math.max(maxFrame, 1));
  return group;
}

const BVH_TO_HUMANOID = {
  hips: 'hips', hip: 'hips', pelvis: 'hips',
  spine: 'spine', spine1: 'chest', chest: 'chest',
  spine2: 'upperChest', upperchest: 'upperChest',
  neck: 'neck', neck1: 'neck', head: 'head',
  leftshoulder: 'leftShoulder', lshoulder: 'leftShoulder', lcollar: 'leftShoulder',
  leftarm: 'leftUpperArm', lupperarm: 'leftUpperArm', lefthumerus: 'leftUpperArm',
  leftforearm: 'leftLowerArm', llowerarm: 'leftLowerArm',
  lefthand: 'leftHand', lhand: 'leftHand',
  rightshoulder: 'rightShoulder', rshoulder: 'rightShoulder', rcollar: 'rightShoulder',
  rightarm: 'rightUpperArm', rupperarm: 'rightUpperArm', righthumerus: 'rightUpperArm',
  rightforearm: 'rightLowerArm', rlowerarm: 'rightLowerArm',
  righthand: 'rightHand', rhand: 'rightHand',
  leftupleg: 'leftUpperLeg', leftthigh: 'leftUpperLeg', lthigh: 'leftUpperLeg', leftupperleg: 'leftUpperLeg',
  leftleg: 'leftLowerLeg', leftshin: 'leftLowerLeg', lshin: 'leftLowerLeg', leftlowerleg: 'leftLowerLeg',
  leftfoot: 'leftFoot', lfoot: 'leftFoot',
  righttupleg: 'rightUpperLeg', rightupleg: 'rightUpperLeg', rightthigh: 'rightUpperLeg', rthigh: 'rightUpperLeg', rightupperleg: 'rightUpperLeg',
  rightleg: 'rightLowerLeg', rightshin: 'rightLowerLeg', rshin: 'rightLowerLeg', rightlowerleg: 'rightLowerLeg',
  rightfoot: 'rightFoot', rfoot: 'rightFoot',
};

function bvhKeyToHumanoid(name) {
  const k = name.replace(/[\s_-]/g, '').toLowerCase();
  return BVH_TO_HUMANOID[k] || null;
}

function parseBVH(text) {
  const tokens = text.replace(/\r/g, '').split(/[\s\n]+/).filter(Boolean);
  let p = 0;
  const peek = () => tokens[p];
  const eat = () => tokens[p++];
  const eatNum = () => parseFloat(tokens[p++]);

  const joints = [];
  const stack = [];

  function readJoint(name, isEnd) {
    const joint = { name, channels: [], parent: stack[stack.length - 1] ?? -1, channelOffset: 0, isEnd };
    const idx = joints.length;
    joints.push(joint);
    if (eat() !== '{') throw new Error('BVH: { 누락');
    while (peek() !== '}') {
      const tok = eat();
      if (tok === 'OFFSET') { eatNum(); eatNum(); eatNum(); }
      else if (tok === 'CHANNELS') {
        const n = parseInt(eat(), 10);
        for (let i = 0; i < n; i++) joint.channels.push(eat());
      }
      else if (tok === 'JOINT') {
        const childName = eat();
        stack.push(idx);
        readJoint(childName, false);
        stack.pop();
      }
      else if (tok === 'End') {
        eat();
        const childName = 'End_' + name;
        stack.push(idx);
        readJoint(childName, true);
        stack.pop();
      }
    }
    eat();
  }

  if (eat() !== 'HIERARCHY') throw new Error('BVH: HIERARCHY 헤더 누락');
  if (eat() !== 'ROOT') throw new Error('BVH: ROOT 누락');
  const rootName = eat();
  readJoint(rootName, false);

  let totalChannels = 0;
  for (const j of joints) { j.channelOffset = totalChannels; totalChannels += j.channels.length; }

  if (eat() !== 'MOTION') throw new Error('BVH: MOTION 누락');
  if (eat() !== 'Frames:') throw new Error('BVH: Frames: 누락');
  const frameCount = parseInt(eat(), 10);
  if (eat() !== 'Frame' || eat() !== 'Time:') throw new Error('BVH: Frame Time: 누락');
  const frameTime = eatNum();

  const data = new Float32Array(frameCount * totalChannels);
  for (let i = 0; i < frameCount * totalChannels; i++) data[i] = parseFloat(tokens[p++]);

  return { joints, totalChannels, frameCount, frameTime, data };
}

function eulerToQuat(rx, ry, rz, order) {
  const cx = Math.cos(rx / 2), sx = Math.sin(rx / 2);
  const cy = Math.cos(ry / 2), sy = Math.sin(ry / 2);
  const cz = Math.cos(rz / 2), sz = Math.sin(rz / 2);
  const qx = new Quaternion(sx, 0, 0, cx);
  const qy = new Quaternion(0, sy, 0, cy);
  const qz = new Quaternion(0, 0, sz, cz);
  const seq = order.split('').map(c => c === 'X' ? qx : c === 'Y' ? qy : qz);
  return seq[0].multiply(seq[1]).multiply(seq[2]);
}

export async function loadBVHClip(file, ctx) {
  if (!ctx?.currentModel || !ctx?.humanoid) {
    throw new Error('휴머노이드 모델이 로드되지 않았습니다');
  }
  const text = await file.text();
  const bvh = parseBVH(text);
  const fps = 1 / bvh.frameTime;

  const group = new AnimationGroup(file.name, ctx.scene);
  let added = 0;

  for (const j of bvh.joints) {
    if (j.isEnd) continue;
    const humanoidName = bvhKeyToHumanoid(j.name);
    if (!humanoidName) continue;
    const node = ctx.humanoid.getBoneNode?.(humanoidName);
    if (!node) continue;

    const rotChannels = j.channels
      .map((c, i) => ({ c, i }))
      .filter(x => x.c.endsWith('rotation'));
    if (rotChannels.length !== 3) continue;
    const order = rotChannels.map(x => x.c[0]).join('');
    const rotIdx = rotChannels.map(x => j.channelOffset + x.i);

    ensureQuat(node);
    const restQ = ctx.tposeSnapshot?.get(node)?.clone() || node.rotationQuaternion.clone();
    const keys = [];
    for (let f = 0; f < bvh.frameCount; f++) {
      const base = f * bvh.totalChannels;
      const rx = bvh.data[base + rotIdx[0]] * Math.PI / 180;
      const ry = bvh.data[base + rotIdx[1]] * Math.PI / 180;
      const rz = bvh.data[base + rotIdx[2]] * Math.PI / 180;
      const delta = eulerToQuat(rx, ry, rz, order);
      keys.push({ frame: f, value: restQ.multiply(delta) });
    }
    const anim = new Animation(`${j.name}-rot`, 'rotationQuaternion', fps,
      Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE);
    anim.setKeys(keys);
    group.addTargetedAnimation(anim, node);
    added++;
  }

  if (added === 0) {
    group.dispose();
    throw new Error('BVH에 매칭되는 본을 찾지 못했습니다');
  }
  group.normalize(0, bvh.frameCount - 1);
  return group;
}
