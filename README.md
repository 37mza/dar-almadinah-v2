# Dar Al Madinah — website v2

Bilingual (Arabic-first, RTL) site for Dar Al Madinah Engineering Consultants, built with Astro.

- `/ar/` — Arabic (default; `/` redirects here)
- `/en/` — English
- `/ar/projects/`, `/en/projects/` — project index with filters; cards expand into a full-screen project view

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321/ar/
npm run build    # output in dist/
```

## Where to edit

| What | File |
| --- | --- |
| All wording (both languages), email, phone, WhatsApp | `src/i18n/strings.ts` |
| Projects (names, data, images, featured on Home) | `src/data/projects.ts` |
| Project images | `public/projects/<project-slug>/` (replace the `ph-*.svg` placeholders) |
| Colors, fonts, spacing, motion curves | `src/styles/global.css` (`:root` tokens) |
| Logo | `src/components/Wordmark.astro` (placeholder until the identity is final) and `public/favicon.svg` |

## Inquiry form

The form emails submissions through [Web3Forms](https://web3forms.com) (free). Get an access key using
dmce1414@hotmail.com, then add it in Vercel → Project → Settings → Environment Variables as
`PUBLIC_WEB3FORMS_KEY` and redeploy. Until a key is set, the form opens the visitor's email app with the
request already filled in.

## Deploy (Vercel)

Framework preset: Astro. Build command `npm run build`, output `dist`. `vercel.json` redirects `/` to `/ar/`.
Point `www.daralmadinah.com.sa` at this project only after the preview is approved.

## Motion notes

Built to Emil Kowalski's design-engineering rules: custom easing curves, transform/opacity/clip-path only,
hover effects gated to real pointers, interruptible project expand (WAAPI), CSS-only scroll-driven effects
with static fallbacks, and a gentler variant for `prefers-reduced-motion`.

## Managing projects (CMS)

Projects are edited in the Keystatic admin at **/keystatic** (e.g. https://dar-almadinah-v2.vercel.app/keystatic).
Sign in with GitHub; your account needs write access to `37mza/dar-almadinah-v2`. Every Save is a commit to
`main`, and Vercel republishes the site about a minute later.

- Each project is one file in `src/content/projects/<slug>.yaml`; its renders are in `src/assets/projects/<slug>/`.
- Upload full-size renders (JPG/PNG/WebP). The build converts them to WebP at 960px and 2000px.
- **Order** controls position (lower first). **Show on the Home page** + Order decide the four Home projects.
  The first of those is also the large Home hero image.
- Empty fields (year, area, status, description) are hidden on the site.

Locally, `npm run dev` then open http://localhost:4321/keystatic: edits go straight to the files on disk.

### One-time GitHub sign-in setup (already documented in chat)

The live admin needs these Vercel environment variables (Settings → Environment Variables, all environments):
`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
If the site moves to www.daralmadinah.com.sa, add
`https://www.daralmadinah.com.sa/api/keystatic/github/oauth/callback` to the GitHub App's callback URLs.
