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
- **Interaction (after Apple's HIG / "Designing Fluid Interfaces"):**
  - Every tappable thing is at least 44px on touch screens (`--tap`), and highlights on press, not on release.
  - The project view and the inquiry panel each get a browser-history entry: Back (or the Android back
    gesture) closes them (`src/scripts/layers.ts`).
  - Swipe to dismiss on touch: the project view swipes down, the inquiry panel swipes toward its own edge
    (right in English, left in Arabic). Tracking is 1:1, the decision comes from projected momentum, and a
    spring continues at the finger's speed; pulling the wrong way rubber-bands (`src/scripts/physics.ts`).
  - Tracking and leading change with size (`--track-*`, `--lead-*`); Arabic is never letter-spaced.
  - Form fields are checked when you leave them, with a written message, not only a red line.
  - Honors increased contrast, reduced transparency and reduced motion settings.
  - Not adopted on purpose: translucent/blurred bars. The site keeps solid surfaces by design decision.

## Managing content (CMS)

Everything below is edited in the Keystatic admin at **/keystatic** (e.g. https://dar-almadinah-v2.vercel.app/keystatic).
Sign in with GitHub; your account needs write access to `37mza/dar-almadinah-v2`. Every Save is a commit to
`main`, and Vercel republishes the site about a minute later. Sections with no content are hidden automatically.

| CMS section | Where it shows | Notes |
| --- | --- | --- |
| **Portfolio > Projects** | Projects page (list + map), Home | One list for both. A cover render puts it in the portfolio; latitude + longitude put it on the map. **Show on the Home page** + Order pick the four Home projects; the first is the Home hero image. |
| **Office > Team** | About page | Designation, name, specialty, portrait, credentials. Without a portrait, initials are shown. |
| **Office > Licences & certificates** | Home (licences + ISO) and About (all) | Only entries with **Show on the website** ticked appear. ISO 9001/14001/45001, LEED, Mostadam and compliance certificates are prepared but off. Tick them once issued. |
| **Office > Partners & clients** | Home and About | Logo (JPG/PNG/WebP/SVG) or just the name. |
| **Site settings > Office in numbers** | Home and About | Typed by hand. A figure with an empty value is hidden. |
| **Site settings > Company details** | Footer of every page | Commercial registration, VAT and SCE numbers. |

- **Placeholders:** sample entries stand in where real content hasn't arrived yet: 4 team members, 6 partners,
  6 "Sample Project" pins on the map (Madinah, made-up locations), three "XX" figures and the XXXX CR/VAT/SCE numbers.
  They show a dashed "Placeholder / مؤقت" tag on the page and are never published to search engines or AI agents
  (Markdown pages, llms.txt, structured data). To replace one: edit it with real details and untick **Placeholder**,
  or delete it. For figures and company numbers, typing the real value replaces the XX.
  Licences not yet held (ISO, LEED, Mostadam) are deliberately not shown as placeholders, since that would read as a claim.
- Images: upload originals (JPG/PNG/WebP, up to 15 MB). The build converts them to WebP at the right sizes.
- Certificate files (optional): PDF or image, up to 15 MB. If added, visitors can open them.
- Empty fields (year, area, status, description…) are hidden on the site.

Locally, `npm run dev` then open http://localhost:4321/keystatic: edits go straight to the files on disk.

### Importing the old map's spreadsheet

```bash
node scripts/import-map.mjs path/to/projects.csv   # CSV UTF-8 from Excel, or Supabase > Table editor > Export
```

It fills in coordinates, typology, status, year, plot, BUA and the extra figure for projects that already exist
(matched by name), and creates map-only projects for the rest. Nothing is deleted; re-running is safe. It prints which
rows need an Arabic name or have suspicious coordinates. Review in /keystatic, then commit and push.

### Map

Mapbox GL, loaded only when a visitor opens the map. Light mode uses your custom Mapbox style, dark mode Mapbox Dark,
plus a Satellite switch. Settings are in `src/config/site.ts`. The Mapbox token is public by design; restrict it to
your domains in the Mapbox dashboard (Tokens > URL restrictions). The worker and Arabic text plugin are served
from this site (`scripts/vendor.mjs`), so the security policy stays strict.

### One-time GitHub sign-in setup

The live admin needs these Vercel environment variables (Settings → Environment Variables, all environments):
`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
If the site moves to www.daralmadinah.com.sa, add
`https://www.daralmadinah.com.sa/api/keystatic/github/oauth/callback` to the GitHub App's callback URLs.

## Security

- **Headers** (CSP, HSTS, frame denial, etc.) are defined in `security-headers.json` and written into Vercel's
  build output by `scripts/vercel-routes.mjs` after every build. To allow a new outside service (e.g. analytics),
  add its domain to the matching CSP directive there.
- **No secrets in the repo.** All keys live in Vercel → Settings → Environment Variables. `.env` files are git-ignored.
- **Uploads:** the build refuses non-image files and images over 15 MB, and names the file in the build log.
  The previous version of the site stays live until it's fixed.
- **Dependencies:** run `npm audit` monthly. `path-to-regexp` is pinned via `overrides` in package.json
  (GHSA-9wv6-86v2-598j); remove the override once `@astrojs/vercel` ships a patched version.
- **Backup / restore:** the GitHub repo is the database. Every CMS save is a commit, so any change can be undone
  from the repo's History (or `git revert`). A fresh clone + `npm ci && npm run build` rebuilds the full site.

## Agents and search

| What | Where it comes from |
| --- | --- |
| Markdown version of every page (`Accept: text/markdown`, or `/<lang>/<page>/index.md`) | `src/lib/agent.ts` (built from the same CMS data as the HTML); routing in `scripts/vercel-routes.mjs` |
| Markdown 404 (status 404) for agents | `src/pages/404.md.ts` + `scripts/vercel-routes.mjs` |
| `/llms.txt` with "When to use" guidance | `src/pages/llms.txt.ts` |
| `/sitemap.xml` (hreflang alternates), `/robots.txt` | `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts` |
| Organization + ProfessionalService JSON-LD, og:image (1200×630) | `src/lib/agent.ts`, `src/layouts/Base.astro` |
| Contact and Privacy pages | `src/components/ContactPage.astro`, `PrivacyPage.astro`, text in `src/i18n/strings.ts` |

The public address in all of these follows Vercel's production domain (`scripts/site-url.mjs`), so it switches to
www.daralmadinah.com.sa by itself once that domain is attached to this project. Override with `SITE_URL`.

Tests: `npm run build && npm test`. They run real requests through the routing table Vercel receives
(`tests/vercel-router.mjs` emulates Build Output API v3 routing) and check every machine-readable file.

The privacy page text is a plain-language draft that matches how the site works today; have it reviewed before launch,
and update it if you add analytics, a newsletter or other services.
