/** CONFIGURAÇÕES (GESTOR) — GET/PUT /configuracoes (Figma: "Configurações - Gestor"). */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'configuracoes');

  /* ---------------------------------------------------------------- estado */

  var config = null;            // configurações como vieram da API
  var $form = $('#form-config');

  /* ---------------------------------------------------------------- carga */

  buscarConfiguracoes()
    .then(function (dados) {
      config = dados;
      preencherFormulario();
    })
    .catch(mostrarErroDaPagina);

  /* ---------------------------------------------------------------- desenho */

  function preencherFormulario() {
    var f = $form[0].elements;
    f.companyName.value = config.general.companyName;
    f.cnpj.value = config.general.cnpj;
    $(f.dateFormat).html(config.dateFormats.map(function (d) {
      return '<option' + (d === config.general.dateFormat ? ' selected' : '') + '>' + esc(d) + '</option>';
    }).join(''));
    marcarTema(Tema.obter());
    desenharIntegracoes();
  }

  // A seção Integrações está comentada no HTML ("Ativar futuramente"): a lista é só leitura
  // e os botões ficam desativados até existir a integração real.
  function desenharIntegracoes() {
    $('#lista-integracoes').html(config.integrations.map(function (i) {
      return '<li class="integration"><span class="integration__logo" aria-hidden="true">' + esc(i.name.charAt(0)) + '</span>' +
        '<strong>' + esc(i.name) + '</strong>' + statusBadge(i.status) +
        '<button type="button" class="btn btn--outline btn--sm" disabled title="Disponível em breve">' + (i.status === 'Conectado' ? 'Gerenciar' : 'Conectar') + '</button></li>';
    }).join(''));
  }

  function marcarTema(tema) {
    $('[data-tema]').each(function () { $(this).attr('aria-checked', String($(this).data('tema') === tema)); });
  }

  /* ---------------------------------------------------------------- interações */

  $('[data-tema]').on('click', function () {
    Tema.definir($(this).data('tema'));
    marcarTema($(this).data('tema'));
  });

  $('#btn-descartar').on('click', function () { if (config) preencherFormulario(); });

  $form.on('submit', function (e) {
    e.preventDefault();
    if (!config) return;
    var f = $form[0].elements;
    var valido = validateForm($form[0], {
      companyName: rules.required('Informe o nome da empresa.'),
      cnpj: function (v) { return /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v) ? '' : 'Informe um CNPJ válido (00.000.000/0000-00).'; }
    });
    if (!valido) return;

    var $salvar = $form.find('[type="submit"]').prop('disabled', true);
    salvarConfiguracoes({
      nome_empresa: $.trim(f.companyName.value),
      cnpj: $.trim(f.cnpj.value),
      formato_data: f.dateFormat.value
    })
      .then(function (atualizado) {
        config = atualizado;
        preencherFormulario();
        toast('Configurações salvas.', { type: 'success' });
      })
      .catch(function (erro) { toast(erro.message, { type: 'error' }); })
      .finally(function () { $salvar.prop('disabled', false); });
  });
});
