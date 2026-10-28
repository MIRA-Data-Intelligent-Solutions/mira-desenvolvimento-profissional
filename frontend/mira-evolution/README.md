# Mira Evolution — Front-end

Projeto acadêmico em **HTML5 + CSS3 + JavaScript puro + jQuery**. Sem framework, sem Node, sem Python, sem build.
Implementa o design do Figma "Mira_Evolution" nas visões **Gestor** e **Colaborador**, com tema claro/escuro e layout responsivo.

## Como rodar (sem Python)

1. Instale no VS Code a extensão **Live Server** (autor: Ritwick Dey). O VS Code já sugere ao abrir a pasta.
2. Abra a pasta `mira-evolution` no VS Code.
3. Clique com o botão direito em `login.html` > **Open with Live Server** (ou botão **Go Live**, no canto inferior direito).

> Por quê? As telas leem os dados com `fetch()` (arquivos em `data/`), e o navegador **bloqueia `fetch` em arquivos abertos com duplo clique**. O Live Server só entrega os arquivos; não tem código nem Python. Se alguém abrir com duplo clique, o login funciona, mas as telas mostram a mensagem "Abra o projeto pelo Live Server".

## Acessos de demonstração

| Perfil | Usuário ou e-mail | Senha |
|---|---|---|
| Gestor (Madu Oliveira) | `gestor` / `gestor@mira.demo` | `Mira@123` |
| Colaborador (Rafael Marques) | `colaborador` / `colaborador@mira.demo` | `Mira@123` |

É um login **só de demonstração** (as senhas ficam no código, em `js/comum/config.js`). Não é autenticação segura.

## Estrutura de pastas

```
mira-evolution/
├── login.html                    ← cada tela é um arquivo .html
├── dashboard-gestor.html         ← só do Gestor
├── dashboard-colaborador.html    ← só do Colaborador
├── colaboradores.html            ← Gestor: lista de colaboradores
├── detalhes-colaborador.html     ← COMPARTILHADA: Gestor (?id=u01) e Colaborador (os próprios dados = "Progresso")
├── setores.html                  ← Gestor
├── cursos-gestor.html            ← Gestor: catálogo de cursos
├── meus-cursos.html              ← Colaborador: seus cursos
├── detalhe-curso.html            ← Colaborador: um curso (?id=c06)
├── progresso-gestor.html         ← Gestor: evolução e ranking
├── configuracoes.html            ← Gestor
├── perfil.html                   ← COMPARTILHADA
├── css/                          ← estilos (tokens e temas, base, layout, componentes, páginas, responsivo)
├── js/
│   ├── lib/jquery-3.6.1.min.js   ← jQuery (cópia local, funciona offline)
│   ├── comum/                    ← código usado por várias páginas (veja abaixo)
│   └── paginas/                  ← UM arquivo .js por página, com o mesmo nome do .html
├── data/                         ← dados de exemplo em .json
└── assets/img/                   ← logos, favicon e fundo do login
```

### O que tem em `js/comum/`

| Arquivo | Para que serve |
|---|---|
| `config.js` | Usuários de demonstração, itens do menu e quem vê o quê |
| `sessao.js` | Entrar, sair, `protegerPagina()` (bloqueia quem não pode ver a tela) |
| `tema.js` | Tema claro/escuro (carregado no `<head>` para não "piscar") |
| `dados.js` | Leitura dos dados com `fetch` e gravações da demonstração |
| `layout.js` | Menu lateral, topo do celular, botões de notificação e tema, filtro de período |
| `ui.js` | Aviso (toast), janela modal, popover e validação de formulário |
| `widgets.js` | Pedaços de HTML repetidos: cartões de indicadores, barras, selos, tabelas vazias... |
| `ferramentas.js` | Funções pequenas: formatar data, escapar texto, máscara de telefone, parâmetros da URL |
| `icones.js` | Ícones (Lucide) embutidos. Para um novo, copie o SVG de lucide.dev para a lista |
| `grafico.js` | Gráfico de área (SVG) com tooltip e navegação por teclado |

## Onde alterar cada coisa

