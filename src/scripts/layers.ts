// Full-screen layers (project view, inquiry panel) get their own browser-history entry, so the
// Back button / Android back gesture closes the layer instead of leaving the page.
//
//   openLayer('project', '#tala-hotel')  pushes an entry (or swaps, if another layer is open)
//   requestClose('project')              goes Back if we own the entry; otherwise closes directly
//   onClose('project', fn)               fn runs whenever the layer must close (UI, Back, or swap)
type Name = 'project' | 'inquiry';
const handlers = new Map<Name, () => void>();
let active: Name | null = null;

export function onClose(name: Name, fn: () => void) { handlers.set(name, fn); }

export function openLayer(name: Name, url?: string) {
  const target = url ?? location.href;
  if (active && active !== name) history.replaceState({ layer: name }, '', target); // swap: no extra Back step
  else if (!active) history.pushState({ layer: name }, '', target);
  active = name;
}

/** Use from close buttons, Escape and backdrop clicks. */
export function requestClose(name: Name) {
  if (active === name && history.state?.layer === name) history.back(); // popstate does the closing
  else { if (active === name) active = null; handlers.get(name)?.(); }
}

/** The layer was closed without going through history (e.g. replaced by another layer). */
export function released(name: Name) { if (active === name) active = null; }

/** Was opened from a shared link (#slug on first load): no history entry of ours to go back to. */
export function adoptWithoutHistory(name: Name) { active = null; void name; }

window.addEventListener('popstate', () => {
  const now = (history.state?.layer as Name | undefined) ?? null;
  if (active && now !== active) { const closing = active; active = now; handlers.get(closing)?.(); }
});
