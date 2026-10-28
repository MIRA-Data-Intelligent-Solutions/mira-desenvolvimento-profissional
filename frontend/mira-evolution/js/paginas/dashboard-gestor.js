/** DASHBOARD DO GESTOR (Figma: "Dashboard - Gestor Light/Dark"). */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'dashboard');

  var filtros = { setor: 'todos', de: null, ate: null };
  var dashboard = null;     // conteúdo de data/dashboard.json
  var setores = [];         // conteúdo de data/sectors.json
  var grafico = null;

  $('#saudacao').text('Olá, ' + firstName(sessao.name) + '!');

  Promise.all([buscarDados('dashboard'), buscarDados('sectors')])
    .then(function (resultado) {
      dashboard = resultado[0];
      setores = resultado[1].items;
      $('#filtro-setor-grafico').append(setores.map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.name) + '</option>';
      }).join(''));
      desenhar();
    })
    .catch(mostrarErroDaPagina);

  /** Período usado agora (o escolhido pelo usuário ou o padrão dos dados). */
  function periodo() {
    return { de: filtros.de || dashboard.periodDefault.from, ate: filtros.ate || dashboard.periodDefault.to };
  }

  /** Preenche a tela com os dados e os filtros atuais. */
  function desenhar() {
    var gestor = dashboard.gestor;
    var p = periodo();

    $('#subtitulo').text(gestor.subtitle);
    $('#botao-periodo').attr('aria-label', 'Período: ' + formatDate(p.de) + ' a ' + formatDate(p.ate));
    $('#botao-periodo [data-range-label]').text(formatDate(p.de) + ' - ' + formatDate(p.ate));

    // Indicadores
    $('#kpis').html(gestor.kpis.map(kpiCenter).join(''));

    // Progresso por setor (respeita o filtro de setor)
    var progressoSetores = gestor.sectorProgress.filter(function (s) {
      return filtros.setor === 'todos' || s.sector === filtros.setor;
    });
    $('#lista-setores').html(progressoSetores.length
      ? progressoSetores.map(meter).join('')
      : emptyState({ title: 'Nenhum setor selecionado' }));

    // Tabelas pequenas
    $('#tabela-cursos').html(linhasPorcentagem(gestor.runningCourses));
    $('#tabela-distribuicao').html(linhasPorcentagem(gestor.progressDistribution));

    desenharGrafico(p);
  }

  function linhasPorcentagem(lista) {
    return lista.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td>' + Math.round(r.value) + '%</td></tr>'; }).join('');
  }

  function desenharGrafico(p) {
    if (grafico) { grafico.destroy(); grafico = null; }
    var chave = dashboard.dailyHours[filtros.setor] ? filtros.setor : 'todos';
    var serie = recortarPeriodo(dashboard.dates, dashboard.dailyHours[chave], p.de, p.ate);
    if (!serie.categories.length) {
      $('#grafico-horas').html(emptyState({ title: 'Sem dados no período', text: 'Escolha outro intervalo de datas.', iconName: 'calendar' }));
      return;
    }
    $('#grafico-horas').empty();
    grafico = areaChart(document.getElementById('grafico-horas'), {
      categories: serie.categories,
      series: [{ name: 'Horas por dia', color: 'var(--chart-line)', data: serie.values }],
      height: 250,
      formatX: function (c) { return formatDate(c, 'DD/MM'); },
      formatTitle: function (c) { return formatDate(c); },
      formatY: function (v) { return Number(v.toFixed(1)) + 'h'; },
      ariaLabel: 'Média diária de horas de desenvolvimento'
    });
  }

  /* ---------------------------------------------------------------- interações */

  $('#filtro-setor-grafico').on('change', function () {
    filtros.setor = $(this).val();
    desenhar();
  });

  $('#botao-periodo').on('click', function () {
    var p = periodo();
    abrirPeriodo(this, p.de, p.ate, function (novo) {
      filtros.de = novo.from;
      filtros.ate = novo.to;
      desenhar();
    });
  });

  $('#botao-filtros').on('click', function () {
    var opcoes = setores.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === filtros.setor ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    }).join('');
    var modal = openModal({
      title: 'Filtros',
      description: 'Refine o que aparece no dashboard.',
      confirmLabel: 'Aplicar filtros',
      body: '<label class="field"><span class="field__label">Setor</span>' +
        '<span class="select select--field"><select name="sector" data-autofocus><option value="todos">Todos os setores</option>' + opcoes + '</select>' +
        icon('chevron-down', { size: 14 }) + '</span></label>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-reset style="align-self:flex-start">Limpar filtros</button>',
      onSubmit: function (form) {
        filtros.setor = form.elements.sector.value;
        $('#filtro-setor-grafico').val(filtros.setor);
        desenhar();
      }
    });
    $(modal.form).find('[data-reset]').on('click', function () {
      modal.form.elements.sector.value = 'todos';
    });
  });
});