| Quero mudar... | Abra... |
|---|---|
| Um título, texto ou a estrutura de uma tela | o `.html` da tela |
| O que a tela faz (filtros, botões, tabelas, janelas) | o `.js` com o mesmo nome em `js/paginas/` |
| Cores, fontes, tema escuro | `css/tokens.css` e `css/themes.css` |
| Estilo de botões, cartões, tabelas, modais | `css/components.css` |
| Estilo específico de uma tela | `css/pages.css` |
| Como a tela fica no celular/tablet | `css/responsive.css` |
| Itens do menu, quem acessa o quê, usuários de teste | `js/comum/config.js` |
| Os números e textos de exemplo | `data/*.json` |

## Como cada página funciona (exemplo: `colaboradores`)

1. `colaboradores.html` tem a estrutura da tela e, no final, carrega os scripts (jQuery, `js/comum/*`, e `js/paginas/colaboradores.js`).
2. `colaboradores.js` começa com `protegerPagina(['gestor'])` (só o Gestor entra) e `montarLayout(sessao, 'colaboradores')` (desenha o menu).
3. Depois chama `buscarColaboradores()`, recebe a lista e a desenha na tabela com jQuery. Os filtros só alteram variáveis e redesenham.

## Como criar uma página nova

1. Copie um `.html` parecido (ex.: `setores.html`) e um `.js` (ex.: `js/paginas/setores.js`), com o mesmo nome.
2. No `.html`, troque o `<title>`, o conteúdo e o nome do `.js` no final.
3. No `.js`, ajuste `protegerPagina([...])` e a chave do menu em `montarLayout(...)`.
4. Se for aparecer no menu, adicione em `MENU` e em `MENU_POR_PERFIL` (`js/comum/config.js`).

## Dados e API

Os dados vêm de `buscarDados('nome')` (`js/comum/dados.js`), que faz `fetch('data/nome.json')`.
Para usar uma API, mude em `dados.js`:

```js
var FONTE = { modo: 'api', pastaLocal: 'data/', apiBase: 'https://sua-api.com/api' };
```

Cada recurso passa a ser lido em `apiBase + caminho` (ajuste os caminhos em `ENDPOINTS_API`). O formato do JSON de resposta deve ser o mesmo dos arquivos de `data/`.
O que o usuário grava na demonstração (novo colaborador, perfil, configurações, avanço de curso) fica no `localStorage`, por cima dos JSON. Para apagar: `limparDadosDemo()` no console do navegador. Com API, essas gravações viram `fetch` com `POST`/`PUT` (veja `criarColaborador`, `avancarCurso` e os formulários de perfil/configurações).

## Decisões e limitações

- **Figma:** só o Login e o Dashboard do Gestor foram comparados diretamente com o design (a API do Figma atingiu o limite). As outras telas seguem a estrutura, os tokens e as orientações, e **não foram validadas pixel a pixel**. Cabeçalhos de tabelas e textos de apoio são estimados.
- **Mobile/tablet:** não há frames no Figma; o responsivo é derivado do desktop (menu em gaveta até 1024px; tabelas viram cartões até 720px).
- **Gráfico:** SVG próprio (Tremor exige React/Tailwind). Ícones Lucide embutidos. Fontes Inter/Geist vêm do Google Fonts (sem internet usa a fonte do sistema).
- Fundo do login recriado; logos de parceiros viram "tiles" com letra; avatares são iniciais.
- Dados fictícios coerentes entre si, que podem diferir dos números de exemplo do Figma.
- Acrescentado fora do Figma: botão de sair no menu; categorias dinâmicas; cartões de setor levam à lista filtrada; o filtro de datas só afeta os gráficos.
- Contraste do texto "apagado" no tema claro é baixo (#9d9d9d), como no Figma.

## Validação feita na simplificação

A versão anterior (SPA com módulos) foi usada como referência. Com Chromium automatizado:
- **104 telas** (13 telas × 2 temas × 4 larguras: 1440, 1024, 768 e 390 px) comparadas pixel a pixel com a versão anterior: **0 diferenças**.
- **37 verificações de fluxo** passaram: login válido/inválido, bloqueio por perfil, navegação, busca/filtros, modal com validação, tema que persiste, sair, avanço de curso e salvar perfil.
- Sem erros no console. Abrir com duplo clique mostra a mensagem orientando a usar o Live Server.
- Não testado: outros navegadores além do Chromium, leitores de tela reais, impressão.
