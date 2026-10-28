/**
 * DADOS — de onde vêm as informações das telas.
 *
 * MODO LOCAL (padrão): buscarDados('collaborators') lê o arquivo data/collaborators.json com fetch().
 * MODO API: troque FONTE.modo para 'api' e preencha apiBase. Cada recurso vira
 *           apiBase + '/' + recurso (ex.: https://sua-api.com/api/collaborators).
 *           Se os nomes dos endpoints forem diferentes, ajuste em ENDPOINTS_API.
 *
 * IMPORTANTE: o fetch só funciona com a página aberta por um servidor (por exemplo, a extensão
 * "Live Server" do VS Code). Abrindo o arquivo com duplo clique o navegador bloqueia a leitura.
 */
var FONTE = {
  modo: 'local',                          // 'local' ou 'api'
  pastaLocal: 'data/',                    // onde ficam os .json
  apiBase: 'https://api.exemplo.com/v1'   // usado só no modo 'api'
};

/** (modo 'api') nome do recurso -> caminho na API. Se não estiver aqui, usa o próprio nome. */
var ENDPOINTS_API = {
  collaborators: '/collaborators',
  sectors: '/sectors',
  courses: '/courses',
  enrollments: '/me/enrollments',
  dashboard: '/dashboard',
  progress: '/progress',
  settings: '/settings',
  profiles: '/me/profile',
  notifications: '/me/notifications'
};

var _cacheDados = {};

/**
 * Busca um recurso e devolve uma Promise com o JSON.
 * Uso:  buscarDados('sectors').then(function (dados) { ... }).catch(function (erro) { ... });
 */
function buscarDados(recurso) {
  if (!_cacheDados[recurso]) {
    var url = FONTE.modo === 'local'
      ? FONTE.pastaLocal + recurso + '.json'
      : FONTE.apiBase + (ENDPOINTS_API[recurso] || '/' + recurso);
    _cacheDados[recurso] = fetch(url)
      .then(function (resposta) {
        if (!resposta.ok) throw new Error('Não foi possível carregar "' + recurso + '" (HTTP ' + resposta.status + ').');
        return resposta.json();
      })
      .catch(function (erro) {
        delete _cacheDados[recurso];
        if (window.location.protocol === 'file:') {
          throw new Error('Abra o projeto pelo Live Server do VS Code (clique direito no arquivo > Open with Live Server). Abrir com duplo clique bloqueia a leitura dos dados.');
        }
        throw erro;
      });
  }
  // devolve uma cópia, para a página poder alterar à vontade sem afetar o cache
  return _cacheDados[recurso].then(function (dados) { return JSON.parse(JSON.stringify(dados)); });
}

/* ---------------------------------------------------------------- gravações da demonstração */
/*
 * Sem backend, o que o usuário altera (novo colaborador, perfil, configurações, avanço em curso)
 * é guardado no localStorage, "por cima" dos JSON originais. Os JSON nunca são alterados.
 * Com API, estas funções viram chamadas fetch POST/PUT.
 */
function lerBancoDemo() { return armazenamentoLocal.get(APP.chaveBancoDemo, {}); }
function salvarBancoDemo(mudancas) { armazenamentoLocal.set(APP.chaveBancoDemo, $.extend({}, lerBancoDemo(), mudancas)); }
/** Apaga tudo o que foi salvo na demonstração (pode ser chamado pelo console: limparDadosDemo()). */
function limparDadosDemo() { armazenamentoLocal.remove(APP.chaveBancoDemo); }

/* ---------------------------------------------------------------- consultas usadas em várias telas */

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

/** Todos os colaboradores (os do JSON + os cadastrados na demonstração). */
function buscarColaboradores() {
  return buscarDados('collaborators').then(function (db) {
    var adicionados = lerBancoDemo().collaboratorsAdded || [];
    db.items = adicionados.concat(db.items);
    return db;
  });
}

