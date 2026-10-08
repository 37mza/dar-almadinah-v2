// Project category filter. Cards reflow with a View Transition where supported; otherwise they switch instantly.
const group = document.querySelector<HTMLElement>('[data-filters]');
const grid = document.querySelector<HTMLElement>('[data-grid]');
const empty = document.querySelector<HTMLElement>('[data-empty]');

if (group && grid) {
  const items = [...grid.querySelectorAll<HTMLElement>('[data-item]')];
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-filter]')];

  const apply = (cat: string) => {
    let shown = 0;
    for (const it of items) {
      const on = cat === 'all' || it.dataset.category === cat;
      it.hidden = !on;
      if (on) {
        shown++;
      }
    }
    if (empty) empty.hidden = shown > 0;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
  };

  group.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-filter]');
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
    const cat = btn.dataset.filter!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const typed = typeof CSS !== 'undefined' && CSS.supports('selector(:active-view-transition-type(x))');
    if (!document.startViewTransition || !typed || reduce) { apply(cat); return; }
    const root = document.documentElement;
    root.classList.add('vt-filter');
    const vt = document.startViewTransition({ update: () => apply(cat), types: ['filter'] });
    vt.finished.finally(() => root.classList.remove('vt-filter'));
  });
}
