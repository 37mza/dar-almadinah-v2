// Project list. To add a project:
// 1. Put its renders in /public/projects/<slug>/ as WebP: cover.webp (≤2000px wide) and cover-960.webp for cards.
//    Extra gallery images: add more paths to `images` (first image is always the cover).
// 2. Fill in both languages. Any field left out (year, area, status, summary) is simply hidden on the page.
// 3. featured: true puts it on the Home page (first four featured are shown).
export type Category = 'hospitality' | 'residential' | 'commercial' | 'mixed';

export interface Project {
  slug: string;
  category: Category;
  featured?: boolean;
  placeholder?: boolean;
  year?: string;
  areaSqm?: number;
  images: string[]; // first image is the cover
  thumb?: string; // smaller cover for cards
  ar: { name: string; location?: string; status?: string; summary?: string };
  en: { name: string; location?: string; status?: string; summary?: string };
}

export const projects: Project[] = [
  {
    slug: 'al-suleimanyah-towers',
    category: 'mixed',
    featured: true,
    images: ['/projects/al-suleimanyah-towers/cover.webp'],
    thumb: '/projects/al-suleimanyah-towers/cover-960.webp',
    ar: { name: 'أبراج السليمانية', location: 'المدينة المنورة' },
    en: { name: 'Al-Suleimanyah Towers', location: 'Madinah' },
  },
  {
    slug: 'ali-rashwan-hotel',
    category: 'hospitality',
    featured: true,
    images: ['/projects/ali-rashwan-hotel/cover.webp'],
    thumb: '/projects/ali-rashwan-hotel/cover-960.webp',
    ar: { name: 'فندق علي رشوان', location: 'المدينة المنورة' },
    en: { name: 'Ali Rashwan Hotel', location: 'Madinah' },
  },
  {
    slug: 'tala-hotel',
    category: 'hospitality',
    featured: true,
    images: ['/projects/tala-hotel/cover.webp'],
    thumb: '/projects/tala-hotel/cover-960.webp',
    ar: { name: 'فندق تالة', location: 'المدينة المنورة' },
    en: { name: 'Tala Hotel', location: 'Madinah' },
  },
  {
    slug: 'suleiman-alkhreiji-hotel',
    category: 'hospitality',
    featured: true,
    images: ['/projects/suleiman-alkhreiji-hotel/cover.webp'],
    thumb: '/projects/suleiman-alkhreiji-hotel/cover-960.webp',
    ar: { name: 'فندق سليمان الخريجي', location: 'المدينة المنورة' },
    en: { name: 'Suleiman Alkhreiji Hotel', location: 'Madinah' },
  },
];
