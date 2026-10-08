// Copies the Mapbox worker and the Arabic (RTL) text plugin into public/vendor/ so they are served
// from this site. Keeps the Content-Security-Policy strict (no third-party scripts, no blob: workers).
import { copyFileSync, mkdirSync } from 'node:fs';
const out = new URL('../public/vendor/', import.meta.url);
mkdirSync(out, { recursive: true });
const files = [
  ['mapbox-gl/dist/mapbox-gl-csp-worker.js', 'mapbox-gl-csp-worker.js'],
  ['@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', 'mapbox-gl-rtl-text.js'],
];
for (const [from, to] of files) copyFileSync(new URL(`../node_modules/${from}`, import.meta.url), new URL(to, out));
console.log(`[vendor] copied ${files.length} map files to public/vendor/`);
