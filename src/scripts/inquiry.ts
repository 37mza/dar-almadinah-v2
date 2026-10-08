// Inquiry drawer (open/close, Back to close, swipe to dismiss) and the inquiry form, shared by the
// panel and the Home section.
import { lockScroll, unlockScroll } from './scroll-lock';
import { openLayer, requestClose, onClose, released } from './layers';
import { spring, project, rubberband, VelocityTracker } from './physics';

const panel = document.querySelector<HTMLDialogElement>('[data-inquiry-panel]');
const isAr = document.documentElement.lang === 'ar';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface InquiryPrefill { typeIndex?: number; message?: string }

function openPanel(prefill?: InquiryPrefill) {
  if (!panel || panel.open) return;
  const form = panel.querySelector<HTMLFormElement>('[data-inquiry-form]');
  if (form && prefill) {
    const radios = form.querySelectorAll<HTMLInputElement>('input[name="project_type"]');
    if (prefill.typeIndex !== undefined && radios[prefill.typeIndex]) radios[prefill.typeIndex].checked = true;
    const msg = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (msg && prefill.message && !msg.value) msg.value = prefill.message;
  }
  panel.showModal();
  lockScroll();
  openLayer('inquiry'); // Back closes the panel
}

/** The actual close. `gone`: already swiped off screen, so skip the CSS slide-out. */
function closeNow(gone = false) {
  if (!panel?.open) return;
  if (gone) {
    panel.dataset.gone = '';
    panel.close();
    requestAnimationFrame(() => { delete panel.dataset.gone; panel.style.transform = ''; panel.style.removeProperty('--drag-p'); });
  } else {
    panel.style.transform = ''; panel.style.removeProperty('--drag-p');
    panel.close();
  }
}

if (panel) {
  let swiped = false;
  onClose('inquiry', () => { const g = swiped; swiped = false; closeNow(g); });
  panel.addEventListener('close', () => { unlockScroll(); released('inquiry'); });
  panel.querySelector('[data-close]')?.addEventListener('click', () => requestClose('inquiry'));
  panel.addEventListener('cancel', (e) => { e.preventDefault(); requestClose('inquiry'); }); // Escape
  // Light dismiss: a click that lands on the backdrop (the dialog box itself, outside its content)
  panel.addEventListener('click', (e) => { if (e.target === panel) requestClose('inquiry'); });

  // ---------- Swipe toward its edge to dismiss (touch / pen) ----------
  // Dismisses the way it came in: right in English, left in Arabic (spatial consistency).
  const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
  const SLOP = 10;
  const tracker = new VelocityTracker();
  let id: number | null = null, sx = 0, sy = 0, decided = false, dragging = false, offset = 0, x = 0;
  let settle: { stop: () => void } | null = null;
  const W = () => panel.getBoundingClientRect().width;
  const paint = (v: number) => {
    panel.style.transform = `translateX(${v * dir}px)`;
    panel.style.setProperty('--drag-p', String(1 - Math.max(0, Math.min(v / W(), 1))));
  };

  panel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || id !== null) return;
    // Only the field being typed in keeps its own horizontal drags (caret moves, text selection);
    // a swipe that merely starts on an unfocused field still dismisses the panel.
    const field = (e.target as Element).closest('input, textarea, select, [contenteditable]');
    if (field && field === document.activeElement) return;
    settle?.stop(); settle = null;
    id = e.pointerId; sx = e.clientX; sy = e.clientY; decided = false; dragging = false;
    tracker.reset(e.timeStamp, 0);
  });
  panel.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const dx = (e.clientX - sx) * dir, dy = e.clientY - sy;
    if (!decided) {
      if (Math.hypot(dx, dy) < SLOP) return;
      decided = true;
      dragging = Math.abs(dx) > Math.abs(dy) * 1.2; // horizontal intent only; vertical stays a scroll
      if (!dragging) { id = null; return; }
      offset = Math.sign(dx) * SLOP;
      panel.setPointerCapture(e.pointerId);
      panel.style.transition = 'none';
      panel.style.willChange = 'transform';
    }
    if (!dragging) return;
    const raw = dx - offset;
    x = raw >= 0 ? raw : rubberband(raw, W()); // pulling it further open resists
    tracker.add(e.timeStamp, raw);
    paint(x);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    if (!dragging) return;
    dragging = false;
    panel.style.willChange = '';
    const v = tracker.velocity();
    if (x + project(v) > W() * 0.5) {
      if (reduceMotion()) { swiped = true; requestClose('inquiry'); return; }
      settle = spring(x, W(), Math.max(v, 500), { damping: 1, response: 0.3 }, paint);
      settle.done.then(() => { swiped = true; panel.style.transition = ''; requestClose('inquiry'); });
    } else {
      settle = spring(x, 0, v, { damping: Math.abs(v) > 300 ? 0.85 : 1, response: 0.35 }, paint);
      settle.done.then(() => { panel.style.transition = ''; panel.style.transform = ''; panel.style.removeProperty('--drag-p'); });
    }
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
}

