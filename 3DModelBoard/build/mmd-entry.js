// Selective MMD imports — avoid `babylon-mmd` index which pulls in
// WASM physics worker code (top-level `self` reference breaks plain ESM load).
// We only need the file parsers/loaders for PMX/PMD/VMD.
export { PmxLoader } from 'babylon-mmd/esm/Loader/pmxLoader.js';
export { PmdLoader } from 'babylon-mmd/esm/Loader/pmdLoader.js';
export { PmxLoaderMetadata } from 'babylon-mmd/esm/Loader/pmxLoader.metadata.js';
export { PmdLoaderMetadata } from 'babylon-mmd/esm/Loader/pmdLoader.metadata.js';
export { VmdLoader } from 'babylon-mmd/esm/Loader/vmdLoader.js';
export { RegisterDxBmpTextureLoader } from 'babylon-mmd/esm/Loader/registerDxBmpTextureLoader.js';
export { ReferenceFileResolver } from 'babylon-mmd/esm/Loader/referenceFileResolver.js';
export { SdefInjector } from 'babylon-mmd/esm/Loader/sdefInjector.js';
export { MmdStandardMaterialBuilder } from 'babylon-mmd/esm/Loader/mmdStandardMaterialBuilder.js';
