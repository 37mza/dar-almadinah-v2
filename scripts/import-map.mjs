// Imports the old map's spreadsheet into the CMS.
//
//   node scripts/import-map.mjs path/to/projects.csv
//
// Accepts a CSV exported from Excel ("CSV UTF-8") or from Supabase (Table editor > Export > CSV).
// Column names may be either style:  Project Name | project_name, Typology | typology, Status,
// Completion Date, Plot m2, BUA m2, Metric Type, Metric Value, Latitude, Longitude
// Optional extra columns: Arabic Name | name_ar, Arabic Status | status_ar
//
// For each row:
//  - if a project with the same web address (slug) already exists, its map fields are filled in
//    (coordinates, typology, status, year, plot, BUA, extra figure). Names, renders and text are kept.
//  - otherwise a new map-only project is created. It appears on the map straight away and in the
//    portfolio once a cover render is added in the CMS.
// Nothing is deleted. Re-running is safe. A report lists rows that need attention.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import YAML from 'yaml';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/import-map.mjs path/to/projects.csv'); process.exit(1); }

// --- tiny CSV parser (quotes, commas, newlines inside quotes, BOM) ---
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const [header, ...data] = parseCSV(readFileSync(file, 'utf8'));
const norm = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const keys = header.map(norm);
const get = (r, ...names) => { for (const n of names) { const i = keys.indexOf(n); if (i >= 0 && r[i] != null && r[i].trim() !== '') return r[i].trim(); } return undefined; };
const num = (v) => { if (v == null) return undefined; const n = Number(String(v).replace(/[, ]/g, '')); return Number.isFinite(n) ? n : undefined; };
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CAT = (t = '') => { t = t.toLowerCase(); return t.includes('hosp') || t.includes('hotel') ? 'hospitality' : t.includes('resid') ? 'residential' : t.includes('commer') ? 'commercial' : t.includes('mix') ? 'mixed' : undefined; };
const AR_METRIC = { keys: 'غرفة', rooms: 'غرفة', units: 'وحدة', apartments: 'شقة', shops: 'محل', villas: 'فيلا', floors: 'طابق', beds: 'سرير' };
const AR_STATUS = { completed: 'مكتمل', complete: 'مكتمل', 'under construction': 'قيد التنفيذ', construction: 'قيد التنفيذ', design: 'تصميم', 'in design': 'تصميم', 'on hold': 'متوقف' };

const report = { updated: [], created: [], skipped: [], needsArabic: [] };
for (const [n, r] of data.entries()) {
  const line = n + 2;
  const name = get(r, 'project_name', 'name', 'project');
  if (!name) { report.skipped.push(`row ${line}: no project name`); continue; }
  const slug = slugify(name);
  if (!slug) { report.skipped.push(`row ${line}: "${name}" has no Latin letters for a web address; add an English name`); continue; }
  const lat = num(get(r, 'latitude', 'lat')), lng = num(get(r, 'longitude', 'lng', 'lon'));
  const coordsOk = lat != null && lng != null && lat > 16 && lat < 33 && lng > 34 && lng < 56;
  if ((lat != null || lng != null) && !coordsOk) report.skipped.push(`row ${line} "${name}": coordinates ${lat}, ${lng} are outside Saudi Arabia (latitude and longitude swapped?) — imported without a map pin`);

  const path = `src/content/projects/${slug}.yaml`;
  const exists = existsSync(path);
  const doc = exists ? YAML.parse(readFileSync(path, 'utf8')) ?? {} : {
    nameEn: name, nameAr: get(r, 'name_ar', 'arabic_name') ?? name, category: 'hospitality', featured: false, order: 50,
    cover: null, gallery: [], locationEn: 'Madinah', locationAr: 'المدينة المنورة',
  };
  const cat = CAT(get(r, 'typology', 'type', 'category'));
  if (cat) doc.category = cat;
  if (coordsOk) { doc.latitude = lat; doc.longitude = lng; }
  const status = get(r, 'status');
  if (status) { doc.statusEn = status; doc.statusAr = get(r, 'status_ar', 'arabic_status') ?? AR_STATUS[status.toLowerCase()] ?? doc.statusAr ?? ''; }
  const year = (get(r, 'completion_date', 'completion_data', 'year') ?? '').match(/(19|20)\d{2}/)?.[0];
  if (year) doc.year = year;
  const plot = num(get(r, 'plot_m2', 'plot_area', 'plot')); if (plot) doc.plotSqm = Math.round(plot);
  const bua = num(get(r, 'bua_m2', 'bua', 'built_up_area')); if (bua) doc.areaSqm = Math.round(bua);
  const mType = get(r, 'metric_type'); const mVal = num(get(r, 'metric_value'));
  if (mType && mVal != null) { doc.metricLabelEn = mType; doc.metricValue = Math.round(mVal); doc.metricLabelAr = doc.metricLabelAr || AR_METRIC[mType.toLowerCase()] || ''; }

  writeFileSync(path, YAML.stringify(doc));
  (exists ? report.updated : report.created).push(name);
  if (!exists && doc.nameAr === name) report.needsArabic.push(name);
}

console.log(`Updated ${report.updated.length} existing projects, created ${report.created.length} map-only projects.`);
if (report.needsArabic.length) console.log(`\nAdd the Arabic name in the CMS for:\n  - ${report.needsArabic.join('\n  - ')}`);
if (report.skipped.length) console.log(`\nNeeds attention:\n  - ${report.skipped.join('\n  - ')}`);
console.log('\nOpen /keystatic to review, then commit and push (or save from the CMS).');
