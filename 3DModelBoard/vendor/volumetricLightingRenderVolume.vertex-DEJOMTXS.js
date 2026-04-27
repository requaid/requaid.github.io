import"./chunk-T5CHDUTT.js";import"./chunk-GQKW2POQ.js";import"./chunk-N7QLHZ3S.js";import"./chunk-TJVF3ZTG.js";import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;e.ShadersStore[o]||(e.ShadersStore[o]=r);var c={name:o,shader:r};export{c as volumetricLightingRenderVolumeVertexShader};
