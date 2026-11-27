# Backend — MIRA Evolution

API da plataforma MIRA Evolution, feita em **Python com FastAPI** e acesso ao **MySQL com `mysql-connector-python`** (SQL escrito à mão, com pool de conexões).

## Como rodar

```bash
cd backend/src
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
cp ../.env.example .env         # depois preencha os valores
uvicorn main:app --reload       # http://localhost:8000  — documentação automática em /docs
```

### Variáveis de ambiente (`backend/src/.env`)

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | sim (porta: padrão 3306) | Conexão com o MySQL |
| `SECRET_KEY` | sim, **mínimo 32 caracteres** | Assina os tokens JWT. A API não sobe sem ela |
| `TOKEN_MINUTOS` | não (padrão 60) | Validade do token. Também limita o "Lembrar de mim" do front |

O arquivo `.env` nunca vai para o Git (está no `.gitignore`). Use `backend/.env.example` como modelo.

O front só consegue chamar a API a partir dos endereços listados em `CORS_ORIGENS`, no topo do `main.py` (Vercel e Live Server).

## Organização do código

O back-end fica em dois arquivos, por decisão da equipe:

| Arquivo | O que tem |
|---|---|
| `main.py` | Configurações, modelos de entrada (Pydantic), **regras de negócio** (funções `montar_*`, `pode_ver_colaborador`, `capa_curso`...) e as **rotas**. As rotas são curtas: validam, chamam o banco e montam a resposta. |
| `bd_config.py` | Classe `BancoDeDados`: **todo o SQL**. Cada consulta é um método (`listar_colaboradores_do_gestor`, `buscar_perfil`...). Para um `SELECT` simples, use o auxiliar `_consultar(sql, parametros)`, que sempre devolve a conexão ao pool. |

Os dois arquivos são divididos em **blocos por funcionalidade, na mesma ordem**, marcados com `# ------ nome do bloco`:

| `main.py` | `bd_config.py` |
|---|---|
| configuração, aplicação, autenticação | — |
| usuários (cadastro) | usuários |
| setores | setores |
| colaboradores | colaboradores |
| progresso | progresso |
| cursos (catálogo do gestor), meus cursos, dashboards | cursos |
| perfil | perfil |
| configurações | configurações |
| apoio (funções e valores usados por vários blocos) | apoio (`_consultar`) |

Dentro de cada bloco do `main.py` a ordem é sempre: **constantes → modelos de entrada (Pydantic) → regras/montagem (`montar_*`) → rotas**. Os limites de tamanho dos campos (iguais às colunas do banco) ficam juntos no bloco de configuração.

Ao criar uma rota nova, siga o mesmo caminho: **SQL em um método do `BancoDeDados` (no bloco da funcionalidade) → regra em uma função do `main.py` → rota que só junta as duas**. Se a funcionalidade for nova, crie o bloco nos dois arquivos, na mesma posição.

## Autenticação

1. O front chama `POST /login` com `{ "email", "senha" }` e recebe `access_token`, `expira_em_minutos` e `usuario`.
2. Toda rota protegida exige o cabeçalho `Authorization: Bearer <access_token>`.
3. O token carrega `sub` (id do usuário), `id_empresa` e `papel_acesso`. **A empresa e o usuário vêm sempre do token**, nunca do corpo da requisição.

Respostas de erro seguem o padrão do FastAPI: `{ "detail": "mensagem" }` (no 422 de validação automática, `detail` é uma lista). O front mostra o `detail` ao usuário quando é texto.

| Código | Quando |
|---|---|
| 401 | Sem token, token inválido ou expirado. O front apaga a sessão e volta ao login |
| 403 | Logado, mas sem o papel exigido, ou usuário inativo tentando entrar |
| 404 | Registro não existe **ou** o usuário não pode vê-lo (não revela a existência) |
| 409 | Duplicidade (e-mail ou CNPJ já cadastrado) |
| 422 | Campo inválido |
| 500 | Erro interno (detalhe só no log do servidor) |

## Regras de negócio

