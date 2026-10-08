// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.daralmadinah.com.sa',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
