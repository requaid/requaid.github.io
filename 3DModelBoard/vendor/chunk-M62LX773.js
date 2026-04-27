var t=`
#ifndef SDEFDECLARATION
#define SDEFDECLARATION
#if NUM_BONE_INFLUENCERS>0 && defined(SDEF)
attribute matricesSdefC: vec3f;attribute matricesSdefRW0: vec3f;attribute matricesSdefRW1: vec3f;fn rotationMatrixToQuaternion(matrix: mat3x3f)->vec4f {let trace: f32=matrix[0][0]+matrix[1][1]+matrix[2][2];var s: f32;var sqrtParam: f32;if (trace>0.0) {sqrtParam=trace+1.0;} else if (matrix[0][0]>matrix[1][1] && matrix[0][0]>matrix[2][2]) {sqrtParam=1.0+matrix[0][0]-matrix[1][1]-matrix[2][2];} else if (matrix[1][1]>matrix[2][2]) {sqrtParam=1.0+matrix[1][1]-matrix[0][0]-matrix[2][2];} else {sqrtParam=1.0+matrix[2][2]-matrix[0][0]-matrix[1][1];}
let sqrtValue: f32=sqrt(sqrtParam);if (trace>0.0) {s=0.5/sqrtValue;return vec4f(
(matrix[1][2]-matrix[2][1])*s,
(matrix[2][0]-matrix[0][2])*s,
(matrix[0][1]-matrix[1][0])*s,
0.25/s
);} else if (matrix[0][0]>matrix[1][1] && matrix[0][0]>matrix[2][2]) {s=2.0*sqrtValue;return vec4f(
0.25*s,
(matrix[0][1]+matrix[1][0])/s,
(matrix[2][0]+matrix[0][2])/s,
(matrix[1][2]-matrix[2][1])/s
);} else if (matrix[1][1]>matrix[2][2]) {s=2.0*sqrtValue;return vec4f(
(matrix[0][1]+matrix[1][0])/s,
0.25*s,
(matrix[1][2]+matrix[2][1])/s,
(matrix[2][0]-matrix[0][2])/s
);} else {s=2.0*sqrtValue;return vec4f(
(matrix[2][0]+matrix[0][2])/s,
(matrix[1][2]+matrix[2][1])/s,
0.25*s,
(matrix[0][1]-matrix[1][0])/s
);}}
fn quaternionToRotationMatrix(q: vec4f)->mat3x3f {let xx: f32=q.x*q.x;let yy: f32=q.y*q.y;let zz: f32=q.z*q.z;let xy: f32=q.x*q.y;let zw: f32=q.z*q.w;let zx: f32=q.z*q.x;let yw: f32=q.y*q.w;let yz: f32=q.y*q.z;let xw: f32=q.x*q.w;return mat3x3f(
1.0-2.0*(yy+zz),2.0*(xy+zw),2.0*(zx-yw),
2.0*(xy-zw),1.0-2.0*(zz+xx),2.0*(yz+xw),
2.0*(zx+yw),2.0*(yz-xw),1.0-2.0*(yy+xx)
);}
fn slerp(q0: vec4f,_q1: vec4f,t: f32)->vec4f {var q1: vec4f=_q1;var cosTheta: f32=dot(q0,q1);q1=mix(-q1,q1,step(0.0,cosTheta));cosTheta=abs(cosTheta);if (cosTheta>0.999999) {return normalize(mix(q0,q1,t));}
var theta: f32=acos(cosTheta);var sinTheta: f32=sin(theta);var w0: f32=sin((1.0-t)*theta)/sinTheta;var w1: f32=sin(t*theta)/sinTheta;return q0*w0+q1*w1;}
#endif
#endif
`;var r=`
#ifndef SDEFVERTEX
#define SDEFVERTEX
#if !defined(BAKED_VERTEX_ANIMATION_TEXTURE) && defined(SDEF)
#if NUM_BONE_INFLUENCERS>0
{let weight0: f32=vertexInputs.matricesWeights[0];let weight1: f32=vertexInputs.matricesWeights[1];
#ifdef BONETEXTURE
let transformMatrix0: mat4x4f=readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[0]);let transformMatrix1: mat4x4f=readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[1]);
#else
let transformMatrix0: mat4x4f=uniforms.mBones[int(vertexInputs.matricesIndices[0])];let transformMatrix1: mat4x4f=uniforms.mBones[int(vertexInputs.matricesIndices[1])];
#endif
let slerpedRotationMatrix: mat3x3f=quaternionToRotationMatrix(slerp(
rotationMatrixToQuaternion(mat3x3f(transformMatrix0[0].xyz,transformMatrix0[1].xyz,transformMatrix0[2].xyz)),
rotationMatrixToQuaternion(mat3x3f(transformMatrix1[0].xyz,transformMatrix1[1].xyz,transformMatrix1[2].xyz)),
weight1
));var sdefInflunce: mat4x4f=mat4x4f(
vec4f(1.0,0.0,0.0,0.0),
vec4f(0.0,1.0,0.0,0.0),
vec4f(0.0,0.0,1.0,0.0),
vec4f(-vertexInputs.matricesSdefC,1.0)
);let rotationMatrix: mat4x4f=mat4x4f(
vec4f(slerpedRotationMatrix[0],0.0),
vec4f(slerpedRotationMatrix[1],0.0),
vec4f(slerpedRotationMatrix[2],0.0),
vec4f(0.0,0.0,0.0,1.0)
);sdefInflunce=rotationMatrix*sdefInflunce;let positionOffset: vec3f =
(transformMatrix0*vec4f(vertexInputs.matricesSdefRW0,1)).xyz*weight0 +
(transformMatrix1*vec4f(vertexInputs.matricesSdefRW1,1)).xyz*weight1;sdefInflunce[3]+=vec4f(positionOffset,0.0);let useLinearDeform: f32=step(0.0,-abs(vertexInputs.matricesSdefRW0.x));influence=mat4x4f(
mix(sdefInflunce[0],influence[0],useLinearDeform),
mix(sdefInflunce[1],influence[1],useLinearDeform),
mix(sdefInflunce[2],influence[2],useLinearDeform),
mix(sdefInflunce[3],influence[3],useLinearDeform)
);}
#endif
#endif
#endif
`;export{t as a,r as b};
