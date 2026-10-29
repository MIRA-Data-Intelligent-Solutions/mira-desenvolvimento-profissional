from mysql.connector import Error, IntegrityError, errorcode, pooling
from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST")                  # vem do .env
DB_PORT = int(os.getenv("DB_PORT", 3306))       # vem do .env (padrão 3306)
DB_NAME = os.getenv("DB_NAME")                  # vem do .env
DB_USER = os.getenv("DB_USER")                  # vem do .env
DB_PASSWORD = os.getenv("DB_PASSWORD")          # vem do .env
DB_POOL_NOME = "gdp_pool"                       # fixo: nome do pool de conexões
DB_POOL_TAMANHO = 5                             # fixo: máximo de conexões abertas ao mesmo tempo

# --- Papéis de acesso (fixos: iguais ao ENUM da coluna papel_acesso no SQL) -
PAPEL_GESTOR = "GESTOR"
PAPEL_COLABORADOR = "COLABORADOR"

class BancoDeDados:
    def __init__(self):
        self.pool = pooling.MySQLConnectionPool(
            pool_name=DB_POOL_NOME,
            pool_size=DB_POOL_TAMANHO,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            # ssl_ca="ca.pem",  # se a Aiven exigir o certificado
        )

    def adicionar_usuario(self, id_empresa, id_setor, id_gestor, nome, email,
                          senha_hash):
        """Insere um usuário. Retorna o novo id ou um código de erro (str).

        Regra de hierarquia:
          - id_gestor None  -> o próprio usuário é GESTOR
          - id_gestor = X   -> COLABORADOR, subordinado ao gestor de id_usuario X
        """
        conexao = self.pool.get_connection()
        cursor = conexao.cursor()
        try:
            if id_gestor is None:
                papel_acesso = PAPEL_GESTOR
            else:
                papel_acesso = PAPEL_COLABORADOR
                # O gestor informado precisa existir, ser GESTOR e ser da mesma empresa
                cursor.execute(
                    """SELECT 1 FROM Usuario
                       WHERE id_usuario = %s AND id_empresa = %s
                         AND papel_acesso = %s""",
                    (id_gestor, id_empresa, PAPEL_GESTOR),
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

    def buscar_usuario_por_email(self, email):
        """Retorna um dict com os dados do usuário (incluindo senha_hash) ou None."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT U.id_usuario, U.id_empresa, U.nome, U.email, U.senha_hash, U.papel_acesso, U.funcao, S.nome FROM Usuario U
                join Setor S on S.id_setor=U.id_setor
                WHERE U.email = %s""",
                (email,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conexao.close()

    def buscar_skill_usuario(self, id_usuario):
            """Retorna um dict com os dados do usuário (incluindo senha_hash) ou None."""
            conexao = self.pool.get_connection()
            cursor = conexao.cursor(dictionary=True)
            try:
                cursor.execute(
                    """SELECT id_habilidade, texto from Habilidades
                    WHERE id_usuario = %s""",
                    (id_usuario,),
                )
                return cursor.fetchone()
            finally:
                cursor.close()
                conexao.close()