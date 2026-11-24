# Mira Evolution — Front-end

Projeto acadêmico em **HTML5 + CSS3 + JavaScript puro + jQuery**. Sem framework, sem Node, sem Python, sem build.
Implementa o design do Figma "Mira_Evolution" nas visões **Gestor** e **Colaborador**, com tema claro/escuro e layout responsivo.

## Como rodar (sem Python)

1. Instale no VS Code a extensão **Live Server** (autor: Ritwick Dey). O VS Code já sugere ao abrir a pasta.
2. Abra a pasta `mira-evolution` no VS Code.
3. Clique com o botão direito em `login.html` > **Open with Live Server** (ou botão **Go Live**, no canto inferior direito).

> Por quê? As telas buscam os dados com `fetch()`, e o navegador **bloqueia `fetch` em arquivos abertos com duplo clique**. Rode pelo Live Server, de `http://127.0.0.1:5500` ou `http://localhost:5500`, que são os endereços liberados no CORS do back-end.

As telas buscam os dados na **API do back-end** (veja `backend/README.md`) ou, no **modo local**, em arquivos `.json` (veja "Modo API ou modo local" abaixo). O endereço da API fica em um único lugar: `FONTE.apiBase`, em `js/comum/dados.js`.

## Login e acessos de teste

O login é feito pela API (`POST /login`) com **e-mail e senha** de um usuário do banco.

O quadro **"Acessos de demonstração"** da tela de login mostra as contas de teste listadas em `CONTAS_TESTE` (`js/comum/config.js`). Clicar em uma conta preenche o formulário. Se a lista estiver vazia, o quadro some. As senhas dessas contas ficam visíveis no código do site, então use **apenas contas de teste**.

| Perfil | E-mail |
|---|---|
| Gestor (Carlos Lima) | `carlos.lima@empresa.com` |
| Colaborador (Ana Souza) | `ana.souza@empresa.com` |

### Sessão
- Depois do login, a sessão (dados do usuário + token + validade) fica em **um único registro**: no `localStorage` com "Lembrar de mim" marcado, ou no `sessionStorage` sem ele.
- O token vale o tempo definido no back-end (`TOKEN_MINUTOS`, padrão 60 min). Depois disso a sessão é descartada e o login mostra "Sua sessão expirou".
- Se qualquer chamada à API responder **401**, a sessão é apagada e o usuário volta ao login. Depois de entrar de novo, ele retorna à página em que estava (`?next=`).
- "Sair" apaga a sessão e o token.

## Estrutura de pastas

```
mira-evolution/
├── login.html                    ← cada tela é um arquivo .html
├── dashboard-gestor.html         ← só do Gestor
├── dashboard-colaborador.html    ← só do Colaborador
├── colaboradores.html            ← Gestor: lista de colaboradores
├── detalhes-colaborador.html     ← COMPARTILHADA: Gestor (?id=4) e Colaborador (os próprios dados = "Progresso")
├── setores.html                  ← Gestor
├── cursos-gestor.html            ← Gestor: catálogo de cursos
├── meus-cursos.html              ← Colaborador: seus cursos
├── detalhe-curso.html            ← Colaborador: um curso (?id=12)
├── progresso-gestor.html         ← Gestor: evolução e ranking
├── configuracoes.html            ← Gestor
├── perfil.html                   ← COMPARTILHADA
├── css/                          ← estilos (tokens e temas, base, layout, componentes, páginas, responsivo)
├── js/
│   ├── lib/jquery-3.6.1.min.js   ← jQuery (cópia local, funciona offline)
│   ├── comum/                    ← código usado por várias páginas (veja abaixo)
│   └── paginas/                  ← UM arquivo .js por página, com o mesmo nome do .html
├── data/                         ← respostas da API gravadas em .json (modo local) + notifications.json
└── assets/img/                   ← logos, favicon e fundo do login
```

### O que tem em `js/comum/`

| Arquivo | Para que serve |
|---|---|
| `config.js` | Contas de teste do login, textos do perfil no menu, itens do menu e quem vê o quê |
| `sessao.js` | Entrar (API), sair, validade da sessão e `protegerPagina()` (bloqueia quem não pode ver a tela) |
| `tema.js` | Tema claro/escuro (carregado no `<head>` para não "piscar") |
| `dados.js` | Endereço da API, `requisitarApi()` e uma função por recurso (`buscarSetores`, `buscarColaboradores`...) |
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
| Itens do menu, quem acessa o quê, contas de teste | `js/comum/config.js` |
| O endereço da API ou uma chamada ao back-end | `js/comum/dados.js` |

## Como cada página funciona (exemplo: `colaboradores`)

