// Light / dark toggle.
// Default follows the device setting; a click stores an explicit choice in localStorage.
// The switch crossfades in 220 ms (View Transitions), also with reduced motion: a fade has no
// movement and avoids an abrupt brightness jump.
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

toggle?.addEventListener('click', () => {
  const next: Scheme = current() === 'light' ? 'dark' : 'light';
  if (!document.startViewTransition || !supportsTypes) { apply(next); return; }

  document.startViewTransition({ update: () => apply(next), types: ['theme'] });
});

// Follow the device if the visitor never chose explicitly
systemLight.addEventListener('change', () => {
  if (root.dataset.theme) return;
  root.dataset.scheme = systemLight.matches ? 'light' : 'dark';
  syncUi();
});

syncUi();
