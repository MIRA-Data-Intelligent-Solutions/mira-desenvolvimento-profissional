/** DETALHE DO CURSO — Colaborador (Figma: "Detalhes do Curso"). Endereço: detalhe-curso.html?id=c06 */
$(function () {
  var sessao = protegerPagina(['colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'cursos');

  var idCurso = parametroUrl('id');
  var ICONE_MODULO = { 'Concluído': 'circle-check', 'Em andamento': 'circle-play', 'Bloqueado': 'lock' };

  buscarCurso(sessao.id, idCurso)
    .then(desenhar)
    .catch(mostrarErroDaPagina);

  function desenhar(c) {
    var terminou = c.progress >= 100;
    document.title = c.title + ' — Mira Evolution';

    $('#curso-topo').html(
      '<div class="course-card__cover course-card__cover--lg" aria-hidden="true">' + esc(c.cover) + '</div>' +
      '<div class="course-hero__info">' +
        '<div class="course-card__head">' + categoryBadge(c.area) + statusBadge(terminou ? 'Concluído' : 'Em andamento') + '</div>' +
        '<h1 class="page-title">' + esc(c.title) + '</h1>' +
        '<p class="page-subtitle">Instrutor(a): ' + esc(c.instructor) + '</p>' +
        '<div class="course-hero__progress"><div class="goal__labels"><strong>' + c.progress + '% Concluído</strong><span>' + c.doneHours + 'h / ' + c.hours + 'h</span></div>' +
          progressBar(c.progress, { height: 8, label: 'Progresso: ' + c.progress + '%' }) + '</div>' +
      '</div>');

    $('#lista-modulos').html(c.modules.map(function (m) {
      var tipo = m.status === 'Concluído' ? 'done' : (m.status === 'Bloqueado' ? 'locked' : 'current');
      return '<li class="module module--' + tipo + '"><span class="module__icon">' + icon(ICONE_MODULO[m.status] || 'circle', { size: 22 }) + '</span>' +
        '<div class="module__text"><strong>' + m.order + '. ' + esc(m.title) + '</strong><span>' + m.hours + 'h</span></div>' + statusBadge(m.status) + '</li>';
    }).join(''));

    $('#detalhes-praticos').html(
      '<div><dt>Módulos</dt><dd>' + c.moduleCount + '</dd></div>' +
      '<div><dt>Carga horária</dt><dd>' + c.hours + 'h</dd></div>' +
      '<div><dt>Início</dt><dd>' + esc(c.startDate) + '</dd></div>' +
      '<div><dt>Prazo</dt><dd>' + esc(c.deadline) + '</dd></div>' +
      '<div><dt>Certificado</dt><dd>' + esc(c.certificate) + '</dd></div>');

    $('#btn-continuar')
      .prop('disabled', terminou)
      .html(terminou ? 'Curso concluído' : 'Continuar Curso' + icon('arrow-right', { size: 15 }));
  }

  // "Continuar Curso": conclui o módulo atual e avança o progresso (demonstração)
  $('#btn-continuar').on('click', function () {
    var $botao = $(this).prop('disabled', true);
    avancarCurso(sessao.id, idCurso)
      .then(function (novo) {
        desenhar(novo);
        toast(novo.progress >= 100 ? 'Parabéns! Curso concluído.' : 'Progresso salvo.', { type: 'success' });
      })
      .catch(function (erro) {
        $botao.prop('disabled', false);
        toast(erro.message || 'Não foi possível atualizar o curso.', { type: 'error' });
      });
  });
});
