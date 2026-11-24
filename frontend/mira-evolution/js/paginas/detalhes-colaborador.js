/**
 * DETALHES DO COLABORADOR — GET /colaboradores/{id}. Página compartilhada:
 *  - Gestor:      detalhes-colaborador.html?id=4  (colaborador escolhido, com link "Voltar")
 *  - Colaborador: detalhes-colaborador.html       (os próprios dados: é o "Progresso" dele)
 */
$(function () {
  var sessao = protegerPagina(['gestor', 'colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'progresso');

  // Para o gestor, esta tela pertence ao item "Colaboradores" do menu
  var ehGestor = podeFazer(sessao.role, 'voltarParaLista');
  if (ehGestor) $('.nav-link').removeAttr('aria-current').filter('[data-nav="colaboradores"]').attr('aria-current', 'page');

  /* ---------------------------------------------------------------- estado */

  var colaborador = null;
  var grafico = null;
  var idDesejado = parametroUrl('id') || sessao.collaboratorId;

  /* ---------------------------------------------------------------- carga */

  if (ehGestor) {
    $('#topo-detalhe').html('<a class="back-link" href="colaboradores.html">' + icon('arrow-left', { size: 16 }) + 'Voltar para Colaboradores</a>');
  } else {
    $('#topo-detalhe').html('<h1 class="page-title">Meu progresso</h1>');
    $('#recent-title').text('Meus Cursos Recentes');
  }
  $('#link-cursos').attr('href', paginaDoMenu('cursos', sessao.role));

  buscarColaborador(idDesejado)
    .then(function (c) {
      colaborador = c;
      document.title = c.name + ' — Mira Evolution';
      desenharPagina();
    })
    .catch(mostrarErroDaPagina);

  /* ---------------------------------------------------------------- desenho */

  function diasEscolhidos() { return Number($('#filtro-dias').val()); }

  function desenharPagina() {
    var c = colaborador;

    if (ehGestor) $('.detail__top').after('<h1 class="sr-only">' + esc(c.name) + '</h1>');

    $('#resumo').html(
      avatar(c.name, 80) +
      '<div class="profile-summary__info">' +
        '<div class="profile-summary__name"><h2>' + esc(c.name) + '</h2>' +
          (c.status === 'Ativo' ? '<span class="badge badge--green">Ativo</span>' : '<span class="badge badge--gray">Inativo</span>') + '</div>' +
        '<p>' + esc(c.role) + ' · ' + esc(c.sectorName) + '</p>' +
        tags(c.skills) +
      '</div>');

    var k = c.kpis;
    $('#kpis').html(
      kpiLeft({ label: 'Horas de desenvolvimento', value: k.hours.value + 'h', delta: k.hours.delta, note: k.hours.note }) +
      kpiLeft({ label: 'Progresso geral', value: k.progress.value + '%', delta: k.progress.delta, note: k.progress.note }) +
      kpiLeft({ label: 'Cursos em Andamento', value: String(k.inProgress.value), delta: k.inProgress.delta, note: k.inProgress.note }) +
      kpiLeft({ label: 'Cursos Concluídos', value: String(k.completed.value), delta: k.completed.delta, note: k.completed.note }));

    $('#cursos-recentes').html(c.recentCourses.length
      ? '<ul class="course-list">' + c.recentCourses.map(function (r) {
          return '<li class="course-item"><div class="course-item__info"><strong>' + esc(r.title) + '</strong><span>' + esc(r.status) + '</span></div>' +
            progressInline(r.progress, { max: 120, label: r.title + ': ' + r.progress + '%' }) + '</li>';
        }).join('') + '</ul>'
      : emptyState({ title: 'Nenhum curso recente', iconName: 'book-open' }));

    $('#certificados').html(c.certificates.length
      ? '<ul class="cert-list">' + c.certificates.map(function (cert, i) {
          return '<li class="cert"><span class="cert__icon">' + icon('award', { size: 20 }) + '</span>' +
            '<div class="cert__meta"><strong>' + esc(cert.title) + '</strong><span>Emitido em: ' + esc(cert.issuedAt) + '</span></div>' +
            '<button type="button" class="btn btn--ghost btn--icon" data-download="' + i + '" aria-label="Baixar certificado: ' + esc(cert.title) + '">' + icon('download', { size: 16 }) + '</button></li>';
        }).join('') + '</ul>'
      : emptyState({ title: 'Nenhum certificado ainda', iconName: 'award' }));

    $('#competencias').html(c.competencies.length ? tags(c.competencies) : emptyState({ title: 'Sem competências registradas' }));

    desenharGrafico();
  }

  function desenharGrafico() {
    if (grafico) { grafico.destroy(); grafico = null; }
    var pontos = colaborador.frequency.slice(-diasEscolhidos());
    if (!colaborador.frequency.length) {
      $('#grafico-frequencia').removeClass('detail__plot').html(emptyState({ title: 'Sem registros de frequência', iconName: 'calendar' }));
      return;
    }
    $('#grafico-frequencia').empty();
    grafico = areaChart(document.getElementById('grafico-frequencia'), {
      categories: pontos.map(function (p) { return p.date; }),
      series: [{ name: 'Frequência', color: 'var(--chart-line)', data: pontos.map(function (p) { return p.value; }) }],
      height: 214,
      formatX: function (c) { return formatDate(c, 'DD/MM'); },
      formatTitle: function (c) { return formatDate(c); },
      formatY: function (v) { return Math.round(v) + '%'; },
      ariaLabel: 'Evolução de frequência'
    });
  }

  /** Certificado de demonstração em SVG, usado quando o curso não tem o endereço do certificado real. */
  function certificadoSvg(cert, nome) {
    function limpa(t) { return String(t).replace(/[<>&]/g, ''); }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="0 0 1123 794"><rect width="1123" height="794" fill="#000c29"/><rect x="24" y="24" width="1075" height="746" fill="none" stroke="#626eee" stroke-width="3"/>' +
      '<text x="561" y="190" fill="#fefefe" font-family="Inter,Arial" font-size="54" font-weight="700" text-anchor="middle">CERTIFICADO</text>' +
      '<text x="561" y="270" fill="#9aa4ba" font-family="Inter,Arial" font-size="24" text-anchor="middle">Certificamos que</text>' +
      '<text x="561" y="350" fill="#fefefe" font-family="Inter,Arial" font-size="46" font-weight="600" text-anchor="middle">' + limpa(nome) + '</text>' +
      '<text x="561" y="425" fill="#9aa4ba" font-family="Inter,Arial" font-size="24" text-anchor="middle">concluiu o curso</text>' +
      '<text x="561" y="490" fill="#8d9cff" font-family="Inter,Arial" font-size="34" font-weight="600" text-anchor="middle">' + limpa(cert.title) + '</text>' +
      '<text x="561" y="640" fill="#9aa4ba" font-family="Inter,Arial" font-size="20" text-anchor="middle">Emitido em ' + limpa(cert.issuedAt) + ' · Mira Evolution (documento de demonstração)</text></svg>';
  }

  /* ---------------------------------------------------------------- interações */

  $('#filtro-dias').on('change', desenharGrafico);

  $('#certificados').on('click', '[data-download]', function () {
    var cert = colaborador.certificates[Number($(this).data('download'))];
    // Só abre endereços http(s), para não executar links "javascript:" vindos do banco
    if (/^https?:\/\//i.test(cert.url || '')) {
      window.open(cert.url, '_blank', 'noopener');
      return;
    }
    var blob = new Blob([certificadoSvg(cert, colaborador.name)], { type: 'image/svg+xml' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'certificado-' + cert.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    toast('Certificado de demonstração baixado.', { type: 'success' });
  });
});
