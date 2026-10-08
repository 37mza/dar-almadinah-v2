// Agent-readiness tests. Run after a build:  npm run build && npm test
// They run real requests through the routing table Vercel receives (.vercel/output/config.json) and
// check every machine-readable file the build publishes.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createRouter } from './vercel-router.mjs';
import { transform } from '../scripts/vercel-routes.mjs';
import { siteUrl } from '../scripts/site-url.mjs';

const OUT = new URL('../.vercel/output/', import.meta.url).pathname;
const STATIC = join(OUT, 'static');
const req = createRouter(OUT);
const MD = { Accept: 'text/markdown' };
const HTML = { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
const LANGS = ['ar', 'en'];
const PAGES = ['', 'projects/', 'about/', 'contact/', 'privacy/'];
const PATHS = LANGS.flatMap((l) => PAGES.map((p) => `/${l}/${p}`));
const read = (p) => readFileSync(join(STATIC, p), 'utf8');
const text = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const mainText = (html) => text(html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '');

describe('Markdown content negotiation', () => {
  for (const path of ['/', ...PATHS]) {
    test(`${path} with Accept: text/markdown returns Markdown with Vary: Accept`, () => {
      const r = req(path, MD);
      assert.equal(r.status, 200);
      assert.match(r.headers['content-type'], /^text\/markdown/);
      assert.match(r.headers.vary ?? '', /\bAccept\b/);
      assert.ok(r.body.startsWith('# '), 'starts with an H1');
      assert.ok(r.body.length > 200, 'has real content');
    });
  }
  for (const path of PATHS) {
    test(`${path} with Accept: text/html still returns HTML, with Vary: Accept`, () => {
      const r = req(path, HTML);
      assert.equal(r.status, 200);
      assert.match(r.headers['content-type'], /^text\/html/);
      assert.match(r.headers.vary ?? '', /\bAccept\b/);
      assert.match(r.body, /^<!DOCTYPE html>/i);
    });
  }
  test('/ with Accept: text/html redirects to /ar/', () => {
    const r = req('/', HTML);
    assert.equal(r.status, 307);
    assert.equal(r.headers.location, '/ar/');
  });
  test('a request with no Accept header gets HTML (browsers, crawlers)', () => {
    assert.match(req('/en/', {}).headers['content-type'], /^text\/html/);
  });
  test('Markdown and HTML versions describe the same page (same contact details)', () => {
    for (const path of PATHS) {
      const md = req(path, MD).body;
      assert.match(md, /dmce1414@hotmail\.com/);
      assert.match(md, /\+966 50 754 5145/);
    }
  });
  test('security headers are kept on Markdown responses', () => {
    const r = req('/en/', MD);
    assert.ok(r.headers['content-security-policy']);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
  });
  test('the CMS admin is not affected by Markdown negotiation', () => {
    assert.equal(req('/keystatic', MD).fn, '_render');
    assert.equal(req('/api/keystatic/github/login', MD).fn, '_render');
  });
});

describe('Agent-friendly 404', () => {
  test('unknown path as Markdown: status 404, text/markdown, helpful body', () => {
    const r = req('/__probe-does-not-exist', MD);
    assert.equal(r.status, 404);
    assert.match(r.headers['content-type'], /^text\/markdown/);
    assert.match(r.headers.vary ?? '', /\bAccept\b/);
    assert.ok(r.body.length >= 20);
    assert.match(r.body, /\/llms\.txt/);
    assert.match(r.body, /\/sitemap\.xml/);
  });
  test('unknown path as HTML: status 404 with the HTML error page', () => {
    const r = req('/__probe-does-not-exist', HTML);
    assert.equal(r.status, 404);
    assert.match(r.headers['content-type'], /^text\/html/);
  });
  test('the router script refuses to run if the adapter output changes shape', () => {
    assert.throws(() => transform({ routes: [{ handle: 'filesystem' }] }, []), /catch-all not found/);
  });
});

describe('Structured data (JSON-LD)', () => {
  for (const path of PATHS) {
    test(`${path} has Organization JSON-LD with contactPoint and PostalAddress`, () => {
      const html = read(`${path}index.html`);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      assert.equal(blocks.length, 1);
      const data = JSON.parse(blocks[0][1]);
      assert.equal(data['@context'], 'https://schema.org');
      const org = data['@graph'].find((n) => [].concat(n['@type']).includes('Organization'));
      assert.ok(org, 'Organization node');
      assert.ok(org.name && org.description && org.url.startsWith('https://'));
      const cp = org.contactPoint[0];
      assert.equal(cp['@type'], 'ContactPoint');
      assert.ok(cp.email && cp.telephone && cp.contactType);
      assert.equal(org.address['@type'], 'PostalAddress');
      assert.equal(org.address.addressCountry, 'SA');
      assert.ok(data['@graph'].some((n) => n['@type'] === 'WebPage' && n.url.endsWith(path)));
    });
  }
});

describe('Metadata', () => {
  for (const path of PATHS) {
    test(`${path} has canonical, lang, og:type and og:image`, async () => {
      const html = read(`${path}index.html`);
      assert.match(html, /<html lang="(ar|en)"/);
      assert.match(html, /<link rel="canonical" href="https:\/\/[^"]+"/);
      assert.match(html, /<meta property="og:type" content="website"/);
      const img = html.match(/<meta property="og:image" content="(https:\/\/[^"]+)"/)?.[1];
      assert.ok(img, 'absolute og:image URL');
      const file = join(STATIC, new URL(img).pathname);
      assert.ok(existsSync(file), 'og:image file exists in the build');
      const meta = await sharp(file).metadata();
      assert.equal(meta.width, 1200);
      assert.equal(meta.height, 630);
      assert.match(html, /<link rel="alternate" type="text\/markdown" href="https:\/\/[^"]+index\.md"/);
    });
  }
});

