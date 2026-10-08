// Inquiry drawer (open/close) and inquiry form submission, shared by the panel and the Home section.
import { lockScroll, unlockScroll } from './scroll-lock';

const panel = document.querySelector<HTMLDialogElement>('[data-inquiry-panel]');
const isAr = document.documentElement.lang === 'ar';

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
}

function closePanel() {
  if (!panel?.open) return;
  panel.close();
}

if (panel) {
  panel.addEventListener('close', unlockScroll);
  panel.querySelector('[data-close]')?.addEventListener('click', closePanel);
  // Light dismiss: a click that lands on the backdrop (the dialog box itself, outside its content)
  panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
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

function validate(form: HTMLFormElement) {
  let firstBad: HTMLInputElement | null = null;
  form.querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea').forEach((el) => {
    el.value = el.value.trim();
    const ok = (!el.required || el.value !== '') && el.checkValidity();
    el.closest('.field')?.classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
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

  form.addEventListener('input', (e) => {
    const field = (e.target as Element).closest('.field');
    if (field?.classList.contains('is-invalid')) {
      const el = field.querySelector<HTMLInputElement>('input, textarea');
      if (el && el.value.trim() && el.checkValidity()) { field.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); }
    }
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
