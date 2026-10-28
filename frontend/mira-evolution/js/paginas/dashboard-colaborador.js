/** DASHBOARD DO COLABORADOR (Figma: "Dashboard - Colaborador Light/Dark"). */
$(function () {
  var sessao = protegerPagina(['colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'dashboard');

  var filtros = { categoria: 'Todos', de: null, ate: null };
  var dados = null;       // data/dashboard.json
  var matriculas = null;  // cursos do colaborador
  var grafico = null;

  $('#saudacao').text('Olá, ' + firstName(sessao.name) + '!');

  Promise.all([buscarDados('dashboard'), buscarMatriculas(sessao.id)])
    .then(function (r) {
      dados = r[0];
      matriculas = r[1];
      desenhar();
    })
    .catch(mostrarErroDaPagina);

  function periodo() {
    return { de: filtros.de || dados.periodDefault.from, ate: filtros.ate || dados.periodDefault.to };
  }

  function desenhar() {
    var visao = dados.colaborador;
    var p = periodo();

    $('#subtitulo').text(visao.subtitle);
    $('#botao-periodo').attr('aria-label', 'Período: ' + formatDate(p.de) + ' a ' + formatDate(p.ate));
    $('#botao-periodo [data-range-label]').text(formatDate(p.de) + ' - ' + formatDate(p.ate));

    $('#kpis').html(visao.kpis.map(kpiCenter).join(''));

    // Meta do mês
    var meta = visao.goal;
    var pct = Math.round((meta.doneHours / meta.planHours) * 100);
    $('#goal-title').text(meta.title);
    $('#meta-texto').text(meta.text);
    $('#meta-progresso').html(
      '<div class="goal__labels"><strong>' + pct + '% Concluído</strong><span>' + meta.doneHours + 'h / ' + meta.planHours + 'h</span></div>' +
      progressBar(pct, { height: 8, label: 'Meta do mês: ' + pct + '%' }));

    // Cursos em andamento (da categoria escolhida), no máximo 4
    var emAndamento = matriculas.items.filter(function (c) { return c.status === 'Em andamento'; });
    var lista = emAndamento.filter(function (c) { return filtros.categoria === 'Todos' || c.category === filtros.categoria; }).slice(0, 4);
    $('#lista-cursos').html(lista.length
      ? lista.map(function (c) {
          return '<li><div class="course-progress-list__row"><span>' + esc(c.title) + '</span><strong>' + Math.round(c.progress) + '%</strong></div>' +
            progressBar(c.progress, { label: c.title + ': ' + Math.round(c.progress) + '%' }) + '</li>';
        }).join('')
      : '<li>' + emptyState({ title: 'Nenhum curso nesta categoria', iconName: 'book-open' }) + '</li>');

    desenharGrafico(visao, p);
  }

  function desenharGrafico(visao, p) {
    if (grafico) { grafico.destroy(); grafico = null; }
    var datas = visao.evolution.map(function (x) { return x.date; });
    var valores = visao.evolution.map(function (x) { return x.value; });
    var serie = recortarPeriodo(datas, valores, p.de, p.ate);
    if (!serie.categories.length) {
      $('#grafico-evolucao').html(emptyState({ title: 'Sem dados no período', iconName: 'calendar' }));
      return;
    }
    $('#grafico-evolucao').empty();
    grafico = areaChart(document.getElementById('grafico-evolucao'), {
      categories: serie.categories,
      series: [{ name: 'Horas por dia', color: 'var(--chart-line)', data: serie.values }],
      height: 210,
      formatX: function (c) { return formatDate(c, 'DD/MM'); },
      formatTitle: function (c) { return formatDate(c); },
      formatY: function (v) { return Number(v.toFixed(1)) + 'h'; },
      ariaLabel: 'Evolução do desenvolvimento em horas por dia'
    });
  }

  $('#botao-periodo').on('click', function () {
    var p = periodo();
    abrirPeriodo(this, p.de, p.ate, function (novo) {
      filtros.de = novo.from;
      filtros.ate = novo.to;
      desenhar();
    });
  });

  $('#botao-filtros').on('click', function () {
    var categorias = ['Todos'].concat(matriculas.items.filter(function (c) { return c.status === 'Em andamento'; })
      .map(function (c) { return c.category; }).filter(function (c, i, arr) { return arr.indexOf(c) === i; }));
    openModal({
      title: 'Filtros',
      description: 'Escolha a categoria dos cursos exibidos.',
      confirmLabel: 'Aplicar filtros',
      body: '<label class="field"><span class="field__label">Categoria do curso</span><span class="select select--field"><select name="category" data-autofocus>' +
        categorias.map(function (c) { return '<option' + (c === filtros.categoria ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
        '</select>' + icon('chevron-down', { size: 14 }) + '</span></label>',
      onSubmit: function (form) {
        filtros.categoria = form.elements.category.value;
        desenhar();
      }
    });
  });
});
