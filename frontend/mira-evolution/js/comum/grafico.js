(function () {
/**
 * Gráfico de área em SVG puro, no estilo do AreaChart do Tremor (Recharts):
 * linhas suaves, degradê sob a curva, grade horizontal discreta, tooltip e cursor ao passar o mouse.
 *
 * Observação: o Tremor é uma biblioteca React; como o projeto é JavaScript puro, este componente
 * reproduz o visual/comportamento do AreaChart com a mesma "API de dados": categories + series.
 *
 *   areaChart(el, {
 *     categories: ['2026-05-20', ...],
 *     series: [{ name: 'Horas', color: '#2b7fff', data: [4.2, ...] }],
 *     height: 240,
 *     formatX: (cat) => '20/05',          // rótulo do eixo X
 *     formatTitle: (cat) => '20/05/2026', // título do tooltip
 *     formatY: (v) => `${v}h`,
 *   })
 */

let uid = 0;
const NS = 'http://www.w3.org/2000/svg';

/** Escolhe passo "redondo" (1, 2, 2.5, 5 × 10^n) e devolve { top, ticks } com 3 a 6 divisões. */
function niceScale(max) {
  if (!(max > 0)) return { top: 1, ticks: 4 };
  const base = Math.pow(10, Math.floor(Math.log10(max / 6)));
  for (let mag = base; mag < base * 1000; mag *= 10) {
    for (const f of [1, 2, 2.5, 5]) {
      const step = f * mag;
      const ticks = Math.ceil(max / step - 1e-9);
      if (ticks >= 3 && ticks <= 6) return { top: +(ticks * step).toFixed(6), ticks };
    }
  }
  return { top: max, ticks: 4 };
}

/** Curva monotônica (Fritsch–Carlson) — evita "overshoot" entre pontos, como o tipo "monotone" do Recharts. */
function monotonePath(pts) {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = [];
  const m = [];
  const tangents = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6;
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  tangents[0] = m[0];
  tangents[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) tangents[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / m[i];
      const b = tangents[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * a * m[i];
        tangents[i + 1] = t * b * m[i];
      }
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + tangents[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - tangents[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function areaChart(container, options) {
  const opts = {
    height: 240,
    yTicks: 4,
    fill: true,
    formatX: (c) => c,
    formatTitle: (c) => c,
    formatY: (v) => v,
    ariaLabel: 'Gráfico de área',
    ...options,
  };
  const id = `ac${++uid}`;
  let active = -1;
  let dims = { w: 0 };

  container.classList.add('chart');
  container.setAttribute('role', 'group');
  container.setAttribute('tabindex', '0');

  function summary() {
    const lines = opts.series.map((s) => {
      const vals = s.data.filter((v) => Number.isFinite(v));
      if (!vals.length) return `${s.name}: sem dados`;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return `${s.name}: mínimo ${opts.formatY(min)}, máximo ${opts.formatY(max)}`;
    });
    return `${opts.ariaLabel}. ${lines.join('; ')}. Use as setas esquerda e direita para explorar os pontos.`;
  }
  container.setAttribute('aria-label', summary());

  function draw() {
    const width = Math.max(container.clientWidth, 280);
    const { categories, series, height } = opts;
    dims = { w: width };
    const n = categories.length;
    const all = series.flatMap((s) => s.data).filter(Number.isFinite);
    const { top, ticks } = niceScale(all.length ? Math.max(...all) * 1.04 : 1);
    const m = { t: 12, r: 12, b: 28, l: 12 };
    const labelW = Math.max(...Array.from({ length: ticks + 1 }, (_, i) => String(opts.formatY((top / ticks) * i)).length)) * 6.6 + 10;
    m.l = Math.round(labelW);
    const iw = width - m.l - m.r;
    const ih = height - m.t - m.b;
    const x = (i) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => m.t + ih - (v / top) * ih;
    dims.x = x;
    dims.y = y;
    dims.m = m;

    let svg = `<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><defs>`;
    series.forEach((s, i) => {
      svg += `<linearGradient id="${id}-g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity="${series.length > 1 ? 0.09 : 0.38}"/><stop offset="100%" stop-color="${s.color}" stop-opacity="0.02"/></linearGradient>`;
    });
    svg += '</defs>';

    for (let i = 0; i <= ticks; i++) {
      const v = (top / ticks) * i;
      const yy = Math.round(y(v)) + 0.5;
      svg += `<line class="chart__grid" x1="${m.l}" x2="${width - m.r}" y1="${yy}" y2="${yy}"/>`;
      svg += `<text class="chart__axis" x="${m.l - 8}" y="${yy + 4}" text-anchor="end">${esc(opts.formatY(v))}</text>`;
    }

    const maxLabels = Math.max(2, Math.floor(iw / 78));
    const step = Math.max(1, Math.ceil((n - 1) / (maxLabels - 1)));
    const idxs = [];
    for (let i = 0; i < n; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) {
      if (n - 1 - idxs[idxs.length - 1] < step * 0.6) idxs.pop();
      idxs.push(n - 1);
    }
    idxs.forEach((i, k) => {
      const anchor = k === 0 ? 'start' : k === idxs.length - 1 ? 'end' : 'middle';
      svg += `<text class="chart__axis" x="${x(i)}" y="${height - 6}" text-anchor="${anchor}">${esc(opts.formatX(categories[i]))}</text>`;
    });

    series.forEach((s, si) => {
      const pts = s.data.map((v, i) => [x(i), y(v)]);
      const line = monotonePath(pts);
      if (opts.fill && pts.length > 1) {
        svg += `<path d="${line} L${pts[pts.length - 1][0]},${m.t + ih} L${pts[0][0]},${m.t + ih} Z" fill="url(#${id}-g${si})"/>`;
      }
      svg += `<path class="chart__line" d="${line}" stroke="${s.color}"/>`;
    });

    svg += `<line class="chart__cursor" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}"/>`;
    series.forEach((s) => {
      svg += `<circle class="chart__dot" r="4.5" cx="0" cy="0" fill="${s.color}"/>`;
    });
    svg += `<rect class="chart__hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
    svg += '</svg><div class="chart__tooltip" role="status"></div>';
    container.innerHTML = svg;
    if (active >= 0) show(Math.min(active, n - 1));
  }

  function show(i) {
    active = i;
    const { categories, series } = opts;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;
    const xx = dims.x(i);
    const cursor = svgEl.querySelector('.chart__cursor');
    cursor.setAttribute('x1', xx);
    cursor.setAttribute('x2', xx);
    const dots = svgEl.querySelectorAll('.chart__dot');
    series.forEach((s, si) => {
      dots[si].setAttribute('cx', xx);
      dots[si].setAttribute('cy', dims.y(s.data[i]));
    });
    const tip = container.querySelector('.chart__tooltip');
    tip.innerHTML =
      `<div class="chart__tooltip-title">${esc(opts.formatTitle(categories[i]))}</div>` +
      series
        .map(
          (s) =>
            `<div class="chart__tooltip-row"><span class="legend__dot" style="--dot:${s.color}"></span><span>${esc(s.name)}</span><strong>${esc(opts.formatY(s.data[i]))}</strong></div>`,
        )
        .join('');
    const tw = tip.offsetWidth || 140;
    const left = Math.min(Math.max(xx, tw / 2 + 4), dims.w - tw / 2 - 4);
    const topPx = Math.min(...series.map((s) => dims.y(s.data[i]))) - 10;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(topPx, tip.offsetHeight + 4)}px`;
    container.classList.add('is-hovering');
  }

  const hide = () => {
    active = -1;
    container.classList.remove('is-hovering');
  };

  function nearest(clientX) {
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const n = opts.categories.length;
    const ratio = (px - dims.m.l) / (dims.w - dims.m.l - dims.m.r);
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  }

  const onMove = (e) => {
    if (e.target.closest('.chart__hit')) show(nearest(e.clientX));
  };
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerleave', hide);
  container.addEventListener('blur', hide);
  container.addEventListener('keydown', (e) => {
    const n = opts.categories.length;
    if (e.key === 'ArrowRight') show(active < 0 ? 0 : Math.min(n - 1, active + 1));
    else if (e.key === 'ArrowLeft') show(active < 0 ? n - 1 : Math.max(0, active - 1));
    else if (e.key === 'Escape') hide();
    else return;
    e.preventDefault();
  });

  const ro = new ResizeObserver(() => {
    if (Math.abs(container.clientWidth - dims.w) > 2) draw();
  });
  ro.observe(container);
  draw();

  return {
    update(next) {
      Object.assign(opts, next);
      container.setAttribute('aria-label', summary());
      active = -1;
      draw();
    },
    destroy() {
      ro.disconnect();
    },
  };
}

function legend(items) {
  return `<ul class="legend" aria-label="Legenda do gráfico">${items
    .map((i) => `<li class="legend__item"><span class="legend__dot" style="--dot:${i.color}"></span>${esc(i.name)}</li>`)
    .join('')}</ul>`;
}

  window.areaChart = areaChart;
  window.legend = legend;
})();
