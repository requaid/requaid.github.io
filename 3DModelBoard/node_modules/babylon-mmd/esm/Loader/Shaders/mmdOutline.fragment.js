import "@babylonjs/core/Shaders/ShadersInclude/clipPlaneFragmentDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/logDepthDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/clipPlaneFragment";
import "@babylonjs/core/Shaders/ShadersInclude/logDepthFragment";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
const Name = "mmdOutlinePixelShader";
const Shader = /* glsl */ "\n#ifdef LOGARITHMICDEPTH\n#extension GL_EXT_frag_depth : enable\n#endif\nuniform vec4 color;\n#ifdef ALPHATEST\nvarying vec2 vUV;uniform sampler2D diffuseSampler;\n#endif\n#include<clipPlaneFragmentDeclaration>\n#include<logDepthDeclaration>\n#define CUSTOM_FRAGMENT_DEFINITIONS\nvoid main(void) {\n#define CUSTOM_FRAGMENT_MAIN_BEGIN\n#include<clipPlaneFragment>\n#ifdef ALPHATEST\nif (texture2D(diffuseSampler,vUV).a<0.4)\ndiscard;\n#endif\n#include<logDepthFragment>\ngl_FragColor=color;\n#define CUSTOM_FRAGMENT_MAIN_END\n}\n";
// Sideeffect
ShaderStore.ShadersStore[Name] = Shader;
/** @internal */
export const MmdOutlinePixelShader = { name: Name, shader: Shader };
