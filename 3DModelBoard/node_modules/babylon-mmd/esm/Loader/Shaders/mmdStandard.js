import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { MmdPluginMaterial as MmdPluginMaterialBase } from "../mmdPluginMaterial";
import { EscapeRegExp } from "./escapeRegExp";
import { SdefDeclaration } from "./sdefDeclaration";
import { SdefVertex } from "./sdefVertex";
export class MmdPluginMaterial extends MmdPluginMaterialBase {
    /**
     * Gets a boolean indicating that the plugin is compatible with a given shader language.
     * @param shaderLanguage The shader language to use.
     * @returns true if the plugin is compatible with the shader language
     */
    isCompatible(shaderLanguage) {
        switch (shaderLanguage) {
            case ShaderLanguage.GLSL:
                return true;
            default:
                return false;
        }
    }
    getCustomCode(shaderType) {
        if (shaderType === "vertex") {
            const codes = {};
            codes["CUSTOM_VERTEX_DEFINITIONS"] = SdefDeclaration;
            codes[`!${EscapeRegExp("finalWorld=finalWorld*influence;")}`] = /* glsl */ `
${SdefVertex}
finalWorld=(finalWorld*influence);
`;
            return codes;
        }
        if (shaderType === "fragment") {
            const codes = {};
            codes["CUSTOM_FRAGMENT_DEFINITIONS"] = /* glsl */ "\n#if defined(SPHERE_TEXTURE) && defined(NORMAL)\nuniform sampler2D sphereSampler;\n#endif\n#ifdef TOON_TEXTURE\nuniform sampler2D toonSampler;\n#endif\n";
            codes[`!${EscapeRegExp("#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)\nuniform mat4 view;\n#endif")}`] = /* glsl */ "\n#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)\nuniform mat4 view;\n#elif defined(NORMAL) && defined(SPHERE_TEXTURE)\nuniform mat4 view;\n#endif\n";
            codes["CUSTOM_FRAGMENT_MAIN_BEGIN"] = /* glsl */ "\n#ifdef TOON_TEXTURE\nvec3 toonNdl;\n#endif\n";
            codes[`!${EscapeRegExp("vec3 diffuseColor=vDiffuseColor.rgb;")}`] = /* glsl */ "\n#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE\nvec3 diffuseColor=clamp(vDiffuseColor.rgb+vAmbientColor,0.0,1.0);\n#else\nvec3 diffuseColor=(vDiffuseColor.rgb);\n#endif\n";
            codes[`!${EscapeRegExp("float alpha=vDiffuseColor.a;")}`] = /* glsl */ "\n#ifdef CLAMP_ALPHA\nfloat alpha=clamp(vDiffuseColor.a,0.0,1.0);\n#else\nfloat alpha=vDiffuseColor.a;\n#endif\n";
            codes[`!${EscapeRegExp("baseColor=texture2D(diffuseSampler,vDiffuseUV+uvOffset);")}`] = /* glsl */ "\n#if defined(DIFFUSE) && defined(TEXTURE_COLOR)\nbaseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));baseColor.rgb=mix(\nvec3(1.0),\nbaseColor.rgb*textureMultiplicativeColor.rgb,\ntextureMultiplicativeColor.a\n);baseColor.rgb=clamp(\nbaseColor.rgb+(baseColor.rgb-vec3(1.0))*textureAdditiveColor.a,\n0.0,\n1.0\n)+textureAdditiveColor.rgb;\n#else\nbaseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));\n#endif\n";
            codes[`!${EscapeRegExp("struct lightingInfo\n{")}`] = /* glsl */ "\nstruct lightingInfo {\n#ifdef TOON_TEXTURE\n#ifndef NDOTL\nfloat ndl;\n#endif\nfloat isToon;\n#endif\n";
            // ndl might be clamped to 1.0
            codes[`!${EscapeRegExp("result.diffuse=ndl*diffuseColor*attenuation;")}`] = /* glsl */ "\n#ifdef TOON_TEXTURE\nresult.diffuse=diffuseColor*attenuation;result.ndl=ndl;result.isToon=1.0;\n#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED) \nresult.diffuse=diffuseColor*attenuation;\n#else\nresult.diffuse=(ndl*diffuseColor*attenuation);\n#endif\n";
            codes[`!${EscapeRegExp("diffuseBase+=info.diffuse*shadow;")}`] = /* glsl */ "\n#ifdef TOON_TEXTURE\ntoonNdl=vec3(clamp(info.ndl*shadow,0.02,0.98));toonNdl.r=texture2D(toonSampler,vec2(0.5,toonNdl.r)).r;toonNdl.g=texture2D(toonSampler,vec2(0.5,toonNdl.g)).g;toonNdl.b=texture2D(toonSampler,vec2(0.5,toonNdl.b)).b;\n#ifdef TOON_TEXTURE_COLOR\ntoonNdl=mix(\nvec3(1.0),\ntoonNdl*toonTextureMultiplicativeColor.rgb,\ntoonTextureMultiplicativeColor.a\n);toonNdl=clamp(\ntoonNdl+(toonNdl-vec3(1.0))*toonTextureAdditiveColor.a,\n0.0,\n1.0\n)+toonTextureAdditiveColor.rgb;\n#endif\ndiffuseBase+=mix(info.diffuse*shadow,toonNdl*info.diffuse,info.isToon);\n#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)\ndiffuseBase+=info.diffuse;\n#else\ndiffuseBase+=(info.diffuse*shadow);\n#endif\n";
            const finalDiffuse = /* glsl */ "\n#ifdef EMISSIVEASILLUMINATION\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;\n#else\n#ifdef LINKEMISSIVEWITHDIFFUSE\nvec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;\n#else\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor+vAmbientColor,0.0,1.0)*baseColor.rgb;\n#endif\n#endif\n";
            codes[`!${EscapeRegExp(finalDiffuse)}`] = /* glsl */ `
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
${finalDiffuse.replace("diffuseBase", "(diffuseBase)")}#endif
`;
            codes["CUSTOM_FRAGMENT_BEFORE_FOG"] = /* glsl */ "\n#if defined(NORMAL) && defined(SPHERE_TEXTURE)\nvec3 viewSpaceNormal=normalize(mat3(view)*vNormalW);vec2 sphereUV=viewSpaceNormal.xy*0.5+0.5;vec4 sphereReflectionColor=texture2D(sphereSampler,sphereUV);\n#ifdef SPHERE_TEXTURE_COLOR\nsphereReflectionColor.rgb=mix(\nvec3(1.0),\nsphereReflectionColor.rgb*sphereTextureMultiplicativeColor.rgb,\nsphereTextureMultiplicativeColor.a\n);sphereReflectionColor.rgb=clamp(\nsphereReflectionColor.rgb+(sphereReflectionColor.rgb-vec3(1.0))*sphereTextureAdditiveColor.a,\n0.0,\n1.0\n)+sphereTextureAdditiveColor.rgb;\n#endif\nsphereReflectionColor.rgb*=diffuseBase;\n#ifdef SPHERE_TEXTURE_BLEND_MODE_MULTIPLY\ncolor*=sphereReflectionColor;\n#elif defined(SPHERE_TEXTURE_BLEND_MODE_ADD)\ncolor=vec4(color.rgb+sphereReflectionColor.rgb,color.a);\n#endif\n#endif\n";
            return codes;
        }
        return null;
    }
    getUniforms(shaderLanguage) {
        return {
            ...super.getUniforms(shaderLanguage),
            "fragment": "\n#if defined(DIFFUSE) && defined(TEXTURE_COLOR)\nuniform vec4 textureMultiplicativeColor;uniform vec4 textureAdditiveColor;\n#endif\n#if defined(SPHERE_TEXTURE) && defined(SPHERE_TEXTURE_COLOR)\nuniform vec4 sphereTextureMultiplicativeColor;uniform vec4 sphereTextureAdditiveColor;\n#endif\n#if defined(TOON_TEXTURE) && defined(TOON_TEXTURE_COLOR)\nuniform vec4 toonTextureMultiplicativeColor;uniform vec4 toonTextureAdditiveColor;\n#endif\n"
        };
    }
}