function buscarColaborador(id) {
  return buscarColaboradores().then(function (db) {
    var achado = db.items.filter(function (c) { return c.id === id; })[0];
    if (!achado) throw new Error('Colaborador não encontrado.');
    return achado;
  });
}

/** Cadastra um colaborador novo (demonstração: guarda no navegador). */
function criarColaborador(dados) {
  return buscarDados('sectors').then(function (db) {
    var setor = db.items.filter(function (s) { return s.id === dados.sector; })[0] || db.items[0];
    var item = {
      id: 'u' + String(Date.now()).slice(-6), name: dados.name, email: dados.email,
      sector: setor.id, sectorName: setor.name, role: dados.role || 'Colaborador', status: 'Ativo',
      progress: 0, hours: 0, courses: 0, completedCourses: 0, skills: [], competencies: [],
      kpis: {
        hours: { value: 0, delta: '0%' }, progress: { value: 0, delta: '0%' },
        inProgress: { value: 0, delta: 'Estável', note: 'matrículas ativas' },
        completed: { value: 0, delta: '0', note: 'novas certificações' }
      },
      frequency: [], recentCourses: [], certificates: []
    };
    salvarBancoDemo({ collaboratorsAdded: [item].concat(lerBancoDemo().collaboratorsAdded || []) });
    return item;
  });
}

/**
 * Cursos do colaborador. filtros: { categoria, status, busca }.
 * Devolve { kpis, items, categories }.
 */
function buscarMatriculas(userId, filtros) {
  filtros = filtros || {};
  return buscarDados('enrollments').then(function (todas) {
    var db = todas[userId];
    if (!db) return { kpis: { general: 0, inProgress: 0, platforms: 0, completed: 0 }, items: [], categories: [] };
    var salvos = (lerBancoDemo().enrollments || {})[userId] || {};
    var todos = db.items.concat(db.completed).map(function (c) {
      return salvos[c.courseId] ? $.extend({}, c, { progress: salvos[c.courseId].progress }) : c;
    });
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

/** Detalhes de um curso do colaborador (módulos, prazo, instrutor...). */
function buscarCurso(userId, courseId) {
  return buscarDados('enrollments').then(function (todas) {
    var db = todas[userId] || {};
    var base = (db.details || {})[courseId];
    var curso = (db.items || []).concat(db.completed || []).filter(function (c) { return c.courseId === courseId; })[0];
    if (!base || !curso) throw new Error('Curso não encontrado.');
    var salvo = ((lerBancoDemo().enrollments || {})[userId] || {})[courseId];
    return $.extend({ courseId: courseId, title: curso.title }, base, salvo || {});
  });
}

/** "Continuar curso": conclui o módulo atual e avança o progresso (demonstração). */
function avancarCurso(userId, courseId) {
  return buscarCurso(userId, courseId).then(function (atual) {
    var modulos = atual.modules.map(function (m) { return $.extend({}, m); });
    var idx = -1;
    modulos.forEach(function (m, i) { if (idx === -1 && m.status === 'Em andamento') idx = i; });
    if (idx >= 0) {
      modulos[idx].status = 'Concluído';
      if (modulos[idx + 1]) modulos[idx + 1].status = 'Em andamento';
    }
    var progresso = Math.min(100, atual.progress + Math.max(4, Math.round(100 / modulos.length / 2)));
    var terminou = progresso >= 100 || modulos.every(function (m) { return m.status === 'Concluído'; });
    var novo = {
      modules: terminou ? modulos.map(function (m) { return $.extend({}, m, { status: 'Concluído' }); }) : modulos,
      progress: terminou ? 100 : progresso,
      doneHours: Math.round((atual.hours * (terminou ? 100 : progresso)) / 100)
    };
    var todas = lerBancoDemo().enrollments || {};
    var doUsuario = $.extend({}, todas[userId] || {});
    doUsuario[courseId] = novo;
    todas[userId] = doUsuario;
    salvarBancoDemo({ enrollments: todas });
    return $.extend({}, atual, novo);
  });
}
