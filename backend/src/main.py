import os
from datetime import datetime, timedelta, timezone
from typing import Optional
  
import bcrypt
import jwt
from dotenv import load_dotenv #
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from mysql.connector import Error, IntegrityError, errorcode, pooling #
from pydantic import BaseModel, EmailStr, Field, field_validator

from bd_config import BancoDeDados


load_dotenv()

print("Início da aplicação")
# --- Empresa ---------------------------------------------------------------
# Empresa atendida por esta instalação (não vem do front end)
ID_EMPRESA = int(os.getenv("ID_EMPRESA", 1))    # vem do .env (padrão 1)

# --- Token de login (JWT) --------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "") 
if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "Defina SECRET_KEY no .env com pelo menos 32 caracteres. "
    )
ALGORITMO = "HS256"                             # fixo: algoritmo de assinatura do token
TOKEN_MINUTOS = int(os.getenv("TOKEN_MINUTOS", 60))  # vem do .env (padrão 60): validade do token

# --- Regras da senha e do nome (fixas) -------------------------------------
LIMITE_BYTES_SENHA = 72                         # fixo: limite REAL do bcrypt, não mexer
SENHA_MIN_CARACTERES = 8                        # fixo: mínimo ao cadastrar senha
NOME_MIN_CARACTERES = 2                         # fixo
NOME_MAX_CARACTERES = 100                       # fixo (igual ao varchar(100) do banco)

# --- Papéis de acesso (fixos: iguais ao ENUM da coluna papel_acesso no SQL) -
PAPEL_GESTOR = "GESTOR"
PAPEL_COLABORADOR = "COLABORADOR"

#------- FRONT END: trocar pelos endereços reais do front (onde a tela vai rodar)
# Se o endereço do front não estiver nesta lista, o navegador bloqueia as chamadas.
CORS_ORIGENS = [
    "https://mira-evolution.vercel.app",   # produção (Vercel)
    "http://127.0.0.1:5500",               # Live Server (teste local)
    "http://localhost:5500",               # o mesmo, escrito com localhost
]  # fixo

# Obs.: HASH_FALSO (usado no login) é calculado mais abaixo, junto da função
# criptografar_senha, porque depende dela.
# ===========================================================================


# ---------------------------------------------------------------------------
# Aplicação
# ---------------------------------------------------------------------------
app = FastAPI()
bd = BancoDeDados()  # cria o objeto (e o pool de conexões) uma vez, ao subir o servidor

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGENS,  # definido no bloco de configurações, no topo
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Funções das tarefas de autenticação
# ---------------------------------------------------------------------------
def criptografar_senha(senha: str) -> str:
    """GDP-129: transforma a senha em hash bcrypt (irreversível) para guardar no banco."""
    senha_bytes = senha.encode("utf-8")
    return bcrypt.hashpw(senha_bytes, bcrypt.gensalt()).decode("utf-8")


# Hash falso usado quando o e-mail não existe, para o login levar o mesmo tempo
# nos dois casos (evita descobrir quais e-mails estão cadastrados pelo tempo de resposta)
HASH_FALSO = criptografar_senha("senha-falsa")


def verificar_senha(senha_digitada: str, hash_salvo: str) -> bool:
    """GDP-130: confere a senha digitada contra o hash salvo.

    Não existe "descriptografar": o bcrypt repete a conta e compara os resultados.
    """
    senha_bytes = senha_digitada.encode("utf-8")
    if len(senha_bytes) > LIMITE_BYTES_SENHA:
        return False  # acima do limite, a senha nunca pode ser a correta
    return bcrypt.checkpw(senha_bytes, hash_salvo.encode("utf-8"))


def validar_credenciais(email: str, senha: str) -> dict:
    """GDP-128: valida e-mail e senha. Retorna o usuário ou levanta erro 401."""
    try:
        usuario = bd.buscar_usuario_por_email(email.lower())
        usuario["habilidades"] = bd.buscar_skill_usuario(usuario["id_usuario"]) if usuario else None
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")

    # Mesmo com e-mail inexistente, a conta do bcrypt é feita (contra o hash falso)
    hash_salvo = usuario["senha_hash"] if usuario else HASH_FALSO
    senha_ok = verificar_senha(senha, hash_salvo)

    # Mesma mensagem para e-mail inexistente e senha errada (não revela qual deu errado)
    if usuario is None or not senha_ok:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
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


# ---------------------------------------------------------------------------
# Cadastro de usuário (GDP-126)
# ---------------------------------------------------------------------------
#------- FRONT END: estes campos são o JSON que o front envia no cadastro.
# Os nomes (id_setor, id_gestor, nome, email, senha) precisam ser IGUAIS aos do formulário.
class UsuarioCadastro(BaseModel):
    id_setor: int
    id_gestor: Optional[int] = None
    nome: str = Field(min_length=NOME_MIN_CARACTERES, max_length=NOME_MAX_CARACTERES)
    email: EmailStr
    senha: str = Field(min_length=SENHA_MIN_CARACTERES, max_length=LIMITE_BYTES_SENHA)

    @field_validator("senha")
    @classmethod
    def senha_cabe_no_bcrypt(cls, senha: str) -> str:
        # max_length conta caracteres; o bcrypt conta bytes (acentos ocupam mais de 1)
        if len(senha.encode("utf-8")) > LIMITE_BYTES_SENHA:
            raise ValueError(f"Senha muito longa (máximo de {LIMITE_BYTES_SENHA} bytes)")
        return senha


