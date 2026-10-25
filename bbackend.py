import os
import bcrypt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
from mysql.connector import Error, IntegrityError, pooling

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
            # ssl_ca="ca.pem",
        )

    def cadastrar_usuario(self, nome, email, senha_hash):
        conexao = self.pool.get_connection()
        cursor = conexao.cursor()
        try:
            cursor.execute(
                "INSERT INTO Usuario (nome, email, senha_hash) VALUES (%s, %s, %s)",
                (nome, email, senha_hash),
            )
            conexao.commit()
            return cursor.lastrowid
        except IntegrityError:
            conexao.rollback()
            return "duplicado"
        except Error as erro:
            conexao.rollback()
            print(f"Erro no MySQL: {erro}")
            return None
        finally:
            cursor.close()
            conexao.close()  # devolve a conexão ao pool

    def ler_usuarios(self):
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id, nome, email FROM Usuario")
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()


app = FastAPI()
bd = BancoDeDados()


class UsuarioCadastro(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(min_length=8)


def padronizar_nome(nome: str) -> str:
    minusculas = {"da", "de", "do", "das", "dos", "e"}
    palavras = nome.lower().split()
    return " ".join(
        p if (i > 0 and p in minusculas) else p.capitalize()
        for i, p in enumerate(palavras)
    )


@app.post("/cadastro", status_code=201)
def cadastro(usuario: UsuarioCadastro):
    nome = padronizar_nome(usuario.nome)
    email = usuario.email.lower()
    senha_hash = bcrypt.hashpw(usuario.senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    resultado = bd.cadastrar_usuario(nome, email, senha_hash)

    if resultado == "duplicado":
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro interno ao cadastrar")

    return {"mensagem": "Usuário cadastrado!", "id": resultado}