// Módulos ESM remotos (cargados en runtime desde esm.sh con webpackIgnore en
// Hero3D.tsx). Los declaramos como `any` para que TypeScript no falle al no
// poder resolver una URL como especificador de módulo.
declare module "https://esm.sh/three";
declare module "https://esm.sh/three/addons/controls/OrbitControls.js";
declare module "https://esm.sh/three/addons/postprocessing/EffectComposer.js";
declare module "https://esm.sh/three/addons/postprocessing/RenderPass.js";
declare module "https://esm.sh/three/addons/postprocessing/UnrealBloomPass.js";
declare module "https://esm.sh/three/addons/loaders/FontLoader.js";
declare module "https://esm.sh/three/addons/geometries/TextGeometry.js";
