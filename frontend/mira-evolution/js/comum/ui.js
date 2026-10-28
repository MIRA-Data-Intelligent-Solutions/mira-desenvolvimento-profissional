(function () {
/** Toast, modal e popover acessíveis (foco, ESC, clique fora). */

/* ------------------------------------------------------------------ Toast */
function toast(message, { type = 'info', duration = 3600 } = {}) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const name = type === 'success' ? 'circle-check' : type === 'error' ? 'alert-circle' : 'info';
  el.innerHTML = `${icon(name, { size: 18 })}<span>${esc(message)}</span>`;
  host.append(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/* ------------------------------------------------------------------ Modal */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * openModal({ title, description, body, confirmLabel, cancelLabel, onSubmit })
 * `body` é HTML (formulário). `onSubmit(form, modal)` pode retornar false para manter o modal aberto.
 */
function openModal({ title, description = '', body = '', confirmLabel = 'Salvar', cancelLabel = 'Cancelar', onSubmit, wide = false }) {
  const opener = document.activeElement;
  const titleId = nextId('modal-title');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}" novalidate ${wide ? 'style="width:min(640px,100%)"' : ''}>
      <div class="modal__head">
        <div>
          <h2 class="modal__title" id="${titleId}">${esc(title)}</h2>
          ${description ? `<p class="modal__desc">${esc(description)}</p>` : ''}
        </div>
        <button type="button" class="btn btn--ghost btn--icon" data-close aria-label="Fechar">${icon('x', { size: 18 })}</button>
      </div>
      <div class="modal__body">${body}</div>
      <div class="modal__foot">
        <button type="button" class="btn btn--outline" data-close>${esc(cancelLabel)}</button>
        ${onSubmit ? `<button type="submit" class="btn btn--primary">${esc(confirmLabel)}</button>` : ''}
      </div>
    </form>`;
  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  const form = backdrop.querySelector('form');

  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    document.body.style.overflow = '';
    opener?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const items = [...form.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  form.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const keepOpen = (await onSubmit(form, { close })) === false;
      if (!keepOpen) close();
    } finally {
      submit.disabled = false;
    }
  });
  (form.querySelector('[data-autofocus]') || form.querySelector('input, select, textarea') || form.querySelector('button'))?.focus();
  return { close, form };
}

/** Validação simples de formulário: marca campos inválidos e devolve true/false. */
function validateForm(form, rules) {
  let ok = true;
  let firstInvalid = null;
  form.querySelectorAll('.field__error').forEach((e) => e.remove());
  Object.entries(rules).forEach(([name, check]) => {
    const input = form.elements[name];
    if (!input) return;
    const message = check(input.value.trim(), input);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) {
      ok = false;
      firstInvalid ??= input;
      const err = document.createElement('span');
      err.className = 'field__error';
      err.id = `${input.id || input.name}-error`;
      err.textContent = message;
      input.setAttribute('aria-describedby', err.id);
      input.closest('.field')?.append(err);
    }
  });
  firstInvalid?.focus();
  return ok;
}

const rules = {
  required: (msg = 'Campo obrigatório.') => (v) => (v ? '' : msg),
  email: (msg = 'Informe um e-mail válido.') => (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : msg),
  minLen: (n, msg) => (v) => (v.length >= n ? '' : msg || `Informe ao menos ${n} caracteres.`),
};

/* ------------------------------------------------------------------ Popover */
let openPopover = null;

function closePopover() {
  if (!openPopover) return;
  const { el, trigger, off } = openPopover;
  off();
  el.remove();
  trigger.setAttribute('aria-expanded', 'false');
  openPopover = null;
}

/**
 * Abre um popover ancorado ao `trigger`.
 * `render(close)` devolve o HTML interno; `bind(el, close)` registra eventos.
 */
function showPopover(trigger, { html, bind, align = 'right', label = '' }) {
  if (openPopover?.trigger === trigger) return closePopover();
  closePopover();
  const el = document.createElement('div');
  el.className = 'popover';
  el.setAttribute('role', 'dialog');
  if (label) el.setAttribute('aria-label', label);
  el.innerHTML = html;
  document.body.append(el);

  const place = () => {
    const r = trigger.getBoundingClientRect();
    const w = el.offsetWidth;
    let left = align === 'right' ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    let top = r.bottom + 8;
    if (top + el.offsetHeight > window.innerHeight - 8 && r.top > el.offsetHeight + 16) top = r.top - el.offsetHeight - 8;
    el.style.left = `${left + window.scrollX}px`;
    el.style.top = `${top + window.scrollY}px`;
  };
  place();

  const onDoc = (e) => {
    if (!el.contains(e.target) && !trigger.contains(e.target)) closePopover();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      closePopover();
      trigger.focus();
    }
  };
  document.addEventListener('mousedown', onDoc);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', place);
  const off = () => {
    document.removeEventListener('mousedown', onDoc);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', place);
  };
  trigger.setAttribute('aria-expanded', 'true');
  openPopover = { el, trigger, off };
  bind?.(el, closePopover);
  (el.querySelector('[data-autofocus]') || el.querySelector('button, input, select'))?.focus({ preventScroll: true });
  return el;
}

  window.toast = toast;
  window.openModal = openModal;
  window.validateForm = validateForm;
  window.rules = rules;
  window.closePopover = closePopover;
  window.showPopover = showPopover;
})();