1. `colaboradores.html` tem a estrutura da tela e, no final, carrega os scripts (jQuery, `js/comum/*`, e `js/paginas/colaboradores.js`).
2. `colaboradores.js` começa com `protegerPagina(['gestor'])` (só o Gestor entra) e `montarLayout(sessao, 'colaboradores')` (desenha o menu).
3. Depois chama `buscarColaboradores()` (que chama `GET /colaboradores` na API), recebe a lista e a desenha na tabela com jQuery. Os filtros só alteram variáveis e redesenham, sem chamar a API de novo.

### Organização interna dos arquivos JS

Os arquivos são divididos em blocos marcados com `/* ------ nome do bloco */`:

- **Páginas** (`js/paginas/*.js`): sempre `estado → carga → desenho → interações`. O cabeçalho do arquivo diz a tela, o perfil e a rota da API usada.
- **`dados.js`**: configuração, chamadas, modo local, e as funções `buscar...`/`salvar...` agrupadas por funcionalidade (dashboards, setores, colaboradores, progresso, cursos, perfil, configurações), na mesma ordem dos blocos do back-end.
- **Demais arquivos de `js/comum/`**: um bloco por assunto (ex.: em `widgets.js`: indicadores, barras de progresso, selos e listas, estados).

Comentários só onde explicam uma regra, uma decisão ou algo que não fica claro lendo o código.

## Como criar uma página nova

1. Copie um `.html` parecido (ex.: `setores.html`) e um `.js` (ex.: `js/paginas/setores.js`), com o mesmo nome.
2. No `.html`, troque o `<title>`, o conteúdo e o nome do `.js` no final.
3. No `.js`, ajuste `protegerPagina([...])` e a chave do menu em `montarLayout(...)`.
4. Se for aparecer no menu, adicione em `MENU` e em `MENU_POR_PERFIL` (`js/comum/config.js`).

## Dados e API

### Modo API ou modo local

Em `js/comum/dados.js`:

```js
var FONTE = {
  modo: 'api',            // 'api' = back-end   |   'local' = arquivos .json da pasta data/
  pastaLocal: 'data/',
  apiBase: 'https://mira-desenvolvimento-profissional.onrender.com'
};
```

| | `modo: 'api'` (padrão) | `modo: 'local'` |
|---|---|---|
| De onde vêm os dados | Back-end (`apiBase` + rota) | `data/` + rota + `.json` (ex.: `/setores` → `data/setores.json`, `/colaboradores/4` → `data/colaboradores/4.json`) |
| Login | Qualquer usuário do banco | Só as contas de `CONTAS_TESTE` (`config.js`) |
| Gravações (cadastrar, salvar perfil/configurações) | Gravam no banco | Mostram "Indisponível no modo demonstração" |
| Quando usar | Uso normal | Apresentação sem internet ou com o servidor fora do ar; mexer nas telas sem subir o back-end |

- Os arquivos do modo local têm **exatamente o formato das respostas da API**. As telas não sabem de onde vêm os dados.
- Rotas `/me/...` dependem de quem está logado, por isso ficam numa pasta por perfil: `data/gestor/me/perfil.json`, `data/colaborador/me/cursos.json`.
- No modo local só existem os dados das contas de teste (o gestor Carlos e a colaboradora Ana).
- **Para atualizar os arquivos**, com a API rodando:
  ```bash
  python backend/scripts/gerar_dados_locais.py --api http://localhost:8000 \
      --gestor carlos.lima@empresa.com SENHA --colaborador ana.souza@empresa.com SENHA
  ```
  O script loga com as duas contas, chama todas as rotas de leitura e regrava a pasta `data/`. Rode-o de novo sempre que a API mudar de formato.

### Rotas e `requisitarApi`

As rotas ficam num lugar só, o catálogo **`ENDPOINTS_API`** (`dados.js`). Para montar um caminho, use `rota('colaborador', { id: 4 })`, que devolve `'/colaboradores/4'`.

Toda leitura e gravação passa por **`requisitarApi(caminho, opcoes)`** (`js/comum/dados.js`), que:
- no modo local, lê o arquivo em vez de chamar o servidor;
- no modo API, monta a URL com `FONTE.apiBase` (para trocar de servidor, mude só essa linha);
- envia o token da sessão no cabeçalho `Authorization: Bearer ...`;
- espera até 60 s, porque o servidor gratuito do Render pode demorar para "acordar";
- em erro, rejeita com uma mensagem pronta para mostrar ao usuário (`erro.message`) e o código HTTP em `erro.status` (0 = servidor não respondeu);
- em **401**, encerra a sessão e volta ao login.

```js
requisitarApi(rota('setores')).then(function (dados) { ... }).catch(mostrarErroDaPagina);
requisitarApi(rota('perfil'), { metodo: 'PUT', corpo: { nome: 'Ana Souza' } });
```

