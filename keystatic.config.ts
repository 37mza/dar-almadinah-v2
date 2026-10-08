// Keystatic CMS: the admin lives at /keystatic.
// Locally (npm run dev) it edits files on disk. On the live site it signs in with GitHub and every
// "Save" becomes a commit to 37mza/dar-almadinah-v2, which Vercel then rebuilds automatically.
import { config, collection, fields } from '@keystatic/core';

const img = (label: string, required = false) =>
  fields.image({
    label,
    description: 'JPG, PNG or WebP only, up to 15 MB. Upload the full-size render; the site resizes and compresses it automatically.',
    directory: 'src/assets/projects',
    publicPath: '/src/assets/projects/',
    validation: { isRequired: required },
  });

export default config({
  storage: import.meta.env.PROD
    ? { kind: 'github', repo: { owner: '37mza', name: 'dar-almadinah-v2' } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Dar Al Madinah' },
    navigation: { Portfolio: ['projects'] },
  },
  collections: {
    projects: collection({
      label: 'Projects',
      slugField: 'nameEn',
      path: 'src/content/projects/*',
      format: { data: 'yaml' },
      columns: ['nameEn', 'category', 'featured', 'order'],
      entryLayout: 'form',
      schema: {
        nameEn: fields.slug({
          name: { label: 'Name (English)', validation: { length: { min: 2, max: 80 } } },
          slug: { label: 'Web address', description: 'Used in the project link, e.g. /projects/#tala-hotel. Leave as generated.' },
        }),
        nameAr: fields.text({ label: 'الاسم (عربي)', validation: { length: { min: 2, max: 80 } } }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Hospitality — ضيافة', value: 'hospitality' },
            { label: 'Residential — سكني', value: 'residential' },
            { label: 'Commercial — تجاري', value: 'commercial' },
            { label: 'Mixed-use — متعدد الاستخدامات', value: 'mixed' },
          ],
          defaultValue: 'hospitality',
        }),
        featured: fields.checkbox({
          label: 'Show on the Home page',
          description: 'The Home page shows the first four featured projects, by Order.',
          defaultValue: false,
        }),
        order: fields.integer({
          label: 'Order',
          description: 'Lower numbers appear first (1, 2, 3…). Projects with the same number are sorted by name.',
          defaultValue: 10,
          validation: { isRequired: true, min: 0, max: 999 },
        }),
        cover: img('Cover render', true),
        gallery: fields.array(img('Image'), {
          validation: { length: { max: 12 } },
          label: 'More images',
          description: 'Optional. Shown in the full-screen project view.',
          itemLabel: (p) => (p.value ? 'Image' : 'Empty'),
        }),
        locationEn: fields.text({ label: 'Location (English)', defaultValue: 'Madinah', validation: { length: { max: 80 } } }),
        locationAr: fields.text({ label: 'الموقع (عربي)', defaultValue: 'المدينة المنورة', validation: { length: { max: 80 } } }),
        year: fields.text({
          label: 'Year',
          description: 'e.g. 2024. Leave empty to hide.',
          validation: { pattern: { regex: /^(19|20)\d{2}$|^$/, message: 'Enter a 4-digit year such as 2024, or leave empty.' } },
        }),
        areaSqm: fields.integer({ label: 'Built-up area (m²)', description: 'Numbers only. Leave empty to hide.', validation: { min: 1, max: 10000000 } }),
        statusEn: fields.text({ label: 'Status (English)', description: 'e.g. Completed, Under construction, Design. Leave empty to hide.', validation: { length: { max: 40 } } }),
        statusAr: fields.text({ label: 'الحالة (عربي)', description: 'مثال: مكتمل، قيد التنفيذ، تصميم', validation: { length: { max: 40 } } }),
        summaryEn: fields.text({ label: 'Description (English)', multiline: true, description: 'One or two sentences.', validation: { length: { max: 600 } } }),
        summaryAr: fields.text({ label: 'الوصف (عربي)', multiline: true, description: 'جملة أو جملتان.', validation: { length: { max: 600 } } }),
      },
    }),
  },
});
