/** SETORES (Figma: "Setores - Gestor Light/Dark"). */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'setores');

  var periodo = { de: '2026-05-20', ate: APP.hoje };

  function mostrarPeriodo() {
    $('#botao-periodo').attr('aria-label', 'Período: ' + formatDate(periodo.de) + ' a ' + formatDate(periodo.ate));
    $('#botao-periodo [data-range-label]').text(formatDate(periodo.de) + ' - ' + formatDate(periodo.ate));
  }
  mostrarPeriodo();

  buscarDados('sectors')
    .then(function (db) {
      $('#kpis').html(db.kpis.map(kpiLeft).join(''));
      // Cada cartão leva para a lista de colaboradores já filtrada pelo setor
      $('#lista-setores').html(db.items.map(function (s) {
        return '<li><a class="card sector-card" href="colaboradores.html?setor=' + encodeURIComponent(s.name) + '" aria-label="' + esc(s.name) + ': ' + s.collaborators + ' colaboradores, progresso médio ' + s.avgProgress + '%. Ver colaboradores do setor.">' +
          '<div class="sector-card__top">' +
            '<span class="sector-badge" style="--sector:' + s.color + '"><span class="sector-badge__icon">' + icon(s.icon, { size: 16 }) + '</span>' + esc(s.name) + '</span>' +
            '<span class="sector-card__count">' + s.collaborators + ' colaboradores</span>' +
          '</div>' +
          '<div class="sector-card__progress">' +
            '<div class="sector-card__row"><span>Progresso Médio</span><span>' + s.avgProgress + '% / 100%</span></div>' +
            progressBar(s.avgProgress, { color: s.color, height: 8, label: s.name + ': ' + s.avgProgress + '%' }) +
          '</div></a></li>';
      }).join(''));
    })
    .catch(mostrarErroDaPagina);

  $('#botao-periodo').on('click', function () {
    abrirPeriodo(this, periodo.de, periodo.ate, function (novo) {
      periodo = { de: novo.from, ate: novo.to };
      mostrarPeriodo();
    });
  });
});
