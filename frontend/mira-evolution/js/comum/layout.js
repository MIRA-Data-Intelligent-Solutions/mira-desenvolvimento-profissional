/**
 * LAYOUT COMPARTILHADO: menu lateral, barra do topo (celular), botões de notificação e tema,
 * e o filtro de período. Está num só arquivo para que o menu seja editado em um único lugar
 * (a lista de itens fica em config.js).
 *
 * Cada página interna tem, no HTML:  <aside class="sidebar" id="sidebar"></aside>
 * e este arquivo preenche o conteúdo.
 */

/**
 * No HTML das páginas, ícones são escritos assim:  <i data-icone="calendar" data-tamanho="16"></i>
 * Esta função troca cada <i> pelo SVG do ícone (veja a lista em icones.js).
 */
function preencherIcones() {
  $('i[data-icone]').each(function () {
    var $i = $(this);
    $i.replaceWith(icon($i.data('icone'), {
      size: Number($i.data('tamanho')) || 18,
      stroke: Number($i.data('traco')) || 2,
      cls: $i.data('classe') || ''
    }));
  });
}

/** Mostra uma mensagem de erro no lugar do conteúdo (ex.: falha ao carregar os dados). */
function mostrarErroDaPagina(erro) {
  $('#page-root').html('<div class="page card">' + errorState(erro && erro.message) + '</div>');
  $('#page-root [data-action="retry"]').on('click', function () { window.location.reload(); });
}

/** Monta menu, topo e botões. Chame no início do JavaScript de cada página interna. */
function montarLayout(sessao, chaveMenu) {
  preencherIcones();

  // --- Menu lateral
  var itens = MENU_POR_PERFIL[sessao.role].map(function (chave) {
    var item = MENU[chave];
    return '<li><a class="nav-link" href="' + paginaDoMenu(chave, sessao.role) + '" data-nav="' + chave + '"' +
      (chave === chaveMenu ? ' aria-current="page"' : '') + '>' + icon(item.icon, { size: 18 }) + '<span>' + esc(item.label) + '</span></a></li>';
  }).join('');
  var inicio = paginaInicial(sessao.role);
  $('#sidebar').html(
    '<a class="sidebar__logo" href="' + inicio + '" aria-label="Mira Evolution — ir para o Dashboard">' +
      '<img class="logo--light" src="./assets/img/logo-sidebar-light.png" alt="Mira Evolution" width="191" height="67">' +
      '<img class="logo--dark" src="./assets/img/logo-sidebar-dark.png" alt="Mira Evolution" width="199" height="61">' +
    '</a>' +
    '<nav><ul class="sidebar__nav">' + itens + '</ul></nav>' +
    '<div class="sidebar__profile" data-user>' + blocoUsuario(sessao) + '</div>'
  );

  // --- Barra do topo (aparece só em tablet/celular)
  $('.topbar').html(
    '<button type="button" class="icon-btn" data-action="open-menu" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menu">' + icon('menu', { size: 22 }) + '</button>' +
    '<a href="' + inicio + '" aria-label="Mira Evolution">' +
      '<img class="logo--light" src="./assets/img/logo-sidebar-light.png" alt="Mira Evolution" height="34">' +
      '<img class="logo--dark" src="./assets/img/logo-sidebar-dark.png" alt="Mira Evolution" height="34">' +
    '</a>'
  );

  // --- Botões de notificação e tema (cada página tem um <div class="header-tools" data-tools>)
  montarFerramentasDoTopo(sessao);

  // --- Aviso se veio de uma página sem permissão
  if (parametroUrl('acesso') === 'negado') {
    toast('Você não tem acesso a essa página.', { type: 'error' });
    window.history.replaceState(null, '', window.location.pathname);
  }
}

/** Nome, perfil e botão "sair" no rodapé do menu. */
function blocoUsuario(sessao) {
  return avatar(sessao.name, 36) +
    '<div class="sidebar__user">' +
      '<span class="sidebar__user-name">' + esc(sessao.firstName) + ' (' + esc(sessao.roleLabel) + ')</span>' +
      '<span class="sidebar__user-mode">' + esc(sessao.modeLabel) + '</span>' +
    '</div>' +
    '<button type="button" class="sidebar__logout" data-action="logout" aria-label="Sair da aplicação" title="Sair">' + icon('log-out', { size: 18 }) + '</button>';
}

/* ---------------------------------------------------------------- menu em gaveta (celular) */

function abrirMenu(abrir) {
  $('.app').toggleClass('is-menu-open', abrir);
  $('[data-action="open-menu"]').attr('aria-expanded', String(abrir));
  document.body.style.overflow = abrir ? 'hidden' : '';
}

$(document).on('click', '[data-action="open-menu"]', function () { abrirMenu(true); });
$(document).on('click', '[data-action="close-menu"], .nav-link', function () { abrirMenu(false); });
$(document).on('keydown', function (e) { if (e.key === 'Escape') abrirMenu(false); });
if (window.matchMedia) {
  window.matchMedia('(min-width: 1025px)').addEventListener('change', function (e) { if (e.matches) abrirMenu(false); });
}

$(document).on('click', '[data-action="logout"]', function () { sair(); });

// Quando o nome muda em "Meu perfil", atualiza o rodapé do menu
$(window).on('mira:session-updated', function (e) {
  $('[data-user]').html(blocoUsuario(e.originalEvent.detail));
});

/* ---------------------------------------------------------------- notificações e tema */

var _lidas = new Set(armazenamentoSessao.get('mira.notifications.read', []));
var _notificacoes = [];

