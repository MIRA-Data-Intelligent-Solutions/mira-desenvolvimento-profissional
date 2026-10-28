/**
 * SESSÃO (login demonstrativo) e proteção das páginas.
 * "Lembrar de mim" guarda no localStorage; sem marcar, guarda só enquanto a aba está aberta.
 */

/** Devolve o usuário logado (ou null). */
function lerSessao() {
  return armazenamentoSessao.get(APP.chaveSessao) || armazenamentoLocal.get(APP.chaveSessao) || null;
}

/**
 * Tenta entrar. Devolve { ok: true, sessao } ou { ok: false, error }.
 * Versão de demonstração: compara com USUARIOS_DEMO (config.js).
 * Com API real, troque o corpo por um fetch(POST) para o endpoint de login.
 */
function entrar(identificador, senha, lembrar) {
  var id = normalize(identificador).trim();
  var usuario = USUARIOS_DEMO.filter(function (u) {
    return normalize(u.email) === id || normalize(u.username) === id;
  })[0];
  if (!usuario || usuario.password !== senha) return { ok: false, error: 'Usuário ou senha inválidos.' };

  var sessao = $.extend({}, usuario, { token: 'demo-' + usuario.id, signedAt: Date.now() });
  delete sessao.password;
  armazenamentoSessao.remove(APP.chaveSessao);
  armazenamentoLocal.remove(APP.chaveSessao);
  (lembrar ? armazenamentoLocal : armazenamentoSessao).set(APP.chaveSessao, sessao);
  return { ok: true, sessao: sessao };
}

function sair() {
  armazenamentoSessao.remove(APP.chaveSessao);
  armazenamentoLocal.remove(APP.chaveSessao);
  window.location.href = 'login.html';
}

/** Atualiza dados do usuário já logado (ex.: nome alterado em "Meu perfil"). */
function atualizarSessao(mudancas) {
  var atual = lerSessao();
  if (!atual) return null;
  var nova = $.extend({}, atual, mudancas);
  (armazenamentoLocal.get(APP.chaveSessao) ? armazenamentoLocal : armazenamentoSessao).set(APP.chaveSessao, nova);
  return nova;
}

/**
 * Chame no começo de cada página interna.
 *  - sem login: vai para login.html
 *  - perfil sem permissão: vai para o dashboard do próprio perfil
 * Devolve a sessão (ou null, se redirecionou).
 */
function protegerPagina(perfisPermitidos) {
  var sessao = lerSessao();
  if (!sessao) {
    window.location.replace('login.html?next=' + encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search));
    return null;
  }
  if (perfisPermitidos.indexOf(sessao.role) === -1) {
    window.location.replace(paginaInicial(sessao.role) + '?acesso=negado');
    return null;
  }
  return sessao;
}
