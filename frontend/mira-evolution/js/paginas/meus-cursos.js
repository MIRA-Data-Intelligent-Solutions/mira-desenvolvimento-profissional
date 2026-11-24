/** MEUS CURSOS (COLABORADOR) — GET /me/cursos (Figma: "Cursos - Colaborador"). */
$(function () {
  var sessao = protegerPagina(['colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'cursos');

  /* ---------------------------------------------------------------- estado */

  var filtros = { categoria: 'Todos', status: 'Todos', busca: '' };
  var STATUS = ['Todos', 'Em andamento', 'Concluído'];

  /* ---------------------------------------------------------------- carga */

  // Indicadores e categorias só na primeira carga; depois os filtros redesenham apenas a lista
  buscarMatriculas(sessao.id)
    .then(function (db) {
      var k = db.kpis;
      $('#kpis').html(
        kpiCenter({ label: 'Progresso Geral', value: k.general + '%', note: 'média das matrículas' }) +
        kpiCenter({ label: 'Cursos em Andamento', value: String(k.inProgress), note: 'matrículas ativas' }) +
        kpiCenter({ label: 'Plataformas', value: String(k.platforms), note: 'das suas matrículas' }) +
        kpiCenter({ label: 'Cursos Concluídos', value: String(k.completed), note: 'cursos finalizados' }));
      $('#pills-categoria').html(['Todos'].concat(db.categories).map(function (c) {
        return '<button type="button" class="pill" data-categoria="' + esc(c) + '" aria-pressed="' + (c === 'Todos') + '">' + esc(c) + '</button>';
      }).join(''));
      desenharLista();
    })
    .catch(mostrarErroDaPagina);

  /* ---------------------------------------------------------------- desenho */

  function desenharLista() {
    buscarMatriculas(sessao.id, filtros).then(function (db) {
      if (!db.items.length) {
        $('#lista-cursos').html(emptyState({ title: 'Nenhum curso encontrado', text: 'Altere a busca ou os filtros.', iconName: 'book-open' }));
        return;
      }
      $('#lista-cursos').html('<ul class="course-cards">' + db.items.map(function (c) {
        return '<li class="card course-card">' +
          '<div class="course-card__cover" aria-hidden="true">' + esc(c.cover) + '</div>' +
          '<div class="course-card__body">' +
            '<div class="course-card__head"><h3>' + esc(c.title) + '</h3>' + categoryBadge(c.category) + statusBadge(c.status) + '</div>' +
            '<p class="course-card__meta">' +
              // o banco ainda não tem módulos: mostra só a carga horária
              (c.modules != null ? icon('layers', { size: 14 }) + c.modules + ' módulos <span aria-hidden="true">·</span> ' : '') +
              icon('clock', { size: 14 }) + c.hours + 'h</p>' +
            '<div class="course-card__progress"><span>' + c.progress + '%</span>' + progressBar(c.progress, { height: 8, label: c.title + ': ' + c.progress + '%' }) + '</div>' +
          '</div>' +
          '<a class="btn btn--outline course-card__cta" href="detalhe-curso.html?id=' + encodeURIComponent(c.courseId) + '" aria-label="Acessar curso ' + esc(c.title) + '">Acessar</a>' +
        '</li>';
      }).join('') + '</ul>');
    }).catch(mostrarErroDaPagina);
  }

  /* ---------------------------------------------------------------- interações */

  $('#busca').on('input', debounce(function () {
    filtros.busca = $('#busca').val();
    desenharLista();
  }, 250));

  $('#pills-categoria').on('click', '.pill', function () {
    $('#pills-categoria .pill').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    filtros.categoria = $(this).data('categoria');
    desenharLista();
  });

  $('#botao-filtros').on('click', function () {
    openModal({
      title: 'Filtros',
      description: 'Filtre os cursos pelo status da matrícula.',
      confirmLabel: 'Aplicar',
      body: '<fieldset class="field"><legend class="field__label">Status</legend>' + STATUS.map(function (s) {
        return '<label class="check" style="margin-top:10px"><input type="radio" name="status" value="' + s + '"' + (s === filtros.status ? ' checked' : '') + '>' +
          '<span class="check__box">' + icon('check', { size: 14, stroke: 3 }) + '</span>' + s + '</label>';
      }).join('') + '</fieldset>',
      onSubmit: function (form) {
        filtros.status = form.elements.status.value;
        $('#texto-filtros').text('Filtros' + (filtros.status !== 'Todos' ? ' (' + filtros.status + ')' : ''));
        desenharLista();
      }
    });
  });
});
