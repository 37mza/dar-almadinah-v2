// Shared page scroll lock for the drawer and the project overlay.
let locks = 0;
export function lockScroll() {
  if (locks++ === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    if (gap > 0) document.documentElement.style.paddingInlineEnd = `${gap}px`;
  }
}
export function unlockScroll() {
  if (locks > 0 && --locks === 0) {
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingInlineEnd = '';
  }
}
