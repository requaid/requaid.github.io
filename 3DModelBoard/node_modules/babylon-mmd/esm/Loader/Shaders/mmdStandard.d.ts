import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import type { Nullable } from "@babylonjs/core/types";
import { MmdPluginMaterial as MmdPluginMaterialBase } from "../mmdPluginMaterial";
export declare class MmdPluginMaterial extends MmdPluginMaterialBase {
    /**
     * Gets a boolean indicating that the plugin is compatible with a given shader language.
     * @param shaderLanguage The shader language to use.
     * @returns true if the plugin is compatible with the shader language
     */
    isCompatible(shaderLanguage: ShaderLanguage): boolean;
    getCustomCode(shaderType: string): Nullable<{
        [pointName: string]: string;
    }>;
    getUniforms(shaderLanguage?: ShaderLanguage): {
        ubo: {
            name: string;
            size: number;
            type: string;
        }[];
        fragment: string;
    };
}
