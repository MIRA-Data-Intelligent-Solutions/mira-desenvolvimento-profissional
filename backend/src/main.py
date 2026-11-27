"""API da plataforma MIRA Evolution.

Organização: cada funcionalidade é um bloco (mesma ordem das seções do bd_config.py),
sempre na sequência constantes -> modelos de entrada -> regras/montagem -> rotas.
O SQL fica no BancoDeDados (bd_config.py); as rotas só validam, consultam e montam a resposta.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from mysql.connector import Error
from pydantic import BaseModel, EmailStr, Field, field_validator

from bd_config import PAPEL_COLABORADOR, PAPEL_GESTOR, BancoDeDados

load_dotenv()

# ------------------------------------------------------------------ configuração

SECRET_KEY = os.getenv("SECRET_KEY", "")
if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "Defina SECRET_KEY no .env com pelo menos 32 caracteres. "
    )
ALGORITMO = "HS256"
TOKEN_MINUTOS = int(os.getenv("TOKEN_MINUTOS", 60))

LIMITE_BYTES_SENHA = 72                           # limite real do bcrypt: não alterar

# Tamanhos iguais aos das colunas do banco
NOME_MIN_CARACTERES = 2
NOME_MAX_CARACTERES = 100
FUNCAO_MAX_CARACTERES = 200
TELEFONE_MAX_CARACTERES = 20
SOBRE_MIM_MAX_CARACTERES = 500
HABILIDADE_MAX_CARACTERES = 255
EMPRESA_NOME_MAX_CARACTERES = 150

# Endereços do front autorizados a chamar a API (o navegador bloqueia os demais)
CORS_ORIGENS = [
    "https://mira-evolution.vercel.app",   # produção (Vercel)
    "http://127.0.0.1:5500",               # Live Server
    "http://localhost:5500",
]

# ------------------------------------------------------------------ aplicação

app = FastAPI()
bd = BancoDeDados()   # o pool de conexões é criado uma vez, ao subir o servidor

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGENS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ autenticação


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1)


def criptografar_senha(senha: str) -> str:
    """GDP-129: gera o hash bcrypt da senha."""
    senha_bytes = senha.encode("utf-8")
    return bcrypt.hashpw(senha_bytes, bcrypt.gensalt()).decode("utf-8")


# Usado quando o e-mail não existe: o login leva o mesmo tempo nos dois casos,
# e o tempo de resposta não revela quais e-mails estão cadastrados.
HASH_FALSO = criptografar_senha("senha-falsa")


def verificar_senha(senha_digitada: str, hash_salvo: str) -> bool:
    """GDP-130: confere a senha digitada contra o hash salvo."""
    senha_bytes = senha_digitada.encode("utf-8")
    if len(senha_bytes) > LIMITE_BYTES_SENHA:
        return False
    try:
        return bcrypt.checkpw(senha_bytes, hash_salvo.encode("utf-8"))
    except ValueError:
        # hash salvo não é bcrypt (ex.: "hash_teste_1" dos dados de exemplo): senha errada, não erro 500
        return False


def validar_credenciais(email: str, senha: str) -> dict:
    """GDP-128: valida e-mail e senha. Retorna o usuário ou levanta 401/403."""
    try:
        usuario = bd.buscar_usuario_por_email(email.lower())
        usuario["habilidades"] = bd.buscar_skill_usuario(usuario["id_usuario"]) if usuario else None
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")

    hash_salvo = usuario["senha_hash"] if usuario else HASH_FALSO
    senha_ok = verificar_senha(senha, hash_salvo)

    # Mesma mensagem para e-mail inexistente e senha errada
    if usuario is None or not senha_ok:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Inativo só é avisado depois de acertar a senha, para não revelar quais e-mails existem
    if not usuario["ativo"]:
        raise HTTPException(status_code=403, detail="Usuário inativo. Procure seu gestor.")
    return usuario


def gerar_token(usuario: dict) -> str:
    """GDP-132: cria o token JWT assinado com a SECRET_KEY."""
    agora = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(usuario["id_usuario"]),
            "id_empresa": usuario["id_empresa"],
            "papel_acesso": usuario["papel_acesso"],
            "iat": agora,
            "exp": agora + timedelta(minutes=TOKEN_MINUTOS),
        },
        SECRET_KEY,
        algorithm=ALGORITMO,
    )


seguranca = HTTPBearer(auto_error=False)


def usuario_atual(cred: HTTPAuthorizationCredentials = Depends(seguranca)):
    """Dependência das rotas que exigem login (cabeçalho Authorization: Bearer <token>)."""
    nao_autenticado = {"WWW-Authenticate": "Bearer"}
    if cred is None:
        raise HTTPException(401, "Não autenticado", headers=nao_autenticado)
    try:
        dados = jwt.decode(
            cred.credentials,
            SECRET_KEY,
            algorithms=[ALGORITMO],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada, faça login novamente", headers=nao_autenticado)
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido", headers=nao_autenticado)

    return {
        "id_usuario": int(dados["sub"]),
        "id_empresa": dados["id_empresa"],
        "papel_acesso": dados["papel_acesso"],
    }


def exigir_papel(papel: str):
    """Dependência: exige login e exatamente este papel (senão, 403). Uso: Depends(exigir_papel(PAPEL_GESTOR))."""
    def verificador(usuario=Depends(usuario_atual)):
        if usuario["papel_acesso"] != papel:
            raise HTTPException(403, "Sem permissão para esta ação")
        return usuario
    return verificador


@app.post("/login")
def login(dados: LoginEntrada):
    """Login: devolve o token e os dados do usuário para a tela."""
    usuario = validar_credenciais(dados.email, dados.senha)
    token = gerar_token(usuario)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expira_em_minutos": TOKEN_MINUTOS,
        "usuario": {
            "userId": usuario["id_usuario"],
            "name": usuario["nome"],
            "firstName": usuario["nome"].split()[0],
            "title": usuario["funcao"],
            "email": usuario["email"],
            "papel_acesso": usuario["papel_acesso"],          # como no banco: GESTOR / COLABORADOR
            "role": usuario["papel_acesso"].lower(),          # como o front usa: gestor / colaborador
            "department": usuario["setor_nome"],
            "phone": "",
            "bio": "",
            "skills": [habilidade["texto"] for habilidade in usuario["habilidades"]]
        },
    }

# ------------------------------------------------------------------ usuários (cadastro)

# Regra: só o GESTOR cadastra, e o novo usuário é sempre COLABORADOR subordinado a ele.
# Senha inicial padrão (a troca obrigatória no primeiro acesso ainda não existe).
SENHA_PADRAO_NOVO_USUARIO = "12345678"


class UsuarioCadastro(BaseModel):
    id_setor: int
    nome: str = Field(min_length=NOME_MIN_CARACTERES, max_length=NOME_MAX_CARACTERES)
    email: EmailStr
    funcao: Optional[str] = Field(default=None, max_length=FUNCAO_MAX_CARACTERES)   # cargo


def padronizar_info_cadastro(usuario: UsuarioCadastro):
    """Arruma nome e e-mail antes de salvar."""
    return padronizar_nome(usuario.nome), usuario.email.lower()


@app.post("/usuarios", status_code=201)
def rota_cadastrar_usuario(usuario: UsuarioCadastro, logado=Depends(exigir_papel(PAPEL_GESTOR))):
    """GDP-126: cadastra um colaborador na equipe do gestor logado."""
    nome, email = padronizar_info_cadastro(usuario)
    funcao = (usuario.funcao or "").strip() or None
    senha_hash = criptografar_senha(SENHA_PADRAO_NOVO_USUARIO)

    resultado = bd.adicionar_usuario(
        logado["id_empresa"], usuario.id_setor,
        logado["id_usuario"],                        # gestor = quem está cadastrando
        nome, email, senha_hash, funcao,
    )

    if resultado == "duplicado":
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    if resultado == "referencia_invalida":
        raise HTTPException(status_code=400, detail="Empresa ou setor inválido")
    if resultado == "gestor_invalido":
        raise HTTPException(
            status_code=400,
            detail="id_gestor deve ser de um usuário GESTOR da mesma empresa",
        )
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro interno ao cadastrar")

    return {
        "mensagem": "Usuário cadastrado!",
        "id_usuario": resultado,
        "nome": nome,
        "senha_inicial": SENHA_PADRAO_NOVO_USUARIO,   # o gestor repassa ao colaborador
    }

# ------------------------------------------------------------------ setores

ICONE_SETOR_PADRAO = "folder"


def montar_resumo_setores(linhas: list) -> dict:
    """Tela Setores: indicadores + setores da equipe."""
    itens = []
    total_colaboradores = total_matriculas = total_horas = 0
    total_percentual = 0.0

    for linha in linhas:
        total_colaboradores += linha["colaboradores"]
        total_matriculas += linha["matriculas"]
        total_percentual += float(linha["soma_percentual"])
        total_horas += float(linha["horas"])
        itens.append({
            "id": str(linha["id_setor"]),
            "name": linha["nome"],
            "icon": linha["icone"] or ICONE_SETOR_PADRAO,
            "color": linha["cor"] or COR_SETOR_PADRAO,
            "collaborators": int(linha["colaboradores"]),
            "avgProgress": percentual(linha["soma_percentual"], linha["matriculas"]),
        })

    return {
        "kpis": [
            {"label": "Setores Mapeados", "value": str(len(itens)), "note": "setores com a sua equipe"},
            {"label": "Colaboradores Totais", "value": formatar_numero(total_colaboradores), "note": "ativos na sua equipe"},
            {"label": "Progresso Médio", "value": f"{percentual(total_percentual, total_matriculas)}%", "note": "média das matrículas da equipe"},
            {"label": "Horas de Desenvolvimento", "value": f"{formatar_numero(round(total_horas))}h", "note": "concluídos + progresso em andamento da equipe"},
        ],
        "items": itens,
    }


@app.get("/setores")
def setores(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Setores onde o gestor tem equipe, com colaboradores e progresso dessa equipe."""
    try:
        linhas = bd.buscar_resumo_setores(usuario["id_empresa"], usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar os setores")
    return montar_resumo_setores(linhas)


@app.get("/setores/opcoes")
def setores_opcoes(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Todos os setores da empresa, para o campo "Setor" do cadastro de colaborador."""
    try:
        linhas = bd.listar_setores_empresa(usuario["id_empresa"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar os setores")
    return [{"id": str(l["id_setor"]), "name": l["nome"]} for l in linhas]

# ------------------------------------------------------------------ colaboradores

FUNCAO_PADRAO = "Colaborador"        # usuário sem função cadastrada
CURSOS_RECENTES_LIMITE = 5


def pode_ver_colaborador(logado: dict, colaborador: dict) -> bool:
    """Regra de acesso: o colaborador vê só a si mesmo; o gestor, só os seus subordinados."""
    if logado["papel_acesso"] == PAPEL_COLABORADOR:
        return colaborador["id_usuario"] == logado["id_usuario"]
    return colaborador["id_gestor"] == logado["id_usuario"]


def montar_lista_colaboradores(linhas: list) -> dict:
    """Tela Colaboradores: lista da equipe (sem os detalhes)."""
    itens = [{
        "id": str(l["id_usuario"]),
        "name": l["nome"],
        "email": l["email"],
        "sector": str(l["id_setor"]),
        "sectorName": l["setor_nome"],
        "role": l["funcao"] or FUNCAO_PADRAO,
        "status": status_usuario(l["ativo"]),
        "progress": percentual(l["soma_percentual"], l["matriculas"]),
        "hours": round(float(l["horas"])),
        "courses": int(l["matriculas"]),
        "completedCourses": int(l["concluidos"]),
    } for l in linhas]
    setores = sorted({i["sectorName"] for i in itens})
    return {
        "totalActive": sum(1 for i in itens if i["status"] == "Ativo"),
        "sectorsFilter": setores,
        "items": itens,
    }


def horas_estudadas(matriculas: list) -> int:
    """Horas de desenvolvimento: carga inteira dos concluídos + fração feita dos em andamento.

    Ex.: concluído de 16h + em andamento de 100h com 15% -> 16 + 15 = 31h.
    """
    total = 0.0
    for m in matriculas:
        carga = float(m["carga_horaria"])
        if m["status"] == "CONCLUIDO":
            total += carga
        elif m["status"] == "EM_ANDAMENTO":
            total += carga * float(m["percentual_atual"]) / 100
    return round(total)


def montar_detalhe_colaborador(colaborador, matriculas, habilidades, competencias, historico) -> dict:
    """Tela Detalhes do colaborador (e "Meu progresso" do colaborador)."""
    quantidade = len(matriculas)
    soma = sum(float(m["percentual_atual"]) for m in matriculas)
    concluidas = [m for m in matriculas if m["status"] == "CONCLUIDO"]
    em_andamento = sum(1 for m in matriculas if m["status"] == "EM_ANDAMENTO")
    horas = horas_estudadas(matriculas)
    progresso = percentual(soma, quantidade)

    return {
        "id": str(colaborador["id_usuario"]),
        "name": colaborador["nome"],
        "email": colaborador["email"],
        "sectorName": colaborador["setor_nome"],
        "role": colaborador["funcao"] or FUNCAO_PADRAO,
        "status": status_usuario(colaborador["ativo"]),
        "progress": progresso,
        "hours": horas,
        "courses": quantidade,
        "completedCourses": len(concluidas),
        "skills": [h["texto"] for h in habilidades if h["texto"]],
        "competencies": [c["nome"] for c in competencias],
        "kpis": {
            "hours": {"value": horas, "note": "concluídos + progresso em andamento"},
            "progress": {"value": progresso, "note": "média das matrículas"},
            "inProgress": {"value": em_andamento, "note": "matrículas ativas"},
            "completed": {"value": len(concluidas), "note": "cursos finalizados"},
        },
        # gráfico de "frequência": histórico PROGRESSO_USUARIO de Registro_Progresso
        "frequency": [
            {"date": h["data_registro"].date().isoformat(), "value": float(h["valor"])}
            for h in historico
        ],
        "recentCourses": [
            {
                "title": m["curso"],
                "status": STATUS_MATRICULA.get(m["status"], m["status"]),
                "progress": round(float(m["percentual_atual"])),
            }
            for m in matriculas[:CURSOS_RECENTES_LIMITE]
        ],
        # certificado = curso concluído com Curso_Usuario.certificado preenchido
        "certificates": [
            {
                "title": m["curso"],
                "issuedAt": m["data_conclusao"].strftime("%d/%m/%Y") if m["data_conclusao"] else "",
                "url": m["certificado"],
            }
            for m in concluidas if m["certificado"]
        ],
    }


@app.get("/colaboradores")
def colaboradores(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Subordinados do gestor logado, ativos e inativos (a tela filtra pelo status)."""
    try:
        linhas = bd.listar_colaboradores_do_gestor(usuario["id_empresa"], usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar os colaboradores")
    return montar_lista_colaboradores(linhas)


@app.get("/colaboradores/{id_usuario}")
def colaborador_detalhe(id_usuario: int, usuario=Depends(usuario_atual)):
    """Detalhe de um colaborador. 404 também quando quem pede não pode vê-lo (não revela que existe)."""
    nao_encontrado = HTTPException(status_code=404, detail="Colaborador não encontrado.")
    try:
        colaborador = bd.buscar_colaborador(usuario["id_empresa"], id_usuario)
        if colaborador is None or not pode_ver_colaborador(usuario, colaborador):
            raise nao_encontrado
        detalhe = montar_detalhe_colaborador(
            colaborador,
            bd.listar_matriculas_usuario(id_usuario),
            bd.buscar_skill_usuario(id_usuario),
            bd.listar_competencias_concluidas(id_usuario),
            bd.listar_historico_progresso_usuario(id_usuario),
        )
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o colaborador")
    return detalhe

# ------------------------------------------------------------------ progresso


def evolucao_progresso(grupo_por_usuario: dict, historico: dict, hoje) -> tuple:
    """Média diária do progresso por grupo (setor) e de todos ("todos").

    `historico` é {id_usuario: {dia: percentual}}. Em cada dia vale o último percentual
    conhecido de cada colaborador (até ele ter um registro, ele não entra na média).
    Retorna (dias, {grupo: [média por dia], "todos": [...]}).
    """
    datas = [dia for registros in historico.values() for dia in registros]
    if not datas:
        return [], {}
    dias = dias_da_serie(datas + [hoje])

    ultimo = {}                                         # id_usuario -> último percentual conhecido
    medias = {grupo: [] for grupo in set(grupo_por_usuario.values())}
    medias["todos"] = []
    for dia in dias:
        for id_usuario, registros in historico.items():
            if dia in registros:
                ultimo[id_usuario] = registros[dia]
        for grupo, serie in medias.items():
            valores = [v for u, v in ultimo.items() if grupo == "todos" or grupo_por_usuario.get(u) == grupo]
            serie.append(round(sum(valores) / len(valores), 1) if valores else 0)
    return dias, medias


def historico_por_usuario(linhas_historico: list) -> dict:
    """Linhas (id_usuario, dia, valor) de PROGRESSO_USUARIO -> {id_usuario: {dia: percentual}}."""
    historico = {}
    for id_usuario, dia, valor in linhas_historico:     # em ordem de data: o último do dia prevalece
        historico.setdefault(id_usuario, {})[dia] = float(valor)
    return historico


def evolucao_progresso_equipe(linhas_ranking: list, linhas_historico: list, hoje) -> tuple:
    """Evolução do progresso médio da equipe por setor (e "todos").

    Usa as linhas de buscar_ranking_progresso: só entram os colaboradores ativos da equipe,
    e o ponto de hoje é o progresso atual das matrículas (mesma média do ranking).
    """
    historico = historico_por_usuario(linhas_historico)
    setor_por_usuario = {}
    for id_setor, _, _, id_usuario, _, matriculas, soma_percentual, _, _ in linhas_ranking:
        setor_por_usuario[id_usuario] = str(id_setor)
        historico.setdefault(id_usuario, {})[hoje] = float(soma_percentual) / matriculas if matriculas else 0
    historico = {u: r for u, r in historico.items() if u in setor_por_usuario}
    return evolucao_progresso(setor_por_usuario, historico, hoje)


def montar_progresso(linhas_ranking: list, linhas_historico: list) -> dict:
    """Tela Progresso: indicadores, ranking e evolução diária do progresso médio de cada setor da equipe."""
    setores = {}
    ranking = []
    total_matriculas = total_percentual = total_concluidos = total_horas = 0
    hoje = datetime.now().date()

    for id_setor, setor, cor, id_usuario, nome, matriculas, soma_percentual, concluidos, horas in linhas_ranking:
        # Como na tela Setores: só entram os setores onde o gestor tem equipe
        setor_id = str(id_setor)
        setores[setor_id] = {"id": setor_id, "name": setor, "color": cor or COR_SETOR_PADRAO}

        total_matriculas += matriculas
        total_percentual += soma_percentual
        total_concluidos += concluidos
        total_horas += float(horas)

        ranking.append({
            "position": len(ranking) + 1,
            "collaboratorId": str(id_usuario),
            "name": nome,
            "sector": setor,
            "progress": percentual(soma_percentual, matriculas),
            "hours": round(float(horas)),
            "completed": int(concluidos),
        })

    dias, progresso_por_dia = evolucao_progresso_equipe(linhas_ranking, linhas_historico, hoje)

    # legenda e filtro na ordem dos setores (o ranking vem ordenado por progresso)
    setores = dict(sorted(setores.items(), key=lambda item: int(item[0])))

    quantidade = len(ranking)
    progresso_geral = total_percentual / total_matriculas if total_matriculas else 0
    media_horas = total_horas / quantidade if quantidade else 0
    taxa_conclusao = 100 * total_concluidos / total_matriculas if total_matriculas else 0

    return {
        "kpis": [
            {"label": "Progresso Geral", "value": f"{progresso_geral:.0f}%", "note": "Média das matrículas"},
            {"label": "Média de Horas", "value": f"{media_horas:.1f}h", "note": "Concluídos + em andamento, por colaborador"},
            {"label": "Taxa de Conclusão", "value": f"{taxa_conclusao:.0f}%", "note": "Proporção de matrículas concluídas"},
            {"label": "Colaboradores Ativos", "value": str(quantidade), "note": "Na sua equipe"},
        ],
        "ranking": ranking,
        "sectors": list(setores.values()),
        "legendSectors": list(setores),
        "periodDefault": {
            "from": (dias[0] if dias else hoje).isoformat(),
            "to": (dias[-1] if dias else hoje).isoformat(),
        },
        "dates": [dia.isoformat() for dia in dias],
        "dailyProgress": {
            setor_id: progresso_por_dia.get(setor_id, [0] * len(dias))
            for setor_id in setores
        },
    }


@app.get("/progresso")
def progresso(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Ranking e evolução diária do progresso médio por setor (só a equipe do gestor logado)."""
    try:
        linhas_ranking = bd.buscar_ranking_progresso(usuario["id_empresa"], usuario["id_usuario"])
        linhas_historico = bd.buscar_historico_progresso_equipe(usuario["id_empresa"], usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o progresso")
    return montar_progresso(linhas_ranking, linhas_historico)

# ------------------------------------------------------------------ cursos (catálogo do gestor)


def montar_catalogo_cursos(linhas: list, inscritos_equipe: int) -> dict:
    """Tela Cursos do gestor: catálogo com os números da equipe."""
    itens = [{
        "id": str(l["id_curso"]),
        "title": l["nome"],
        "category": l["categoria"] or CATEGORIA_PADRAO,
        "enrolled": int(l["inscritos"]),
        "avgProgress": percentual(l["soma_percentual"], l["inscritos"]),
        "status": status_usuario(l["ativo"]),          # Curso.ativo -> "Ativo" / "Inativo"
    } for l in linhas]

    matriculas = sum(i["enrolled"] for i in itens)
    concluidos = sum(int(l["concluidos"]) for l in linhas)
    ativos = sum(1 for i in itens if i["status"] == "Ativo")
    taxa = round(100 * concluidos / matriculas) if matriculas else 0

    return {
        "totalCourses": ativos,
        "categories": sorted({i["category"] for i in itens}),
        "kpis": [
            {"label": "Total de Cursos", "value": formatar_numero(ativos), "note": "ativos no catálogo"},
            {"label": "Colaboradores Inscritos", "value": formatar_numero(inscritos_equipe), "note": "da sua equipe"},
            {"label": "Cursos Concluídos", "value": formatar_numero(concluidos), "note": "pela sua equipe"},
            {"label": "Taxa Média de Conclusão", "value": f"{taxa}%", "note": "das matrículas da equipe"},
        ],
        "items": itens,
    }


@app.get("/cursos")
def cursos(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Catálogo inteiro (Curso não tem empresa); inscritos e progresso contam só a equipe do gestor."""
    try:
        linhas = bd.listar_catalogo_cursos(usuario["id_empresa"], usuario["id_usuario"])
        inscritos = bd.contar_inscritos_equipe(usuario["id_empresa"], usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar os cursos")
    return montar_catalogo_cursos(linhas, inscritos)

# ------------------------------------------------------------------ meus cursos (colaborador)

NAO_INFORMADO = "Não informado"      # instrutor, início, prazo... ainda não existem no banco
PALAVRAS_IGNORADAS_CAPA = {"de", "da", "do", "das", "dos", "e", "para", "com", "a", "o"}
CAPA_MAX_CARACTERES = 10             # cabe na capa de 96px do cartão


def capa_curso(nome: str) -> str:
    """Texto da capa: a primeira palavra (se couber) ou as iniciais. Ex.: 'Docker', 'FC'."""
    palavras = [p for p in nome.split() if p.lower() not in PALAVRAS_IGNORADAS_CAPA] or nome.split()
    if len(palavras[0]) <= CAPA_MAX_CARACTERES or len(palavras) == 1:
        return palavras[0]
    return "".join(p[0].upper() for p in palavras[:3])


def montar_matricula(m: dict) -> dict:
    """Um curso do colaborador, no formato do cartão de "Meus cursos"."""
    return {
        "courseId": str(m["id_curso"]),
        "title": m["curso"],
        "category": m["categoria"] or CATEGORIA_PADRAO,
        "cover": capa_curso(m["curso"]),
        "modules": None,                      # o banco ainda não tem módulos
        "hours": int(m["carga_horaria"]),
        "progress": round(float(m["percentual_atual"])),
        "status": STATUS_MATRICULA.get(m["status"], m["status"]),
    }


def montar_meus_cursos(matriculas: list) -> dict:
    """Tela Meus cursos: indicadores + lista."""
    soma = sum(float(m["percentual_atual"]) for m in matriculas)
    return {
        "kpis": {
            "general": percentual(soma, len(matriculas)),
            "inProgress": sum(1 for m in matriculas if m["status"] == "EM_ANDAMENTO"),
            "platforms": len({m["id_plataforma"] for m in matriculas}),
            "completed": sum(1 for m in matriculas if m["status"] == "CONCLUIDO"),
        },
        "items": [montar_matricula(m) for m in matriculas],
    }


def montar_detalhe_curso(m: dict) -> dict:
    """Tela Detalhe do curso. Campos sem dados no banco vão como "Não informado"."""
    item = montar_matricula(m)
    return {
        "courseId": item["courseId"],
        "title": item["title"],
        "cover": item["cover"],
        "area": item["category"],
        "status": item["status"],
        "moduleCount": NAO_INFORMADO,
        "hours": item["hours"],
        "doneHours": round(item["hours"] * float(m["percentual_atual"]) / 100),
        "progress": item["progress"],
        "instructor": NAO_INFORMADO,
        "startDate": NAO_INFORMADO,
        "deadline": NAO_INFORMADO,
        "certificate": "Disponível" if m["certificado"] else NAO_INFORMADO,
        "modules": [],
    }


@app.get("/me/cursos")
def meus_cursos(usuario=Depends(exigir_papel(PAPEL_COLABORADOR))):
    """Cursos do colaborador logado, com indicadores."""
    try:
        matriculas = bd.listar_matriculas_usuario(usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar seus cursos")
    return montar_meus_cursos(matriculas)


@app.get("/me/cursos/{id_curso}")
def meu_curso_detalhe(id_curso: int, usuario=Depends(exigir_papel(PAPEL_COLABORADOR))):
    """Detalhe de um curso do colaborador logado (404 se ele não estiver matriculado)."""
    try:
        matriculas = bd.listar_matriculas_usuario(usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o curso")
    matricula = next((m for m in matriculas if m["id_curso"] == id_curso), None)
    if matricula is None:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")
    return montar_detalhe_curso(matricula)

# ------------------------------------------------------------------ dashboards

# Ainda sem: deltas "vs. período anterior" e meta do mês
# (dependem de regra e do job diário que vai alimentar Registro_Progresso).
SERIE_MIN_DIAS = 7                   # o gráfico mostra pelo menos uma semana
CURSOS_EM_ANDAMENTO_LIMITE = 5


def dias_da_serie(datas: list) -> list:
    """Todos os dias entre a primeira e a última data (mínimo de SERIE_MIN_DIAS, terminando na última)."""
    if not datas:
        return []
    inicio, fim = min(datas), max(datas)
    inicio = min(inicio, fim - timedelta(days=SERIE_MIN_DIAS - 1))
    return [inicio + timedelta(days=i) for i in range((fim - inicio).days + 1)]


def montar_dashboard_gestor(resumo_setores: list, linhas_ranking: list, linhas_historico: list,
                            cursos_andamento: list) -> dict:
    """Dashboard do gestor (só a equipe dele)."""
    setores = montar_resumo_setores(resumo_setores)["items"]
    colaboradores = sum(s["collaborators"] for s in setores)
    matriculas = sum(int(l["matriculas"]) for l in resumo_setores)
    soma = sum(float(l["soma_percentual"]) for l in resumo_setores)
    horas = round(sum(float(l["horas"]) for l in resumo_setores))
    em_andamento = sum(int(c["quantidade"]) for c in cursos_andamento)

    # gráfico: progresso médio diário por setor e da equipe inteira ("todos")
    hoje = datetime.now().date()
    dias, progresso_por_dia = evolucao_progresso_equipe(linhas_ranking, linhas_historico, hoje)
    vazio = [0] * len(dias)
    daily = {s["id"]: progresso_por_dia.get(s["id"], vazio) for s in setores}
    daily["todos"] = progresso_por_dia.get("todos", vazio)

    return {
        "periodDefault": {"from": (dias[0] if dias else hoje).isoformat(), "to": (dias[-1] if dias else hoje).isoformat()},
        "dates": [d.isoformat() for d in dias],
        "dailyProgress": daily,
        "sectors": [{"id": s["id"], "name": s["name"]} for s in setores],   # opções do filtro de setor
        "gestor": {
            "subtitle": "Aqui está o panorama do desenvolvimento da sua equipe.",
            "kpis": [
                {"label": "Colaboradores ativos", "value": formatar_numero(colaboradores), "note": "na sua equipe"},
                {"label": "Horas de desenvolvimento", "value": f"{formatar_numero(horas)}h", "note": "concluídos + progresso em andamento"},
                {"label": "Progresso médio", "value": f"{percentual(soma, matriculas)}%", "note": "média das matrículas"},
                {"label": "Cursos em andamento", "value": formatar_numero(em_andamento), "note": "matrículas ativas"},
            ],
            "sectorProgress": [
                {"sector": s["id"], "name": s["name"], "value": s["avgProgress"], "color": s["color"]}
                for s in setores
            ],
            "runningCourses": [
                {"name": c["curso"], "value": percentual(c["soma_percentual"], c["quantidade"])}
                for c in cursos_andamento[:CURSOS_EM_ANDAMENTO_LIMITE]
            ],
        },
    }


def montar_dashboard_colaborador(matriculas: list, historico: list) -> dict:
    """Dashboard do colaborador logado."""
    concluidas = [m for m in matriculas if m["status"] == "CONCLUIDO"]
    horas = horas_estudadas(matriculas)
    soma = sum(float(m["percentual_atual"]) for m in matriculas)

    # gráfico: histórico PROGRESSO_USUARIO + o progresso atual das matrículas como ponto de hoje
    hoje = datetime.now().date()
    registros = {h["data_registro"].date(): float(h["valor"]) for h in historico}
    registros[hoje] = soma / len(matriculas) if matriculas else 0
    dias, medias = evolucao_progresso({}, {"eu": registros}, hoje)

    return {
        "periodDefault": {"from": dias[0].isoformat(), "to": dias[-1].isoformat()},
        "colaborador": {
            "subtitle": "Aqui está o panorama do seu desenvolvimento.",
            "kpis": [
                {"label": "Horas de Desenvolvimento", "value": f"{formatar_numero(horas)}h", "note": "concluídos + progresso em andamento"},
                {"label": "Progresso Geral", "value": f"{percentual(soma, len(matriculas))}%", "note": "média das matrículas"},
                {"label": "Cursos em Andamento", "value": str(sum(1 for m in matriculas if m["status"] == "EM_ANDAMENTO")), "note": "matrículas ativas"},
                {"label": "Cursos Concluídos", "value": str(len(concluidas)), "note": "cursos finalizados"},
            ],
            "goal": None,                    # meta do mês: regra não definida
            "evolution": [{"date": d.isoformat(), "value": v} for d, v in zip(dias, medias["todos"])],
        },
    }


@app.get("/dashboard/gestor")
def dashboard_gestor(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Dashboard do gestor (só a equipe dele)."""
    empresa, gestor = usuario["id_empresa"], usuario["id_usuario"]
    try:
        resumo = bd.buscar_resumo_setores(empresa, gestor)
        ranking = bd.buscar_ranking_progresso(empresa, gestor)
        historico = bd.buscar_historico_progresso_equipe(empresa, gestor)
        cursos_andamento = bd.listar_cursos_em_andamento_equipe(empresa, gestor)
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o dashboard")
    return montar_dashboard_gestor(resumo, ranking, historico, cursos_andamento)


@app.get("/dashboard/colaborador")
def dashboard_colaborador(usuario=Depends(exigir_papel(PAPEL_COLABORADOR))):
    """Dashboard do colaborador logado."""
    try:
        matriculas = bd.listar_matriculas_usuario(usuario["id_usuario"])
        historico = bd.listar_historico_progresso_usuario(usuario["id_usuario"])
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o dashboard")
    return montar_dashboard_colaborador(matriculas, historico)

# ------------------------------------------------------------------ perfil

# Regra: o próprio usuário não altera o e-mail (é o login) nem o setor (definido pelo gestor).
HABILIDADES_MAX = 30


class PerfilAtualizacao(BaseModel):
    nome: str = Field(min_length=NOME_MIN_CARACTERES, max_length=NOME_MAX_CARACTERES)
    funcao: Optional[str] = Field(default=None, max_length=FUNCAO_MAX_CARACTERES)
    telefone: Optional[str] = Field(default=None, max_length=TELEFONE_MAX_CARACTERES)
    sobre_mim: Optional[str] = Field(default=None, max_length=SOBRE_MIM_MAX_CARACTERES)
    habilidades: list[str] = Field(default_factory=list, max_length=HABILIDADES_MAX)

    @field_validator("habilidades")
    @classmethod
    def habilidades_validas(cls, lista: list[str]) -> list[str]:
        if any(len(h.strip()) > HABILIDADE_MAX_CARACTERES for h in lista):
            raise ValueError(f"Cada habilidade pode ter no máximo {HABILIDADE_MAX_CARACTERES} caracteres")
        return lista


def limpar_habilidades(lista: list[str]) -> list[str]:
    """Tira espaços, vazias e repetidas (sem diferenciar maiúsculas), mantendo a ordem."""
    vistas, saida = set(), []
    for texto in (h.strip() for h in lista):
        if texto and texto.lower() not in vistas:
            vistas.add(texto.lower())
            saida.append(texto)
    return saida


def montar_perfil(perfil: dict, habilidades: list) -> dict:
    """Tela Meu perfil."""
    return {
        "userId": str(perfil["id_usuario"]),
        "name": perfil["nome"],
        "firstName": perfil["nome"].split()[0],
        "title": perfil["funcao"] or "",
        "email": perfil["email"],
        "phone": perfil["telefone"] or "",
        "department": perfil["setor_nome"],
        "bio": perfil["sobre_mim"] or "",
        "skills": [h["texto"] for h in habilidades if h["texto"]],
    }


def carregar_perfil(id_usuario: int) -> dict:
    try:
        perfil = bd.buscar_perfil(id_usuario)
        habilidades = bd.buscar_skill_usuario(id_usuario) if perfil else []
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o perfil")
    if perfil is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return montar_perfil(perfil, habilidades)


@app.get("/me/perfil")
def meu_perfil(usuario=Depends(usuario_atual)):
    """Perfil do usuário logado (gestor ou colaborador)."""
    return carregar_perfil(usuario["id_usuario"])


@app.put("/me/perfil")
def atualizar_meu_perfil(dados: PerfilAtualizacao, usuario=Depends(usuario_atual)):
    """Salva o perfil do usuário logado e devolve o perfil atualizado."""
    nome = padronizar_nome(dados.nome)
    if len(nome) < NOME_MIN_CARACTERES:          # ex.: nome só com espaços
        raise HTTPException(status_code=422, detail="Informe seu nome.")
    ok = bd.atualizar_perfil(
        usuario["id_usuario"],
        nome,
        texto_ou_nulo(dados.funcao),
        texto_ou_nulo(dados.telefone),
        texto_ou_nulo(dados.sobre_mim),
        limpar_habilidades(dados.habilidades),
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Erro interno ao salvar o perfil")
    return carregar_perfil(usuario["id_usuario"])

# ------------------------------------------------------------------ configurações

# Sem o bloco Segurança (2FA e renovação de senha estão fora do sistema por enquanto).
# Formato de data: a tela usa YYYY; o banco guarda em português (AAAA), como no script de criação.
FORMATOS_DATA = {"DD/MM/YYYY": "DD/MM/AAAA", "MM/DD/YYYY": "MM/DD/AAAA", "YYYY-MM-DD": "AAAA-MM-DD"}
FORMATO_DATA_PADRAO = "DD/MM/YYYY"
RENOVACAO_SENHA_PADRAO = 90          # coluna obrigatória em Configuracoes, sem uso no sistema


class ConfiguracoesAtualizacao(BaseModel):
    nome_empresa: str = Field(min_length=1, max_length=EMPRESA_NOME_MAX_CARACTERES)
    cnpj: str = Field(min_length=14, max_length=18)
    formato_data: str


def formato_para_tela(formato_banco: Optional[str]) -> str:
    for tela, banco in FORMATOS_DATA.items():
        if banco == formato_banco:
            return tela
    return FORMATO_DATA_PADRAO


def formatar_cnpj(cnpj: str) -> Optional[str]:
    """Aceita com ou sem pontuação e devolve 00.000.000/0000-00 (None se não tiver 14 dígitos)."""
    d = "".join(c for c in cnpj if c.isdigit())
    if len(d) != 14:
        return None
    return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"


def montar_configuracoes(config: dict, plataformas: list) -> dict:
    """Tela Configurações."""
    return {
        "general": {
            "companyName": config["nome"],
            "cnpj": config["cnpj"],
            "dateFormat": formato_para_tela(config["formato_data"]),
        },
        "dateFormats": list(FORMATOS_DATA),
        # só leitura: a seção Integrações está desativada na tela
        "integrations": [
            {"id": str(p["id_plataforma"]), "name": p["nome"],
             "status": "Conectado" if p["conectada"] else "Pendente"}
            for p in plataformas
        ],
    }


def carregar_configuracoes(id_empresa: int) -> dict:
    try:
        config = bd.buscar_configuracoes(id_empresa)
        plataformas = bd.listar_plataformas_empresa(id_empresa) if config else []
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar as configurações")
    if config is None:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    return montar_configuracoes(config, plataformas)


@app.get("/configuracoes")
def configuracoes(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Nome e CNPJ da empresa, formato de data e integrações."""
    return carregar_configuracoes(usuario["id_empresa"])


@app.put("/configuracoes")
def atualizar_configuracoes(dados: ConfiguracoesAtualizacao, usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Salva nome, CNPJ e formato de data e devolve as configurações atualizadas."""
    nome = dados.nome_empresa.strip()
    cnpj = formatar_cnpj(dados.cnpj)
    if not nome:
        raise HTTPException(status_code=422, detail="Informe o nome da empresa.")
    if cnpj is None:
        raise HTTPException(status_code=422, detail="Informe um CNPJ válido (00.000.000/0000-00).")
    if dados.formato_data not in FORMATOS_DATA:
        raise HTTPException(status_code=422, detail="Formato de data inválido.")

    resultado = bd.salvar_configuracoes(
        usuario["id_empresa"], nome, cnpj, FORMATOS_DATA[dados.formato_data], RENOVACAO_SENHA_PADRAO,
    )
    if resultado == "cnpj_duplicado":
        raise HTTPException(status_code=409, detail="Este CNPJ já está cadastrado para outra empresa.")
    if resultado != "ok":
        raise HTTPException(status_code=500, detail="Erro interno ao salvar as configurações")
    return carregar_configuracoes(usuario["id_empresa"])

# ------------------------------------------------------------------ apoio

COR_SETOR_PADRAO = "#2b7fff"         # setor sem cor no banco
CATEGORIA_PADRAO = "Sem categoria"   # curso sem id_categoria
STATUS_MATRICULA = {                 # ENUM do banco -> texto da tela
    "NAO_INICIADO": "Não iniciado",
    "EM_ANDAMENTO": "Em andamento",
    "CONCLUIDO": "Concluído",
}


def padronizar_nome(nome: str) -> str:
    """'ana  DA souza' -> 'Ana da Souza'."""
    minusculas = {"da", "de", "do", "das", "dos", "e"}
    palavras = nome.lower().split()
    return " ".join(
        p if (i > 0 and p in minusculas) else p.capitalize()
        for i, p in enumerate(palavras)
    )


def texto_ou_nulo(valor: Optional[str]) -> Optional[str]:
    """Tira espaços das pontas; texto vazio vira NULL no banco."""
    return (valor or "").strip() or None


def formatar_numero(valor) -> str:
    """1347 -> '1.347' (milhar brasileiro)."""
    return f"{int(valor):,}".replace(",", ".")


def percentual(soma, quantidade) -> int:
    """Média de percentual_atual das matrículas, arredondada (0 se não houver matrículas)."""
    return round(float(soma) / quantidade) if quantidade else 0


def status_usuario(ativo) -> str:
    return "Ativo" if ativo else "Inativo"
