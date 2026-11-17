// Copies the Nutrient Web SDK runtime (WASM, workers, fonts) into public/ so it is served and cached same-origin.
import { cpSync, rmSync } from "node:fs";
const src = "node_modules/@nutrient-sdk/viewer/dist/nutrient-viewer-lib";
const dest = "public/nutrient-viewer-lib";
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
