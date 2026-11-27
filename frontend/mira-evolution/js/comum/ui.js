/** UI: aviso (toast), modal, validação de formulário e popover, acessíveis (foco, ESC, clique fora). */
(function () {

/* ---------------------------------------------------------------- aviso (toast) */
function toastHost() {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  return host;
}

function toast(message, { type = 'info', duration = 3600 } = {}) {
  const host = toastHost();
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

/* ---------------------------------------------------------------- carregando */

/**
 * Liga/desliga o spinner de um botão enquanto espera a API: desabilita, mostra o giro no lugar do texto
 * e marca aria-busy. Aceita elemento ou objeto jQuery. Ex.: carregandoBotao($salvar, true)
 */
function carregandoBotao(botao, ligado) {
  const el = botao?.jquery ? botao[0] : botao;
  if (!el) return;
  if (ligado) {
    if (el.classList.contains('is-loading')) return;
    const cor = getComputedStyle(el).color;        // lida antes de o texto ficar transparente
    el.disabled = true;
    el.classList.add('is-loading');
    el.setAttribute('aria-busy', 'true');
    const giro = document.createElement('span');
    giro.className = 'btn__spinner';
    giro.setAttribute('aria-hidden', 'true');
    giro.style.color = cor;
    el.append(giro);
  } else {
    el.disabled = false;
    el.classList.remove('is-loading');
    el.removeAttribute('aria-busy');
    el.querySelector(':scope > .btn__spinner')?.remove();
  }
}

/**
 * Formulário esperando os dados da API: campos viram skeleton e ficam travados até ligado = false.
 * Só destrava o que ele mesmo travou (campos desabilitados de propósito continuam assim).
 */
function carregandoFormulario(form, ligado) {
  const el = form?.jquery ? form[0] : form;
  if (!el) return;
  el.classList.toggle('is-carregando', ligado);
  if (ligado) {
    el.setAttribute('aria-busy', 'true');
    el.querySelectorAll('input, select, textarea, button').forEach((c) => {
      if (c.disabled) return;
      c.disabled = true;
      c.dataset.travadoCarregando = '';
    });
  } else {
    el.removeAttribute('aria-busy');
    el.querySelectorAll('[data-travado-carregando]').forEach((c) => {
      c.disabled = false;
      delete c.dataset.travadoCarregando;
    });
  }
}

/**
 * Aviso "servidor demorando" (chamado por requisitarApi em dados.js quando a resposta passa de alguns
 * segundos). Conta as chamadas lentas em andamento: o aviso some quando a última termina.
 */
let chamadasLentas = 0;
let avisoLento = null;
function avisoServidorLento(ligado) {
  chamadasLentas = Math.max(0, chamadasLentas + (ligado ? 1 : -1));
  if (chamadasLentas && !avisoLento) {
    avisoLento = document.createElement('div');
    avisoLento.className = 'toast toast--lento';
    avisoLento.setAttribute('role', 'status');
    avisoLento.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>' +
      '<span>Conectando ao servidor… Na primeira vez isso pode levar até 1 minuto.</span>';
    toastHost().append(avisoLento);
  } else if (!chamadasLentas && avisoLento) {
    avisoLento.remove();
    avisoLento = null;
  }
}

/* ---------------------------------------------------------------- modal */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * openModal({ title, description, body, confirmLabel, cancelLabel, onSubmit, wide })
 * `body` é HTML (formulário). `onSubmit(form, { close })` pode devolver false (ou uma Promise de false)
 * para manter o modal aberto.
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
    if (submit.classList.contains('is-loading')) return;   // evita envio duplo
    carregandoBotao(submit, true);
    try {
      const keepOpen = (await onSubmit(form, { close })) === false;
      if (!keepOpen) close();
    } finally {
      carregandoBotao(submit, false);
    }
  });
  (form.querySelector('[data-autofocus]') || form.querySelector('input, select, textarea') || form.querySelector('button'))?.focus();
  return { close, form };
}

/* ---------------------------------------------------------------- validação de formulário */

/** rules: { nomeDoCampo: função(valor) -> mensagem de erro ou '' }. Marca os inválidos e devolve true/false. */
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

/* ---------------------------------------------------------------- popover */
let openPopover = null;

function closePopover() {
  if (!openPopover) return;
  const { el, trigger, off } = openPopover;
  off();
  el.remove();
  trigger.setAttribute('aria-expanded', 'false');
  openPopover = null;
}

/** Abre um popover ancorado ao `trigger` com o HTML `html`; `bind(el, close)` registra os eventos. */
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

  // funções usadas pelas páginas
  window.toast = toast;
  window.carregandoBotao = carregandoBotao;
  window.carregandoFormulario = carregandoFormulario;
  window.avisoServidorLento = avisoServidorLento;
  window.openModal = openModal;
  window.validateForm = validateForm;
  window.rules = rules;
  window.closePopover = closePopover;
  window.showPopover = showPopover;
})();
