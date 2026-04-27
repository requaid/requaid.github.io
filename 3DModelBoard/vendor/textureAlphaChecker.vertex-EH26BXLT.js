import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var t="textureAlphaCheckerVertexShader",r=`
attribute uv: vec2f;varying vUv: vec2f;@vertex
fn main(input: VertexInputs)->FragmentInputs {vertexOutputs.vUv=vertexInputs.uv;vertexOutputs.position=vec4f(
(vertexInputs.uv % 1.0)*2.0-1.0,
0.0,
1.0
);}
`;e.ShadersStoreWGSL[t]=r;var v={name:t,shader:r};export{v as TextureAlphaCheckerVertexShader};
