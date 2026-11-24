/** DETALHE DO CURSO (COLABORADOR) — GET /me/cursos/{id}. Endereço: detalhe-curso.html?id=12 (Figma: "Detalhes do Curso"). */
$(function () {
  var sessao = protegerPagina(['colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'cursos');

  /* ---------------------------------------------------------------- estado */

  var idCurso = parametroUrl('id');
  var ICONE_MODULO = { 'Concluído': 'circle-check', 'Em andamento': 'circle-play', 'Bloqueado': 'lock' };

  /* ---------------------------------------------------------------- carga */

  buscarCurso(sessao.id, idCurso)
    .then(desenhar)
    .catch(mostrarErroDaPagina);

  /* ---------------------------------------------------------------- desenho */

  function desenhar(c) {
    var terminou = c.progress >= 100;
    document.title = c.title + ' — Mira Evolution';

    $('#curso-topo').html(
      '<div class="course-card__cover course-card__cover--lg" aria-hidden="true">' + esc(c.cover) + '</div>' +
      '<div class="course-hero__info">' +
        '<div class="course-card__head">' + categoryBadge(c.area) + statusBadge(c.status || (terminou ? 'Concluído' : 'Em andamento')) + '</div>' +
        '<h1 class="page-title">' + esc(c.title) + '</h1>' +
        '<p class="page-subtitle">Instrutor(a): ' + esc(c.instructor) + '</p>' +
        '<div class="course-hero__progress"><div class="goal__labels"><strong>' + c.progress + '% Concluído</strong><span>' + c.doneHours + 'h / ' + c.hours + 'h</span></div>' +
          progressBar(c.progress, { height: 8, label: 'Progresso: ' + c.progress + '%' }) + '</div>' +
      '</div>');

    $('#lista-modulos').html(c.modules.length
      ? c.modules.map(function (m) {
          var tipo = m.status === 'Concluído' ? 'done' : (m.status === 'Bloqueado' ? 'locked' : 'current');
          return '<li class="module module--' + tipo + '"><span class="module__icon">' + icon(ICONE_MODULO[m.status] || 'circle', { size: 22 }) + '</span>' +
            '<div class="module__text"><strong>' + m.order + '. ' + esc(m.title) + '</strong><span>' + m.hours + 'h</span></div>' + statusBadge(m.status) + '</li>';
        }).join('')
      : '<li>' + emptyState({ title: 'Módulos não disponíveis', text: 'Os módulos aparecerão quando o curso for sincronizado com a plataforma.', iconName: 'layers' }) + '</li>');

    $('#detalhes-praticos').html(
      '<div><dt>Módulos</dt><dd>' + esc(c.moduleCount) + '</dd></div>' +
      '<div><dt>Carga horária</dt><dd>' + c.hours + 'h</dd></div>' +
      '<div><dt>Início</dt><dd>' + esc(c.startDate) + '</dd></div>' +
      '<div><dt>Prazo</dt><dd>' + esc(c.deadline) + '</dd></div>' +
      '<div><dt>Certificado</dt><dd>' + esc(c.certificate) + '</dd></div>');

    // "Continuar Curso" fica desativado: o progresso virá da integração com as plataformas
    $('#btn-continuar')
      .prop('disabled', true)
      .attr('title', terminou ? '' : 'Disponível em breve')
      .html(terminou ? 'Curso concluído' : 'Continuar Curso' + icon('arrow-right', { size: 15 }));
  }
});
