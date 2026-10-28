/**
 * LOGIN (demonstração). Visual fixo no tema escuro, conforme o Figma.
 * Os usuários de teste ficam em js/comum/config.js.
 */
$(function () {
  preencherIcones();

  // Já está logado? Vai direto para o dashboard.
  var sessaoAtual = lerSessao();
  if (sessaoAtual) {
    window.location.replace(paginaInicial(sessaoAtual.role));
    return;
  }

  var $form = $('#form-login');
  var $erro = $('.login__error');
  var $usuario = $('#login-user');
  var $senha = $('#login-pass');
  var $enviar = $('.login__submit');

  $usuario.trigger('focus');

  function mostrarErro(mensagem) {
    $erro.text(mensagem).prop('hidden', !mensagem);
  }

  // Olho: mostrar / ocultar a senha
  $('[data-action="toggle-pass"]').on('click', function () {
    var mostrar = $senha.attr('type') === 'password';
    $senha.attr('type', mostrar ? 'text' : 'password');
    $(this).html(icon(mostrar ? 'eye-off' : 'eye', { size: 22, stroke: 1.6 }))
      .attr('aria-pressed', String(mostrar))
      .attr('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });

  $('[data-action="forgot"]').on('click', function () {
    mostrarErro('Recuperação de senha indisponível na versão demonstrativa. Use os acessos de demonstração abaixo.');
  });

  // Botões "Acessos de demonstração": preenchem o formulário
  $('[data-demo]').on('click', function () {
    var nome = $(this).data('demo');
    var usuario = USUARIOS_DEMO.filter(function (u) { return u.username === nome; })[0];
    $usuario.val(usuario.email);
    $senha.val(usuario.password);
    mostrarErro('');
    $senha.trigger('focus');
  });

  // Página para onde ir depois do login (?next=detalhes-colaborador.html?id=u01). Só aceita arquivos .html do projeto.
  function destinoDepoisDoLogin(perfil) {
    var proximo = parametroUrl('next');
    if (/^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(proximo) && proximo.indexOf('login.html') !== 0) return proximo;
    return paginaInicial(perfil);
  }

  $form.on('submit', function (e) {
    e.preventDefault();
    mostrarErro('');
    if (!$.trim($usuario.val()) || !$senha.val()) {
      mostrarErro('Informe usuário e senha.');
      ($.trim($usuario.val()) ? $senha : $usuario).trigger('focus');
      return;
    }
    $enviar.prop('disabled', true).addClass('is-loading');
    var resultado = entrar($usuario.val(), $senha.val(), $form.find('[name="remember"]').prop('checked'));
    $enviar.prop('disabled', false).removeClass('is-loading');
    if (!resultado.ok) {
      mostrarErro(resultado.error);
      $senha.trigger('select');
      return;
    }
    window.location.href = destinoDepoisDoLogin(resultado.sessao.role);
  });
});
