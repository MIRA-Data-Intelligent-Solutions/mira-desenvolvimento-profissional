/**
 * DADOS — de onde vêm as informações das telas. Toda leitura e gravação passa por requisitarApi().
 *
 * FONTE.modo escolhe a origem:
 *   'api'   (padrão) chama o back-end: FONTE.apiBase + rota.
 *   'local'          lê .json em FONTE.pastaLocal no MESMO formato da API (/setores -> data/setores.json).
 *                    Para demonstrar sem back-end: o login aceita só CONTAS_TESTE (config.js) e as
 *                    gravações mostram "indisponível". Arquivos gerados por backend/scripts/gerar_dados_locais.py.
 *
 * As páginas usam só as funções "buscar..."/"salvar..." no fim deste arquivo, nunca a rota direto.
 * O fetch exige a página aberta por um servidor (ex.: Live Server); com duplo clique o navegador bloqueia.
 */

/* ---------------------------------------------------------------- configuração */

var FONTE = {
  modo: 'api',                            // 'api' (back-end) ou 'local' (arquivos .json)
  pastaLocal: 'data/',
  apiBase: 'https://mira-desenvolvimento-profissional.onrender.com'
};

/** Catálogo de rotas da API. {id} é trocado pelo valor informado em rota(). */
var ENDPOINTS_API = {
  login: '/login',
  dashboardGestor: '/dashboard/gestor',
  dashboardColaborador: '/dashboard/colaborador',
  setores: '/setores',
  setoresOpcoes: '/setores/opcoes',
  colaboradores: '/colaboradores',
  colaborador: '/colaboradores/{id}',
  cadastrarUsuario: '/usuarios',
  progresso: '/progresso',
  cursos: '/cursos',
  meusCursos: '/me/cursos',
  meuCurso: '/me/cursos/{id}',
  perfil: '/me/perfil',
  configuracoes: '/configuracoes'
};

/** Caminho de uma rota do catálogo. Ex.: rota('colaborador', { id: 4 }) -> '/colaboradores/4' */
function rota(nome, parametros) {
  return ENDPOINTS_API[nome].replace(/\{(\w+)\}/g, function (_, chave) {
    return encodeURIComponent((parametros || {})[chave]);
  });
}

/* ---------------------------------------------------------------- chamadas (API ou local) */

var TEMPO_LIMITE_API = 60000;   // o plano gratuito do Render pode levar até ~1 minuto para "acordar"

/**
 * Busca ou grava dados e devolve uma Promise com o JSON da resposta.
 *   requisitarApi(rota('setores'))
 *   requisitarApi(rota('login'), { metodo: 'POST', corpo: {...}, semToken: true })
 * Envia o token da sessão (exceto com semToken). Em 401 numa rota protegida, encerra a sessão.
 * Em erro, rejeita com Error(mensagem para o usuário) e erro.status (0 = sem resposta do servidor).
 */
function requisitarApi(caminho, opcoes) {
  opcoes = opcoes || {};
  if (FONTE.modo === 'local') return requisitarLocal(caminho, opcoes);

  var cabecalhos = { Accept: 'application/json' };
  var temCorpo = opcoes.corpo !== undefined;
  if (temCorpo) cabecalhos['Content-Type'] = 'application/json';
  var sessao = opcoes.semToken ? null : lerSessao();
  if (sessao) cabecalhos.Authorization = 'Bearer ' + sessao.token;

  var controle = new AbortController();
  var limite = setTimeout(function () { controle.abort(); }, opcoes.tempoLimite || TEMPO_LIMITE_API);

  return fetch(FONTE.apiBase + caminho, {
    method: opcoes.metodo || 'GET',
    headers: cabecalhos,
    body: temCorpo ? JSON.stringify(opcoes.corpo) : undefined,
    signal: controle.signal
  })
    .catch(function (erro) {
      throw erroDaApi(erro && erro.name === 'AbortError'
        ? 'O servidor demorou para responder. Tente novamente em instantes.'
        : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 0);
    })
    .then(function (resposta) {
      return resposta.json().catch(function () { return null; }).then(function (dados) {
        if (resposta.ok) return dados;
        if (resposta.status === 401 && !opcoes.semToken) encerrarSessaoExpirada();
        throw erroDaApi(mensagemDeErroApi(resposta.status, dados), resposta.status);
      });
    })
    .finally(function () { clearTimeout(limite); });
}

