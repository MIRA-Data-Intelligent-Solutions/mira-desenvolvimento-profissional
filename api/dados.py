# =====================================================
# PLANO
# =====================================================

Plano = [
    {
        "id_plano": 1,
        "nome": "Basico",
        "descricao": "Plano inicial"
    },
    {
        "id_plano": 2,
        "nome": "Profissional",
        "descricao": "Plano intermediario"
    },
    {
        "id_plano": 3,
        "nome": "Premium",
        "descricao": "Plano completo"
    }
]


# =====================================================
# EMPRESA
# =====================================================

Empresa = [
    {
        "id_empresa": 1,
        "id_plano": 3,
        "nome": "Tech Solutions",
        "cnpj": "12.345.678/0001-10"
    },
    {
        "id_empresa": 2,
        "id_plano": 2,
        "nome": "Data Company",
        "cnpj": "98.765.432/0001-20"
    }
]


# =====================================================
# SETOR
# =====================================================

Setor = [
    {
        "id_setor": 1,
        "id_empresa": 1,
        "nome": "Tecnologia"
    },
    {
        "id_setor": 2,
        "id_empresa": 1,
        "nome": "Recursos Humanos"
    },
    {
        "id_setor": 3,
        "id_empresa": 1,
        "nome": "Financeiro"
    },
    {
        "id_setor": 4,
        "id_empresa": 2,
        "nome": "Dados"
    }
]


# =====================================================
# USUARIO
# =====================================================

Usuario = [
    {
        "id_usuario": 1,
        "id_empresa": 1,
        "id_setor": 1,
        "id_gestor": None,
        "nome": "Carlos Lima",
        "email": "carlos@email.com",
        "senha_hash": "hash_ficticio_1",
        "papel_acesso": "GESTOR",
        "ativo": True
    },
    {
        "id_usuario": 2,
        "id_empresa": 1,
        "id_setor": 1,
        "id_gestor": 1,
        "nome": "Ana Souza",
        "email": "ana@email.com",
        "senha_hash": "hash_ficticio_2",
        "papel_acesso": "COLABORADOR",
        "ativo": True
    },
    {
        "id_usuario": 3,
        "id_empresa": 1,
        "id_setor": 1,
        "id_gestor": 1,
        "nome": "Bruno Martins",
        "email": "bruno@email.com",
        "senha_hash": "hash_ficticio_3",
        "papel_acesso": "COLABORADOR",
        "ativo": True
    },
    {
        "id_usuario": 4,
        "id_empresa": 1,
        "id_setor": 2,
        "id_gestor": None,
        "nome": "Fernanda Costa",
        "email": "fernanda@email.com",
        "senha_hash": "hash_ficticio_4",
        "papel_acesso": "ADMINISTRADOR",
        "ativo": True
    },
    {
        "id_usuario": 5,
        "id_empresa": 2,
        "id_setor": 4,
        "id_gestor": None,
        "nome": "Mariana Silva",
        "email": "mariana@email.com",
        "senha_hash": "hash_ficticio_5",
        "papel_acesso": "GESTOR",
        "ativo": True
    },
    {
        "id_usuario": 6,
        "id_empresa": 2,
        "id_setor": 4,
        "id_gestor": 5,
        "nome": "Joao Oliveira",
        "email": "joao@email.com",
        "senha_hash": "hash_ficticio_6",
        "papel_acesso": "COLABORADOR",
        "ativo": False
    }
]


# =====================================================
# PLATAFORMA
# =====================================================

Plataforma = [
    {
        "id_plataforma": 1,
        "nome": "Alura",
        "descricao": "Plataforma de cursos de tecnologia",
        "url": "https://www.alura.com.br"
    },
    {
        "id_plataforma": 2,
        "nome": "Udemy",
        "descricao": "Plataforma de cursos online",
        "url": "https://www.udemy.com"
    },
    {
        "id_plataforma": 3,
        "nome": "Coursera",
        "descricao": "Plataforma de cursos e especializacoes",
        "url": "https://www.coursera.org"
    }
]


# =====================================================
# EMPRESA_PLATAFORMA
# =====================================================

Empresa_plataforma = [
    {
        "id_empresa": 1,
        "id_plataforma": 1
    },
    {
        "id_empresa": 1,
        "id_plataforma": 2
    },
    {
        "id_empresa": 2,
        "id_plataforma": 1
    },
    {
        "id_empresa": 2,
        "id_plataforma": 3
    }
]


# =====================================================
# CATEGORIA
# =====================================================

Categoria = [
    {
        "id_categoria": 1,
        "nome": "Programacao"
    },
    {
        "id_categoria": 2,
        "nome": "Dados"
    },
    {
        "id_categoria": 3,
        "nome": "Gestao"
    },
    {
        "id_categoria": 4,
        "nome": "Design"
    }
]


