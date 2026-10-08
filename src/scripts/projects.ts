// Project expand: the clicked card's image grows into a full-screen project view (shared-element style).
// The stage is clipped to the card's rectangle and opened to the full viewport with clip-path,
// while the cover image is counter-transformed so its crop matches the card exactly at the start.
import { lockScroll, unlockScroll } from './scroll-lock';
import { openLayer, requestClose, onClose } from './layers';
import { spring, project, rubberband, VelocityTracker } from './physics';

interface ProjectData {
  images: string[]; name: string; summary?: string; category: string;
  location?: string; status?: string; year?: string; area?: string; plot?: string; metric?: string; metricLabel?: string; placeholder: boolean;
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
    dialog!.querySelector('[data-metric-label]')!.textContent = p.metricLabel ?? '';
    (['location', 'year', 'area', 'plot', 'metric', 'status'] as const).forEach((k) => {
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

  async function open(slug: string, card: HTMLElement | null, { fromSharedLink = false } = {}) {
    if (!data[slug] || dialog!.open) return;
    current = { slug, card };
    fill(slug);
    if (!cover.complete) await new Promise((res) => { cover.onload = cover.onerror = res; });
    dialog!.classList.remove('is-ready', 'is-leaving');
    dialog!.showModal();
    lockScroll();
    stage.scrollTop = 0;
    // Own history entry, so Back closes the view. A shared #link already sits on its own entry.
    if (!fromSharedLink) openLayer('project', `#${slug}`);

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

  async function close({ instant = false, gone = false } = {}) {
    if (!dialog!.open || closing || !current) return;
    closing = true;
    const { card } = current;
    const running = anims.some((a) => a.playState === 'running');

    dialog!.classList.add('is-leaving');
    dialog!.classList.remove('is-ready');

    if (gone) {
      // Already swiped off screen: nothing left to animate
      cancelAnims();
    } else if (running && !instant) {
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
    stage.style.transform = ''; stage.style.opacity = ''; stage.style.borderRadius = '';
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

  // Every way of closing goes through history (Back, button, Escape, swipe), so they all behave alike
  let closeMode: { instant?: boolean; gone?: boolean } = {};
  onClose('project', () => { const m = closeMode; closeMode = {}; close(m); });
  closeBtn.addEventListener('click', () => requestClose('project'));
  // Escape is a keyboard action: close quickly with a short fade, no geometry animation
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeMode = { instant: true }; requestClose('project'); });

  // ---------- Swipe down to dismiss (touch), when the view is scrolled to the top ----------
  // 1:1 tracking with a 10 px decision threshold; release decides from projected momentum,
  // then a spring continues at the finger's velocity. The view shrinks slightly as it is
  // pulled, hinting that it will return to the page.
  const SLOP = 10;
  const tracker = new VelocityTracker();
  let startX = 0, startY = 0, decided = false, dragging = false, offset = 0, y = 0;
  let settle: { stop: () => void } | null = null;
  const H = () => window.innerHeight;
  const paint = (v: number) => {
    const p = Math.max(0, Math.min(v / H(), 1));
    stage.style.transform = `translateY(${v}px) scale(${1 - p * 0.08})`;
    stage.style.borderRadius = `${Math.min(p * 120, 16)}px`;
  };

  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || closing || anims.some((a) => a.playState === 'running')) { decided = true; dragging = false; return; }
    settle?.stop(); settle = null;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    decided = false; dragging = false;
    tracker.reset(e.timeStamp, 0);
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if (!decided) {
      if (Math.hypot(dx, dy) < SLOP) return;
      decided = true;
      dragging = stage.scrollTop <= 0 && dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2;
      offset = Math.sign(dy) * SLOP; // no jump when tracking starts
      if (dragging) { stage.style.overflowY = 'hidden'; cancelAnims(); }
    }
    if (!dragging) return;
    e.preventDefault();
    const raw = dy - offset;
    y = raw >= 0 ? raw : rubberband(raw, H()); // pulling back up past the start resists
    tracker.add(e.timeStamp, raw);
    paint(y);
  }, { passive: false });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.style.overflowY = '';
    const v = tracker.velocity();
    const landing = y + project(v);
    if (landing > H() * 0.3) {
      // Commit: continue downward at the finger's speed, then close without a second animation
      if (reduce()) { closeMode = { instant: true }; requestClose('project'); return; }
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' });
      settle = spring(y, H(), Math.max(v, 600), { damping: 1, response: 0.3 }, paint);
      settle.done.then(() => { closeMode = { gone: true }; requestClose('project'); });
    } else {
      // Cancel: back to rest; a little give only because the finger carried momentum
      settle = spring(y, 0, v, { damping: Math.abs(v) > 300 ? 0.85 : 1, response: 0.35 }, paint);
      settle.done.then(() => { stage.style.transform = ''; stage.style.borderRadius = ''; });
    }
  };
  stage.addEventListener('touchend', endDrag);
  stage.addEventListener('touchcancel', endDrag);

  inquireBtn.addEventListener('click', async () => {
    const slug = current?.slug;
    await close({ instant: true }); // the inquiry panel takes over this history entry (no extra Back step)
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
    requestAnimationFrame(() => open(fromHash, card, { fromSharedLink: true }));
  }
}
