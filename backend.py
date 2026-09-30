import os

import mysql.connector
from dotenv import load_dotenv
from mysql.connector import Error

load_dotenv()


def conectar_bd():
    try:
        conexao = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT")),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            # ssl_ca="ca.pem",  # descomente se a Aiven exigir o certificado
        )
        if conexao.is_connected():
            print("Conexão com MySQL estabelecida com sucesso!")
        return conexao
    except Error as erro:
        print(f"Erro ao conectar ao MySQL: {erro}")
        return None


def ler_dados(conexao):
    cursor = None
    try:
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM Curso")
        for linha in cursor.fetchall():
            print(linha)
    except Error as erro:
        print(f"Erro ao ler dados do MySQL: {erro}")
    finally:
        if cursor:
            cursor.close()


if __name__ == "__main__":
    conexao = conectar_bd()
    if conexao:
        try:
            ler_dados(conexao)
        finally:
            conexao.close()
            print("Conexão encerrada.")