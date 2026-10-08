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
