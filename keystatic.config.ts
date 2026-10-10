// Keystatic CMS: the admin lives at /keystatic.
// Locally (npm run dev) it edits files on disk. On the live site it signs in with GitHub and every
// "Save" becomes a commit to 37mza/dar-almadinah-v2, which Vercel then rebuilds automatically.
import { config, collection, singleton, fields } from '@keystatic/core';

const img = (label: string, directory: string, required = false) =>
  fields.image({
    label,
    description: 'JPG, PNG or WebP only, up to 15 MB. Upload the original; the site resizes and compresses it automatically.',
    directory,
    publicPath: `/${directory}/`,
    validation: { isRequired: required },
  });

const txt = (label: string, max: number, opts: { required?: boolean; multiline?: boolean; description?: string; defaultValue?: string } = {}) =>
  fields.text({
    label,
    multiline: opts.multiline,
    description: opts.description,
    defaultValue: opts.defaultValue,
    validation: { length: { min: opts.required ? 1 : 0, max } },
  });

// Sample content that stands in until the real thing arrives. It is tagged "Placeholder" on the page and
// left out of everything machines read (Markdown pages, llms.txt, structured data). Delete the entry, or
// untick this once it holds real information.
const placeholder = fields.checkbox({
  label: 'Placeholder (sample content)',
  description: 'Tagged "Placeholder" on the website and hidden from search engines and AI agents. Untick once the details are real.',
  defaultValue: false,
});

const order = fields.integer({
  label: 'Order',
  description: 'Lower numbers appear first (1, 2, 3…). Items with the same number are sorted by name.',
  defaultValue: 10,
  validation: { isRequired: true, min: 0, max: 999 },
});

