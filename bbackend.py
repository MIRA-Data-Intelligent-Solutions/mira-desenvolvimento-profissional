import os
from typing import Optional #
import bcrypt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware #
from mysql.connector import Error, IntegrityError, errorcode, pooling
from pydantic import BaseModel, EmailStr, Field

load_dotenv()


class BancoDeDados:
    def __init__(self):
        self.pool = pooling.MySQLConnectionPool(
            pool_name="gdp_pool",
            pool_size=5,
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 3306)),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            # ssl_ca="ca.pem",  # se a Aiven exigir o certificado
        )



"""Insere um usuário. Retorna o novo id ou um código de erro (str).

    Regra de hierarquia:
    - id_gestor None  -> o próprio usuário é GESTOR
    - id_gestor = X   -> COLABORADOR, subordinado ao gestor de id_usuario X  """

    def adicionar_usuario(self, id_empresa, id_setor, id_gestor, nome, email, senha_hash):
      
        conexao = self.pool.get_connection()
        cursor = conexao.cursor()
        try:
            if id_gestor is None:
                papel_acesso = "GESTOR"
            else:
                papel_acesso = "COLABORADOR"
                # O gestor informado precisa existir, ser GESTOR e ser da mesma empresa
                cursor.execute(
                    """SELECT 1 FROM Usuario
                       WHERE id_usuario = %s AND id_empresa = %s
                         AND papel_acesso = 'GESTOR'""",
                    (id_gestor, id_empresa),
                )
                if cursor.fetchone() is None:
                    return "gestor_invalido"

            cursor.execute(
                """INSERT INTO Usuario
                   (id_empresa, id_setor, id_gestor, nome, email, senha_hash, papel_acesso)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (id_empresa, id_setor, id_gestor, nome, email, senha_hash, papel_acesso),
            )
            conexao.commit()
            return cursor.lastrowid
        except IntegrityError as erro:
            conexao.rollback()
            if erro.errno == errorcode.ER_DUP_ENTRY:  # 1062: e-mail repetido
                return "duplicado"
            if erro.errno == errorcode.ER_NO_REFERENCED_ROW_2:  # 1452: FK inválida
                return "referencia_invalida"  # empresa/setor não existe ou setor de outra empresa
            print(f"Erro de integridade: {erro}")
            return None
        except Error as erro:
            conexao.rollback()
            print(f"Erro no MySQL: {erro}")
            return None
        finally:
            cursor.close()
            conexao.close()  # devolve a conexão ao pool


app = FastAPI()
bd = BancoDeDados()

# ajustar a origem para o endereço real do front end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Empresa atendida por esta instalação (definida no .env, não vem do front end)
ID_EMPRESA = int(os.getenv("ID_EMPRESA", 1))


class UsuarioCadastro(BaseModel):
    id_setor: int
    id_gestor: Optional[int] = None
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)


def padronizar_nome(nome: str) -> str:
    minusculas = {"da", "de", "do", "das", "dos", "e"}
    palavras = nome.lower().split()
    return " ".join(
        p if (i > 0 and p in minusculas) else p.capitalize()
        for i, p in enumerate(palavras)
    )


@app.post("/usuarios", status_code=201)
def adicionar_usuario(usuario: UsuarioCadastro):
    nome = padronizar_nome(usuario.nome)
    email = usuario.email.lower()
    senha_hash = bcrypt.hashpw(
        usuario.senha.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

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