describe('Sitemap and robots.txt', () => {
  const xml = read('sitemap.xml');
  test('sitemap.xml is a sitemaps.org urlset listing every public page with lastmod', () => {
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    assert.deepEqual(locs.sort(), [...PATHS].sort());
    assert.equal((xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) ?? []).length, PATHS.length);
    assert.equal((xml.match(/<url>/g) ?? []).length, (xml.match(/<\/url>/g) ?? []).length);
  });
  test('sitemap URLs all resolve to built pages', () => {
    for (const p of PATHS) assert.equal(req(p, HTML).status, 200);
  });
  test('robots.txt points to the sitemap and keeps the CMS out', () => {
    const robots = read('robots.txt');
    assert.match(robots, /^Sitemap: https:\/\/\S+\/sitemap\.xml$/m);
    assert.match(robots, /^Disallow: \/keystatic$/m);
  });
});

describe('llms.txt', () => {
  const body = read('llms.txt');
  test('follows the llmstxt.org layout: H1, blockquote summary, H2 link sections', () => {
    const lines = body.split('\n').filter((l) => l.trim());
    assert.match(lines[0], /^# \S/);
    assert.match(lines[1], /^> \S/);
    assert.ok(/^## /m.test(body));
    assert.ok(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/m.test(body), 'has Markdown links');
  });
  test('has a "When to use" section with concrete use cases', () => {
    const section = body.split('## When to use')[1]?.split('\n## ')[0] ?? '';
    assert.ok(section.length > 300);
    assert.match(section, /hotel/i);
    assert.match(section, /Madinah/);
  });
  test('every Markdown link it lists exists', () => {
    for (const m of body.matchAll(/(https:\/\/[^\s)]+index\.md)/g)) {
      assert.ok(existsSync(join(STATIC, new URL(m[1]).pathname)), m[1]);
    }
  });
  test('is served as Markdown', () => {
    assert.match(req('/llms.txt', {}).headers['content-type'], /^text\/markdown/);
  });
});

describe('Trust pages', () => {
  for (const lang of LANGS) {
    for (const page of ['about', 'contact', 'privacy']) {
      test(`/${lang}/${page}/ has at least 500 characters of real content`, () => {
        assert.ok(mainText(read(`${lang}/${page}/index.html`)).length >= 500);
      });
    }
  }
  test('contact and privacy are linked from every page footer', () => {
    for (const p of PATHS) {
      const html = read(`${p}index.html`);
      const lang = p.split('/')[1];
      assert.ok(html.includes(`href="/${lang}/contact/"`));
      assert.ok(html.includes(`href="/${lang}/privacy/"`));
    }
  });
});

describe('Site address', () => {
  test('uses the Vercel production domain when building on Vercel', () => {
    assert.equal(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'dar-almadinah-v2.vercel.app' }), 'https://dar-almadinah-v2.vercel.app');
    assert.equal(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'www.daralmadinah.com.sa' }), 'https://www.daralmadinah.com.sa');
  });
  test('SITE_URL overrides, and local builds fall back to the intended domain', () => {
    assert.equal(siteUrl({ SITE_URL: 'https://example.sa/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' }), 'https://example.sa');
    assert.equal(siteUrl({}), 'https://www.daralmadinah.com.sa');
  });
});
