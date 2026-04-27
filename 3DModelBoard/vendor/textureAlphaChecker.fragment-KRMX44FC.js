import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var r="textureAlphaCheckerPixelShader",a=`
precision highp float;uniform sampler2D textureSampler;varying vec2 vUv;void main() {gl_FragColor=vec4(vec3(1.0)-vec3(texture2D(textureSampler,vUv).a),1.0);}
`;e.ShadersStore[r]=a;var o={name:r,shader:a};export{o as TextureAlphaCheckerPixelShader};
