/** CONFIGURAÇÕES — só Gestor (Figma: "Configurações - Gestor"). */
$(function () {
  var sessao = protegerPagina(['gestor']);
  if (!sessao) return;
  montarLayout(sessao, 'configuracoes');

  var config = null;            // configurações atuais (JSON + o que foi salvo na demonstração)
  var statusIntegracoes = {};   // mudanças nas integrações que ainda não foram salvas
  var $form = $('#form-config');

  buscarDados('settings')
    .then(function (db) {
      // junta o JSON original com o que o gestor já salvou antes
      var salvo = lerBancoDemo().settings;
      if (salvo) {
        db.integrations = db.integrations.map(function (i) {
          return $.extend({}, i, { status: (salvo.integrations || {})[i.id] || i.status });
        });
        db.general = $.extend({}, db.general, salvo.general);
        db.security = $.extend({}, db.security, salvo.security);
      }
      config = db;
      preencherFormulario();
    })
    .catch(mostrarErroDaPagina);

  function preencherFormulario() {
    var f = $form[0].elements;
    f.companyName.value = config.general.companyName;
    f.cnpj.value = config.general.cnpj;
    $(f.dateFormat).html(config.dateFormats.map(function (d) {
      return '<option' + (d === config.general.dateFormat ? ' selected' : '') + '>' + d + '</option>';
    }).join(''));
    $(f.renewal).html(config.renewalOptions.map(function (d) {
      return '<option value="' + d + '"' + (d === config.security.passwordRenewalDays ? ' selected' : '') + '>A cada ' + d + ' dias</option>';
    }).join(''));
    $('#ultima-renovacao').text('Última renovação há ' + config.security.lastRenewalDaysAgo + ' dias.');
    definirDoisFatores(config.security.twoFactor);
    marcarTema(Tema.obter());
    statusIntegracoes = {};
    desenharIntegracoes();
  }

  function desenharIntegracoes() {
    $('#lista-integracoes').html(config.integrations.map(function (i) {
      var status = statusIntegracoes[i.id] || i.status;
      return '<li class="integration"><span class="integration__logo" aria-hidden="true">' + esc(i.name.charAt(0)) + '</span>' +
        '<strong>' + esc(i.name) + '</strong>' + statusBadge(status) +
        '<button type="button" class="btn btn--outline btn--sm" data-integracao="' + i.id + '">' + (status === 'Conectado' ? 'Gerenciar' : 'Conectar') + '</button></li>';
    }).join(''));
  }

  /* ---------------------------------------------------------------- aparência (tema) */
  function marcarTema(tema) {
    $('[data-tema]').each(function () { $(this).attr('aria-checked', String($(this).data('tema') === tema)); });
  }
  $('[data-tema]').on('click', function () {
    Tema.definir($(this).data('tema'));
    marcarTema($(this).data('tema'));
  });

  /* ---------------------------------------------------------------- autenticação em dois fatores */
  function definirDoisFatores(ligado) {
    $('#twoFactor').attr('aria-checked', String(ligado));
    $('#texto-2fa').text(ligado ? 'Ativada' : 'Desativada');
  }
  $('#twoFactor').on('click', function () {
    definirDoisFatores($(this).attr('aria-checked') !== 'true');
  });

  /* ---------------------------------------------------------------- integrações (modal) */
  $('#lista-integracoes').on('click', '[data-integracao]', function () {
    var id = $(this).data('integracao');
    var item = config.integrations.filter(function (i) { return i.id === id; })[0];
    var conectado = (statusIntegracoes[id] || item.status) === 'Conectado';
    openModal({
      title: (conectado ? 'Gerenciar ' : 'Conectar ') + item.name,
      description: conectado ? 'A integração está ativa. Você pode desconectá-la.' : 'Conexão demonstrativa: nenhuma credencial é enviada.',
      confirmLabel: conectado ? 'Desconectar' : 'Conectar',
      body: conectado ? '' : '<label class="field"><span class="field__label">Chave de API (demonstração)</span><input class="input" name="key" data-autofocus></label>',
      onSubmit: function (form) {
        if (!conectado && !validateForm(form, { key: rules.required('Informe a chave de API.') })) return false;
        statusIntegracoes[id] = conectado ? 'Pendente' : 'Conectado';
        desenharIntegracoes();
        toast(item.name + ': ' + statusIntegracoes[id].toLowerCase() + '. Clique em "Salvar alterações" para confirmar.', { type: 'info' });
      }
    });
  });

  /* ---------------------------------------------------------------- salvar / descartar */
  $('#btn-descartar').on('click', preencherFormulario);

  $form.on('submit', function (e) {
    e.preventDefault();
    var f = $form[0].elements;
    var valido = validateForm($form[0], {
      companyName: rules.required('Informe o nome da empresa.'),
      cnpj: function (v) { return /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v) ? '' : 'Informe um CNPJ válido (00.000.000/0000-00).'; }
    });
    if (!valido) return;

    var antes = (lerBancoDemo().settings || {}).integrations || {};
    salvarBancoDemo({
      settings: {
        general: { companyName: $.trim(f.companyName.value), cnpj: $.trim(f.cnpj.value), dateFormat: f.dateFormat.value },
        security: { passwordRenewalDays: Number(f.renewal.value), twoFactor: $('#twoFactor').attr('aria-checked') === 'true' },
        integrations: $.extend({}, antes, statusIntegracoes)
      }
    });
    toast('Configurações salvas.', { type: 'success' });
    buscarDados('settings').then(function (db) {
      var salvo = lerBancoDemo().settings;
      db.integrations = db.integrations.map(function (i) { return $.extend({}, i, { status: (salvo.integrations || {})[i.id] || i.status }); });
      db.general = $.extend({}, db.general, salvo.general);
      db.security = $.extend({}, db.security, salvo.security);
      config = db;
      preencherFormulario();
    });
  });
});
