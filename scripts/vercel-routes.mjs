// Runs after `astro build`. Adds rules to Vercel's routing table (.vercel/output/config.json,
// Build Output API v3) that the Astro adapter does not generate:
//
//  1. Security headers from security-headers.json, on every response.
//  2. Markdown content negotiation (acceptmarkdown.com): a request with `Accept: text/markdown`
//     for any page gets that page's Markdown twin (built at /<lang>/<page>/index.md) with
//     Content-Type: text/markdown and Vary: Accept. Browsers keep getting HTML, also with Vary: Accept.
//  3. The root redirect / -> /ar/ (Markdown requests to / get the Arabic Home page's Markdown directly).
//  4. A Markdown 404 body (status 404) for unknown paths requested as text/markdown.
//
// The routing logic is exported so tests can run real requests through it.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MD = 'text/markdown; charset=utf-8';
export const WANTS_MD = [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }];
const PAGES = '(projects|about|contact|privacy)';

/** Routes inserted before Vercel's filesystem check (order matters: first match wins unless `continue`). */
export function beforeFilesystem(securityRules) {
  return [
    ...securityRules.map((r) => ({ src: r.src, headers: r.headers, continue: true })),
    // Both representations of a page vary by Accept, so caches never serve one in place of the other
    { src: `^/(?:(?:ar|en)(?:/${PAGES})?/?)?$`, headers: { Vary: 'Accept' }, continue: true },
    { src: '^/.+\\.md$', headers: { 'Content-Type': MD }, continue: true },
    { src: '^/llms\\.txt$', headers: { 'Content-Type': MD }, continue: true },
    // Markdown negotiation
    { src: '^/$', has: WANTS_MD, dest: '/ar/index.md', headers: { 'Content-Type': MD, Vary: 'Accept' } },
    { src: '^/(ar|en)/?$', has: WANTS_MD, dest: '/$1/index.md', headers: { 'Content-Type': MD, Vary: 'Accept' } },
    { src: `^/(ar|en)/${PAGES}/?$`, has: WANTS_MD, dest: '/$1/$2/index.md', headers: { 'Content-Type': MD, Vary: 'Accept' } },
    // Arabic is the default language
    { src: '^/$', status: 307, headers: { Location: '/ar/', Vary: 'Accept' } },
  ];
}

/** Route inserted just before the adapter's final 404 catch-all. */
export const markdown404 = { src: '^/.*$', has: WANTS_MD, dest: '/404.md', status: 404, headers: { 'Content-Type': MD, Vary: 'Accept' } };

export function transform(cfg, securityRules) {
  const routes = cfg.routes ?? [];
  const fsAt = routes.findIndex((r) => r.handle === 'filesystem');
  const head = routes.slice(0, fsAt);
  const tail = routes.slice(fsAt);
  // The adapter's last route sends everything unmatched to /404.html; Markdown requests get /404.md first.
  const catchAll = tail.findIndex((r) => r.src === '^/.*$' && r.status === 404);
  if (catchAll === -1) throw new Error('[vercel-routes] adapter 404 catch-all not found; routing table changed shape');
  tail.splice(catchAll, 0, markdown404);
  tail[catchAll + 1] = { ...tail[catchAll + 1], headers: { ...(tail[catchAll + 1].headers ?? {}), Vary: 'Accept' } };
  return { ...cfg, routes: [...beforeFilesystem(securityRules), ...head, ...tail] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfgPath = new URL('../.vercel/output/config.json', import.meta.url);
  const rules = JSON.parse(readFileSync(new URL('../security-headers.json', import.meta.url), 'utf8'));
  const out = transform(JSON.parse(readFileSync(cfgPath, 'utf8')), rules);
  writeFileSync(cfgPath, JSON.stringify(out, null, 2));
  console.log(`[vercel-routes] ${out.routes.length} routes: security headers, Markdown negotiation, root redirect, Markdown 404`);
}
