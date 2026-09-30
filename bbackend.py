import os
import mysql.connector
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from mysql.connector import Error, IntegrityError
load_dotenv()

app = FastAPI()

class UsuarioCadastro(BaseModel):
    nome: str
    email: EmailStr
    senha: str


def conectar_bd():
    try:
        conexao = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT")),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            # ssl_ca="ca.pem",  # se a Aiven exigir o certificado
        )
        if conexao.is_connected():
            print("Conexão com MySQL estabelecida com sucesso!")
        return conexao
    except Error as erro:
        print(f"Erro ao conectar ao MySQL: {erro}")
        return None

def cadastrar_usuario(conexao, nome, email, senha_hash, telefone):
    cursor = None
    try:
        cursor = conexao.cursor()
        sql = "INSERT INTO Usuario (nome, email, senha_hash) VALUES (%s, %s, %s)"
        cursor.execute(sql, (nome, email, senha_hash))
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
        if cursor:
            cursor.close()

@app.post("/cadastro", status_code=201)
def cadastro(usuario: UsuarioCadastro):
    # O JSON já chegou convertido em objeto: cada campo é uma string normal
    nome = usuario.nome
    email = usuario.email
    senha = usuario.senha

    senha_hash = bcrypt.hash(senha)  # nunca salve a senha em texto puro

    conexao = get_conexao()
    try:
        resultado = cadastrar_usuario(conexao, nome, email, senha_hash, telefone)
    finally:
        conexao.close()

    if resultado == "duplicado":
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    if resultado is None:
        raise HTTPException(status_code=500, detail="Erro interno ao cadastrar")

    return {"mensagem": "Usuário cadastrado!", "id": resultado}

def ler_dados(conexao):
    cursor = None
    try:
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM Usuario")
        for linha in cursor.fetchall():
            print(linha)
    except Error as erro:
        print(f"Erro ao ler dados do MySQL: {erro}")
    finally:
        if cursor:
            cursor.close()

'''if __name__ == "__main__":
    conexao = conectar_bd()
    if conexao:
        try:
            ler_dados(conexao)
        finally:
            conexao.close()
            print("Conexão encerrada.")'''


conectar_bd()
