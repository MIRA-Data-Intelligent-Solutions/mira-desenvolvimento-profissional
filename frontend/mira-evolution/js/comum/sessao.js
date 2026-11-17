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
async function entrar(identificador, senha, lembrar) {
  var id = normalize(identificador).trim();

  var usuario = await fazerLogin(identificador, senha);

  if (!usuario) return { ok: false, error: 'Usuário ou senha inválidos.' };
  
  var sessao = $.extend({}, usuario, { token: 'demo-' + usuario.id, signedAt: Date.now() });
  delete sessao.password;
  armazenamentoSessao.remove(APP.chaveSessao);
  armazenamentoLocal.remove(APP.chaveSessao);
  (lembrar ? armazenamentoLocal : armazenamentoSessao).set(APP.chaveSessao, sessao);
  return { ok: true, sessao: sessao };
}

async function fazerLogin(email, senha) {
    try {
        // Envia a requisição para a API
        const resposta = await fetch("https://mira-desenvolvimento-profissional.onrender.com/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        // Converte a resposta para JSON
        const dados = await resposta.json();

        // Verifica se o login foi realizado
        if (dados.access_token) {

          // Armazena o token de autenticação no Cache do navegador (localStorage)
          localStorage.setItem("token", dados.access_token);

           return {
            collaboratorId: null,
            email: dados.usuario.email,
            firstName: dados.usuario.firstName,
            id: String(dados.usuario.userId),
            modeLabel: dados.usuario.title,
            name: dados.usuario.name,
            password: " ",
            role: dados.usuario.role,
            roleLabel: dados.usuario.papel_acesso,
            username: dados.usuario.role
          };
        }
    } catch (erro) {
        console.error("Erro ao realizar login:", erro);
    }
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
