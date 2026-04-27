import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var r="textureAlphaCheckerVertexShader",t=`
precision highp float;attribute vec2 uv;varying vec2 vUv;void main() {vUv=uv;gl_Position=vec4(mod(uv,1.0)*2.0-1.0,0.0,1.0);}
`;e.ShadersStore[r]=t;var o={name:r,shader:t};export{o as TextureAlphaCheckerVertexShader};
