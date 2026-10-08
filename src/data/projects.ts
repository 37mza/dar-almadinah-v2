// Everything editable in the CMS (Keystatic) is read here at build time.
//   Projects     src/content/projects/*.yaml     renders in src/assets/projects/<slug>/
//   Team         src/content/team/*.yaml         portraits in src/assets/team/<slug>/
//   Partners     src/content/partners/*.yaml     logos in src/assets/partners/<slug>/
//   Credentials  src/content/credentials/*.yaml  files in public/documents/<slug>/
//   Settings     src/content/settings/{numbers,company}.yaml
// Images are checked (type and size) and turned into compressed WebP files.
import { createReader } from '@keystatic/core/reader';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import keystaticConfig from '../../keystatic.config';

export type Category = 'hospitality' | 'residential' | 'commercial' | 'mixed';
type Bi<T> = { ar: T; en: T };

export interface Project {
  slug: string;
  category: Category;
  featured: boolean;
  placeholder?: boolean;
  year?: string;
  areaSqm?: number;
  plotSqm?: number;
  metric?: { value: number; label: Bi<string> };
  coords?: { lat: number; lng: number };
  images: string[]; // optimized; first is the cover (2000px). Empty = map-only project
  coverSrc?: string; // CMS path of the original cover, for derived images (link previews)
  thumb?: string; // optimized cover (960px) for cards
  ar: { name: string; location?: string; status?: string; summary?: string };
  en: { name: string; location?: string; status?: string; summary?: string };
}
export interface Member {
  slug: string; name: Bi<string>; role: Bi<string>; specialty: Bi<string | undefined>;
  credentials: string[]; portrait?: string;
}
export interface Partner { slug: string; name: Bi<string>; logo?: string; logoIsVector: boolean; url?: string }
export interface Credential {
  slug: string; title: Bi<string>; value: Bi<string | undefined>; issuer: Bi<string | undefined>;
  reference?: string; validUntil?: string; document?: string; group: 'licence' | 'iso' | 'sustainability' | 'compliance';
}
export interface Figure { value: string; label: Bi<string> }
export interface Company { crNumber?: string; vatNumber?: string; sceNumber?: string; address: Bi<string | undefined> }

// ---------- image handling ----------
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp,svg,JPG,JPEG,PNG,WEBP,SVG}',
  { eager: true },
);
const MAX_MB = 15;
function checkUpload(path: string, owner: string, allowSvg = false) {
  const ok = allowSvg ? /\.(jpe?g|png|webp|svg)$/i : /\.(jpe?g|png|webp)$/i;
  if (!ok.test(path)) throw new Error(`[cms] "${owner}": ${path} is not an allowed image (${allowSvg ? 'JPG, PNG, WebP or SVG' : 'JPG, PNG or WebP'}). Replace it in the CMS.`);
  const mb = statSync(join(process.cwd(), path)).size / 1024 / 1024;
  if (mb > MAX_MB) throw new Error(`[cms] "${owner}": ${path} is ${mb.toFixed(1)} MB; the limit is ${MAX_MB} MB. Export a smaller file and re-upload it in the CMS.`);
}
async function optimize(path: string | null | undefined, width: number) {
  if (!path) return undefined;
  const meta = files[path]?.default;
  if (!meta) { console.warn(`[cms] image not found: ${path}`); return undefined; }
  if (meta.format === 'svg') return meta.src; // vector logos are used as-is
  const img = await getImage({ src: meta, width: Math.min(width, meta.width), format: 'webp', quality: 80 });
  return img.src;
}
function checkDocument(path: string | null | undefined, owner: string) {
  if (!path) return undefined;
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(path)) throw new Error(`[cms] "${owner}": the certificate file must be a PDF or image.`);
  const mb = statSync(join(process.cwd(), 'public', path)).size / 1024 / 1024;
  if (mb > MAX_MB) throw new Error(`[cms] "${owner}": the certificate file is ${mb.toFixed(1)} MB; the limit is ${MAX_MB} MB.`);
  return path;
}

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
const byOrder = <T extends { order: number; name: string }>(a: T, b: T) => a.order - b.order || a.name.localeCompare(b.name);
const reader = createReader(process.cwd(), keystaticConfig);

