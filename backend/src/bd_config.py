from mysql.connector import Error, IntegrityError, errorcode, pooling
from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_POOL_NOME = "gdp_pool"
DB_POOL_TAMANHO = 5                             # máximo de conexões abertas ao mesmo tempo

# Papéis de acesso: iguais ao ENUM da coluna Usuario.papel_acesso
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

    # ------------------------------------------------------------------ usuários

    def adicionar_usuario(self, id_empresa, id_setor, id_gestor, nome, email,
                          senha_hash, funcao=None):
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
                # o gestor informado precisa existir, ser GESTOR e ser da mesma empresa
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
                   (id_empresa, id_setor, id_gestor, nome, email, senha_hash, papel_acesso, funcao)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (id_empresa, id_setor, id_gestor, nome, email, senha_hash, papel_acesso, funcao),
            )
            conexao.commit()
            return cursor.lastrowid
        except IntegrityError as erro:
            conexao.rollback()
            if erro.errno == errorcode.ER_DUP_ENTRY:  # 1062: e-mail repetido
                return "duplicado"
            if erro.errno == errorcode.ER_NO_REFERENCED_ROW_2:  # 1452: setor inexistente ou de outra empresa
                return "referencia_invalida"
            print(f"Erro de integridade: {erro}")
            return None
        except Error as erro:
            conexao.rollback()
            print(f"Erro no MySQL: {erro}")
            return None
        finally:
            cursor.close()
            conexao.close()

    def buscar_usuario_por_email(self, email):
        """Dados do usuário para o login (inclui senha_hash) ou None."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT U.id_usuario, U.id_empresa, U.nome, U.email, U.senha_hash, U.papel_acesso,
                          U.funcao, U.ativo, S.nome AS setor_nome
                   FROM Usuario U
                   JOIN Setor S ON S.id_setor = U.id_setor
                   WHERE U.email = %s""",
                (email,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conexao.close()

    def buscar_skill_usuario(self, id_usuario):
        """Habilidades do usuário: lista de {"texto": ...}."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT texto FROM Habilidades
                   WHERE id_usuario = %s""",
                (id_usuario,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()

    # ------------------------------------------------------------------ setores

    def buscar_resumo_setores(self, id_empresa, id_gestor):
        """Setores onde o gestor tem equipe, com os números dessa equipe (só colaboradores ATIVOS).

        Cada linha: id_setor, nome, icone, cor, colaboradores, matriculas, soma_percentual
        e horas (carga horária dos cursos concluídos).
        """
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT S.id_setor, S.nome, S.icone, S.cor,
                          COUNT(DISTINCT U.id_usuario) AS colaboradores,
                          COUNT(CU.id_curso_usuario) AS matriculas,
                          COALESCE(SUM(CU.percentual_atual), 0) AS soma_percentual,
                          COALESCE(SUM(CASE WHEN CU.status = 'CONCLUIDO'
                                            THEN C.carga_horaria ELSE 0 END), 0) AS horas
                   FROM Setor S
                   LEFT JOIN Usuario U ON U.id_setor = S.id_setor
                       AND U.id_empresa = S.id_empresa
                       AND U.papel_acesso = %s AND U.ativo = 1
                       AND U.id_gestor = %s
                   LEFT JOIN Curso_Usuario CU ON CU.id_usuario = U.id_usuario
                   LEFT JOIN Curso C ON C.id_curso = CU.id_curso
                   WHERE S.id_empresa = %s
                   GROUP BY S.id_setor, S.nome, S.icone, S.cor
                   HAVING COUNT(DISTINCT U.id_usuario) > 0
                   ORDER BY S.id_setor""",
                (PAPEL_COLABORADOR, id_gestor, id_empresa),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()

    def listar_setores_empresa(self, id_empresa):
        """Todos os setores da empresa (id e nome)."""
        return self._consultar(
            "SELECT id_setor, nome FROM Setor WHERE id_empresa = %s ORDER BY nome",
            (id_empresa,),
        )

    # ------------------------------------------------------------------ colaboradores

    def listar_colaboradores_do_gestor(self, id_empresa, id_gestor):
        """Colaboradores (ativos e inativos) subordinados ao gestor, com totais das matrículas."""
        return self._consultar(
            """SELECT U.id_usuario, U.nome, U.email, U.funcao, U.ativo,
                      S.id_setor, S.nome AS setor_nome,
                      COUNT(CU.id_curso_usuario) AS matriculas,
                      COALESCE(SUM(CU.percentual_atual), 0) AS soma_percentual,
                      COALESCE(SUM(CASE WHEN CU.status = 'CONCLUIDO'
                                        THEN C.carga_horaria ELSE 0 END), 0) AS horas,
                      COALESCE(SUM(CASE WHEN CU.status = 'CONCLUIDO' THEN 1 ELSE 0 END), 0) AS concluidos
               FROM Usuario U
               JOIN Setor S ON S.id_setor = U.id_setor
               LEFT JOIN Curso_Usuario CU ON CU.id_usuario = U.id_usuario
               LEFT JOIN Curso C ON C.id_curso = CU.id_curso
               WHERE U.id_empresa = %s AND U.id_gestor = %s AND U.papel_acesso = %s
               GROUP BY U.id_usuario, U.nome, U.email, U.funcao, U.ativo, S.id_setor, S.nome
               ORDER BY U.nome""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
        )

    def buscar_colaborador(self, id_empresa, id_usuario):
        """Dados básicos de um colaborador da empresa (ou None)."""
        linhas = self._consultar(
            """SELECT U.id_usuario, U.id_gestor, U.nome, U.email, U.funcao, U.ativo,
                      S.nome AS setor_nome
               FROM Usuario U
               JOIN Setor S ON S.id_setor = U.id_setor
               WHERE U.id_empresa = %s AND U.id_usuario = %s AND U.papel_acesso = %s""",
            (id_empresa, id_usuario, PAPEL_COLABORADOR),
        )
        return linhas[0] if linhas else None

    def listar_matriculas_usuario(self, id_usuario):
        """Cursos do usuário: em andamento primeiro, depois concluídos (mais recentes), depois não iniciados."""
        return self._consultar(
            """SELECT C.id_curso, C.nome AS curso, C.carga_horaria, CA.nome AS categoria,
                      CU.id_plataforma, CU.status, CU.percentual_atual,
                      CU.data_conclusao, CU.certificado
               FROM Curso_Usuario CU
               JOIN Curso C ON C.id_curso = CU.id_curso
               LEFT JOIN Categoria CA ON CA.id_categoria = C.id_categoria
               WHERE CU.id_usuario = %s
               ORDER BY CASE CU.status WHEN 'EM_ANDAMENTO' THEN 0
                                       WHEN 'CONCLUIDO' THEN 1 ELSE 2 END,
                        CU.data_conclusao DESC, CU.percentual_atual DESC, C.nome""",
            (id_usuario,),
        )

    def listar_competencias_concluidas(self, id_usuario):
        """Competências dos cursos que o usuário já concluiu (sem repetição)."""
        return self._consultar(
            """SELECT DISTINCT CO.nome
               FROM Curso_Usuario CU
               JOIN Curso_Competencia CC ON CC.id_curso = CU.id_curso
               JOIN Competencia CO ON CO.id_competencia = CC.id_competencia
               WHERE CU.id_usuario = %s AND CU.status = 'CONCLUIDO'
               ORDER BY CO.nome""",
            (id_usuario,),
        )

    def listar_historico_progresso_usuario(self, id_usuario, limite=90):
        """Últimos registros diários de PROGRESSO_USUARIO (tabela Registro_Progresso), do mais antigo ao mais novo."""
        linhas = self._consultar(
            """SELECT data_registro, valor
               FROM Registro_Progresso
               WHERE nome_tabela = 'Usuario' AND id_registro = %s AND tipo = 'PROGRESSO_USUARIO'
               ORDER BY data_registro DESC
               LIMIT %s""",
            (id_usuario, limite),
        )
        return list(reversed(linhas))

    # ------------------------------------------------------------------ progresso

    def buscar_ranking_progresso(self, id_empresa, id_gestor):
        """Uma linha por colaborador ATIVO da equipe, do maior para o menor progresso médio.

        Cada linha (tupla): id_setor, setor, cor, id_usuario, nome, matriculas,
        soma_percentual, concluidos, horas.
        """
        return self._consultar(
            """SELECT S.id_setor, S.nome, S.cor, U.id_usuario, U.nome,
                      COUNT(CU.id_curso_usuario),
                      COALESCE(SUM(CU.percentual_atual), 0),
                      COALESCE(SUM(CASE WHEN CU.status = 'CONCLUIDO' THEN 1 ELSE 0 END), 0),
                      COALESCE(SUM(CASE WHEN CU.status = 'CONCLUIDO' THEN C.carga_horaria ELSE 0 END), 0)
               FROM Usuario U
               JOIN Setor S ON S.id_setor = U.id_setor AND S.id_empresa = U.id_empresa
               LEFT JOIN Curso_Usuario CU ON CU.id_usuario = U.id_usuario
               LEFT JOIN Curso C ON C.id_curso = CU.id_curso
               WHERE U.id_empresa = %s AND U.id_gestor = %s
                 AND U.papel_acesso = %s AND U.ativo = 1
               GROUP BY S.id_setor, S.nome, S.cor, U.id_usuario, U.nome
               ORDER BY COALESCE(AVG(CU.percentual_atual), 0) DESC, U.nome, U.id_usuario""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
            como_dict=False,
        )

    def buscar_horas_concluidas_por_dia(self, id_empresa, id_gestor):
        """Horas concluídas pela equipe (ATIVOS) por setor e dia: carga horária do curso na data de conclusão.

        Cada linha (tupla): id_setor, data_conclusao, horas.
        """
        return self._consultar(
            """SELECT U.id_setor, CU.data_conclusao, SUM(C.carga_horaria)
               FROM Curso_Usuario CU
               JOIN Usuario U ON U.id_usuario = CU.id_usuario
               JOIN Curso C ON C.id_curso = CU.id_curso
               WHERE U.id_empresa = %s AND U.id_gestor = %s
                 AND U.papel_acesso = %s AND U.ativo = 1
                 AND CU.status = 'CONCLUIDO' AND CU.data_conclusao IS NOT NULL
               GROUP BY U.id_setor, CU.data_conclusao""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
            como_dict=False,
        )

    # ------------------------------------------------------------------ cursos

    def listar_catalogo_cursos(self, id_empresa, id_gestor):
        """Todo o catálogo, com os números da equipe do gestor (só ATIVOS).

        Matrículas de quem não é da equipe ficam com U nulo e não entram nas contas.
        """
        return self._consultar(
            """SELECT C.id_curso, C.nome, C.ativo, CA.nome AS categoria,
                      COUNT(U.id_usuario) AS inscritos,
                      COALESCE(SUM(CASE WHEN U.id_usuario IS NOT NULL
                                        THEN CU.percentual_atual END), 0) AS soma_percentual,
                      COALESCE(SUM(CASE WHEN U.id_usuario IS NOT NULL AND CU.status = 'CONCLUIDO'
                                        THEN 1 ELSE 0 END), 0) AS concluidos
               FROM Curso C
               LEFT JOIN Categoria CA ON CA.id_categoria = C.id_categoria
               LEFT JOIN Curso_Usuario CU ON CU.id_curso = C.id_curso
               LEFT JOIN Usuario U ON U.id_usuario = CU.id_usuario
                   AND U.id_empresa = %s AND U.id_gestor = %s
                   AND U.papel_acesso = %s AND U.ativo = 1
               GROUP BY C.id_curso, C.nome, C.ativo, CA.nome
               ORDER BY C.nome""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
        )

    def contar_inscritos_equipe(self, id_empresa, id_gestor):
        """Quantos colaboradores ATIVOS da equipe têm pelo menos uma matrícula."""
        linhas = self._consultar(
            """SELECT COUNT(DISTINCT U.id_usuario) AS total
               FROM Usuario U
               JOIN Curso_Usuario CU ON CU.id_usuario = U.id_usuario
               WHERE U.id_empresa = %s AND U.id_gestor = %s
                 AND U.papel_acesso = %s AND U.ativo = 1""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
        )
        return int(linhas[0]["total"]) if linhas else 0

    def listar_cursos_em_andamento_equipe(self, id_empresa, id_gestor):
        """Cursos com matrículas EM_ANDAMENTO da equipe (só ATIVOS), dos mais cursados para os menos.

        Cada linha: curso, quantidade e soma_percentual (das matrículas em andamento).
        """
        return self._consultar(
            """SELECT C.nome AS curso, COUNT(*) AS quantidade,
                      COALESCE(SUM(CU.percentual_atual), 0) AS soma_percentual
               FROM Curso_Usuario CU
               JOIN Usuario U ON U.id_usuario = CU.id_usuario
               JOIN Curso C ON C.id_curso = CU.id_curso
               WHERE U.id_empresa = %s AND U.id_gestor = %s
                 AND U.papel_acesso = %s AND U.ativo = 1
                 AND CU.status = 'EM_ANDAMENTO'
               GROUP BY C.id_curso, C.nome
               ORDER BY quantidade DESC, C.nome""",
            (id_empresa, id_gestor, PAPEL_COLABORADOR),
        )

    # ------------------------------------------------------------------ perfil

    def buscar_perfil(self, id_usuario):
        """Dados do "Meu perfil" (ou None). Usa as colunas telefone e sobre_mim (script Att_3.sql)."""
        linhas = self._consultar(
            """SELECT U.id_usuario, U.nome, U.email, U.funcao, U.telefone, U.sobre_mim,
                      S.nome AS setor_nome
               FROM Usuario U
               JOIN Setor S ON S.id_setor = U.id_setor
               WHERE U.id_usuario = %s""",
            (id_usuario,),
        )
        return linhas[0] if linhas else None

    def atualizar_perfil(self, id_usuario, nome, funcao, telefone, sobre_mim, habilidades):
        """Atualiza o perfil e SUBSTITUI as habilidades numa transação só. Retorna True ou False (nada gravado)."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor()
        try:
            cursor.execute(
                """UPDATE Usuario SET nome = %s, funcao = %s, telefone = %s, sobre_mim = %s
                   WHERE id_usuario = %s""",
                (nome, funcao, telefone, sobre_mim, id_usuario),
            )
            cursor.execute("DELETE FROM Habilidades WHERE id_usuario = %s", (id_usuario,))
            if habilidades:
                cursor.executemany(
                    "INSERT INTO Habilidades (id_usuario, texto) VALUES (%s, %s)",
                    [(id_usuario, texto) for texto in habilidades],
                )
            conexao.commit()
            return True
        except Error as erro:
            conexao.rollback()
            print(f"Erro no MySQL: {erro}")
            return False
        finally:
            cursor.close()
            conexao.close()

    # ------------------------------------------------------------------ configurações

    def buscar_configuracoes(self, id_empresa):
        """Nome e CNPJ da empresa + formato de data (tabela Configuracoes, se existir a linha)."""
        linhas = self._consultar(
            """SELECT E.nome, E.cnpj, C.formato_data
               FROM Empresa E
               LEFT JOIN Configuracoes C ON C.id_empresa = E.id_empresa
               WHERE E.id_empresa = %s""",
            (id_empresa,),
        )
        return linhas[0] if linhas else None

    def listar_plataformas_empresa(self, id_empresa):
        """Todas as plataformas de curso, marcando as que a empresa já usa (Empresa_plataforma)."""
        return self._consultar(
            """SELECT P.id_plataforma, P.nome,
                      (EP.id_empresa IS NOT NULL) AS conectada
               FROM Plataforma P
               LEFT JOIN Empresa_plataforma EP ON EP.id_plataforma = P.id_plataforma
                   AND EP.id_empresa = %s
               ORDER BY P.nome""",
            (id_empresa,),
        )

    def salvar_configuracoes(self, id_empresa, nome, cnpj, formato_data, renovacao_padrao):
        """Atualiza empresa e formato de data numa transação só. Retorna "ok", "cnpj_duplicado" ou None."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor()
        try:
            cursor.execute(
                "UPDATE Empresa SET nome = %s, cnpj = %s WHERE id_empresa = %s",
                (nome, cnpj, id_empresa),
            )
            # Cria a linha se não existir (id_empresa é único); renovacao_senha é obrigatória
            # e só recebe o padrão na criação.
            cursor.execute(
                """INSERT INTO Configuracoes (id_empresa, formato_data, renovacao_senha)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE formato_data = VALUES(formato_data)""",
                (id_empresa, formato_data, renovacao_padrao),
            )
            conexao.commit()
            return "ok"
        except IntegrityError as erro:
            conexao.rollback()
            if erro.errno == errorcode.ER_DUP_ENTRY:   # CNPJ de outra empresa
                return "cnpj_duplicado"
            print(f"Erro de integridade: {erro}")
            return None
        except Error as erro:
            conexao.rollback()
            print(f"Erro no MySQL: {erro}")
            return None
        finally:
            cursor.close()
            conexao.close()

    # ------------------------------------------------------------------ apoio

    def _consultar(self, sql, parametros, como_dict=True):
        """Executa um SELECT e devolve as linhas (dicts, ou tuplas com como_dict=False). Sempre devolve a conexão ao pool."""
        conexao = self.pool.get_connection()
        cursor = conexao.cursor(dictionary=como_dict)
        try:
            cursor.execute(sql, parametros)
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()