import{a as e}from"./chunk-L5WUWJUF.js";var o="fogVertex",t=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;e.IncludesShadersStoreWGSL[o]||(e.IncludesShadersStoreWGSL[o]=t);
