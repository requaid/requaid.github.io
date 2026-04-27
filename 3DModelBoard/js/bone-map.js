export const HUMANOID_BONES = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
];

export const PMX_BONE_MAP = {
  hips: 'センター', spine: '上半身', chest: '上半身2',
  upperChest: '上半身3', neck: '首', head: '頭',
  leftShoulder: '左肩', leftUpperArm: '左腕', leftLowerArm: '左ひじ', leftHand: '左手首',
  rightShoulder: '右肩', rightUpperArm: '右腕', rightLowerArm: '右ひじ', rightHand: '右手首',
  leftUpperLeg: '左足', leftLowerLeg: '左ひざ', leftFoot: '左足首', leftToes: '左つま先',
  rightUpperLeg: '右足', rightLowerLeg: '右ひざ', rightFoot: '右足首', rightToes: '右つま先',
};

export const MMD_TO_VRM_BONE = {};
for (const [vrm, mmd] of Object.entries(PMX_BONE_MAP)) MMD_TO_VRM_BONE[mmd] = vrm;

export function buildMMDHumanoidFromBones(skeletons) {
  if (!skeletons?.length) return null;
  const allBones = [];
  for (const skel of skeletons) {
    for (const b of skel.bones || []) allBones.push(b);
  }
  if (!allBones.length) return null;

  const cache = new Map();
  const findBoneNode = (mmdName) => {
    const bone = allBones.find(b => b.name === mmdName);
    if (!bone) return null;
    return bone.getTransformNode?.() || bone;
  };

  return {
    version: 'mmd',
    map: { ...PMX_BONE_MAP },
    getBoneNode(humanoidName) {
      if (cache.has(humanoidName)) return cache.get(humanoidName);
      const mmdName = PMX_BONE_MAP[humanoidName];
      const node = mmdName ? findBoneNode(mmdName) : null;
      cache.set(humanoidName, node);
      return node;
    },
  };
}

export function getBoneNode(ctx, humanoidName) {
  return ctx?.humanoid?.getBoneNode?.(humanoidName) || null;
}
