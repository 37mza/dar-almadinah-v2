// Public address used in canonical links, the sitemap, llms.txt and structured data.
// 1. SITE_URL if set explicitly; 2. on Vercel, the project's production domain (the vercel.app address
// today; www.daralmadinah.com.sa automatically once that domain is attached to this project);
// 3. the intended domain for local builds.
export function siteUrl(env = process.env) {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  return 'https://www.daralmadinah.com.sa';
}
