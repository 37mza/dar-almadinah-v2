// Machine-readable versions of the site, built from the same CMS data as the HTML pages:
//  - pageMarkdown(): the Markdown twin of every page (served for `Accept: text/markdown`)
//  - organizationJsonLd(): schema.org structured data for the firm
//  - PAGES / pageUrl(): the list of public pages, shared by the sitemap, llms.txt and the router
import { t, contact, type Lang } from '../i18n/strings';
import * as cms from '../data/projects';

// Placeholder (sample) entries and XX values are shown to visitors with a "Placeholder" tag, but never
// published to machines, so no search engine or AI agent repeats sample content as fact.
const projects = cms.real(cms.projects);
const mapProjects = cms.real(cms.mapProjects);
const team = cms.real(cms.team);
const partners = cms.real(cms.partners);
const figures = cms.real(cms.figures);
const credentials = cms.credentials;
const company = cms.companyFacts;

export type Page = '' | 'projects' | 'about' | 'contact' | 'privacy';
export const PAGES: Page[] = ['', 'projects', 'about', 'contact', 'privacy'];
export const LANGS: Lang[] = ['ar', 'en'];

export const siteOrigin = (site: URL | undefined) => (site?.toString() ?? 'https://www.daralmadinah.com.sa/').replace(/\/$/, '');
export const pagePath = (lang: Lang, page: Page) => `/${lang}/${page ? page + '/' : ''}`;
export const pageUrl = (origin: string, lang: Lang, page: Page) => origin + pagePath(lang, page);
export const mdPath = (lang: Lang, page: Page) => `${pagePath(lang, page)}index.md`;

const titles = (lang: Lang): Record<Page, string> => {
  const s = t(lang);
  return { '': s.firm, projects: s.projects.title, about: s.aboutPage.title, contact: s.contactPage.title, privacy: s.privacy.title };
};
export const pageTitle = (lang: Lang, page: Page) => titles(lang)[page];