// ---------- projects ----------
async function loadProjects(): Promise<Project[]> {
  const entries = await reader.collections.projects.all();
  const list = await Promise.all(entries.map(async ({ slug, entry: e }) => {
    [e.cover, ...e.gallery].forEach((p) => p && checkUpload(p, slug));
    const cover = await optimize(e.cover, 2000);
    const thumb = await optimize(e.cover, 960);
    const gallery = (await Promise.all(e.gallery.map((g) => optimize(g, 2000)))).filter(Boolean) as string[];
    const hasMetric = e.metricValue != null && blank(e.metricLabelEn) && blank(e.metricLabelAr);
    return {
      order: e.order ?? 10, name: e.nameEn,
      project: {
        slug,
        category: e.category as Category,
        featured: e.featured,
        year: blank(e.year),
        areaSqm: e.areaSqm ?? undefined,
        plotSqm: e.plotSqm ?? undefined,
        metric: hasMetric ? { value: e.metricValue!, label: { en: e.metricLabelEn.trim(), ar: e.metricLabelAr.trim() } } : undefined,
        coords: e.latitude != null && e.longitude != null ? { lat: e.latitude, lng: e.longitude } : undefined,
        images: cover ? [cover, ...gallery] : gallery,
        coverSrc: e.cover ?? undefined,
        thumb,
        en: { name: e.nameEn, location: blank(e.locationEn), status: blank(e.statusEn), summary: blank(e.summaryEn) },
        ar: { name: e.nameAr, location: blank(e.locationAr), status: blank(e.statusAr), summary: blank(e.summaryAr) },
      } satisfies Project,
    };
  }));
  return list.sort(byOrder).map((x) => x.project);
}

async function loadTeam(): Promise<Member[]> {
  const entries = await reader.collections.team.all();
  const list = await Promise.all(entries.map(async ({ slug, entry: e }) => {
    if (e.portrait) checkUpload(e.portrait, slug);
    return {
      order: e.order ?? 10, name: e.nameEn,
      m: {
        slug,
        name: { en: e.nameEn, ar: e.nameAr },
        role: { en: e.roleEn, ar: e.roleAr },
        specialty: { en: blank(e.specialtyEn), ar: blank(e.specialtyAr) },
        credentials: [...e.credentials],
        portrait: await optimize(e.portrait, 640),
      } satisfies Member,
    };
  }));
  return list.sort(byOrder).map((x) => x.m);
}

async function loadPartners(): Promise<Partner[]> {
  const entries = await reader.collections.partners.all();
  const list = await Promise.all(entries.map(async ({ slug, entry: e }) => {
    if (e.logo) checkUpload(e.logo, slug, true);
    return {
      order: e.order ?? 10, name: e.nameEn,
      p: {
        slug, name: { en: e.nameEn, ar: e.nameAr },
        logo: await optimize(e.logo, 480), logoIsVector: !!e.logo && /\.svg$/i.test(e.logo),
        url: blank(e.url),
      } satisfies Partner,
    };
  }));
  return list.sort(byOrder).map((x) => x.p);
}

async function loadCredentials(): Promise<Credential[]> {
  const entries = await reader.collections.credentials.all();
  return entries
    .filter(({ entry: e }) => e.visible)
    .map(({ slug, entry: e }) => ({
      order: e.order ?? 10, name: e.titleEn,
      c: {
        slug,
        title: { en: e.titleEn, ar: e.titleAr },
        value: { en: blank(e.valueEn), ar: blank(e.valueAr) },
        issuer: { en: blank(e.issuerEn), ar: blank(e.issuerAr) },
        reference: blank(e.reference),
        validUntil: e.validUntil ?? undefined,
        document: checkDocument(e.document, slug),
        group: e.group,
      } satisfies Credential,
    }))
    .sort(byOrder).map((x) => x.c);
}

async function loadFigures(): Promise<Figure[]> {
  const s = await reader.singletons.numbers.read();
  return (s?.items ?? [])
    .filter((i) => blank(i.value))
    .map((i) => ({ value: i.value.trim(), label: { en: i.labelEn, ar: i.labelAr } }));
}

async function loadCompany(): Promise<Company> {
  const c = await reader.singletons.company.read();
  return {
    crNumber: blank(c?.crNumber), vatNumber: blank(c?.vatNumber), sceNumber: blank(c?.sceNumber),
    address: { en: blank(c?.addressEn), ar: blank(c?.addressAr) },
  };
}

export const allProjects = await loadProjects();
/** Projects with at least one render: the portfolio */
export const projects = allProjects.filter((p) => p.images.length > 0);
/** Projects with coordinates: the map */
export const mapProjects = allProjects.filter((p) => p.coords);
export const team = await loadTeam();
export const partners = await loadPartners();
export const credentials = await loadCredentials();
export const figures = await loadFigures();
export const company = await loadCompany();

/** 1200×630 JPEG link-preview image (og:image), cropped from the Home hero render. */
async function loadOgImage() {
  const src = (projects.find((p) => p.featured) ?? projects[0])?.coverSrc;
  const meta = src ? files[src]?.default : undefined;
  if (!meta) return undefined;
  const img = await getImage({ src: meta, width: 1200, height: 630, fit: 'cover', format: 'jpg', quality: 82 });
  return { src: img.src, width: 1200, height: 630 };
}
export const ogImage = await loadOgImage();
