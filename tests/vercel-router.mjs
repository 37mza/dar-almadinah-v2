// A small, faithful emulator of Vercel's Build Output API v3 routing, enough to run real requests
// through .vercel/output/config.json in tests: ordered routes, `continue`, `has` header conditions,
// `$n` substitution in `dest`, `status`, header merging, the `filesystem` phase, and functions.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TYPES = { html: 'text/html; charset=utf-8', md: 'text/markdown; charset=utf-8', txt: 'text/plain; charset=utf-8', xml: 'application/xml', js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', jpg: 'image/jpeg', webp: 'image/webp' };

function matches(route, path, reqHeaders) {
  if (!route.src) return null;
  const m = new RegExp(route.src).exec(path);
  if (!m) return null;
  for (const h of route.has ?? []) {
    if (h.type !== 'header') return null;
    const v = reqHeaders[h.key.toLowerCase()];
    if (v === undefined) return null;
    if (h.value !== undefined && !new RegExp(`^${h.value}$`).test(v)) return null; // anchored: the stricter reading
  }
  return m;
}
const sub = (s, m) => s.replace(/\$(\d+)/g, (_, i) => m[Number(i)] ?? '');

export function createRouter(outDir) {
  const cfg = JSON.parse(readFileSync(join(outDir, 'config.json'), 'utf8'));
  const staticDir = join(outDir, 'static');
  const fnExists = (name) => existsSync(join(outDir, 'functions', `${name.replace(/^\//, '')}.func`));
  const file = (p) => {
    const clean = decodeURIComponent(p.split('?')[0]);
    for (const c of [clean, join(clean, 'index.html'), `${clean}.html`]) {
      const f = join(staticDir, c);
      if (existsSync(f) && statSync(f).isFile()) return f;
    }
    return null;
  };

  return function request(path, reqHeaders = {}) {
    const h = Object.fromEntries(Object.entries(reqHeaders).map(([k, v]) => [k.toLowerCase(), v]));
    const out = {};
    let status = null;
    let cur = path;
    const serve = (target, code) => {
      if (fnExists(target)) return { status: code ?? 200, headers: out, fn: target };
      const f = file(target);
      if (!f) return null;
      const ext = f.split('.').pop();
      return { status: code ?? 200, headers: { 'content-type': TYPES[ext] ?? 'application/octet-stream', ...out }, file: f, body: readFileSync(f, 'utf8') };
    };
    let phase = 'pre';
    for (const r of cfg.routes) {
      if (r.handle === 'filesystem') {
        phase = 'post';
        const hit = serve(cur, status ?? undefined);
        if (hit) return hit;
        continue;
      }
      if (r.handle) continue;
      const m = matches(r, cur, h);
      if (!m) continue;
      for (const [k, v] of Object.entries(r.headers ?? {})) out[k.toLowerCase()] = sub(v, m);
      if (r.status) status = r.status;
      if (r.dest) cur = sub(r.dest, m);
      if (r.continue) continue;
      if (status && status >= 300 && status < 400) return { status, headers: out };
      const hit = serve(cur, status ?? undefined);
      if (hit) return hit;
      if (phase === 'pre') continue; // dest missing before filesystem: keep routing
      return { status: 404, headers: out };
    }
    return { status: 404, headers: out };
  };
}
