// Markdown 404 body, served with status 404 when an agent asks for text/markdown.
import type { APIRoute } from 'astro';
import { notFoundMarkdown, siteOrigin } from '../lib/agent';
export const GET: APIRoute = ({ site }) =>
  new Response(notFoundMarkdown(siteOrigin(site)), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