document.addEventListener('click', (e) => {
  const trigger = (e.target as Element).closest('[data-inquire]');
  if (trigger) { e.preventDefault(); openPanel(); }
});
document.addEventListener('inquiry:open', (e) => openPanel((e as CustomEvent<InquiryPrefill>).detail));

// ---------- Form submission ----------
function swapLabel(btn: HTMLButtonElement, text: string) {
  const label = btn.querySelector<HTMLElement>('[data-label]');
  if (!label || label.textContent === text) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { label.textContent = text; return; }
  // Blur crossfade masks the swap between the two labels (Emil: blur bridges two states)
  btn.classList.add('is-swapping');
  setTimeout(() => { label.textContent = text; btn.classList.remove('is-swapping'); }, 180);
}

// Inline validation: a field is checked when the visitor leaves it (blur) and re-checked as they
// type once it has been flagged, so the message disappears the moment the entry becomes valid.
function fieldOk(el: HTMLInputElement | HTMLTextAreaElement) {
  return (!el.required || el.value.trim() !== '') && el.checkValidity();
}
function showState(el: HTMLInputElement | HTMLTextAreaElement, ok: boolean) {
  const field = el.closest('.field');
  field?.classList.toggle('is-invalid', !ok);
  if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
  const msg = field?.querySelector<HTMLElement>('[data-err]');
  if (msg) msg.hidden = ok;
}
function validate(form: HTMLFormElement) {
  let firstBad: HTMLInputElement | null = null;
  form.querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea').forEach((el) => {
    el.value = el.value.trim();
    const ok = fieldOk(el);
    showState(el, ok);
    if (!ok && !firstBad) firstBad = el;
  });
  if (firstBad) (firstBad as HTMLInputElement).focus();
  return !firstBad;
}

document.querySelectorAll<HTMLFormElement>('[data-inquiry-form]').forEach((form) => {
  const btn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const idleLabel = btn.querySelector('[data-label]')?.textContent ?? '';
  const { endpoint, mailto, msgSending, msgSent, msgError, msgWait } = form.dataset;
  let lastSent = 0;

  form.addEventListener('focusout', (e) => {
    const el = e.target as HTMLInputElement;
    if (!el.matches?.('input[required], textarea[required]') || el.value === '' ) return; // don't scold an untouched field
    el.value = el.value.trim();
    showState(el, fieldOk(el));
  });
  form.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.closest('.field')?.classList.contains('is-invalid')) showState(el, fieldOk(el));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'status';
    status.textContent = '';
    if (!validate(form)) return;

    const raw = new FormData(form);
    if (raw.get('botcheck')) return; // honeypot: bots fill hidden fields, people don't
    // Only send the fields we expect, with a hard length cap (the browser limits can be bypassed)
    const allowed: Record<string, number> = { access_key: 100, subject: 120, from_name: 60, name: 100, company: 120, email: 254, phone: 20, project_type: 60, message: 4000 };
    const data = new FormData();
    for (const [k, max] of Object.entries(allowed)) {
      const v = raw.get(k);
      if (typeof v === 'string' && v) data.set(k, v.slice(0, max));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.get('email') ?? ''))) { validate(form); return; }

    // Throttle: one request per 30 s per browser tab, so the button can't be used to spam the inbox
    const now = Date.now();
    if (now - lastSent < 30_000) { status.textContent = msgWait ?? ''; status.classList.add('err'); return; }

    // No form service configured yet: hand the request to the visitor's email app.
    if (!endpoint) {
      const lines = [
        `${isAr ? 'الاسم' : 'Name'}: ${data.get('name')}`,
        `${isAr ? 'الجهة' : 'Company'}: ${data.get('company') || '-'}`,
        `${isAr ? 'البريد' : 'Email'}: ${data.get('email')}`,
        `${isAr ? 'الجوال' : 'Mobile'}: ${data.get('phone')}`,
        `${isAr ? 'نوع المشروع' : 'Project type'}: ${data.get('project_type')}`,
        '',
        String(data.get('message') || ''),
      ];
      const href = `mailto:${mailto}?subject=${encodeURIComponent(String(data.get('subject')))}&body=${encodeURIComponent(lines.join('\n'))}`;
      window.location.href = href;
      return;
    }

    btn.setAttribute('aria-busy', 'true');
    swapLabel(btn, msgSending ?? '');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      if (!res.ok) throw new Error(String(res.status));
      lastSent = Date.now();
      form.reset();
      status.textContent = msgSent ?? '';
      status.classList.add('ok');
    } catch {
      status.textContent = msgError ?? '';
      status.classList.add('err');
    } finally {
      btn.removeAttribute('aria-busy');
      swapLabel(btn, idleLabel);
    }
  });
});
