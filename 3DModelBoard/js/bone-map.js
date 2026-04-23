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
