import{a as l,b as s}from"./chunk-M62LX773.js";import{c as a}from"./chunk-RAT27XV3.js";import{a as i}from"./chunk-FJVMC4LL.js";import"./chunk-5G5GAIRV.js";import"./chunk-XF6F4LTW.js";import"./chunk-BOJFY5TM.js";import"./chunk-U2M3PDPG.js";import"./chunk-3TUTWMB2.js";import"./chunk-KSRYPKRX.js";import"./chunk-4QJMST5Y.js";import"./chunk-3YDSD3AB.js";import"./chunk-BHXYIM2X.js";import"./chunk-DCHRNTDF.js";import"./chunk-ZY2ZH6GH.js";import"./chunk-J4BYHON2.js";import"./chunk-HUXJGNY7.js";import"./chunk-VAKEU5TB.js";import"./chunk-6DN4ITWG.js";import"./chunk-IZ6QYDYW.js";import"./chunk-CCUABLZY.js";import"./chunk-2GW6FSLA.js";import"./chunk-HIJMIXSC.js";import"./chunk-7QTLRPM3.js";import"./chunk-7PGD3745.js";import"./chunk-EEMR7E6K.js";import"./chunk-A3WFPZFR.js";import"./chunk-L5WUWJUF.js";import"./chunk-7AIRJFWQ.js";import"./chunk-OPJEXU7D.js";import"./chunk-XIFSTT4M.js";import"./chunk-H3QA7S42.js";import"./chunk-YMFCEB4X.js";import"./chunk-FBWYJUBX.js";import"./chunk-44XR4LD6.js";import"./chunk-PTJ4CXVK.js";import"./chunk-WAOL3KZN.js";import"./chunk-WOT6VMZA.js";function f(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}var t=class extends a{isCompatible(o){switch(o){case i.WGSL:return!0;default:return!1}}getCustomCode(o){if(o==="vertex"){let e={};return e.CUSTOM_VERTEX_DEFINITIONS=l,e[`!${f("finalWorld=finalWorld*influence;")}`]=`
${s}
finalWorld=(finalWorld*influence);
`,e}if(o==="fragment"){let e={};e.CUSTOM_FRAGMENT_DEFINITIONS=`
#if defined(SPHERE_TEXTURE) && defined(NORMAL)
var sphereSamplerSampler: sampler;var sphereSampler: texture_2d<f32>;
#endif
#ifdef TOON_TEXTURE
var toonSamplerSampler: sampler;var toonSampler: texture_2d<f32>;
#endif
`,e.CUSTOM_FRAGMENT_MAIN_BEGIN=`
#ifdef TOON_TEXTURE
var toonNdl: vec3f;
#endif
`,e[`!${f("var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;")}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
var diffuseColor: vec3f=clamp(uniforms.vDiffuseColor.rgb+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0));
#else
var diffuseColor: vec3f=(uniforms.vDiffuseColor.rgb);
#endif
`,e[`!${f("var alpha: f32=uniforms.vDiffuseColor.a;")}`]=`
#ifdef CLAMP_ALPHA
var alpha: f32=clamp(uniforms.vDiffuseColor.a,0.0,1.0);
#else
var alpha: f32=uniforms.vDiffuseColor.a;
#endif
`,e[`!${f("baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vDiffuseUV+uvOffset);")}`]=`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,(fragmentInputs.vDiffuseUV+uvOffset));baseColor=vec4f(
mix(
vec3f(1.0),
baseColor.rgb*uniforms.textureMultiplicativeColor.rgb,
uniforms.textureMultiplicativeColor.a
),
baseColor.a
);baseColor=vec4f(
clamp(
baseColor.rgb+(baseColor.rgb-vec3f(1.0))*uniforms.textureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.textureAdditiveColor.rgb,
baseColor.a
);
#else
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,(fragmentInputs.vDiffuseUV+uvOffset));
#endif
`,e[`!${f(`struct lightingInfo
{`)}`]=`
struct lightingInfo {
#ifdef TOON_TEXTURE
#ifndef NDOTL
ndl: f32,
#endif
isToon: f32,
#endif
`,e[`!${f("result.diffuse=ndl*diffuseColor*attenuation;")}`]=`
#ifdef TOON_TEXTURE
result.diffuse=diffuseColor*attenuation;result.ndl=ndl;result.isToon=1.0;
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
result.diffuse=diffuseColor*attenuation;
#else
result.diffuse=(ndl*diffuseColor*attenuation);
#endif
`,e[`!${f("diffuseBase+=info.diffuse*shadow;")}`]=`
#ifdef TOON_TEXTURE
toonNdl=vec3f(clamp(info.ndl*shadow,0.02,0.98));toonNdl.r=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.r)).r;toonNdl.g=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.g)).g;toonNdl.b=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.b)).b;
#ifdef TOON_TEXTURE_COLOR
toonNdl=mix(
vec3f(1.0),
toonNdl*uniforms.toonTextureMultiplicativeColor.rgb,
uniforms.toonTextureMultiplicativeColor.a
);toonNdl=clamp(
toonNdl+(toonNdl-vec3f(1.0))*uniforms.toonTextureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.toonTextureAdditiveColor.rgb;
#endif
diffuseBase+=mix(info.diffuse*shadow,toonNdl*info.diffuse,info.isToon);
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
diffuseBase+=info.diffuse;
#else
diffuseBase+=(info.diffuse*shadow);
#endif
`;let r=`
#ifdef EMISSIVEASILLUMINATION
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
var finalDiffuse: vec3f=clamp((diffuseBase+emissiveColor)*diffuseColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+emissiveColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#endif
#endif
`;return e[`!${f(r)}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
#ifdef EMISSIVEASILLUMINATION
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
var finalDiffuse: vec3f=clamp((diffuseBase+emissiveColor)*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+emissiveColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#endif
#endif
#else
${r.replace("diffuseBase","(diffuseBase)")}#endif
`,e.CUSTOM_FRAGMENT_BEFORE_FOG=`
#if defined(NORMAL) && defined(SPHERE_TEXTURE)
var viewSpaceNormal: vec3f=normalize(mat3x3f(scene.view[0].xyz,scene.view[1].xyz,scene.view[2].xyz)*fragmentInputs.vNormalW);var sphereUV: vec2f=viewSpaceNormal.xy*0.5+0.5;var sphereReflectionColor: vec4f=textureSample(sphereSampler,sphereSamplerSampler,sphereUV);
#ifdef SPHERE_TEXTURE_COLOR
sphereReflectionColor=vec4f(
mix(
vec3f(1.0),
sphereReflectionColor.rgb*uniforms.sphereTextureMultiplicativeColor.rgb,
uniforms.sphereTextureMultiplicativeColor.a
),
sphereReflectionColor.a
);sphereReflectionColor=vec4f(
clamp(
sphereReflectionColor.rgb+(sphereReflectionColor.rgb-vec3f(1.0))*uniforms.sphereTextureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.sphereTextureAdditiveColor.rgb,
sphereReflectionColor.a
);
#endif
sphereReflectionColor=vec4f(sphereReflectionColor.rgb*diffuseBase,sphereReflectionColor.a);
#ifdef SPHERE_TEXTURE_BLEND_MODE_MULTIPLY
color*=sphereReflectionColor;
#elif defined(SPHERE_TEXTURE_BLEND_MODE_ADD)
color=vec4f(color.rgb+sphereReflectionColor.rgb,color.a);
#endif
#endif
`,e}return null}};export{t as MmdPluginMaterial};
