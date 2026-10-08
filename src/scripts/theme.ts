// Light / dark toggle.
// Default follows the device setting; a click stores an explicit choice in localStorage.
// The switch is revealed as a circle growing from the toggle (View Transitions), a rare,
// deliberate action, so it can afford a little delight. Reduced motion: instant switch.
const root = document.documentElement;
const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const systemLight = matchMedia('(prefers-color-scheme: light)');
const supportsTypes = typeof CSS !== 'undefined' && CSS.supports('selector(:active-view-transition-type(x))');

type Scheme = 'light' | 'dark';
const current = (): Scheme => (root.dataset.scheme as Scheme) || (systemLight.matches ? 'light' : 'dark');

function syncUi() {
  if (!toggle) return;
  const next = current() === 'light' ? 'dark' : 'light';
  toggle.setAttribute('aria-label', next === 'light' ? toggle.dataset.labelLight! : toggle.dataset.labelDark!);
}

function setMetaColor(scheme: Scheme) {
  document.querySelectorAll<HTMLMetaElement>('meta[data-theme-color]').forEach((m) => {
    m.removeAttribute('media');
    m.content = scheme === 'light' ? '#f4f2ee' : '#0a0a0b';
  });
}

function apply(scheme: Scheme) {
  root.dataset.theme = scheme;
  root.dataset.scheme = scheme;
  setMetaColor(scheme);
  try { localStorage.setItem('theme', scheme); } catch {}
  syncUi();
}

toggle?.addEventListener('click', async () => {
  const next: Scheme = current() === 'light' ? 'dark' : 'light';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || !supportsTypes || reduce) { apply(next); return; }

  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const vt = document.startViewTransition({ update: () => apply(next), types: ['theme'] });
  await vt.ready;
  root.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 620, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' },
  );
});

// Follow the device if the visitor never chose explicitly
systemLight.addEventListener('change', () => {
  if (root.dataset.theme) return;
  root.dataset.scheme = systemLight.matches ? 'light' : 'dark';
  syncUi();
});

syncUi();