As páginas não chamam `requisitarApi` direto: usam a função do recurso em `dados.js`. **Para uma rota nova:** acrescente-a em `ENDPOINTS_API`, crie a função `buscar...` em `dados.js` e inclua a rota em `backend/scripts/gerar_dados_locais.py`, para o modo local também tê-la.

| Tela | Função em `dados.js` | Rota da API |
|---|---|---|
| Login | `entrar()` (em `sessao.js`) | `POST /login` |
| Dashboard do gestor | `buscarDashboardGestor()` | `GET /dashboard/gestor` |
| Dashboard do colaborador | `buscarDashboardColaborador()` + `buscarMatriculas()` | `GET /dashboard/colaborador` + `GET /me/cursos` |
| Colaboradores | `buscarColaboradores()`, `buscarOpcoesSetores()`, `criarColaborador()` | `GET /colaboradores`, `GET /setores/opcoes`, `POST /usuarios` |
| Detalhes do colaborador / Meu progresso | `buscarColaborador(id)` | `GET /colaboradores/{id}` |
| Setores | `buscarSetores()` | `GET /setores` |
| Cursos (gestor) | `buscarCatalogoCursos()` | `GET /cursos` |
| Meus cursos | `buscarMatriculas()` | `GET /me/cursos` |
| Detalhe do curso | `buscarCurso(id)` | `GET /me/cursos/{id}` |
| Progresso (gestor) | `buscarProgresso()` | `GET /progresso` |
| Meu perfil | `buscarPerfil()`, `salvarPerfil()` | `GET` e `PUT /me/perfil` |
| Configurações | `buscarConfiguracoes()`, `salvarConfiguracoes()` | `GET` e `PUT /configuracoes` |

As respostas da API têm o **mesmo formato dos antigos arquivos `data/*.json`**, por isso o desenho das telas não mudou.

**Sempre locais, nos dois modos:** as notificações (`buscarDados('notifications')` lê `data/notifications.json`; o botão do sino está escondido) e o tema escolhido, que fica no navegador.

### O que ainda não tem dados reais
- **Detalhe do curso:** instrutor, início, prazo e módulos aparecem como "Não informado" ou "Módulos não disponíveis" (o banco não tem essas informações). O botão **"Continuar Curso" fica desativado** até existir a integração com as plataformas.
- **Indicadores:** sem a variação "vs. período anterior". A **meta do mês** mostra "ainda não foi definida" e a tabela **"Distribuição do progresso"** mostra "Indicador em definição".
- **Configurações:** sem o bloco Segurança (2FA e renovação de senha não fazem parte do sistema por enquanto). A seção Integrações está comentada no HTML.
- **Meu perfil:** e-mail e departamento são somente leitura.

## Decisões e limitações

- **Figma:** só o Login e o Dashboard do Gestor foram comparados diretamente com o design (a API do Figma atingiu o limite). As outras telas seguem a estrutura, os tokens e as orientações, e **não foram validadas pixel a pixel**. Cabeçalhos de tabelas e textos de apoio são estimados.
- **Mobile/tablet:** não há frames no Figma; o responsivo é derivado do desktop (menu em gaveta até 1024px; tabelas viram cartões até 720px).
- **Gráfico:** SVG próprio (Tremor exige React/Tailwind). Ícones Lucide embutidos. Fontes Inter/Geist vêm do Google Fonts (sem internet usa a fonte do sistema).
- Fundo do login recriado; logos de parceiros viram "tiles" com letra; avatares são iniciais.
- Os números vêm do banco e podem diferir dos números de exemplo do Figma.
- Acrescentado fora do Figma: botão de sair no menu; categorias dinâmicas; cartões de setor levam à lista filtrada; o filtro de datas só afeta os gráficos.
- Contraste do texto "apagado" no tema claro é baixo (#9d9d9d), como no Figma.

## Validação feita na simplificação

(Validação da versão com dados de exemplo, **antes** da integração com a API.)

A versão anterior (SPA com módulos) foi usada como referência. Com Chromium automatizado:
- **104 telas** (13 telas × 2 temas × 4 larguras: 1440, 1024, 768 e 390 px) comparadas pixel a pixel com a versão anterior: **0 diferenças**.
- **37 verificações de fluxo** passaram: login válido/inválido, bloqueio por perfil, navegação, busca/filtros, modal com validação, tema que persiste, sair, avanço de curso e salvar perfil.
- Sem erros no console. Abrir com duplo clique mostra a mensagem orientando a usar o Live Server.
- Não testado: outros navegadores além do Chromium, leitores de tela reais, impressão.
