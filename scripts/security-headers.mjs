// Runs after `astro build`. Writes the security headers directly into Vercel's routing file
// (.vercel/output/config.json), so they are guaranteed to be served, whatever Vercel does with vercel.json.
// The header values live in security-headers.json at the project root.
import { readFileSync, writeFileSync } from 'node:fs';

const cfgPath = new URL('../.vercel/output/config.json', import.meta.url);
const rules = JSON.parse(readFileSync(new URL('../security-headers.json', import.meta.url), 'utf8'));
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));

// Build Output API v3 route: { src: regex, headers: {...}, continue: true } adds headers and keeps routing.
// Placed first so they apply to every response, including the CMS functions.
const ours = rules.map((r) => ({ src: r.src, headers: r.headers, continue: true }));
cfg.routes = [...ours, ...(cfg.routes ?? [])];

writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
console.log(`[security-headers] added ${ours.length} header rules to .vercel/output/config.json`);
