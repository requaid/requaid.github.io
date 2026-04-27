import"./chunk-7AUTXDVK.js";import"./chunk-DBJ62XIJ.js";import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var t="volumetricLightingRenderVolumeVertexShader",o=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;e.ShadersStoreWGSL[t]||(e.ShadersStoreWGSL[t]=o);var s={name:t,shader:o};export{s as volumetricLightingRenderVolumeVertexShaderWGSL};
