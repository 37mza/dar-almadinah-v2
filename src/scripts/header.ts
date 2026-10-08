// Header turns solid once the page scrolls past the top of the hero (or always, off the home page).
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const overHero = header.dataset.overHero === 'true';
  let ticking = false;
  const update = () => {
    const threshold = overHero ? window.innerHeight * 0.6 : 8;
    header.classList.toggle('is-solid', window.scrollY > threshold);
    ticking = false;
  };
  update();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
}
