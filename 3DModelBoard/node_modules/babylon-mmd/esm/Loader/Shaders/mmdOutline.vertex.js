import "@babylonjs/core/Shaders/ShadersInclude/bonesDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/bakedVertexAnimationDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/morphTargetsVertexGlobalDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/morphTargetsVertexDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/clipPlaneVertexDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/logDepthDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/morphTargetsVertexGlobal";
import "@babylonjs/core/Shaders/ShadersInclude/morphTargetsVertex";
import "@babylonjs/core/Shaders/ShadersInclude/instancesVertex";
import "@babylonjs/core/Shaders/ShadersInclude/bonesVertex";
import "@babylonjs/core/Shaders/ShadersInclude/bakedVertexAnimation";
import "@babylonjs/core/Shaders/ShadersInclude/clipPlaneVertex";
import "@babylonjs/core/Shaders/ShadersInclude/logDepthVertex";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
const Name = "mmdOutlineVertexShader";
const Shader = /* glsl */ "\nattribute vec3 position;attribute vec3 normal;\n#include<bonesDeclaration>\n#include<bakedVertexAnimationDeclaration>\n#include<morphTargetsVertexGlobalDeclaration>\n#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]\n#include<clipPlaneVertexDeclaration>\nuniform float offset;\n#include<instancesDeclaration>\nuniform vec2 viewport;uniform mat3 view;uniform mat4 viewProjection;\n#ifdef WORLDPOS_REQUIRED\nuniform mat4 inverseViewProjection;\n#endif\n#ifdef ALPHATEST\nvarying vec2 vUV;uniform mat4 diffuseMatrix;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#endif\n#include<logDepthDeclaration>\n#define CUSTOM_VERTEX_DEFINITIONS\nvoid main(void)\n{vec3 positionUpdated=position;vec3 normalUpdated=normal;\n#ifdef UV1\nvec2 uvUpdated=uv;\n#endif\n#ifdef UV2\nvec2 uv2Updated=uv2;\n#endif\n#include<morphTargetsVertexGlobal>\n#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]\n#include<instancesVertex>\n#include<bonesVertex>\n#include<bakedVertexAnimation>\nvec3 viewNormal=view*(mat3(finalWorld)*normalUpdated);vec4 projectedPosition=viewProjection*finalWorld*vec4(positionUpdated,1.0);vec2 screenNormal=normalize(vec2(viewNormal));projectedPosition.xy+=screenNormal/(viewport*0.25/*0.5 */)*offset*projectedPosition.w;gl_Position=projectedPosition;\n#ifdef WORLDPOS_REQUIRED\nvec4 worldPos=inverseViewProjection*projectedPosition;\n#endif\n#ifdef ALPHATEST\n#ifdef UV1\nvUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));\n#endif\n#ifdef UV2\nvUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));\n#endif\n#endif\n#include<clipPlaneVertex>\n#include<logDepthVertex>\n}\n";
// Sideeffect
ShaderStore.ShadersStore[Name] = Shader;
/** @internal */
export const MmdOutlineVertexShader = { name: Name, shader: Shader };