function montarFerramentasDoTopo(sessao) {
  var escuro = Tema.obter() === 'dark';
  var mostrarTema = $('[data-tools]').data('semTema') === undefined;   // Configurações usa data-sem-tema
  $('[data-tools]').html(
    '<button type="button" class="icon-btn" data-action="notifications" aria-haspopup="dialog" aria-expanded="false" aria-label="Notificações">' +
      icon('bell', { size: 22 }) + '<span class="icon-btn__count" data-notif-count hidden>0</span></button>' +
    (mostrarTema
      ? '<button type="button" class="icon-btn" data-action="toggle-theme" aria-pressed="' + escuro + '" aria-label="' + (escuro ? 'Ativar tema claro' : 'Ativar tema escuro') + '">' + icon(escuro ? 'moon' : 'sun', { size: 22 }) + '</button>'
      : '')
  );
  buscarDados('notifications').then(function (db) {
    _notificacoes = db[sessao.role] || [];
    atualizarContador();
  }).catch(function () { /* sem notificações: ignora */ });
}

function atualizarContador() {
  var naoLidas = _notificacoes.filter(function (n) { return n.unread && !_lidas.has(n.id); }).length;
  $('[data-notif-count]').text(naoLidas).prop('hidden', naoLidas === 0);
}

$(document).on('click', '[data-action="toggle-theme"]', function () { Tema.alternar(); });

Tema.aoMudar(function (tema) {
  $('[data-action="toggle-theme"]')
    .html(icon(tema === 'dark' ? 'moon' : 'sun', { size: 22 }))
    .attr('aria-pressed', String(tema === 'dark'))
    .attr('aria-label', tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
});

$(document).on('click', '[data-action="notifications"]', function () {
  var lista = _notificacoes.length
    ? _notificacoes.map(function (n) {
        return '<div class="popover__item"><span class="popover__item-icon">' + icon(n.icon, { size: 15 }) + '</span>' +
          '<span style="flex:1">' + esc(n.text) + '<span class="popover__sub">' + esc(n.time) + '</span></span>' +
          (n.unread && !_lidas.has(n.id) ? '<span class="dot-unread" aria-label="não lida"></span>' : '') + '</div>';
      }).join('')
    : '<p class="popover__item">Nenhuma notificação.</p>';
  showPopover(this, {
    label: 'Notificações',
    html: '<p class="popover__title">Notificações</p>' + lista +
      '<div class="popover__footer"><button type="button" class="btn btn--ghost btn--sm" data-mark-read>Marcar todas como lidas</button></div>',
    bind: function (el, fechar) {
      $(el).find('[data-mark-read]').on('click', function () {
        _notificacoes.forEach(function (n) { _lidas.add(n.id); });
        armazenamentoSessao.set('mira.notifications.read', Array.from(_lidas));
        atualizarContador();
        fechar();
      });
    }
  });
});

/* ---------------------------------------------------------------- filtro de período (calendário) */

var PERIODOS_RAPIDOS = [
  { rotulo: 'Últimos 7 dias', dias: 7 },
  { rotulo: 'Últimos 30 dias', dias: 30 },
  { rotulo: 'Últimos 90 dias', dias: 90 }
];

/** Soma (ou subtrai) dias de uma data ISO. */
function addDays(iso, delta) {
  var d = toDate(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

/** Limites do calendário: os dados cobrem os últimos 90 dias. */
function limitesDoPeriodo() {
  return { min: addDays(APP.hoje, -89), max: APP.hoje };
}

/** Texto do botão de período (pode ser usado na primeira montagem da página). */
function botaoPeriodo(de, ate) {
  return '<button type="button" class="filter-btn" data-action="date-range" aria-haspopup="dialog" aria-expanded="false" aria-label="Período: ' + formatDate(de) + ' a ' + formatDate(ate) + '">' +
    icon('calendar', { size: 16 }) + '<span data-range-label>' + formatDate(de) + ' - ' + formatDate(ate) + '</span>' + icon('chevron-down', { size: 14 }) + '</button>';
}

/**
 * Abre o popover de período. Ao escolher, chama aoAplicar({ from, to }).
 * Como usar:  $('#periodo').on('click', function () { abrirPeriodo(this, de, ate, function (r) {...}); });
 */
function abrirPeriodo(botao, de, ate, aoAplicar) {
  var lim = limitesDoPeriodo();
  showPopover(botao, {
    label: 'Selecionar período',
    html: '<p class="popover__title">Período</p>' +
      PERIODOS_RAPIDOS.map(function (p) { return '<button type="button" class="popover__item" data-preset="' + p.dias + '">' + esc(p.rotulo) + '</button>'; }).join('') +
      '<div class="row">' +
        '<label class="field" style="flex:1"><span class="field__label">De</span><input class="input" type="date" name="from" value="' + de + '" min="' + lim.min + '" max="' + lim.max + '"></label>' +
        '<label class="field" style="flex:1"><span class="field__label">Até</span><input class="input" type="date" name="to" value="' + ate + '" min="' + lim.min + '" max="' + lim.max + '"></label>' +
      '</div>' +
      '<p class="field__error" data-range-error hidden></p>' +
      '<div class="popover__footer"><button type="button" class="btn btn--primary btn--sm" data-apply>Aplicar</button></div>',
    bind: function (el, fechar) {
      var $el = $(el);
      $el.find('[data-preset]').on('click', function () {
        var dias = Number($(this).data('preset'));
        aoAplicar({ from: addDays(lim.max, -(dias - 1)), to: lim.max });
        fechar();
      });
      $el.find('[data-apply]').on('click', function () {
        var f = $el.find('[name=from]').val();
        var t = $el.find('[name=to]').val();
        if (!f || !t || f > t) {
          $el.find('[data-range-error]').prop('hidden', false).text('A data inicial deve ser anterior à final.');
          return;
        }
        aoAplicar({ from: f < lim.min ? lim.min : f, to: t > lim.max ? lim.max : t });
        fechar();
      });
    }
  });
}
