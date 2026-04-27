// Selective MMD imports — avoid `babylon-mmd` index which pulls in
// WASM physics worker code (top-level `self` reference breaks plain ESM load).
// We only need the file parsers/loaders for PMX/PMD/VMD.
//
// Side-effect import: registers `MmdStandardMaterialBuilder` as the global
// `MmdModelLoader.SharedMaterialBuilder`. Without this, PmxLoader/PmdLoader
// instantiate with `materialBuilder = null`, which causes the model load to
// produce an empty material set and (for PMD specifically) leaves downstream
// skeleton/morph builders waiting on metadata that never arrives → infinite
// preview loading. Keep this import first so the static slot is populated
// before any loader is constructed below.
import 'babylon-mmd/esm/Loader/mmdModelLoader.default.js';

export { PmxLoader } from 'babylon-mmd/esm/Loader/pmxLoader.js';
export { PmdLoader } from 'babylon-mmd/esm/Loader/pmdLoader.js';
export { PmxLoaderMetadata } from 'babylon-mmd/esm/Loader/pmxLoader.metadata.js';
export { PmdLoaderMetadata } from 'babylon-mmd/esm/Loader/pmdLoader.metadata.js';
export { VmdLoader } from 'babylon-mmd/esm/Loader/vmdLoader.js';
export { RegisterDxBmpTextureLoader } from 'babylon-mmd/esm/Loader/registerDxBmpTextureLoader.js';
export { ReferenceFileResolver } from 'babylon-mmd/esm/Loader/referenceFileResolver.js';
export { SdefInjector } from 'babylon-mmd/esm/Loader/sdefInjector.js';
export { MmdStandardMaterialBuilder } from 'babylon-mmd/esm/Loader/mmdStandardMaterialBuilder.js';
