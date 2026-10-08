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

## Design rules

Deliberately plain, to avoid the look of template / AI-generated sites:

- **Type:** IBM Plex Sans + IBM Plex Sans Arabic only. Largest text is the home hero at 48px; page titles 40px;
  section headings 26px; body 16–18px. Scale lives in `--step-*` tokens in `src/styles/global.css`.
- **Spacing:** only the 8px-based `--sp-1` … `--sp-7` tokens. Don't add one-off rem values.
- **No:** gradient text, glass/blur panels, pill buttons, labels above headings, icon arrows in buttons,
  scroll-triggered fade-ins, marquees, emoji, em dashes in copy, buzzword copy.
- **Motion is only where it explains something:** the project card opening into its full view, the inquiry drawer,
  the filter reflow, button press feedback, and a 220 ms crossfade when switching light/dark.
  All of it respects `prefers-reduced-motion`.

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

### One-time GitHub sign-in setup

The live admin needs these Vercel environment variables (Settings → Environment Variables, all environments):
`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
If the site moves to www.daralmadinah.com.sa, add
`https://www.daralmadinah.com.sa/api/keystatic/github/oauth/callback` to the GitHub App's callback URLs.

## Security

- **Headers** (CSP, HSTS, frame denial, etc.) are defined in `security-headers.json` and written into Vercel's
  build output by `scripts/security-headers.mjs` after every build. To allow a new outside service (e.g. analytics),
  add its domain to the matching CSP directive there.
- **No secrets in the repo.** All keys live in Vercel → Settings → Environment Variables. `.env` files are git-ignored.
- **Uploads:** the build refuses non-image files and images over 15 MB, and names the file in the build log.
  The previous version of the site stays live until it's fixed.
- **Dependencies:** run `npm audit` monthly. `path-to-regexp` is pinned via `overrides` in package.json
  (GHSA-9wv6-86v2-598j); remove the override once `@astrojs/vercel` ships a patched version.
- **Backup / restore:** the GitHub repo is the database. Every CMS save is a commit, so any change can be undone
  from the repo's History (or `git revert`). A fresh clone + `npm ci && npm run build` rebuilds the full site.
