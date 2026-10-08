// Projects come from the CMS (Keystatic): one YAML file per project in src/content/projects/,
// with its renders in src/assets/projects/<slug>/. Edit them at /keystatic, not here.
// At build time this file reads every project, sorts them, and turns each uploaded render into
// compressed WebP files at two sizes (960px for cards, 2000px for full-screen views).
import { createReader } from '@keystatic/core/reader';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import keystaticConfig from '../../keystatic.config';

export type Category = 'hospitality' | 'residential' | 'commercial' | 'mixed';

export interface Project {
  slug: string;
  category: Category;
  featured: boolean;
  placeholder?: boolean;
  year?: string;
  areaSqm?: number;
  images: string[]; // optimized URLs; first is the cover (2000px)
  thumb?: string; // optimized cover (960px) for cards
  ar: { name: string; location?: string; status?: string; summary?: string };
  en: { name: string; location?: string; status?: string; summary?: string };
}

// Every image uploaded through the CMS, keyed by the path the CMS stores ("/src/assets/projects/…")
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

async function optimize(path: string | null | undefined, width: number) {
  if (!path) return undefined;
  const meta = files[path]?.default;
  if (!meta) {
    console.warn(`[projects] image not found: ${path}`);
    return undefined;
  }
  const img = await getImage({ src: meta, width: Math.min(width, meta.width), format: 'webp', quality: 80 });
  return img.src;
}

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

async function load(): Promise<Project[]> {
  const reader = createReader(process.cwd(), keystaticConfig);
  const entries = await reader.collections.projects.all();

  const list = await Promise.all(
    entries.map(async ({ slug, entry: e }) => {
      const cover = await optimize(e.cover, 2000);
      const thumb = await optimize(e.cover, 960);
      const gallery = (await Promise.all(e.gallery.map((g) => optimize(g, 2000)))).filter(Boolean) as string[];
      return {
        order: e.order ?? 10,
        project: {
          slug,
          category: e.category as Category,
          featured: e.featured,
          year: blank(e.year),
          areaSqm: e.areaSqm ?? undefined,
          images: cover ? [cover, ...gallery] : gallery,
          thumb,
          en: { name: e.nameEn, location: blank(e.locationEn), status: blank(e.statusEn), summary: blank(e.summaryEn) },
          ar: { name: e.nameAr, location: blank(e.locationAr), status: blank(e.statusAr), summary: blank(e.summaryAr) },
        } satisfies Project,
      };
    }),
  );

  return list
    .filter((x) => x.project.images.length > 0)
    .sort((a, b) => a.order - b.order || a.project.en.name.localeCompare(b.project.en.name))
    .map((x) => x.project);
}

export const projects = await load();
