/** COLABORADORES (Figma: "Aba Colaboradores - Gestor"): lista com busca, filtros e cadastro. */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'colaboradores');

  var filtros = { busca: '', setor: parametroUrl('setor') || 'todos', status: 'Ativo' };
  var banco = null;   // { items: [...colaboradores], sectorsFilter: [...] }

  buscarColaboradores()
    .then(function (db) {
      banco = db;
      // opções do filtro de setor
      $('#filtro-setor').append(db.sectorsFilter.map(function (nome) {
        return '<option value="' + esc(nome) + '">Setor: ' + esc(nome) + '</option>';
      }).join(''));
      $('#filtro-setor').val(filtros.setor);
      desenharTabela();
    })
    .catch(mostrarErroDaPagina);

  /** Aplica busca, setor e status sobre a lista completa. */
  function filtrar() {
    var q = normalize(filtros.busca);
    return banco.items.filter(function (c) {
      return (filtros.setor === 'todos' || c.sectorName === filtros.setor) &&
             (filtros.status === 'todos' || c.status === filtros.status) &&
             (!q || normalize(c.name + ' ' + c.email + ' ' + c.sectorName).indexOf(q) !== -1);
    });
  }

  function desenharTabela() {
    var lista = filtrar();
    if (!lista.length) {
      $('#tabela-colaboradores').html(emptyState({ title: 'Nenhum colaborador encontrado', text: 'Ajuste a busca ou os filtros.', iconName: 'users' }));
      return;
    }
    var linhas = lista.map(function (c) {
      return '<tr>' +
        '<td data-label="Colaborador">' + userCell(c.name, c.email) + '</td>' +
        '<td data-label="Setor">' + esc(c.sectorName) + '</td>' +
        '<td data-label="Progresso">' + progressInline(c.progress, { max: 120, label: 'Progresso de ' + c.name }) + '</td>' +
        '<td data-label="Horas">' + c.hours + 'h</td>' +
        '<td data-label="Cursos">' + c.courses + '</td>' +
        '<td class="cell-right" data-label="Detalhes"><a class="btn btn--ghost btn--icon" href="detalhes-colaborador.html?id=' + encodeURIComponent(c.id) + '" aria-label="Ver detalhes de ' + esc(c.name) + '">' + icon('eye', { size: 18 }) + '</a></td>' +
      '</tr>';
    }).join('');
    $('#tabela-colaboradores').html(
      '<div class="table-wrap"><table class="table table--collab responsive-table">' +
        '<caption class="sr-only">Lista de colaboradores — ' + lista.length + ' resultado(s)</caption>' +
        '<thead><tr><th scope="col">Colaborador</th><th scope="col">Setor</th><th scope="col">Progresso</th><th scope="col">Horas</th><th scope="col">Cursos</th><th scope="col" class="cell-right"><span class="sr-only">Ações</span></th></tr></thead>' +
        '<tbody>' + linhas + '</tbody></table></div>');
  }

  /* ---------------------------------------------------------------- interações */

  $('#busca').on('input', debounce(function () {
    filtros.busca = $('#busca').val();
    desenharTabela();
  }, 250));

  $('#filtro-setor').on('change', function () { filtros.setor = $(this).val(); desenharTabela(); });
  $('#filtro-status').on('change', function () { filtros.status = $(this).val(); desenharTabela(); });

  // Botão "Adicionar colaborador": abre o modal com formulário
  $('#btn-adicionar').on('click', function () {
    buscarDados('sectors').then(function (db) {
      var opcoes = db.items.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
      openModal({
        title: 'Adicionar colaborador',
        description: 'O colaborador será criado ativo e sem cursos matriculados.',
        confirmLabel: 'Adicionar',
        body:
          '<label class="field"><span class="field__label">Nome completo</span><input class="input" name="name" data-autofocus autocomplete="off"></label>' +
          '<label class="field"><span class="field__label">E-mail</span><input class="input" name="email" type="email" autocomplete="off"></label>' +
          '<label class="field"><span class="field__label">Setor</span><span class="select select--field"><select name="sector">' + opcoes + '</select>' + icon('chevron-down', { size: 14 }) + '</span></label>' +
          '<label class="field"><span class="field__label">Cargo</span><input class="input" name="role" placeholder="Ex.: Analista"></label>',
        onSubmit: function (form) {
          var valido = validateForm(form, {
            name: function (v) { return rules.required('Informe o nome.')(v) || rules.minLen(3, 'Informe nome e sobrenome.')(v); },
            email: function (v) { return rules.required('Informe o e-mail.')(v) || rules.email()(v); }
          });
          if (!valido) return false;
          return criarColaborador({
            name: $.trim(form.elements.name.value),
            email: $.trim(form.elements.email.value),
            sector: form.elements.sector.value,
            role: $.trim(form.elements.role.value)
          }).then(function (novo) {
            toast(novo.name + ' foi adicionado(a).', { type: 'success' });
            filtros.status = 'Ativo';
            $('#filtro-status').val('Ativo');
            return buscarColaboradores().then(function (db) { banco = db; desenharTabela(); });
          });
        }
      });
    }).catch(function (erro) { toast(erro.message, { type: 'error' }); });
  });
});