- **Papéis:** `GESTOR` e `COLABORADOR` (o `ADMINISTRADOR` foi retirado no `Atualizacao_2.sql`).
- **Usuário inativo** (`Usuario.ativo = 0`) não faz login (403).
- **O gestor vê só os próprios subordinados** (`Usuario.id_gestor`). As telas Setores e Progresso mostram só os setores onde ele tem equipe.
- **O colaborador vê só os próprios dados.**
- **Cadastro:** só o gestor cadastra, e o novo usuário é sempre um `COLABORADOR` subordinado a quem cadastrou, com a **senha inicial `12345678`**. A troca obrigatória no primeiro acesso ainda não existe.
- **Horas de desenvolvimento** (aproximação): carga horária inteira dos cursos **concluídos** + a fração já feita dos cursos **em andamento** (`carga × percentual / 100`). Vale para todos os totais (Detalhes do colaborador, Colaboradores, Setores, Progresso e dashboards). Os **gráficos de horas por dia** continuam usando só os concluídos, contados na data de conclusão, porque o progresso parcial não tem data por curso.
- **Progresso médio:** média do `percentual_atual` das matrículas.
- **Competências:** as dos cursos já concluídos (`Curso_Competencia`).
- **Certificados:** cursos concluídos com `Curso_Usuario.certificado` preenchido.
- **No "Meu perfil", e-mail e setor não são alterados** pelo próprio usuário.

### Ainda não implementado (decisão da equipe)
- Variação "vs. período anterior" nos indicadores, meta do mês e faixas "Alto / Em andamento / Baixo". Dependem de regra e do job diário que vai alimentar `Registro_Progresso`.
- Integração com as plataformas de curso e avanço de progresso pelo botão "Continuar curso".
- 2FA e renovação de senha.
- Notificações.

## Rotas

**Papel:** G = gestor, C = colaborador, G/C = qualquer usuário logado.

| Método e rota | Papel | O que faz |
|---|---|---|
| `POST /login` | público | Login. Devolve token e dados do usuário |
| `POST /usuarios` | G | Cadastra um colaborador na equipe de quem está logado. Corpo: `{ id_setor, nome, email, funcao? }` |
| `GET /setores` | G | Indicadores e setores da equipe (tela Setores) |
| `GET /setores/opcoes` | G | Todos os setores da empresa `[{ id, name }]` (campo do cadastro) |
| `GET /colaboradores` | G | Subordinados, ativos e inativos (tela Colaboradores) |
| `GET /colaboradores/{id}` | G/C | Detalhe. O gestor vê só os subordinados e o colaborador só a si mesmo |
| `GET /progresso` | G | Indicadores, ranking e horas por dia e setor da equipe |
| `GET /cursos` | G | Catálogo; inscritos e progresso contam só a equipe |
| `GET /me/cursos` | C | Cursos do usuário logado e indicadores |
| `GET /me/cursos/{id}` | C | Detalhe de um curso em que o usuário está matriculado |
| `GET /dashboard/gestor` | G | Dados do Dashboard do gestor |
| `GET /dashboard/colaborador` | C | Dados do Dashboard do colaborador |
| `GET /me/perfil` | G/C | Meu perfil |
| `PUT /me/perfil` | G/C | Salva `{ nome, funcao, telefone, sobre_mim, habilidades }` |
| `GET /configuracoes` | G | Nome e CNPJ da empresa, formato de data, integrações (só leitura) |
| `PUT /configuracoes` | G | Salva `{ nome_empresa, cnpj, formato_data }` |

As respostas das rotas `GET` seguem o mesmo formato dos antigos arquivos `frontend/mira-evolution/data/*.json`, com chaves em inglês. Assim as telas não precisaram mudar. Os corpos enviados ao back-end usam nomes em português.

O Swagger em `http://localhost:8000/docs` mostra todas as rotas com os campos e permite testá-las.

## Dados do modo local do front

O front tem um **modo local** (`FONTE.modo = 'local'` em `frontend/mira-evolution/js/comum/dados.js`) que lê as respostas da API gravadas em `.json`. Para regravar esses arquivos depois de mudar a API, rode com a API no ar:

```bash
python backend/scripts/gerar_dados_locais.py --api http://localhost:8000 \
    --gestor carlos.lima@empresa.com SENHA --colaborador ana.souza@empresa.com SENHA
```

**Ao criar uma rota de leitura nova**, inclua-a também nesse script.
