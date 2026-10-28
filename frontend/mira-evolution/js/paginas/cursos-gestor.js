/** CURSOS — visão do Gestor (Figma: "Cursos - Gestor"): catálogo com filtros. */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'cursos');

  var filtros = { categoria: 'Todos', busca: '' };
  var db = null;

  buscarDados('courses')
    .then(function (dados) {
      db = dados;
      $('#kpis').html(db.kpis.map(kpiLeft).join(''));
      $('#pills-categoria').html(['Todos'].concat(db.categories).map(function (c) {
        return '<button type="button" class="pill" data-categoria="' + esc(c) + '" aria-pressed="' + (c === 'Todos') + '">' + esc(c) + '</button>';
      }).join(''));
      desenharTabela();
    })
    .catch(mostrarErroDaPagina);

  function desenharTabela() {
    var q = normalize(filtros.busca);
    var lista = db.items.filter(function (c) {
      return (filtros.categoria === 'Todos' || c.category === filtros.categoria) && (!q || normalize(c.title).indexOf(q) !== -1);
    });
    if (!lista.length) {
      $('#tabela-cursos').html(emptyState({ title: 'Nenhum curso encontrado', text: 'Altere a busca ou a categoria.', iconName: 'book-open' }));
      return;
    }
    $('#tabela-cursos').html('<div class="table-wrap"><table class="table responsive-table">' +
      '<caption class="sr-only">Catálogo de cursos — ' + lista.length + ' resultado(s)</caption>' +
      '<thead><tr><th scope="col">Curso</th><th scope="col">Categoria</th><th scope="col">Inscritos</th><th scope="col">Progresso médio</th><th scope="col">Status</th></tr></thead><tbody>' +
      lista.map(function (c) {
        return '<tr><td data-label="Curso" class="cell-strong">' + esc(c.title) + '</td>' +
          '<td data-label="Categoria">' + categoryBadge(c.category) + '</td>' +
          '<td data-label="Inscritos">' + c.enrolled + '</td>' +
          '<td data-label="Progresso médio">' + progressInline(c.avgProgress, { max: 120, label: c.title + ': ' + c.avgProgress + '%' }) + '</td>' +
          '<td data-label="Status">' + statusBadge(c.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
  }

  $('#busca').on('input', debounce(function () {
    filtros.busca = $('#busca').val();
    desenharTabela();
  }, 250));

  $('#pills-categoria').on('click', '.pill', function () {
    $('#pills-categoria .pill').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    filtros.categoria = $(this).data('categoria');
    desenharTabela();
  });
});