function erroDaApi(mensagem, status) {
  var erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

/** Texto para o usuário a partir do status HTTP e do "detail" que o FastAPI devolve. */
function mensagemDeErroApi(status, dados) {
  var detalhe = dados && dados.detail;
  if (typeof detalhe === 'string' && detalhe) return detalhe;      // mensagens escritas no back-end
  if (status === 422) return 'Dados inválidos. Confira os campos e tente novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return 'Não foi possível concluir a operação (HTTP ' + status + ').';
}

/* ---------------------------------------------------------------- modo local */

var MSG_SOMENTE_LEITURA = 'Indisponível no modo demonstração (dados locais): nada é gravado.';

/**
 * Responde como a API, lendo FONTE.pastaLocal. Rotas "/me/..." dependem de quem está logado,
 * então ficam numa pasta por perfil: /me/cursos (colaborador) -> data/colaborador/me/cursos.json
 */
function requisitarLocal(caminho, opcoes) {
  var metodo = (opcoes.metodo || 'GET').toUpperCase();
  if (caminho === rota('login') && metodo === 'POST') return entrarLocal(opcoes.corpo || {});
  if (metodo !== 'GET') return Promise.reject(erroDaApi(MSG_SOMENTE_LEITURA, 0));

  var sessao = lerSessao();
  var pasta = /^\/me(\/|$)/.test(caminho) && sessao ? '/' + sessao.role : '';
  return lerArquivoLocal((pasta + caminho).replace(/^\//, '') + '.json');
}

/** Login do modo local: só CONTAS_TESTE; a resposta vem de data/login/<perfil>.json. */
function entrarLocal(corpo) {
  var email = String(corpo.email || '').toLowerCase();
  var conta = CONTAS_TESTE.filter(function (c) {
    return c.email && c.email.toLowerCase() === email && c.senha === corpo.senha;
  })[0];
  if (!conta) return Promise.reject(erroDaApi('E-mail ou senha incorretos', 401));
  return lerArquivoLocal('login/' + conta.perfil + '.json');
}

function lerArquivoLocal(arquivo) {
  return fetch(FONTE.pastaLocal + arquivo)
    .catch(function () {
      throw erroDaApi(window.location.protocol === 'file:'
        ? 'Abra o projeto pelo Live Server do VS Code (clique direito no arquivo > Open with Live Server). Abrir com duplo clique bloqueia a leitura dos dados.'
        : 'Não foi possível ler os dados locais.', 0);
    })
    .then(function (resposta) {
      if (!resposta.ok) {
        throw erroDaApi(resposta.status === 404
          ? 'Registro não encontrado nos dados locais.'
          : 'Não foi possível ler os dados locais (HTTP ' + resposta.status + ').', resposta.status);
      }
      return resposta.json();
    });
}

/* ---------------------------------------------------------------- dados fixos do front */

var _cacheDados = {};

/** Lê um .json fixo do front (sempre local, nos dois modos). Hoje só as notificações usam. */
function buscarDados(recurso) {
  if (!_cacheDados[recurso]) {
    _cacheDados[recurso] = lerArquivoLocal(recurso + '.json')
      .catch(function (erro) { delete _cacheDados[recurso]; throw erro; });
  }
  // devolve uma cópia: a página pode alterar à vontade sem afetar o cache
  return _cacheDados[recurso].then(function (dados) { return JSON.parse(JSON.stringify(dados)); });
}

/* ---------------------------------------------------------------- dashboards */

/** GET /dashboard/gestor -> { periodDefault, dates, dailyHours, sectors, gestor: { subtitle, kpis, sectorProgress, runningCourses, progressDistribution } } */
function buscarDashboardGestor() {
  return requisitarApi(rota('dashboardGestor'));
}

/** GET /dashboard/colaborador -> { periodDefault, colaborador: { subtitle, kpis, goal, evolution } } */
function buscarDashboardColaborador() {
  return requisitarApi(rota('dashboardColaborador'));
}

/* ---------------------------------------------------------------- setores */

/** GET /setores -> { kpis, items: [{ id, name, icon, color, collaborators, avgProgress }] } (setores da equipe) */
function buscarSetores() {
  return requisitarApi(rota('setores'));
}

/** GET /setores/opcoes -> [{ id, name }]: todos os setores da empresa (campo do cadastro). */
function buscarOpcoesSetores() {
  return requisitarApi(rota('setoresOpcoes'));
}

/* ---------------------------------------------------------------- colaboradores */

/** GET /colaboradores -> { totalActive, sectorsFilter, items } (subordinados do gestor logado) */
function buscarColaboradores() {
  return requisitarApi(rota('colaboradores'));
}

/** GET /colaboradores/{id}. Gestor vê só os subordinados; colaborador, só a si mesmo (fora disso: 404). */
function buscarColaborador(id) {
  if (!id) return Promise.reject(new Error('Colaborador não encontrado.'));
  return requisitarApi(rota('colaborador', { id: id }));
}

/** POST /usuarios. dados: { name, email, sector (id), role } -> { id_usuario, nome, senha_inicial } */
function criarColaborador(dados) {
  return requisitarApi(rota('cadastrarUsuario'), {
    metodo: 'POST',
    corpo: { nome: dados.name, email: dados.email, id_setor: Number(dados.sector), funcao: dados.role || null }
  });
}

/* ---------------------------------------------------------------- progresso */

/** GET /progresso -> { kpis, ranking, sectors, legendSectors, periodDefault, dates, dailyHours } */
function buscarProgresso() {
  return requisitarApi(rota('progresso'));
}

/* ---------------------------------------------------------------- cursos */

/** GET /cursos -> { totalCourses, categories, kpis, items } (catálogo com os números da equipe) */
function buscarCatalogoCursos() {
  return requisitarApi(rota('cursos'));
}

var _cacheMeusCursos = null;   // os filtros são aplicados aqui, sem buscar de novo a cada tecla

/**
 * Cursos do colaborador logado (GET /me/cursos), filtrados por { categoria, status, busca }.
 * Devolve { kpis, items, categories }. O userId não é enviado: a API usa o usuário do token.
 */
function buscarMatriculas(userId, filtros) {
  filtros = filtros || {};
  if (!_cacheMeusCursos) {
    _cacheMeusCursos = requisitarApi(rota('meusCursos')).catch(function (erro) { _cacheMeusCursos = null; throw erro; });
  }
  return _cacheMeusCursos.then(function (db) {
    var todos = db.items;
    var q = normalize(filtros.busca || '');
    var categorias = [];
    todos.forEach(function (c) { if (categorias.indexOf(c.category) === -1) categorias.push(c.category); });
    var items = todos.filter(function (c) {
      return (!filtros.categoria || filtros.categoria === 'Todos' || c.category === filtros.categoria) &&
             (!filtros.status || filtros.status === 'Todos' || c.status === filtros.status) &&
             (!q || normalize(c.title + ' ' + c.category).indexOf(q) !== -1);
    });
    return { kpis: db.kpis, items: items, categories: categorias };
  });
}

/** GET /me/cursos/{id}. Instrutor, início, prazo e módulos vêm como "Não informado" / lista vazia. */
function buscarCurso(userId, courseId) {
  if (!courseId) return Promise.reject(new Error('Curso não encontrado.'));
  return requisitarApi(rota('meuCurso', { id: courseId }));
}

// "Continuar curso" (avançar o progresso) está desativado: virá da integração com as plataformas.

/* ---------------------------------------------------------------- perfil */

/** GET /me/perfil -> { userId, name, firstName, title, email, phone, department, bio, skills } */
function buscarPerfil() {
  return requisitarApi(rota('perfil'));
}

/** PUT /me/perfil. dados: { nome, funcao, telefone, sobre_mim, habilidades } (e-mail e setor não mudam). */
function salvarPerfil(dados) {
  return requisitarApi(rota('perfil'), { metodo: 'PUT', corpo: dados });
}

/* ---------------------------------------------------------------- configurações */

/** GET /configuracoes -> { general: { companyName, cnpj, dateFormat }, dateFormats, integrations } */
function buscarConfiguracoes() {
  return requisitarApi(rota('configuracoes'));
}

/** PUT /configuracoes. dados: { nome_empresa, cnpj, formato_data } */
function salvarConfiguracoes(dados) {
  return requisitarApi(rota('configuracoes'), { metodo: 'PUT', corpo: dados });
}

/* ---------------------------------------------------------------- apoio */

/** Recorta uma série diária pelo período [de, ate]. Devolve { categories: [datas], values: [valores] }. */
function recortarPeriodo(datas, valores, de, ate) {
  var saida = { categories: [], values: [] };
  datas.forEach(function (d, i) {
    if ((!de || d >= de) && (!ate || d <= ate)) {
      saida.categories.push(d);
      saida.values.push(valores[i]);
    }
  });
  return saida;
}
