import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Writes dist/offline-manifest.json: every file the app needs offline (app shell, SDK runtime, case files).
// The "Prepare offline" button downloads this list into the service worker cache.
// The gdpicture-* folder (Office document conversion) is not needed to view PDFs, so it is left out.
function offlineManifest() {
  let outDir = "dist";
  return {
    name: "offline-manifest",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) {
            if (!name.startsWith("gdpicture-")) walk(full);
            continue;
          }
          const path = "/" + relative(outDir, full).split(sep).join("/");
          if (path === "/sw.js" || path === "/offline-manifest.json") continue;
          files.push({ path: path === "/index.html" ? "/" : path, size: statSync(full).size });
        }
      };
      walk(outDir);
      files.sort((a, b) => a.path.localeCompare(b.path));
      const version = createHash("sha1").update(JSON.stringify(files)).digest("hex").slice(0, 12);
      const bytes = files.reduce((n, f) => n + f.size, 0);
      writeFileSync(join(outDir, "offline-manifest.json"), JSON.stringify({ version, bytes, files: files.map((f) => f.path) }));
    },
  };
}

export default defineConfig({
  server: { port: 5173 },
  preview: { port: 4173 },
  optimizeDeps: { exclude: ["@nutrient-sdk/viewer"] },
  plugins: [offlineManifest()],
});
