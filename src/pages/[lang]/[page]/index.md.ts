// Markdown twins of the inner pages, e.g. /en/projects/index.md (served for Accept: text/markdown).
import type { APIRoute, GetStaticPaths } from 'astro';
import { pageMarkdown, siteOrigin, PAGES, LANGS, type Page } from '../../../lib/agent';
import type { Lang } from '../../../i18n/strings';

export const getStaticPaths: GetStaticPaths = () =>
  LANGS.flatMap((lang) => PAGES.filter(Boolean).map((page) => ({ params: { lang, page } })));
export const GET: APIRoute = ({ params, site }) =>
  new Response(pageMarkdown(siteOrigin(site), params.lang as Lang, params.page as Page), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
