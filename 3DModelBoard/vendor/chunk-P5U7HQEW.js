var t=`
#ifndef SDEFDECLARATION
#define SDEFDECLARATION
#if NUM_BONE_INFLUENCERS>0 && defined(SDEF)
attribute vec3 matricesSdefC;attribute vec3 matricesSdefRW0;attribute vec3 matricesSdefRW1;vec4 rotationMatrixToQuaternion(mat3 matrix) {float trace=matrix[0][0]+matrix[1][1]+matrix[2][2];float s;float sqrtParam;if (trace>0.0) {sqrtParam=trace+1.0;} else if (matrix[0][0]>matrix[1][1] && matrix[0][0]>matrix[2][2]) {sqrtParam=1.0+matrix[0][0]-matrix[1][1]-matrix[2][2];} else if (matrix[1][1]>matrix[2][2]) {sqrtParam=1.0+matrix[1][1]-matrix[0][0]-matrix[2][2];} else {sqrtParam=1.0+matrix[2][2]-matrix[0][0]-matrix[1][1];}
float sqrtValue=sqrt(sqrtParam);if (trace>0.0) {s=0.5/sqrtValue;return vec4(
(matrix[1][2]-matrix[2][1])*s,
(matrix[2][0]-matrix[0][2])*s,
(matrix[0][1]-matrix[1][0])*s,
0.25/s
);} else if (matrix[0][0]>matrix[1][1] && matrix[0][0]>matrix[2][2]) {s=2.0*sqrtValue;return vec4(
0.25*s,
(matrix[0][1]+matrix[1][0])/s,
(matrix[2][0]+matrix[0][2])/s,
(matrix[1][2]-matrix[2][1])/s
);} else if (matrix[1][1]>matrix[2][2]) {s=2.0*sqrtValue;return vec4(
(matrix[0][1]+matrix[1][0])/s,
0.25*s,
(matrix[1][2]+matrix[2][1])/s,
(matrix[2][0]-matrix[0][2])/s
);} else {s=2.0*sqrtValue;return vec4(
(matrix[2][0]+matrix[0][2])/s,
(matrix[1][2]+matrix[2][1])/s,
0.25*s,
(matrix[0][1]-matrix[1][0])/s
);}}
mat3 quaternionToRotationMatrix(vec4 q) {float xx=q.x*q.x;float yy=q.y*q.y;float zz=q.z*q.z;float xy=q.x*q.y;float zw=q.z*q.w;float zx=q.z*q.x;float yw=q.y*q.w;float yz=q.y*q.z;float xw=q.x*q.w;return mat3(
1.0-2.0*(yy+zz),2.0*(xy+zw),2.0*(zx-yw),
2.0*(xy-zw),1.0-2.0*(zz+xx),2.0*(yz+xw),
2.0*(zx+yw),2.0*(yz-xw),1.0-2.0*(yy+xx)
);}
vec4 slerp(vec4 q0,vec4 q1,float t) {float cosTheta=dot(q0,q1);q1=mix(-q1,q1,step(0.0,cosTheta));cosTheta=abs(cosTheta);if (cosTheta>0.999999) {return normalize(mix(q0,q1,t));}
float theta=acos(cosTheta);float sinTheta=sin(theta);float w0=sin((1.0-t)*theta)/sinTheta;float w1=sin(t*theta)/sinTheta;return q0*w0+q1*w1;}
#endif
#endif
`;var e=`
#ifndef SDEFVERTEX
#define SDEFVERTEX
#if !defined(BAKED_VERTEX_ANIMATION_TEXTURE) && defined(SDEF)
#if NUM_BONE_INFLUENCERS>0
{float weight0=matricesWeights[0];float weight1=matricesWeights[1];
#ifdef BONETEXTURE
mat4 transformMatrix0=readMatrixFromRawSampler(boneSampler,matricesIndices[0]);mat4 transformMatrix1=readMatrixFromRawSampler(boneSampler,matricesIndices[1]);
#else
mat4 transformMatrix0=mBones[int(matricesIndices[0])];mat4 transformMatrix1=mBones[int(matricesIndices[1])];
#endif
mat3 slerpedRotationMatrix=quaternionToRotationMatrix(slerp(
rotationMatrixToQuaternion(mat3(transformMatrix0)),
rotationMatrixToQuaternion(mat3(transformMatrix1)),
weight1
));mat4 sdefInflunce=mat4(
vec4(1.0,0.0,0.0,0.0),
vec4(0.0,1.0,0.0,0.0),
vec4(0.0,0.0,1.0,0.0),
vec4(-matricesSdefC,1.0)
);mat4 rotationMatrix=mat4(
vec4(slerpedRotationMatrix[0],0.0),
vec4(slerpedRotationMatrix[1],0.0),
vec4(slerpedRotationMatrix[2],0.0),
vec4(0.0,0.0,0.0,1.0)
);sdefInflunce=rotationMatrix*sdefInflunce;vec3 positionOffset =
vec3(transformMatrix0*vec4(matricesSdefRW0,1))*weight0 +
vec3(transformMatrix1*vec4(matricesSdefRW1,1))*weight1;sdefInflunce[3]+=vec4(positionOffset,0.0);float useLinearDeform=step(0.0,-abs(matricesSdefRW0.x));influence=mat4(
mix(sdefInflunce[0],influence[0],useLinearDeform),
mix(sdefInflunce[1],influence[1],useLinearDeform),
mix(sdefInflunce[2],influence[2],useLinearDeform),
mix(sdefInflunce[3],influence[3],useLinearDeform)
);}
#endif
#endif
#endif
`;export{t as a,e as b};
