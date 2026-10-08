// robots.txt: everything public is crawlable; the CMS admin and its API are not.
import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/agent';
export const GET: APIRoute = ({ site }) => new Response(`User-agent: *
Allow: /
Disallow: /keystatic
Disallow: /api/

Sitemap: ${siteOrigin(site)}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