def padronizar_nome(nome: str) -> str:
    minusculas = {"da", "de", "do", "das", "dos", "e"}
    palavras = nome.lower().split()
    return " ".join(
        p if (i > 0 and p in minusculas) else p.capitalize()
        for i, p in enumerate(palavras)
    )


def padronizar_info_cadastro(usuario: UsuarioCadastro):
    """Arruma nome e e-mail antes de salvar."""
    return padronizar_nome(usuario.nome), usuario.email.lower()


#------- FRONT END: o front chama POST /usuarios (endereço do servidor + "/usuarios").
# Respostas que o front precisa tratar: 201 (ok), 422 (campo inválido), 409 (e-mail repetido),
# 400 (setor/gestor inválido), 500 (erro interno).

@app.post("/usuarios", status_code=201)
def rota_cadastrar_usuario(usuario: UsuarioCadastro):
    nome, email = padronizar_info_cadastro(usuario)
    senha_hash = criptografar_senha(usuario.senha)

    resultado = bd.adicionar_usuario(
        ID_EMPRESA, usuario.id_setor, usuario.id_gestor,
        nome, email, senha_hash,
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

    return {"mensagem": "Usuário cadastrado!", "id_usuario": resultado}


# ---------------------------------------------------------------------------
# Login e proteção de rotas
# ---------------------------------------------------------------------------
#------- FRONT END: estes campos são o JSON que o front envia na tela de login.
class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1)


#------- FRONT END: o front chama POST /login e deve GUARDAR o "access_token" da resposta.
# Respostas que o front precisa tratar: 200 (ok), 401 (e-mail ou senha incorretos),
# 422 (formato inválido), 500 (erro interno).
@app.post("/login")
def login(dados: LoginEntrada):
    usuario = validar_credenciais(dados.email, dados.senha)
    token = gerar_token(usuario)

    #------- FRONT END: este é o JSON que o front recebe (token + dados para mostrar na tela).
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
            "papel_acesso": usuario["papel_acesso"],          # MAIÚSCULO, igual ao banco (GESTOR / COLABORADOR)
            "role": usuario["papel_acesso"].lower(), 
            "department": usuario["nome"],
            "phone": "",
            "bio": "",
            "skills": usuario["habilidades"] # minúsculo, é o que o front usa (gestor / colaborador)
        },
    }


seguranca = HTTPBearer(auto_error=False)


def usuario_atual(cred: HTTPAuthorizationCredentials = Depends(seguranca)):
    """Dependência: use em qualquer rota que exija estar logado."""
    #------- FRONT END: o front deve enviar em TODA rota protegida o cabeçalho
    # Authorization: Bearer <access_token>. Se vier 401, apagar o token e voltar ao login.
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
    """Dependência: exige login E que o usuário tenha exatamente este papel (senão, 403).

    Uso: Depends(exigir_papel(PAPEL_GESTOR))
    """
    def verificador(usuario=Depends(usuario_atual)):
        if usuario["papel_acesso"] != papel:
            raise HTTPException(403, "Sem permissão para esta ação")
        return usuario
    return verificador


#------- FRONT END: rota de teste. O front pode chamar GET /me (com o token) para saber quem está logado.
@app.get("/me")
def me(usuario=Depends(usuario_atual)):
    """Rota de teste: devolve quem está logado, segundo o token."""
    return usuario

 #------- FRONT END: o front chama GET /total_setores (com o token) e recebe {"total_setores": 5}.
# 403 (logado, mas não é gestor), 500 (erro interno). Só o GESTOR acessa.


@app.get("/total_setores")
def total_setores(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Quantidade de setores cadastrados na empresa (contados pelo id_setor). Só para GESTOR."""
    conexao = bd.pool.get_connection()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(id_setor) FROM Setor WHERE id_empresa = %s",
            (ID_EMPRESA,),
        )
        total = cursor.fetchone()[0]
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao contar setores")
    finally:
        cursor.close()
        conexao.close()  # devolve a conexão ao pool

    return {"total_setores": total}

    #------- FRONT END: o front chama GET /total_colaboradores (com o token) e recebe {"total_colaboradores": 12}.
# 403 (logado, mas não é gestor), 500 (erro interno). Só o GESTOR acessa.
@app.get("/total_colaboradores")
def total_colaboradores(usuario=Depends(exigir_papel(PAPEL_GESTOR))):
    """Quantidade de colaboradores da empresa (contados pelo id_usuario). Só para GESTOR."""
    conexao = bd.pool.get_connection()
    cursor = conexao.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(id_usuario) FROM Usuario WHERE id_empresa = %s AND papel_acesso = %s",
            (ID_EMPRESA, PAPEL_COLABORADOR),
        )
        total = cursor.fetchone()[0]
    except Error as erro:
        print(f"Erro no MySQL: {erro}")
        raise HTTPException(status_code=500, detail="Erro interno ao contar colaboradores")
    finally:
        cursor.close()
        conexao.close()  # devolve a conexão ao pool

    return {"total_colaboradores": total}

print("fim")