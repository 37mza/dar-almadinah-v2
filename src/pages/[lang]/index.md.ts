// Markdown twin of the Home page: /ar/index.md and /en/index.md (served for Accept: text/markdown).
import type { APIRoute, GetStaticPaths } from 'astro';
import { pageMarkdown, siteOrigin } from '../../lib/agent';
import type { Lang } from '../../i18n/strings';

export const getStaticPaths: GetStaticPaths = () => [{ params: { lang: 'ar' } }, { params: { lang: 'en' } }];
export const GET: APIRoute = ({ params, site }) =>
  new Response(pageMarkdown(siteOrigin(site), params.lang as Lang, ''), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
