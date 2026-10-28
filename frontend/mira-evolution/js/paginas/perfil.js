/** MEU PERFIL — página compartilhada (Figma: "Meu Perfil"). */
$(function () {
  var sessao = protegerPagina(['gestor', 'colaborador']);
  if (!sessao) return;
  montarLayout(sessao, 'perfil');

  var perfil = null;
  var habilidades = [];
  var $form = $('#form-perfil');

  carregar();

  /** Lê o perfil do JSON e aplica o que o usuário já salvou antes. */
  function carregar() {
    return buscarDados('profiles')
      .then(function (db) {
        var base = db[sessao.role];
        var salvo = (lerBancoDemo().profiles || {})[sessao.id];
        perfil = salvo ? $.extend({}, base, salvo) : base;
        habilidades = perfil.skills.slice();
        desenhar();
      })
      .catch(mostrarErroDaPagina);
  }

  function desenharHabilidades() {
    $('#cartao-perfil .tag-list').replaceWith(tags(habilidades, { addButton: true }));
  }

  function desenhar() {
    $('#cartao-perfil').html(
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

  // Máscara de telefone enquanto digita
  $form.on('input', '[name="phone"]', function () { this.value = maskPhone(this.value); });

  $('#btn-cancelar').on('click', function () {
    habilidades = perfil.skills.slice();
    desenhar();
  });

  // "+ Adicionar" habilidade
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
      email: function (v) { return rules.required('Informe o e-mail.')(v) || rules.email()(v); },
      phone: function (v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Informe um telefone com DDD.'; }
    });
    if (!valido) return;

    var dados = {
      name: $.trim(f.name.value), title: $.trim(f.title.value), email: $.trim(f.email.value),
      phone: $.trim(f.phone.value), department: $.trim(f.department.value), bio: $.trim(f.bio.value),
      skills: habilidades
    };
    dados.firstName = dados.name.split(' ')[0];

    // Demonstração: guarda no navegador. Com API, aqui entraria um fetch PUT.
    var todos = lerBancoDemo().profiles || {};
    todos[sessao.id] = dados;
    salvarBancoDemo({ profiles: todos });

    // Atualiza o nome no menu lateral
    var nova = atualizarSessao({ name: dados.name });
    window.dispatchEvent(new CustomEvent('mira:session-updated', { detail: nova }));
    toast('Perfil atualizado.', { type: 'success' });
    carregar();
  });
});
