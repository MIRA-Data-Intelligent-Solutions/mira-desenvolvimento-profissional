/** Blocos de interface reutilizáveis (retornam strings HTML). */

function delta(text, { tint = false, tone } = {}) {
  const t = String(text);
  const neg = t.startsWith('-');
  const neutral = tone === 'neutral' || /^(Estável|0)/.test(t);
  const cls = ['delta', tint && 'delta--tint', neutral && 'delta--neutral', neg && 'delta--down'].filter(Boolean).join(' ');
  return `<span class="${cls}">${neg || neutral ? '' : icon('arrow-up', { size: 11, stroke: 2.5 })}${esc(t)}</span>`;
}

/** KPI centralizado do dashboard. */
function kpiCenter({ label, value, delta: d, note = 'vs. periodo anterior' }) {
  return `<article class="card kpi">
    <h3 class="kpi__label">${esc(label)}</h3>
    <p class="kpi__value">${esc(value)}</p>
    <p class="kpi__foot">${d ? delta(d) : ''}<span>${esc(note)}</span></p>
  </article>`;
}

/** KPI alinhado à esquerda (telas de Setores, Cursos, Detalhes, Progresso). */
function kpiLeft({ label, value, delta: d, note = 'vs. período anterior' }) {
  return `<article class="card kpi-left">
    <h3 class="kpi-left__label">${esc(label)}</h3>
    <p class="kpi-left__value">${esc(value)}</p>
    <p class="kpi-left__foot">${d ? delta(d, { tint: true }) : ''}<span>${esc(note)}</span></p>
  </article>`;
}

/** Barra de progresso com valor ao lado. */
function progressInline(value, { color, thin = false, max, label } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const style = [`--value:${v}%`, color && `--fill:${color}`, max && `--bar-max:${max}px`].filter(Boolean).join(';');
  return `<div class="progress ${thin ? 'progress--thin' : ''}" style="${style}">
    <div class="progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" ${label ? `aria-label="${esc(label)}"` : ''}><div class="progress__fill"></div></div>
    <span class="progress__value">${v}%</span>
  </div>`;
}

/** Barra simples (sem valor ao lado). */
function progressBar(value, { color, height = 8, label } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return `<div class="progress" style="--value:${v}%;--bar-h:${height}px;${color ? `--fill:${color}` : ''}">
    <div class="progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" ${label ? `aria-label="${esc(label)}"` : ''}><div class="progress__fill"></div></div>
  </div>`;
}

/** Linha "rótulo — valor" com barra abaixo (progresso por setor). */
function meter({ name, value, color }) {
  return `<div class="meter">
    <div class="meter__row"><span>${esc(name)}</span><span>${Math.round(value)}%</span></div>
    ${progressBar(value, { color, height: 7, label: `${name}: ${Math.round(value)}%` })}
  </div>`;
}

function userCell(name, sub, size = 36) {
  return `<div class="user-cell">${avatar(name, size)}<div><div class="user-cell__name">${esc(name)}</div>${sub ? `<div class="user-cell__sub">${esc(sub)}</div>` : ''}</div></div>`;
}

function statusBadge(status) {
  const map = {
    Ativo: 'green',
    Inativo: 'gray',
    Concluído: 'green',
    'Em andamento': 'blue',
    'Em Andamento': 'blue',
    Bloqueado: 'gray',
    'Em Breve': 'amber',
    Conectado: 'green',
    Pendente: 'amber',
  };
  return `<span class="badge badge--${map[status] || 'gray'}">${esc(status)}</span>`;
}

const CATEGORY_TONE = { Dados: 'blue', Gestão: 'purple', 'Soft Skills': 'amber', Tecnologia: 'primary', Segurança: 'red' };
function categoryBadge(cat) {
  return `<span class="badge badge--${CATEGORY_TONE[cat] || 'gray'}">${esc(cat)}</span>`;
}

function tags(list, { addButton = false } = {}) {
  return `<ul class="tag-list">${list.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}${
    addButton ? `<li><button type="button" class="tag tag--add" data-action="add-skill">${icon('plus', { size: 13 })}Adicionar</button></li>` : ''
  }</ul>`;
}

function emptyState({ title = 'Nada por aqui', text = '', iconName = 'search' } = {}) {
  return `<div class="state" role="status">${icon(iconName, { size: 32 })}<p class="state__title">${esc(title)}</p>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
}

function errorState(message, { retry = true } = {}) {
  return `<div class="state state--error" role="alert">${icon('alert-circle', { size: 32 })}
    <p class="state__title">Não foi possível carregar os dados</p><p>${esc(message || 'Tente novamente em instantes.')}</p>
    ${retry ? `<button type="button" class="btn btn--outline btn--sm" data-action="retry">Tentar novamente</button>` : ''}</div>`;
}

/** Esqueleto de carregamento genérico (cabeçalho + cards). */
function pageSkeleton() {
  return `<div class="page" aria-busy="true" aria-live="polite"><span class="sr-only">Carregando…</span>
    <div class="skeleton" style="height:46px;width:min(320px,70%)"></div>
    <div class="grid grid--4" style="--grid-gap:32px">${'<div class="skeleton" style="height:137px"></div>'.repeat(4)}</div>
    <div class="skeleton" style="height:330px"></div>
    <div class="grid grid--2"><div class="skeleton" style="height:240px"></div><div class="skeleton" style="height:240px"></div></div></div>`;
}
