// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.daralmadinah.com.sa',
  trailingSlash: 'ignore',
  // Pages stay static (prerendered); only the CMS admin and its API run on demand on Vercel.
  adapter: vercel(),
  integrations: [react(), keystatic()],
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
