import mysql.connector
from mysql.connector import Error

def conectar_bd():
    try:
        conexao = mysql.connector.connect(
            host= "mysql-34749d79-mira-faculdade.b.aivencloud.com",
            port= "10974",
            database= "sistema_cursos",
            user= "Malu",
            password= "AVNS_Rae3jtnIo2Z_Bts47Pf"
        )
        if conexao.is_connected():
            print("Conexão com MySQL estabelecida com sucesso!")
        return conexao
    except Error as erro:
        print(f"Erro ao conectar ao MySQL: {erro}")
        return None

conectar_bd()



