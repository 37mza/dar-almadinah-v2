// Projects map. Mapbox GL is loaded only the first time the visitor switches to the map view.
// Uses Mapbox's CSP build with its worker served from this site (/vendor), so no blob: workers
// or third-party scripts are needed.
import type { Map as MapboxMap, Popup as MapboxPopup } from 'mapbox-gl';
import { MAPBOX_TOKEN, MAP_STYLES, MAP_CENTER } from '../config/site';

interface Point {
  slug: string; lng: number; lat: number; category: string; categoryLabel: string; name: string;
  status?: string; year?: string; plot?: string; bua?: string; metric?: string; metricLabel?: string; hasView: boolean; placeholder?: boolean;
}
type Labels = Record<'plot' | 'bua' | 'completion' | 'status' | 'view' | 'satellite' | 'streets' | 'placeholder', string>;

const wrap = document.querySelector<HTMLElement>('[data-map-wrap]');
const container = document.querySelector<HTMLElement>('[data-map]');
const raw = document.querySelector('[data-map-data]')?.textContent;

const COLORS: Record<string, string> = { hospitality: '#ac2027', residential: '#b7802f', commercial: '#2b6a8a', mixed: '#4d7a4f' };

let map: MapboxMap | null = null;
let popup: MapboxPopup | null = null;
let satellite = false;
let currentFilter = 'all';
let styleBtn: HTMLButtonElement | null = null;

const scheme = () => (document.documentElement.dataset.scheme === 'light' ? 'light' : 'dark');
const styleUrl = () => (satellite ? MAP_STYLES.satellite : MAP_STYLES[scheme()]);

if (wrap && container && raw) {
  const { points, labels, lang } = JSON.parse(raw) as { points: Point[]; labels: Labels; lang: 'ar' | 'en' };
  const geojson = {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] }, properties: { slug: p.slug, category: p.category } })),
  };
  const bySlug = new Map(points.map((p) => [p.slug, p]));

  function filterExpr(): any {
    return currentFilter === 'all' ? null : ['==', ['get', 'category'], currentFilter];
  }

  function addLayers() {
    if (!map) return;
    if (!map.getSource('projects')) map.addSource('projects', { type: 'geojson', data: geojson });
    if (!map.getLayer('projects-pins')) {
      map.addLayer({
        id: 'projects-pins', type: 'circle', source: 'projects',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9],
          'circle-color': ['match', ['get', 'category'], 'hospitality', COLORS.hospitality, 'residential', COLORS.residential, 'commercial', COLORS.commercial, 'mixed', COLORS.mixed, '#666'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
    map.setFilter('projects-pins', filterExpr());
    localizeLabels();
  }

  // Show place names in the page language where the style has them
  function localizeLabels() {
    if (!map) return;
    const field = ['coalesce', ['get', `name_${lang}`], ['get', 'name']];
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.type !== 'symbol') continue;
      const tf = map.getLayoutProperty(layer.id, 'text-field');
      if (tf && JSON.stringify(tf).includes('name')) {
        try { map.setLayoutProperty(layer.id, 'text-field', field); } catch { /* layer not localizable */ }
      }
    }
  }

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function popupNode(p: Point) {
    const root = el('div', undefined, 'pin-pop');
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (p.placeholder) root.append(el('span', labels.placeholder, 'ph-badge'));
    root.append(el('h3', p.name), el('p', p.categoryLabel, 'cat'));
    const dl = el('dl');
    const row = (k: string, v?: string) => { if (v) dl.append(el('dt', k), el('dd', v)); };
    row(labels.status, p.status);
    row(labels.completion, p.year);
    row(labels.plot, p.plot);
    row(labels.bua, p.bua);
    if (p.metric && p.metricLabel) row(p.metricLabel, p.metric);
    if (dl.childElementCount) root.append(dl);
    if (p.hasView) {
      const a = el('a', labels.view);
      a.href = `#${p.slug}`;
      a.dataset.project = p.slug; // opens the same full-screen project view as the cards
      root.append(a);
    }
    return root;
  }

  async function init() {
    const mod = await import('mapbox-gl/dist/mapbox-gl-csp.js');
    await import('mapbox-gl/dist/mapbox-gl.css');
    const mapboxgl = (mod as any).default ?? mod;
    mapboxgl.workerUrl = '/vendor/mapbox-gl-csp-worker.js';
    mapboxgl.accessToken = MAPBOX_TOKEN;
    if (mapboxgl.getRTLTextPluginStatus?.() === 'unavailable') {
      mapboxgl.setRTLTextPlugin('/vendor/mapbox-gl-rtl-text.js', null, true);
    }

    map = new mapboxgl.Map({
      container: container!,
      style: styleUrl(),
      center: MAP_CENTER,
      zoom: 11.5,
      attributionControl: true,
      cooperativeGestures: matchMedia('(pointer: coarse)').matches, // two fingers to move on phones, so the page still scrolls
    }) as MapboxMap;
    (container as any).__map = map; // handle for automated tests
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), lang === 'ar' ? 'top-left' : 'top-right');

    // Satellite / streets switch as a plain map control
    const ctrl = {
      onAdd() {
        const box = document.createElement('div');
        box.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        styleBtn = document.createElement('button');
        styleBtn.type = 'button';
        styleBtn.className = 'map-style-btn';
        styleBtn.textContent = labels.satellite;
        styleBtn.addEventListener('click', () => {
          satellite = !satellite;
          styleBtn!.textContent = satellite ? labels.streets : labels.satellite;
          map!.setStyle(styleUrl());
        });
        box.append(styleBtn);
        return box;
      },
      onRemove() {},
    };
    map.addControl(ctrl as any, lang === 'ar' ? 'top-left' : 'top-right');

    map.on('style.load', addLayers); // runs on first load and after every style change

    map.on('click', 'projects-pins', (e) => {
      const f = e.features?.[0];
      const p = f && bySlug.get(String(f.properties?.slug));
      if (!p) return;
      popup?.remove();
      popup = new mapboxgl.Popup({ offset: 12, maxWidth: '300px' }).setLngLat([p.lng, p.lat]).setDOMContent(popupNode(p)).addTo(map!) as MapboxPopup;
    });
    map.on('mouseenter', 'projects-pins', () => { map!.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'projects-pins', () => { map!.getCanvas().style.cursor = ''; });

    // Frame all pins
    if (points.length > 1) {
      const lngs = points.map((p) => p.lng), lats = points.map((p) => p.lat);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 64, maxZoom: 14, duration: 0 });
    } else if (points.length === 1) {
      map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 14 });
    }

    // Follow the site's light/dark switch
    new MutationObserver(() => { if (!satellite) map?.setStyle(styleUrl()); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
  }

  let started = false;
  document.addEventListener('projects:view', (e) => {
    const view = (e as CustomEvent<string>).detail;
    if (view !== 'map') return;
    if (!started) { started = true; init().catch((err) => console.error('[map]', err)); }
    else map?.resize();
  });
  document.addEventListener('projects:filter', (e) => {
    currentFilter = (e as CustomEvent<string>).detail;
    popup?.remove();
    if (map?.getLayer('projects-pins')) map.setFilter('projects-pins', filterExpr());
  });
}
