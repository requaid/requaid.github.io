import{a as l,b as d}from"./chunk-P5U7HQEW.js";import{c as t}from"./chunk-RAT27XV3.js";import{a as r}from"./chunk-FJVMC4LL.js";import"./chunk-5G5GAIRV.js";import"./chunk-XF6F4LTW.js";import"./chunk-BOJFY5TM.js";import"./chunk-U2M3PDPG.js";import"./chunk-3TUTWMB2.js";import"./chunk-KSRYPKRX.js";import"./chunk-4QJMST5Y.js";import"./chunk-3YDSD3AB.js";import"./chunk-BHXYIM2X.js";import"./chunk-DCHRNTDF.js";import"./chunk-ZY2ZH6GH.js";import"./chunk-J4BYHON2.js";import"./chunk-HUXJGNY7.js";import"./chunk-VAKEU5TB.js";import"./chunk-6DN4ITWG.js";import"./chunk-IZ6QYDYW.js";import"./chunk-CCUABLZY.js";import"./chunk-2GW6FSLA.js";import"./chunk-HIJMIXSC.js";import"./chunk-7QTLRPM3.js";import"./chunk-7PGD3745.js";import"./chunk-EEMR7E6K.js";import"./chunk-A3WFPZFR.js";import"./chunk-L5WUWJUF.js";import"./chunk-7AIRJFWQ.js";import"./chunk-OPJEXU7D.js";import"./chunk-XIFSTT4M.js";import"./chunk-H3QA7S42.js";import"./chunk-YMFCEB4X.js";import"./chunk-FBWYJUBX.js";import"./chunk-44XR4LD6.js";import"./chunk-PTJ4CXVK.js";import"./chunk-WAOL3KZN.js";import"./chunk-WOT6VMZA.js";function n(f){return f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}var s=class extends t{isCompatible(o){switch(o){case r.GLSL:return!0;default:return!1}}getCustomCode(o){if(o==="vertex"){let e={};return e.CUSTOM_VERTEX_DEFINITIONS=l,e[`!${n("finalWorld=finalWorld*influence;")}`]=`
${d}
finalWorld=(finalWorld*influence);
`,e}if(o==="fragment"){let e={};e.CUSTOM_FRAGMENT_DEFINITIONS=`
#if defined(SPHERE_TEXTURE) && defined(NORMAL)
uniform sampler2D sphereSampler;
#endif
#ifdef TOON_TEXTURE
uniform sampler2D toonSampler;
#endif
`,e[`!${n(`#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)
uniform mat4 view;
#endif`)}`]=`
#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)
uniform mat4 view;
#elif defined(NORMAL) && defined(SPHERE_TEXTURE)
uniform mat4 view;
#endif
`,e.CUSTOM_FRAGMENT_MAIN_BEGIN=`
#ifdef TOON_TEXTURE
vec3 toonNdl;
#endif
`,e[`!${n("vec3 diffuseColor=vDiffuseColor.rgb;")}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
vec3 diffuseColor=clamp(vDiffuseColor.rgb+vAmbientColor,0.0,1.0);
#else
vec3 diffuseColor=(vDiffuseColor.rgb);
#endif
`,e[`!${n("float alpha=vDiffuseColor.a;")}`]=`
#ifdef CLAMP_ALPHA
float alpha=clamp(vDiffuseColor.a,0.0,1.0);
#else
float alpha=vDiffuseColor.a;
#endif
`,e[`!${n("baseColor=texture2D(diffuseSampler,vDiffuseUV+uvOffset);")}`]=`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
baseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));baseColor.rgb=mix(
vec3(1.0),
baseColor.rgb*textureMultiplicativeColor.rgb,
textureMultiplicativeColor.a
);baseColor.rgb=clamp(
baseColor.rgb+(baseColor.rgb-vec3(1.0))*textureAdditiveColor.a,
0.0,
1.0
)+textureAdditiveColor.rgb;
#else
baseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));
#endif
`,e[`!${n(`struct lightingInfo
{`)}`]=`
struct lightingInfo {
#ifdef TOON_TEXTURE
#ifndef NDOTL
float ndl;
#endif
float isToon;
#endif
`,e[`!${n("result.diffuse=ndl*diffuseColor*attenuation;")}`]=`
#ifdef TOON_TEXTURE
result.diffuse=diffuseColor*attenuation;result.ndl=ndl;result.isToon=1.0;
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED) 
result.diffuse=diffuseColor*attenuation;
#else
result.diffuse=(ndl*diffuseColor*attenuation);
#endif
`,e[`!${n("diffuseBase+=info.diffuse*shadow;")}`]=`
#ifdef TOON_TEXTURE
toonNdl=vec3(clamp(info.ndl*shadow,0.02,0.98));toonNdl.r=texture2D(toonSampler,vec2(0.5,toonNdl.r)).r;toonNdl.g=texture2D(toonSampler,vec2(0.5,toonNdl.g)).g;toonNdl.b=texture2D(toonSampler,vec2(0.5,toonNdl.b)).b;
#ifdef TOON_TEXTURE_COLOR
toonNdl=mix(
vec3(1.0),
toonNdl*toonTextureMultiplicativeColor.rgb,
toonTextureMultiplicativeColor.a
);toonNdl=clamp(
toonNdl+(toonNdl-vec3(1.0))*toonTextureAdditiveColor.a,
0.0,
1.0
)+toonTextureAdditiveColor.rgb;
#endif
diffuseBase+=mix(info.diffuse*shadow,toonNdl*info.diffuse,info.isToon);
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
diffuseBase+=info.diffuse;
#else
diffuseBase+=(info.diffuse*shadow);
#endif
`;let i=`
#ifdef EMISSIVEASILLUMINATION
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
vec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#endif
#endif
`;return e[`!${n(i)}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
#ifdef EMISSIVEASILLUMINATION
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
vec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor,0.0,1.0)*baseColor.rgb;
#endif
#endif
#else
${i.replace("diffuseBase","(diffuseBase)")}#endif
`,e.CUSTOM_FRAGMENT_BEFORE_FOG=`
#if defined(NORMAL) && defined(SPHERE_TEXTURE)
vec3 viewSpaceNormal=normalize(mat3(view)*vNormalW);vec2 sphereUV=viewSpaceNormal.xy*0.5+0.5;vec4 sphereReflectionColor=texture2D(sphereSampler,sphereUV);
#ifdef SPHERE_TEXTURE_COLOR
sphereReflectionColor.rgb=mix(
vec3(1.0),
sphereReflectionColor.rgb*sphereTextureMultiplicativeColor.rgb,
sphereTextureMultiplicativeColor.a
);sphereReflectionColor.rgb=clamp(
sphereReflectionColor.rgb+(sphereReflectionColor.rgb-vec3(1.0))*sphereTextureAdditiveColor.a,
0.0,
1.0
)+sphereTextureAdditiveColor.rgb;
#endif
sphereReflectionColor.rgb*=diffuseBase;
#ifdef SPHERE_TEXTURE_BLEND_MODE_MULTIPLY
color*=sphereReflectionColor;
#elif defined(SPHERE_TEXTURE_BLEND_MODE_ADD)
color=vec4(color.rgb+sphereReflectionColor.rgb,color.a);
#endif
#endif
`,e}return null}getUniforms(o){return{...super.getUniforms(o),fragment:`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
uniform vec4 textureMultiplicativeColor;uniform vec4 textureAdditiveColor;
#endif
#if defined(SPHERE_TEXTURE) && defined(SPHERE_TEXTURE_COLOR)
uniform vec4 sphereTextureMultiplicativeColor;uniform vec4 sphereTextureAdditiveColor;
#endif
#if defined(TOON_TEXTURE) && defined(TOON_TEXTURE_COLOR)
uniform vec4 toonTextureMultiplicativeColor;uniform vec4 toonTextureAdditiveColor;
#endif
`}}};export{s as MmdPluginMaterial};