# =====================================================
# CURSO
# =====================================================

Curso = [
    {
        "id_curso": 1,
        "nome": "Python para Iniciantes",
        "descricao": "Fundamentos da linguagem Python",
        "carga_horaria": 20,
        "ativo": True,
        "id_categoria": 1
    },
    {
        "id_curso": 2,
        "nome": "Python para Ciencia de Dados",
        "descricao": "Python aplicado a analise de dados",
        "carga_horaria": 40,
        "ativo": True,
        "id_categoria": 2
    },
    {
        "id_curso": 3,
        "nome": "SQL e Banco de Dados",
        "descricao": "Fundamentos de SQL e bancos relacionais",
        "carga_horaria": 25,
        "ativo": True,
        "id_categoria": 2
    },
    {
        "id_curso": 4,
        "nome": "Lideranca de Equipes",
        "descricao": "Desenvolvimento de habilidades de lideranca",
        "carga_horaria": 15,
        "ativo": True,
        "id_categoria": 3
    },
    {
        "id_curso": 5,
        "nome": "UX Design",
        "descricao": "Fundamentos de experiencia do usuario",
        "carga_horaria": 30,
        "ativo": True,
        "id_categoria": 4
    }
]


# =====================================================
# COMPETENCIA
# =====================================================

Competencia = [
    {
        "id_competencia": 1,
        "id_empresa": 1,
        "nome": "Programacao",
        "descricao": "Capacidade de desenvolver sistemas"
    },
    {
        "id_competencia": 2,
        "id_empresa": 1,
        "nome": "Banco de Dados",
        "descricao": "Conhecimento em bancos relacionais"
    },
    {
        "id_competencia": 3,
        "id_empresa": 1,
        "nome": "Lideranca",
        "descricao": "Capacidade de liderar equipes"
    },
    {
        "id_competencia": 4,
        "id_empresa": 2,
        "nome": "Analise de Dados",
        "descricao": "Capacidade de interpretar dados"
    }
]


# =====================================================
# CURSO_COMPETENCIA
# =====================================================

Curso_Competencia = [
    {
        "id_curso": 1,
        "id_competencia": 1
    },
    {
        "id_curso": 2,
        "id_competencia": 4
    },
    {
        "id_curso": 3,
        "id_competencia": 2
    },
    {
        "id_curso": 4,
        "id_competencia": 3
    }
]


# =====================================================
# CURSO_USUARIO
# =====================================================

Curso_Usuario = [
    {
        "id_curso_usuario": 1,
        "id_usuario": 2,
        "id_curso": 1,
        "id_plataforma": 1,
        "status": "EM_ANDAMENTO",
        "data_conclusao": None,
        "percentual_atual": 70.00
    },
    {
        "id_curso_usuario": 2,
        "id_usuario": 2,
        "id_curso": 3,
        "id_plataforma": 1,
        "status": "CONCLUIDO",
        "data_conclusao": "2026-09-20",
        "percentual_atual": 100.00
    },
    {
        "id_curso_usuario": 3,
        "id_usuario": 3,
        "id_curso": 2,
        "id_plataforma": 2,
        "status": "EM_ANDAMENTO",
        "data_conclusao": None,
        "percentual_atual": 45.00
    },
    {
        "id_curso_usuario": 4,
        "id_usuario": 5,
        "id_curso": 4,
        "id_plataforma": 3,
        "status": "CONCLUIDO",
        "data_conclusao": "2026-09-15",
        "percentual_atual": 100.00
    },
    {
        "id_curso_usuario": 5,
        "id_usuario": 6,
        "id_curso": 2,
        "id_plataforma": 1,
        "status": "NAO_INICIADO",
        "data_conclusao": None,
        "percentual_atual": 0.00
    }
]


# =====================================================
# REGISTRO_PROGRESSO
# =====================================================

Registro_Progresso = [
    {
        "id_curso_usuario": 1,
        "data_registro": "2026-09-01 10:00:00",
        "percentual_progresso": 20.00,
        "observacao": "Inicio do curso"
    },
    {
        "id_curso_usuario": 1,
        "data_registro": "2026-09-10 10:00:00",
        "percentual_progresso": 45.00,
        "observacao": "Progresso intermediario"
    },
    {
        "id_curso_usuario": 1,
        "data_registro": "2026-09-20 10:00:00",
        "percentual_progresso": 70.00,
        "observacao": "Curso em andamento"
    },
    {
        "id_curso_usuario": 2,
        "data_registro": "2026-09-20 15:00:00",
        "percentual_progresso": 100.00,
        "observacao": "Curso concluido"
    },
    {
        "id_curso_usuario": 3,
        "data_registro": "2026-09-25 09:00:00",
        "percentual_progresso": 45.00,
        "observacao": "Curso em andamento"
    }
]