// Project expand: the clicked card's image grows into a full-screen project view (shared-element style).
// The stage is clipped to the card's rectangle and opened to the full viewport with clip-path,
// while the cover image is counter-transformed so its crop matches the card exactly at the start.
import { lockScroll, unlockScroll } from './scroll-lock';

interface ProjectData {
  images: string[]; name: string; summary?: string; category: string;
  location?: string; status?: string; year?: string; area?: string; placeholder: boolean;
}

const dialog = document.querySelector<HTMLDialogElement>('[data-project-overlay]');

if (dialog) {
  const data: Record<string, ProjectData> = JSON.parse(dialog.querySelector('[data-po-data]')!.textContent || '{}');
  const stage = dialog.querySelector<HTMLElement>('[data-po-stage]')!;
  const hero = dialog.querySelector<HTMLElement>('[data-po-hero]')!;
  const cover = dialog.querySelector<HTMLImageElement>('[data-po-cover]')!;
  const gallery = dialog.querySelector<HTMLElement>('[data-po-gallery]')!;
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-po-close]')!;
  const inquireBtn = dialog.querySelector<HTMLButtonElement>('[data-po-inquire]')!;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)'; // --ease-in-out: on-screen morph
  const OPEN_MS = 720;
  const CLOSE_MS = 480; // exits faster than entrances

  let current: { slug: string; card: HTMLElement | null } | null = null;
  let anims: Animation[] = [];
  let closing = false;

  // Stagger the overlay content in after the image lands
  const inEls = [
    '[data-po-cat]', '[data-po-name]', '[data-po-summary]', '[data-po-inquire]', '[data-po-facts]', '[data-po-gallery]',
  ].map((sel, i) => {
    const el = dialog.querySelector<HTMLElement>(sel)!;
    el.setAttribute('data-po-in', '');
    el.style.setProperty('--d', String(i));
    return el;
  });
  void inEls;

  function fill(slug: string) {
    const p = data[slug];
    cover.src = p.images[0];
    dialog!.querySelector('[data-po-cat]')!.textContent = p.category;
    dialog!.querySelector('[data-po-name]')!.textContent = p.name;
    const sum = dialog!.querySelector<HTMLElement>('[data-po-summary]')!;
    sum.textContent = p.summary ?? '';
    sum.hidden = !p.summary;
    (['location', 'year', 'area', 'status'] as const).forEach((k) => {
      const row = dialog!.querySelector<HTMLElement>(`[data-fact="${k}"]`)!;
      const v = p[k];
      row.hidden = !v;
      row.querySelector('dd')!.textContent = v ?? '';
    });
    const rest = p.images.slice(1);
    gallery.hidden = rest.length === 0;
    gallery.replaceChildren(...rest.map((src) => {
      const img = new Image();
      img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      return img;
    }));
  }

  /** Geometry that makes the full-screen stage look exactly like the card. */
  function startState(card: HTMLElement) {
    const r = card.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh || r.width === 0) return null; // card not on screen
    const H = hero.getBoundingClientRect();
    const iw = cover.naturalWidth || 1600, ih = cover.naturalHeight || 1000;
    const fit = (w: number, h: number) => Math.max(w / iw, h / ih); // object-fit: cover scale
    const k = fit(r.width, r.height) / fit(H.width, H.height);
    const dx = r.left + r.width / 2 - (H.left + H.width / 2);
    const dy = r.top + r.height / 2 - (H.top + H.height / 2);
    return {
      clip: `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 2px)`,
      img: `translate(${dx}px, ${dy}px) scale(${k})`,
    };
  }

  function cancelAnims() { anims.forEach((a) => a.cancel()); anims = []; }

  async function open(slug: string, card: HTMLElement | null) {
    if (!data[slug] || dialog!.open) return;
    current = { slug, card };
    fill(slug);
    if (!cover.complete) await new Promise((res) => { cover.onload = cover.onerror = res; });
    dialog!.classList.remove('is-ready', 'is-leaving');
    dialog!.showModal();
    lockScroll();
    stage.scrollTop = 0;
    history.replaceState(null, '', `#${slug}`);

    const from = card && !reduce() ? startState(card) : null;
    if (from) {
      card!.style.visibility = 'hidden';
      anims = [
        stage.animate([{ clipPath: from.clip }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: OPEN_MS, easing: EASE }),
        cover.animate([{ transform: from.img }, { transform: 'none' }], { duration: OPEN_MS, easing: EASE }),
        closeBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: OPEN_MS * 0.6, easing: 'ease', fill: 'backwards' }),
      ];
      // Content starts entering a little before the image settles
      setTimeout(() => { if (dialog!.open && !closing) dialog!.classList.add('is-ready'); }, OPEN_MS * 0.55);
    } else {
      anims = [stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce() ? 200 : 320, easing: 'ease' })];
      dialog!.classList.add('is-ready');
    }
  }

  async function close({ instant = false } = {}) {
    if (!dialog!.open || closing || !current) return;
    closing = true;
    const { card } = current;
    const running = anims.some((a) => a.playState === 'running');

    dialog!.classList.add('is-leaving');
    dialog!.classList.remove('is-ready');

    if (running && !instant) {
      // Interrupted mid-open: reverse from exactly where it is, at the same speed
      anims.forEach((a) => a.reverse());
      await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    } else {
      cancelAnims();
      const to = !instant && card && !reduce() && stage.scrollTop < 40 ? startState(card) : null;
      if (to) {
        stage.scrollTop = 0;
        anims = [
          stage.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to.clip }], { duration: CLOSE_MS, easing: EASE, fill: 'forwards' }),
          cover.animate([{ transform: 'none' }, { transform: to.img }], { duration: CLOSE_MS, easing: EASE, fill: 'forwards' }),
          closeBtn.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }),
        ];
      } else {
        anims = [stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: instant ? 140 : 220, easing: 'ease', fill: 'forwards' })];
      }
      await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    }

    if (card) card.style.visibility = '';
    dialog!.close();
    cancelAnims();
    unlockScroll();
    history.replaceState(null, '', location.pathname + location.search);
    current = null;
    closing = false;
  }

  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-project]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(link.dataset.project!, link.querySelector<HTMLElement>('[data-media]'));
  });

  closeBtn.addEventListener('click', () => close());
  // Escape is a keyboard action: close quickly with a short fade, no geometry animation
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close({ instant: true }); });

  inquireBtn.addEventListener('click', async () => {
    const slug = current?.slug;
    await close({ instant: true });
    if (!slug) return;
    const cat = document.querySelector<HTMLElement>(`a[data-project="${slug}"]`)?.closest<HTMLElement>('[data-category]')?.dataset.category;
    const typeIndex = { hospitality: 0, residential: 1, commercial: 2, mixed: 3 }[cat ?? ''] as number | undefined;
    const isAr = document.documentElement.lang === 'ar';
    document.dispatchEvent(new CustomEvent('inquiry:open', {
      detail: { typeIndex, message: `${isAr ? 'بخصوص مشروع مماثل لـ' : 'Regarding a project similar to'}: ${data[slug].name}\n` },
    }));
  });

  // Deep link: /projects/#slug opens that project
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (fromHash && data[fromHash]) {
    const card = document.querySelector<HTMLElement>(`a[data-project="${CSS.escape(fromHash)}"] [data-media]`);
    requestAnimationFrame(() => open(fromHash, card));
  }
}
