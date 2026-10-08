// Runs before first paint so the page never flashes the wrong color scheme.
(function () {
  var d = document.documentElement, saved = null;
  d.classList.add('js');
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved !== 'light' && saved !== 'dark') saved = null; // ignore anything unexpected in storage
  if (saved) d.setAttribute('data-theme', saved);
  var scheme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  d.setAttribute('data-scheme', scheme);
  if (saved) document.querySelectorAll('meta[data-theme-color]').forEach(function (m) {
    m.removeAttribute('media'); m.setAttribute('content', saved === 'light' ? '#f4f2ee' : '#0a0a0b');
  });
})();
