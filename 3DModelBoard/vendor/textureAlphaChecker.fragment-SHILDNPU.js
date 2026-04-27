import{a as e}from"./chunk-L5WUWJUF.js";import"./chunk-WOT6VMZA.js";var r="textureAlphaCheckerPixelShader",t=`
var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;varying vUv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(
vec3f(1.0)-vec3f(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.vUv).a),
1.0
);}
`;e.ShadersStoreWGSL[r]=t;var n={name:r,shader:t};export{n as TextureAlphaCheckerPixelShader};