const n = (v: number) => v.toLocaleString('en-US');
const esc = (v: string) => v.replace(/([\\`*_[\]<>])/g, '\\$1'); // keep CMS text from turning into Markdown syntax

function contactBlock(lang: Lang) {
  const s = t(lang);
  const c = s.contactPage;
  const lines = [
    `- ${c.email}: ${contact.email}`,
    `- ${c.phone}: ${contact.phoneDisplay}`,
    `- ${c.whatsapp}: ${contact.whatsapp}`,
    `- ${c.location}: ${company.address[lang] ?? s.footer.city}`,
  ];
  if (company.crNumber) lines.push(`- ${s.footer.cr}: ${company.crNumber}`);
  return lines.join('\n');
}

function projectLines(lang: Lang) {
  const s = t(lang);
  const list = [...new Map([...projects, ...mapProjects].map((p) => [p.slug, p])).values()];
  return list.map((p) => {
    const c = p[lang];
    const facts = [
      s.projects.filters[p.category],
      c.location,
      c.status,
      p.year && `${s.map.completion}: ${p.year}`,
      p.plotSqm && `${s.map.plot}: ${n(p.plotSqm)} ${s.projects.sqm}`,
      p.areaSqm && `${s.map.bua}: ${n(p.areaSqm)} ${s.projects.sqm}`,
      p.metric && `${p.metric.label[lang]}: ${n(p.metric.value)}`,
    ].filter(Boolean).join(' · ');
    return `- **${esc(c.name)}**: ${esc(facts)}${c.summary ? `. ${esc(c.summary)}` : ''}`;
  }).join('\n');
}

function credentialLines(lang: Lang) {
  return credentials.map((c) => {
    const bits = [c.value[lang], c.issuer[lang], c.reference && `${t(lang).credentials.ref} ${c.reference}`, c.validUntil && `${t(lang).credentials.validUntil} ${c.validUntil}`].filter(Boolean);
    return `- **${esc(c.title[lang])}**${bits.length ? `: ${esc(bits.join(' · '))}` : ''}`;
  }).join('\n');
}

export function pageMarkdown(origin: string, lang: Lang, page: Page): string {
  const s = t(lang);
  const other: Lang = lang === 'ar' ? 'en' : 'ar';
  const out: string[] = [];
  out.push(`# ${pageTitle(lang, page)}`, '');

  const summary: Record<Page, string> = {
    '': `${s.hero.title}. ${s.hero.lede}`,
    projects: s.projects.lede,
    about: s.about.body,
    contact: s.contactPage.lede,
    privacy: s.privacy.intro,
  };
  out.push(`> ${summary[page]}`, '');
  out.push(`${lang === 'ar' ? 'هذه الصفحة بالإنجليزية' : 'This page in Arabic'}: ${pageUrl(origin, other, page)}`, '');

  if (page === '') {
    if (figures.length) out.push(`## ${s.numbers.title}`, '', ...figures.map((f) => `- ${f.value} ${f.label[lang]}`), '');
    out.push(`## ${s.services.title}`, '', ...s.services.items.map((i) => `- **${i.t}**: ${i.d}`), '');
    if (projects.length) out.push(`## ${s.featured.title}`, '', projectLines(lang), '', `${s.featured.all}: ${pageUrl(origin, lang, 'projects')}`, '');
    if (credentials.length) out.push(`## ${s.credentials.title}`, '', credentialLines(lang), '');
    out.push(`## ${s.contactPage.details}`, '', contactBlock(lang), '');
    out.push(`## ${lang === 'ar' ? 'صفحات الموقع' : 'Pages'}`, '', ...PAGES.filter(Boolean).map((p) => `- [${pageTitle(lang, p)}](${pageUrl(origin, lang, p)})`), '');
  }
  if (page === 'projects') out.push(projectLines(lang) || s.projects.empty, '');
  if (page === 'about') {
    if (figures.length) out.push(`## ${s.numbers.title}`, '', ...figures.map((f) => `- ${f.value} ${f.label[lang]}`), '');
    out.push(`## ${s.aboutPage.servicesTitle}`, '', ...s.services.items.map((i) => `- **${i.t}**: ${i.d}`), '');
    if (team.length) out.push(`## ${s.team.title}`, '', ...team.map((m) => `- **${esc(m.name[lang])}**, ${esc(m.role[lang])}${m.specialty[lang] ? ` (${esc(m.specialty[lang]!)})` : ''}${m.credentials.length ? `. ${m.credentials.map((c) => (s.memberCreds as Record<string, string>)[c] ?? c).join(', ')}` : ''}`), '');
    if (credentials.length) out.push(`## ${s.credentials.title}`, '', credentialLines(lang), '');
    if (partners.length) out.push(`## ${s.partners.title}`, '', ...partners.map((p) => `- ${esc(p.name[lang])}${p.url ? `: ${p.url}` : ''}`), '');
  }
  if (page === 'contact') {
    out.push(`## ${s.contactPage.details}`, '', contactBlock(lang), `- ${s.contactPage.languages}: ${s.contactPage.languagesValue}`, '');
    out.push(`## ${s.contactPage.includeTitle}`, '', ...s.contactPage.includeItems.map((i) => `- ${i}`), '');
    out.push(`${s.contactPage.formTitle}: ${pageUrl(origin, lang, 'contact')}`, '');
  }
  if (page === 'privacy') {
    out.push(s.privacy.updated, '');
    for (const sec of s.privacy.sections) out.push(`## ${sec.h}`, '', sec.p, '');
  }

  out.push('---', '', `${s.firm} · ${contact.email} · ${contact.phoneDisplay} · ${company.address[lang] ?? s.footer.city}`, '');
  return out.join('\n');
}

export function notFoundMarkdown(origin: string) {
  return [
    '# Page not found (404)',
    '',
    'There is no page at this address on the Dar Al Madinah Engineering Consultants website. It may have moved or never existed.',
    '',
    'لا توجد صفحة بهذا العنوان في موقع دار المدينة للاستشارات الهندسية.',
    '',
    '## Where to go',
    '',
    `- Site guide for agents: ${origin}/llms.txt`,
    `- Sitemap: ${origin}/sitemap.xml`,
    `- Home (Arabic): ${pageUrl(origin, 'ar', '')}`,
    `- Home (English): ${pageUrl(origin, 'en', '')}`,
    `- Contact: ${pageUrl(origin, 'en', 'contact')}`,
    '',
  ].join('\n');
}

/** schema.org data for the firm: Organization + ProfessionalService (a LocalBusiness), with contact and address. */
export function organizationJsonLd(origin: string, lang: Lang, page: Page, ogImage?: string) {
  const s = t(lang);
  const org: Record<string, unknown> = {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${origin}/#organization`,
    name: t('en').firm,
    alternateName: t('ar').firm,
    url: pageUrl(origin, lang, ''),
    logo: `${origin}/favicon.svg`,
    ...(ogImage ? { image: ogImage } : {}),
    description: s.meta.homeDesc,
    email: contact.email,
    telephone: contact.phoneTel,
    address: {
      '@type': 'PostalAddress',
      ...(company.address.en ? { streetAddress: company.address.en } : {}),
      addressLocality: 'Madinah',
      addressRegion: 'Madinah Province',
      addressCountry: 'SA',
    },
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: contact.email,
      telephone: contact.phoneTel,
      availableLanguage: ['ar', 'en'],
      areaServed: 'SA',
      url: pageUrl(origin, lang, 'contact'),
    }],
    areaServed: { '@type': 'City', name: 'Madinah' },
    knowsAbout: ['Architectural design', 'Engineering design', 'Hotel design', 'Building permits'],
    ...(company.crNumber ? { identifier: { '@type': 'PropertyValue', propertyID: 'Commercial Registration', value: company.crNumber } } : {}),
    ...(company.vatNumber ? { vatID: company.vatNumber } : {}),
    ...(credentials.length ? {
      hasCredential: credentials.map((c) => ({
        '@type': 'EducationalOccupationalCredential',
        name: c.value.en ? `${c.title.en}: ${c.value.en}` : c.title.en,
        ...(c.issuer.en ? { recognizedBy: { '@type': 'Organization', name: c.issuer.en } } : {}),
        ...(c.validUntil ? { validUntil: c.validUntil } : {}),
      })),
    } : {}),
  };
  const webpage = {
    '@type': 'WebPage',
    '@id': `${pageUrl(origin, lang, page)}#webpage`,
    url: pageUrl(origin, lang, page),
    name: pageTitle(lang, page),
    inLanguage: lang,
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#organization` },
  };
  const website = { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: t('en').firm, alternateName: t('ar').firm, inLanguage: ['ar', 'en'], publisher: { '@id': `${origin}/#organization` } };
  return { '@context': 'https://schema.org', '@graph': [org, website, webpage] };
}
