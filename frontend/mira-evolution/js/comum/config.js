/** CONFIGURAÇÃO GERAL: dados do app, contas de teste, menu e permissões por perfil. */

/* ---------------------------------------------------------------- aplicação */

var APP = {
  nome: 'Mira Evolution',
  chaveSessao: 'mira.session',
  chaveTema: 'mira.theme',
  chaveBancoDemo: 'mira.demo.db',
  // "hoje" (AAAA-MM-DD): limite do filtro de período
  hoje: (function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })()
};

/* ---------------------------------------------------------------- login */

/** Textos do rodapé do menu lateral para cada perfil (iguais ao design). */
var ROTULOS_PERFIL = {
  gestor:      { roleLabel: 'Gestor',      modeLabel: 'Admin Mode' },
  colaborador: { roleLabel: 'Colaborador', modeLabel: 'Colaborador' }
};

/**
 * Contas do quadro "Acessos de demonstração" do login (e as únicas aceitas no modo local).
 * São contas reais do banco e a senha fica visível no navegador: use só contas de teste.
 * E-mail vazio esconde a conta; sem nenhuma, o quadro some.
 */
var CONTAS_TESTE = [
  { perfil: 'gestor',      rotulo: 'Gestor',      email: 'carlos.lima@empresa.com',  senha: '12345678' },
  { perfil: 'colaborador', rotulo: 'Colaborador', email: 'ana.souza@empresa.com',    senha: '12345678' }
];

/* ---------------------------------------------------------------- menu e permissões */

/** Itens do menu lateral e a página de cada um por perfil (algumas telas são diferentes para cada perfil). */
var MENU = {
  dashboard:     { label: 'Dashboard',     icon: 'layout-grid', pagina: { gestor: 'dashboard-gestor.html', colaborador: 'dashboard-colaborador.html' } },
  colaboradores: { label: 'Colaboradores', icon: 'users',       pagina: { gestor: 'colaboradores.html' } },
  setores:       { label: 'Setores',       icon: 'folder',      pagina: { gestor: 'setores.html' } },
  cursos:        { label: 'Cursos',        icon: 'book-open',   pagina: { gestor: 'cursos-gestor.html', colaborador: 'meus-cursos.html' } },
  progresso:     { label: 'Progresso',     icon: 'trending-up', pagina: { gestor: 'progresso-gestor.html', colaborador: 'detalhes-colaborador.html' } },
  configuracoes: { label: 'Configurações', icon: 'settings',    pagina: { gestor: 'configuracoes.html' } },
  perfil:        { label: 'Meu perfil',    icon: 'user',        pagina: { gestor: 'perfil.html', colaborador: 'perfil.html' } }
};

var MENU_POR_PERFIL = {
  gestor: ['dashboard', 'colaboradores', 'setores', 'cursos', 'progresso', 'configuracoes', 'perfil'],
  colaborador: ['dashboard', 'cursos', 'progresso', 'perfil']
};

/** Ações dentro das telas e os perfis que podem usá-las. */
var ACOES = {
  voltarParaLista: ['gestor']      // link "Voltar para Colaboradores" nos detalhes
};

function paginaDoMenu(chave, perfil) {
  return (MENU[chave].pagina[perfil]) || 'login.html';
}

/** Página inicial de cada perfil (depois do login). */
function paginaInicial(perfil) {
  return paginaDoMenu('dashboard', perfil);
}

function podeFazer(perfil, acao) {
  return (ACOES[acao] || []).indexOf(perfil) !== -1;
}
