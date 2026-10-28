/** PROGRESSO — visão do Gestor (Figma: "Progresso - Gestor"): evolução por setor e ranking. */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'progresso');

  var filtros = { setor: 'todos', de: null, ate: null };
  var progresso = null;     // data/progress.json
  var dashboard = null;     // data/dashboard.json (tem as horas diárias de cada setor)
  var setores = [];         // data/sectors.json
  var grafico = null;

  Promise.all([buscarDados('progress'), buscarDados('dashboard'), buscarDados('sectors')])
    .then(function (r) {
      progresso = r[0];
      dashboard = r[1];
      setores = r[2].items;
      $('#filtro-setor').append(setores.map(function (s) { return '<option value="' + s.id + '">Setor: ' + esc(s.name) + '</option>'; }).join(''));
      $('#kpis').html(progresso.kpis.map(kpiLeft).join(''));
      desenhar();
    })
    .catch(mostrarErroDaPagina);

  function periodo() {
    return { de: filtros.de || dashboard.periodDefault.from, ate: filtros.ate || dashboard.periodDefault.to };
  }

  function desenhar() {
    var p = periodo();
    $('#botao-periodo').attr('aria-label', 'Período: ' + formatDate(p.de) + ' a ' + formatDate(p.ate));
    $('#botao-periodo [data-range-label]').text(formatDate(p.de) + ' - ' + formatDate(p.ate));

    // Uma linha no gráfico por setor (ou só a do setor escolhido)
    var ids = filtros.setor === 'todos' ? progresso.legendSectors : [filtros.setor];
    var series = ids.map(function (id) {
      var s = setores.filter(function (x) { return x.id === id; })[0];
      var corte = recortarPeriodo(dashboard.dates, dashboard.dailyHours[id], p.de, p.ate);
      return { name: s.name, color: s.color, data: corte.values, categories: corte.categories };
    });
    desenharGrafico(series);
    desenharRanking();
  }

  function desenharGrafico(series) {
    if (grafico) { grafico.destroy(); grafico = null; }
    $('#legenda').html(legend(series));
    var categorias = series.length ? series[0].categories : [];
    if (!categorias.length) {
      $('#grafico-progresso').html(emptyState({ title: 'Sem dados no período', text: 'Escolha outro intervalo de datas.', iconName: 'calendar' }));
      return;
    }
    $('#grafico-progresso').empty();
    grafico = areaChart(document.getElementById('grafico-progresso'), {
      categories: categorias,
      series: series.map(function (s) { return { name: s.name, color: s.color, data: s.data }; }),
      height: 280,
      formatX: function (c) { return formatDate(c, 'DD/MM'); },
      formatTitle: function (c) { return formatDate(c); },
      formatY: function (v) { return Number(v.toFixed(1)) + 'h'; },
      ariaLabel: 'Evolução do desenvolvimento por setor'
    });
  }

  function desenharRanking() {
    var nomeDoSetor = (setores.filter(function (s) { return s.id === filtros.setor; })[0] || {}).name;
    var lista = progresso.ranking.filter(function (r) { return filtros.setor === 'todos' || r.sector === nomeDoSetor; });
    if (!lista.length) {
      $('#ranking').html(emptyState({ title: 'Sem colaboradores neste setor', iconName: 'users' }));
      return;
    }
    $('#ranking').html('<div class="table-wrap"><table class="table responsive-table">' +
      '<caption class="sr-only">Ranking de colaboradores</caption>' +
      '<thead><tr><th scope="col">#</th><th scope="col">Colaborador</th><th scope="col">Setor</th><th scope="col">Progresso</th><th scope="col">Horas</th><th scope="col">Concluídos</th><th scope="col" class="cell-right"><span class="sr-only">Ações</span></th></tr></thead><tbody>' +
      lista.map(function (r, i) {
        return '<tr><td data-label="Posição" class="cell-strong">' + (i + 1) + 'º</td>' +
          '<td data-label="Colaborador">' + userCell(r.name) + '</td><td data-label="Setor">' + esc(r.sector) + '</td>' +
          '<td data-label="Progresso">' + progressInline(r.progress, { max: 120, label: r.name + ': ' + r.progress + '%' }) + '</td>' +
          '<td data-label="Horas">' + r.hours + 'h</td><td data-label="Concluídos">' + r.completed + '</td>' +
          '<td class="cell-right" data-label="Detalhes"><a class="btn btn--ghost btn--icon" href="detalhes-colaborador.html?id=' + encodeURIComponent(r.collaboratorId) + '" aria-label="Ver detalhes de ' + esc(r.name) + '">' + icon('eye', { size: 18 }) + '</a></td></tr>';
      }).join('') + '</tbody></table></div>');
  }

  $('#filtro-setor').on('change', function () { filtros.setor = $(this).val(); desenhar(); });

  $('#botao-periodo').on('click', function () {
    var p = periodo();
    abrirPeriodo(this, p.de, p.ate, function (novo) {
      filtros.de = novo.from;
      filtros.ate = novo.to;
      desenhar();
    });
  });
});
