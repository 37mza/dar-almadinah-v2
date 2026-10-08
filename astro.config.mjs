// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.daralmadinah.com.sa',
  trailingSlash: 'ignore',
  // CSS always ships as files, so the Content-Security-Policy can forbid inline <style> blocks.
  build: { inlineStylesheets: 'never' },
  // Fonts and other assets always ship as files too (no data: URIs), keeping the CSP strict.
  vite: { build: { assetsInlineLimit: 0 } },
  // Pages stay static (prerendered); only the CMS admin and its API run on demand on Vercel.
  adapter: vercel(),
  integrations: [react(), keystatic()],
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
