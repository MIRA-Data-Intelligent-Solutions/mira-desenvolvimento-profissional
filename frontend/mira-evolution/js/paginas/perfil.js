/** MEU PERFIL — GET/PUT /me/perfil. Página compartilhada pelos dois perfis (Figma: "Meu Perfil"). */
$(function () {
  var sessao = protegerPagina(['gestor', 'colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'perfil');

  /* ---------------------------------------------------------------- estado */

  var perfil = null;
  var habilidades = [];     // lista em edição (só vai para a API ao salvar)
  var $form = $('#form-perfil');

  // Regra: e-mail (login) e departamento (setor definido pelo gestor) não são alterados aqui
  $form.find('[name="email"], [name="department"]').prop('readOnly', true)
    .attr('title', 'Este campo não pode ser alterado por aqui.');

  /* ---------------------------------------------------------------- carga */

  carregar();

  function carregar() {
    carregandoFormulario($form, true);     // campos em skeleton até os dados chegarem
    return buscarPerfil()
      .then(function (dados) {
        carregandoFormulario($form, false);
        mostrarPerfil(dados);
      })
      .catch(mostrarErroDaPagina);
  }

  /* ---------------------------------------------------------------- desenho */

  function mostrarPerfil(dados) {
    perfil = dados;
    habilidades = perfil.skills.slice();
    desenhar();
  }

  function desenharHabilidades() {
    $('#cartao-perfil .tag-list').replaceWith(tags(habilidades, { addButton: true }));
  }

  function desenhar() {
    $('#cartao-perfil').removeAttr('aria-busy').html(
      avatar(perfil.name, 96) +
      '<h2>' + esc(perfil.name) + '</h2>' +
      '<p class="profile__title">' + esc(perfil.title) + '</p>' +
      '<h3 class="card__title">Habilidades</h3>' + tags(habilidades, { addButton: true }));
    var f = $form[0].elements;
    f.name.value = perfil.name;
    f.title.value = perfil.title;
    f.email.value = perfil.email;
    f.phone.value = perfil.phone;
    f.department.value = perfil.department;
    f.bio.value = perfil.bio;
  }

  /* ---------------------------------------------------------------- interações */

  $form.on('input', '[name="phone"]', function () { this.value = maskPhone(this.value); });

  $('#btn-cancelar').on('click', function () {
    habilidades = perfil.skills.slice();
    desenhar();
  });

  $('#cartao-perfil').on('click', '[data-action="add-skill"]', function () {
    openModal({
      title: 'Adicionar habilidade',
      confirmLabel: 'Adicionar',
      body: '<label class="field"><span class="field__label">Habilidade</span><input class="input" name="skill" data-autofocus></label>',
      onSubmit: function (form) {
        if (!validateForm(form, { skill: rules.required('Informe a habilidade.') })) return false;
        var valor = $.trim(form.elements.skill.value);
        if (habilidades.indexOf(valor) === -1) habilidades.push(valor);
        desenharHabilidades();
      }
    });
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    var f = $form[0].elements;
    var valido = validateForm($form[0], {
      name: rules.required('Informe seu nome.'),
      title: rules.required('Informe seu cargo.'),
      phone: function (v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Informe um telefone com DDD.'; }
    });
    if (!valido) return;

    var $salvar = $form.find('[type="submit"]');
    if ($salvar.hasClass('is-loading')) return;
    carregandoBotao($salvar, true);
    salvarPerfil({
      nome: $.trim(f.name.value),
      funcao: $.trim(f.title.value),
      telefone: $.trim(f.phone.value),
      sobre_mim: $.trim(f.bio.value),
      habilidades: habilidades
    })
      .then(function (atualizado) {
        mostrarPerfil(atualizado);
        // Atualiza o nome no rodapé do menu lateral
        var nova = atualizarSessao({ name: atualizado.name, firstName: atualizado.firstName, title: atualizado.title });
        window.dispatchEvent(new CustomEvent('mira:session-updated', { detail: nova }));
        toast('Perfil atualizado.', { type: 'success' });
      })
      .catch(function (erro) { toast(erro.message, { type: 'error' }); })
      .finally(function () { carregandoBotao($salvar, false); });
  });
});
