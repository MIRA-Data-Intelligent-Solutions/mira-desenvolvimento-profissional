/**
 * SESSÃO E PROTEÇÃO DAS PÁGINAS.
 * A sessão é um registro só: { dados do usuário, token, expiraEm }, no localStorage ("Lembrar de mim")
 * ou no sessionStorage. Vale o tempo que a API informar (expira_em_minutos); depois é descartada.
 */

var CHAVE_TOKEN_ANTIGA = 'token';   // a versão anterior guardava o token solto; é apagada ao sair/entrar

/* ---------------------------------------------------------------- leitura da sessão */

/** Usuário logado (ou null). Sessão sem token ou vencida é apagada. */
function lerSessao() {
  var sessao = lerSessaoGuardada();
  if (sessao && (!sessao.token || !sessao.expiraEm || Date.now() >= sessao.expiraEm)) {
    limparSessao();
    return null;
  }
  return sessao;
}

/** O que está guardado, mesmo se vencido (usado para saber se a sessão expirou). */
function lerSessaoGuardada() {
  return armazenamentoSessao.get(APP.chaveSessao) || armazenamentoLocal.get(APP.chaveSessao) || null;
}

/** Atualiza dados do usuário já logado (ex.: nome alterado em "Meu perfil"). */
function atualizarSessao(mudancas) {
  var atual = lerSessao();
  if (!atual) return null;
  var nova = $.extend({}, atual, mudancas);
  (armazenamentoLocal.get(APP.chaveSessao) ? armazenamentoLocal : armazenamentoSessao).set(APP.chaveSessao, nova);
  return nova;
}

function limparSessao() {
  armazenamentoSessao.remove(APP.chaveSessao);
  armazenamentoLocal.remove(APP.chaveSessao);
  armazenamentoLocal.remove(CHAVE_TOKEN_ANTIGA);
}

/* ---------------------------------------------------------------- entrar e sair */

/**
 * Login (POST /login). Devolve { ok: true, sessao } ou { ok: false, error }.
 * Nunca lança erro: a tela de login só precisa mostrar a mensagem.
 */
async function entrar(email, senha, lembrar) {
  var dados;
  try {
    dados = await requisitarApi(rota('login'), {
      metodo: 'POST',
      corpo: { email: $.trim(email).toLowerCase(), senha: senha },
      semToken: true
    });
  } catch (erro) {
    return { ok: false, error: mensagemErroLogin(erro) };
  }

  var u = (dados && dados.usuario) || {};
  var rotulos = ROTULOS_PERFIL[u.role];
  if (!dados || !dados.access_token || !rotulos) {
    return { ok: false, error: 'Resposta inesperada do servidor. Tente novamente.' };
  }

  var agora = Date.now();
  var sessao = {
    id: String(u.userId),
    role: u.role,                               // 'gestor' ou 'colaborador'
    name: u.name,
    firstName: u.firstName || firstName(u.name),
    email: u.email,
    title: u.title || '',
    department: u.department || '',
    roleLabel: rotulos.roleLabel,
    modeLabel: rotulos.modeLabel,
    collaboratorId: u.role === 'colaborador' ? String(u.userId) : null,
    token: dados.access_token,
    expiraEm: agora + (Number(dados.expira_em_minutos) || 60) * 60 * 1000,
    signedAt: agora
  };

  limparSessao();
  (lembrar ? armazenamentoLocal : armazenamentoSessao).set(APP.chaveSessao, sessao);
  return { ok: true, sessao: sessao };
}

function mensagemErroLogin(erro) {
  if (erro.status === 401) return 'E-mail ou senha incorretos.';
  if (erro.status === 422) return 'Informe um e-mail válido.';
  return erro.message;   // 403 (inativo), servidor fora do ar, demora, erro interno
}

function sair() {
  limparSessao();
  window.location.href = 'login.html';
}

/** Chamado quando a API responde 401 (token vencido ou inválido): volta ao login. */
function encerrarSessaoExpirada() {
  limparSessao();
  window.location.replace('login.html?sessao=expirada&next=' + encodeURIComponent(paginaAtual()));
}

/* ---------------------------------------------------------------- proteção das páginas */

/**
 * Chame no começo de cada página interna. Sem login: vai para o login (avisando se a sessão expirou).
 * Perfil sem permissão: vai para o dashboard do próprio perfil. Devolve a sessão (ou null, se redirecionou).
 */
function protegerPagina(perfisPermitidos) {
  var expirou = !!lerSessaoGuardada();
  var sessao = lerSessao();
  if (!sessao) {
    window.location.replace('login.html?' + (expirou ? 'sessao=expirada&' : '') + 'next=' + encodeURIComponent(paginaAtual()));
    return null;
  }
  if (perfisPermitidos.indexOf(sessao.role) === -1) {
    window.location.replace(paginaInicial(sessao.role) + '?acesso=negado');
    return null;
  }
  return sessao;
}

/** Endereço da página atual, para voltar a ela depois do login. */
function paginaAtual() {
  return window.location.pathname.split('/').pop() + window.location.search;
}
