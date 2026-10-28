/**
 * CONFIGURAÇÃO GERAL: usuários de demonstração, menu e permissões.
 * Quer mudar quem acessa o quê? É só aqui.
 */

var APP = {
  nome: 'Mira Evolution',
  chaveSessao: 'mira.session',
  chaveTema: 'mira.theme',
  chaveBancoDemo: 'mira.demo.db',
  hoje: '2026-06-20'   // "data de hoje" dos dados fictícios (os JSON terminam em 20/06/2026)
};

/**
 * USUÁRIOS DE DEMONSTRAÇÃO — só para apresentar o front-end.
 * NÃO é autenticação segura: as senhas ficam visíveis no navegador.
 * Em produção, o login deve ser feito por uma API (veja entrar() em sessao.js).
 */
var USUARIOS_DEMO = [
  { id: 'g01', role: 'gestor', username: 'gestor', email: 'gestor@mira.demo', password: 'Mira@123',
    name: 'Madu Oliveira', firstName: 'Madu', roleLabel: 'Gestora', modeLabel: 'Admin Mode', collaboratorId: null },
  { id: 'u07', role: 'colaborador', username: 'colaborador', email: 'colaborador@mira.demo', password: 'Mira@123',
    name: 'Rafael Marques', firstName: 'Rafael', roleLabel: 'Colaborador', modeLabel: 'Colaborador', collaboratorId: 'u07' }
];

/**
 * Itens do menu lateral. Para cada perfil, a página de destino:
 * (algumas telas são diferentes para Gestor e Colaborador; outras são a mesma)
 */
var MENU = {
  dashboard:     { label: 'Dashboard',     icon: 'layout-grid', pagina: { gestor: 'dashboard-gestor.html', colaborador: 'dashboard-colaborador.html' } },
  colaboradores: { label: 'Colaboradores', icon: 'users',       pagina: { gestor: 'colaboradores.html' } },
  setores:       { label: 'Setores',       icon: 'folder',      pagina: { gestor: 'setores.html' } },
  cursos:        { label: 'Cursos',        icon: 'book-open',   pagina: { gestor: 'cursos-gestor.html', colaborador: 'meus-cursos.html' } },
  progresso:     { label: 'Progresso',     icon: 'trending-up', pagina: { gestor: 'progresso-gestor.html', colaborador: 'detalhes-colaborador.html' } },
  configuracoes: { label: 'Configurações', icon: 'settings',    pagina: { gestor: 'configuracoes.html' } },
  perfil:        { label: 'Meu perfil',    icon: 'user',        pagina: { gestor: 'perfil.html', colaborador: 'perfil.html' } }
};

/** Ordem dos itens do menu em cada perfil. */
var MENU_POR_PERFIL = {
  gestor: ['dashboard', 'colaboradores', 'setores', 'cursos', 'progresso', 'configuracoes', 'perfil'],
  colaborador: ['dashboard', 'cursos', 'progresso', 'perfil']
};

/** Perfis que podem usar ações específicas dentro das telas. */
var ACOES = {
  voltarParaLista: ['gestor']      // botão "Voltar para Colaboradores" nos detalhes
};

/** Endereço (arquivo .html) de um item do menu para o perfil indicado. */
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
