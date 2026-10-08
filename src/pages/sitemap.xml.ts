// XML sitemap (sitemaps.org 0.9) with hreflang alternates for the Arabic and English versions.
import type { APIRoute } from 'astro';
import { PAGES, LANGS, pageUrl, siteOrigin } from '../lib/agent';

export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const lastmod = new Date().toISOString().slice(0, 10); // build date: every deploy republishes all pages
  const urls = PAGES.flatMap((page) => LANGS.map((lang) => `  <url>
    <loc>${pageUrl(origin, lang, page)}</loc>
    <lastmod>${lastmod}</lastmod>
${LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(origin, l, page)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(origin, 'ar', page)}"/>
  </url>`)).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
