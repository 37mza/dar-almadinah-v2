// Scroll reveals: elements marked data-reveal / data-reveal-img get .is-in once they enter the viewport.
// Image reveals start fully clipped, and IntersectionObserver ignores clipped-away area, so for those
// we watch the parent element instead of the clipped element itself.
const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-img]')];

if (!('IntersectionObserver' in window)) {
  targets.forEach((el) => el.classList.add('is-in'));
} else {
  const owner = new Map<Element, HTMLElement>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (owner.get(e.target) ?? (e.target as HTMLElement)).classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );
  for (const el of targets) {
    const watch = el.hasAttribute('data-reveal-img') && el.parentElement ? el.parentElement : el;
    owner.set(watch, el);
    io.observe(watch);
  }
}
