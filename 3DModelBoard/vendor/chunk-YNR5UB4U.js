import{a as o}from"./chunk-L5WUWJUF.js";var e="fogFragment",r=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;o.IncludesShadersStore[e]||(o.IncludesShadersStore[e]=r);
