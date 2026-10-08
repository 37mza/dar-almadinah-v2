// Project list. Replace placeholder entries with real projects:
// 1. Put renders in /public/projects/<slug>/ (cover first, landscape ~2400px wide, .webp or .jpg).
// 2. Fill in both languages. Leave a field undefined to hide it on the page.
// 3. Set placeholder: false once the project is real.
export type Category = 'hospitality' | 'residential' | 'commercial';

export interface Project {
  slug: string;
  category: Category;
  featured?: boolean;
  placeholder?: boolean;
  year?: string;
  areaSqm?: number;
  images: string[]; // first image is the cover
  ar: { name: string; location?: string; status?: string; summary: string };
  en: { name: string; location?: string; status?: string; summary: string };
}

export const projects: Project[] = [
  {
    slug: 'hotel-central-area',
    category: 'hospitality',
    featured: true,
    placeholder: true,
    year: '2025',
    areaSqm: 24000,
    images: ['/projects/ph-1.svg', '/projects/ph-2.svg', '/projects/ph-3.svg'],
    ar: { name: 'فندق المنطقة المركزية', location: 'المنطقة المركزية، المدينة المنورة', status: 'قيد التنفيذ', summary: 'نص مؤقت: فندق بإطلالة على الحرم، صُمّمت واجهته لتنظيم الضوء والحرارة دون أن تفقد حضورها في الأفق.' },
    en: { name: 'Central Area Hotel', location: 'Central Area, Medina', status: 'Under construction', summary: 'Placeholder text: a hotel facing the Haram, its facade tuned to manage light and heat while holding its place on the skyline.' },
  },
  {
    slug: 'serviced-apartments-quba',
    category: 'hospitality',
    featured: true,
    placeholder: true,
    year: '2024',
    areaSqm: 11500,
    images: ['/projects/ph-2.svg', '/projects/ph-4.svg'],
    ar: { name: 'شقق فندقية — قباء', location: 'قباء، المدينة المنورة', status: 'مكتمل', summary: 'نص مؤقت: شقق فندقية للإقامات الطويلة، بتوزيع مرن للوحدات يرفع العائد لكل متر مربع.' },
    en: { name: 'Quba Serviced Apartments', location: 'Quba, Medina', status: 'Completed', summary: 'Placeholder text: serviced apartments for long stays, with a flexible unit mix that raises the yield per square meter.' },
  },
  {
    slug: 'residential-complex-north',
    category: 'residential',
    featured: true,
    placeholder: true,
    year: '2023',
    areaSqm: 38000,
    images: ['/projects/ph-3.svg', '/projects/ph-5.svg'],
    ar: { name: 'مجمع سكني — شمال المدينة', location: 'شمال المدينة المنورة', status: 'تصميم', summary: 'نص مؤقت: مجمع سكني متوسط الارتفاع، تتوزع كتله حول أفنية مظللة تخفف أحمال التبريد.' },
    en: { name: 'North Residential Complex', location: 'North Medina', status: 'Design', summary: 'Placeholder text: a mid-rise residential complex arranged around shaded courtyards that cut cooling loads.' },
  },
  {
    slug: 'commercial-boulevard',
    category: 'commercial',
    featured: true,
    placeholder: true,
    year: '2025',
    areaSqm: 16000,
    images: ['/projects/ph-6.svg', '/projects/ph-1.svg'],
    ar: { name: 'مبنى تجاري على الطريق الدائري', location: 'الطريق الدائري الثاني، المدينة المنورة', status: 'تصميم', summary: 'نص مؤقت: مبنى تجاري ومكتبي بواجهة شبكية تعطي المستأجرين مرونة دون أن تفقد المبنى هويته.' },
    en: { name: 'Ring Road Commercial Building', location: 'Second Ring Road, Medina', status: 'Design', summary: 'Placeholder text: retail and offices behind a grid facade that gives tenants flexibility without diluting the building.' },
  },
  {
    slug: 'boutique-hotel',
    category: 'hospitality',
    placeholder: true,
    year: '2022',
    areaSqm: 7200,
    images: ['/projects/ph-4.svg', '/projects/ph-6.svg'],
    ar: { name: 'فندق بوتيك', location: 'المدينة المنورة', status: 'مكتمل', summary: 'نص مؤقت: فندق صغير بعدد غرف محدود وتفاصيل داخلية مدروسة.' },
    en: { name: 'Boutique Hotel', location: 'Medina', status: 'Completed', summary: 'Placeholder text: a small hotel with a limited key count and carefully considered interiors.' },
  },
  {
    slug: 'villas-compound',
    category: 'residential',
    placeholder: true,
    year: '2021',
    images: ['/projects/ph-5.svg', '/projects/ph-3.svg'],
    ar: { name: 'مجمع فلل', location: 'المدينة المنورة', summary: 'نص مؤقت: مجموعة فلل تتشارك لغة معمارية واحدة وتختلف في التوزيع الداخلي.' },
    en: { name: 'Villa Compound', location: 'Medina', summary: 'Placeholder text: a group of villas sharing one architectural language with varied plans.' },
  },
];