export default config({
  storage: import.meta.env.PROD
    ? { kind: 'github', repo: { owner: '37mza', name: 'dar-almadinah-v2' } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Dar Al Madinah' },
    navigation: {
      Portfolio: ['projects'],
      Office: ['team', 'credentials', 'partners'],
      'Site settings': ['numbers', 'company'],
    },
  },

  collections: {
    // ---------------------------------------------------------------------------------------------
    // One list for both the portfolio and the map.
    // - Has a cover render  -> shown as a card in the portfolio
    // - Has coordinates     -> shown as a pin on the map
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
        nameAr: txt('الاسم (عربي)', 80, { required: true }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Hospitality / ضيافة', value: 'hospitality' },
            { label: 'Residential / سكني', value: 'residential' },
            { label: 'Commercial / تجاري', value: 'commercial' },
            { label: 'Mixed-use / متعدد الاستخدامات', value: 'mixed' },
          ],
          defaultValue: 'hospitality',
        }),
        placeholder,
        featured: fields.checkbox({
          label: 'Show on the Home page',
          description: 'The Home page shows the first four featured projects that have a cover render, by Order.',
          defaultValue: false,
        }),
        order,
        cover: img('Cover render', 'src/assets/projects'),
        gallery: fields.array(img('Image', 'src/assets/projects'), {
          label: 'More images',
          description: 'Optional. Shown in the full-screen project view.',
          validation: { length: { max: 12 } },
          itemLabel: (p) => (p.value ? 'Image' : 'Empty'),
        }),
        locationEn: txt('Location (English)', 80, { defaultValue: 'Madinah' }),
        locationAr: txt('الموقع (عربي)', 80, { defaultValue: 'المدينة المنورة' }),
        latitude: fields.number({
          label: 'Map: latitude',
          description: 'Decimal degrees, e.g. 24.467218. In Google Maps: right-click the site, click the numbers to copy them; the first is latitude. Leave empty to keep it off the map.',
          validation: { min: 16, max: 33 },
        }),
        longitude: fields.number({
          label: 'Map: longitude',
          description: 'Decimal degrees, e.g. 39.611082 (the second number from Google Maps).',
          validation: { min: 34, max: 56 },
        }),
        year: fields.text({
          label: 'Completion year',
          description: 'e.g. 2024. Leave empty to hide.',
          validation: { pattern: { regex: /^(19|20)\d{2}$|^$/, message: 'Enter a 4-digit year such as 2024, or leave empty.' } },
        }),
        statusEn: txt('Status (English)', 40, { description: 'e.g. Completed, Under construction, Design. Leave empty to hide.' }),
        statusAr: txt('الحالة (عربي)', 40, { description: 'مثال: مكتمل، قيد التنفيذ، تصميم' }),
        plotSqm: fields.integer({ label: 'Plot area (m²)', description: 'Numbers only. Leave empty to hide.', validation: { min: 1, max: 100000000 } }),
        areaSqm: fields.integer({ label: 'Built-up area, BUA (m²)', description: 'Numbers only. Leave empty to hide.', validation: { min: 1, max: 100000000 } }),
        metricLabelEn: txt('Extra figure: label (English)', 30, { description: 'Optional, e.g. Keys, Units, Shops.' }),
        metricLabelAr: txt('رقم إضافي: الوصف (عربي)', 30, { description: 'مثال: غرفة، وحدة، محل' }),
        metricValue: fields.integer({ label: 'Extra figure: value', description: 'e.g. 240', validation: { min: 0, max: 1000000 } }),
        summaryEn: txt('Description (English)', 600, { multiline: true, description: 'One or two sentences.' }),
        summaryAr: txt('الوصف (عربي)', 600, { multiline: true, description: 'جملة أو جملتان.' }),
      },
    }),

    // ---------------------------------------------------------------------------------------------
    team: collection({
      label: 'Team',
      slugField: 'nameEn',
      path: 'src/content/team/*',
      format: { data: 'yaml' },
      columns: ['nameEn', 'roleEn', 'order'],
      entryLayout: 'form',
      schema: {
        nameEn: fields.slug({ name: { label: 'Name (English)', validation: { length: { min: 2, max: 60 } } } }),
        nameAr: txt('الاسم (عربي)', 60, { required: true }),
        roleEn: txt('Designation (English)', 60, { required: true, description: 'e.g. Senior Architect, Head of Design' }),
        roleAr: txt('المسمى الوظيفي (عربي)', 60, { required: true }),
        specialtyEn: txt('Specialty (English)', 80, { description: 'e.g. Hotel planning, Structural design' }),
        specialtyAr: txt('التخصص (عربي)', 80),
        credentials: fields.multiselect({
          label: 'Professional credentials',
          description: 'Only tick what the person actually holds.',
          options: [
            { label: 'SCE accredited engineer / مهندس معتمد', value: 'sce' },
            { label: 'LEED Green Associate', value: 'leed-ga' },
            { label: 'LEED AP', value: 'leed-ap' },
            { label: 'Mostadam AP / مستدام', value: 'mostadam' },
            { label: 'WELL AP', value: 'well-ap' },
            { label: 'PMP', value: 'pmp' },
          ],
        }),
        portrait: img('Portrait', 'src/assets/team'),
        placeholder,
        order,
      },
    }),

    // ---------------------------------------------------------------------------------------------
    credentials: collection({
      label: 'Licences & certificates',
      slugField: 'titleEn',
      path: 'src/content/credentials/*',
      format: { data: 'yaml' },
      columns: ['titleEn', 'visible', 'order'],
      entryLayout: 'form',
      schema: {
        visible: fields.checkbox({
          label: 'Show on the website',
          description: 'Tick only once the certificate or licence is actually issued and valid.',
          defaultValue: false,
        }),
        titleEn: fields.slug({ name: { label: 'Title (English)', validation: { length: { min: 2, max: 80 } } } }),
        titleAr: txt('العنوان (عربي)', 80, { required: true }),
        valueEn: txt('Grade or scope (English)', 40, { description: 'Short highlight, e.g. Grade A, Quality management. Optional.' }),
        valueAr: txt('الدرجة أو النطاق (عربي)', 40, { description: 'مثال: الفئة أ' }),
        issuerEn: txt('Issued by (English)', 80),
        issuerAr: txt('الجهة المصدرة (عربي)', 80),
        reference: txt('Reference / certificate number', 40, { description: 'Optional. Shown as written.' }),
        validUntil: fields.date({ label: 'Valid until', description: 'Optional. Shown as month and year.' }),
        document: fields.file({
          label: 'Certificate file (optional)',
          description: 'PDF or image. If added, visitors can open it. Leave empty to show the entry without a file.',
          directory: 'public/documents',
          publicPath: '/documents/',
        }),
        group: fields.select({
          label: 'Group',
          options: [
            { label: 'Licences & classification', value: 'licence' },
            { label: 'ISO certification', value: 'iso' },
            { label: 'Sustainability', value: 'sustainability' },
            { label: 'Compliance', value: 'compliance' },
          ],
          defaultValue: 'licence',
        }),
        order,
      },
    }),

    // ---------------------------------------------------------------------------------------------
    partners: collection({
      label: 'Partners & clients',
      slugField: 'nameEn',
      path: 'src/content/partners/*',
      format: { data: 'yaml' },
      columns: ['nameEn', 'order'],
      entryLayout: 'form',
      schema: {
        nameEn: fields.slug({ name: { label: 'Name (English)', validation: { length: { min: 2, max: 80 } } } }),
        nameAr: txt('الاسم (عربي)', 80, { required: true }),
        logo: img('Logo', 'src/assets/partners'),
        url: fields.url({ label: 'Website (optional)' }),
        placeholder,
        order,
      },
    }),
  },

  singletons: {
    numbers: singleton({
      label: 'Office in numbers',
      path: 'src/content/settings/numbers',
      format: { data: 'yaml' },
      schema: {
        items: fields.array(
          fields.object({
            value: txt('Figure', 12, { description: 'As it should appear, e.g. 30+, 120, 1.2M. Leave empty to hide this line. XX shows a placeholder.' }),
            labelEn: txt('Label (English)', 50, { required: true }),
            labelAr: txt('الوصف (عربي)', 50, { required: true }),
          }),
          {
            label: 'Figures',
            description: 'Shown in this order. Four works best. Only figures with a value are shown.',
            validation: { length: { max: 6 } },
            itemLabel: (p) => `${p.fields.value.value || '(empty)'}  ${p.fields.labelEn.value}`,
          },
        ),
      },
    }),
    company: singleton({
      label: 'Company details',
      path: 'src/content/settings/company',
      format: { data: 'yaml' },
      schema: {
        crNumber: txt('Commercial registration (CR) number', 20, { description: 'Shown at the very bottom of every page. Leave empty to hide. Only X characters (XXXXXXXXXX) counts as a placeholder.' }),
        vatNumber: txt('VAT number (optional)', 20),
        sceNumber: txt('Saudi Council of Engineers office number (optional)', 20),
        addressEn: txt('Address (English, optional)', 140),
        addressAr: txt('العنوان (عربي، اختياري)', 140),
      },
    }),
  },
});
