/** LOGIN — POST /login. Visual fixo no tema escuro (Figma). Contas de teste: CONTAS_TESTE em config.js. */
$(function () {
  preencherIcones();

  // Já logado com token válido: vai direto para o dashboard
  var sessaoAtual = lerSessao();
  if (sessaoAtual) {
    window.location.replace(paginaInicial(sessaoAtual.role));
    return;
  }

  /* ---------------------------------------------------------------- estado */

  var $form = $('#form-login');
  var $erro = $('.login__error');
  var $usuario = $('#login-user');
  var $senha = $('#login-pass');
  var $enviar = $('.login__submit');

  $usuario.trigger('focus');

  /* ---------------------------------------------------------------- interações */

  $('[data-action="toggle-pass"]').on('click', function () {
    var mostrar = $senha.attr('type') === 'password';
    $senha.attr('type', mostrar ? 'text' : 'password');
    $(this).html(icon(mostrar ? 'eye-off' : 'eye', { size: 22, stroke: 1.6 }))
      .attr('aria-pressed', String(mostrar))
      .attr('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });

  if (parametroUrl('sessao') === 'expirada') mostrarErro('Sua sessão expirou. Entre novamente.');

  $('[data-action="forgot"]').on('click', function () {
    mostrarErro('Recuperação de senha indisponível no momento. Procure seu gestor.');
  });

  // Quadro "Acessos de demonstração": um botão por conta de teste; sem contas, o quadro some
  var contas = CONTAS_TESTE.filter(function (c) { return c.email; });
  $('.login__demo').prop('hidden', !contas.length);
  $('[data-contas-teste]').html(contas.map(function (c, i) {
    return '<li><button type="button" data-demo="' + i + '"><strong>' + esc(c.rotulo) + '</strong><span>' + esc(c.email) + '</span></button></li>';
  }).join(''));

  $('[data-contas-teste]').on('click', '[data-demo]', function () {
    var conta = contas[Number($(this).data('demo'))];
    $usuario.val(conta.email);
    $senha.val(conta.senha);
    mostrarErro('');
    $senha.trigger('focus');
  });

  $form.on('submit', async function (e) {
    e.preventDefault();
    mostrarErro('');
    if (!$.trim($usuario.val()) || !$senha.val()) {
      mostrarErro('Informe e-mail e senha.');
      ($.trim($usuario.val()) ? $senha : $usuario).trigger('focus');
      return;
    }
    $enviar.prop('disabled', true).addClass('is-loading');
    var resultado = await entrar($usuario.val(), $senha.val(), $form.find('[name="remember"]').prop('checked'));
    $enviar.prop('disabled', false).removeClass('is-loading');
    if (!resultado.ok) {
      mostrarErro(resultado.error);
      $senha.trigger('select');
      return;
    }
    window.location.href = destinoDepoisDoLogin(resultado.sessao.role);
  });

  /* ---------------------------------------------------------------- apoio */

  function mostrarErro(mensagem) {
    $erro.text(mensagem).prop('hidden', !mensagem);
  }

  /** Página do ?next= (só arquivos .html do projeto, para evitar redirecionamento externo) ou o dashboard. */
  function destinoDepoisDoLogin(perfil) {
    var proximo = parametroUrl('next');
    if (/^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(proximo) && proximo.indexOf('login.html') !== 0) return proximo;
    return paginaInicial(perfil);
  }
});
