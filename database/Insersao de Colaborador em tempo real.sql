use sistema_cursos;

-- =====================================================
-- 1. INFORMAR O EMAIL DO COLABORADOR CRIADO NA APRESENTACAO
-- =====================================================

set @email_novo = 'rafael@gmail.com';

set @id_usuario = (
    select id_usuario
    from Usuario
    where email = @email_novo
);

-- conferir se encontrou o usuario
select @id_usuario as id_usuario_encontrado;


-- =====================================================
-- 2. SIMULAR CURSOS RECEBIDOS DA ALURA
-- =====================================================

-- Python para Iniciantes = 60%
-- SQL e Banco de Dados = 40%
-- Git e GitHub = 100%

insert into Curso_Usuario
(id_usuario, id_curso, id_plataforma, status, data_conclusao, percentual_atual)
values
(@id_usuario, 1, 1, 'EM_ANDAMENTO', null, 60.00),
(@id_usuario, 3, 1, 'EM_ANDAMENTO', null, 40.00),
(@id_usuario, 8, 1, 'CONCLUIDO', current_date, 100.00);


-- =====================================================
-- 3. PEGAR OS IDS DAS MATRICULAS CRIADAS
-- =====================================================

set @curso_python = (
    select id_curso_usuario
    from Curso_Usuario
    where id_usuario = @id_usuario
    and id_curso = 1
);

set @curso_sql = (
    select id_curso_usuario
    from Curso_Usuario
    where id_usuario = @id_usuario
    and id_curso = 3
);

set @curso_git = (
    select id_curso_usuario
    from Curso_Usuario
    where id_usuario = @id_usuario
    and id_curso = 8
);


-- =====================================================
-- 4. SIMULAR O JOB DE PROGRESSO DIARIO DOS CURSOS
-- =====================================================

insert into Registro_Progresso
(nome_tabela, id_registro, tipo, valor, data_registro)
values

-- Python
('Curso_Usuario', @curso_python, 'PROGRESSO_CURSO', 10,
 timestamp(date_sub(current_date, interval 4 day), '10:00:00')),

('Curso_Usuario', @curso_python, 'PROGRESSO_CURSO', 25,
 timestamp(date_sub(current_date, interval 3 day), '10:00:00')),

('Curso_Usuario', @curso_python, 'PROGRESSO_CURSO', 40,
 timestamp(date_sub(current_date, interval 2 day), '10:00:00')),

('Curso_Usuario', @curso_python, 'PROGRESSO_CURSO', 50,
 timestamp(date_sub(current_date, interval 1 day), '10:00:00')),

('Curso_Usuario', @curso_python, 'PROGRESSO_CURSO', 60,
 timestamp(current_date, '10:00:00')),


-- SQL
('Curso_Usuario', @curso_sql, 'PROGRESSO_CURSO', 0,
 timestamp(date_sub(current_date, interval 4 day), '10:01:00')),

('Curso_Usuario', @curso_sql, 'PROGRESSO_CURSO', 10,
 timestamp(date_sub(current_date, interval 3 day), '10:01:00')),

('Curso_Usuario', @curso_sql, 'PROGRESSO_CURSO', 20,
 timestamp(date_sub(current_date, interval 2 day), '10:01:00')),

('Curso_Usuario', @curso_sql, 'PROGRESSO_CURSO', 30,
 timestamp(date_sub(current_date, interval 1 day), '10:01:00')),

('Curso_Usuario', @curso_sql, 'PROGRESSO_CURSO', 40,
 timestamp(current_date, '10:01:00')),


-- Git e GitHub
('Curso_Usuario', @curso_git, 'PROGRESSO_CURSO', 20,
 timestamp(date_sub(current_date, interval 4 day), '10:02:00')),

('Curso_Usuario', @curso_git, 'PROGRESSO_CURSO', 45,
 timestamp(date_sub(current_date, interval 3 day), '10:02:00')),

('Curso_Usuario', @curso_git, 'PROGRESSO_CURSO', 70,
 timestamp(date_sub(current_date, interval 2 day), '10:02:00')),

('Curso_Usuario', @curso_git, 'PROGRESSO_CURSO', 90,
 timestamp(date_sub(current_date, interval 1 day), '10:02:00')),

('Curso_Usuario', @curso_git, 'PROGRESSO_CURSO', 100,
 timestamp(current_date, '10:02:00'));


-- =====================================================
-- 5. REGISTRAR O PROGRESSO GERAL DO COLABORADOR
-- =====================================================

insert into Registro_Progresso
(nome_tabela, id_registro, tipo, valor, data_registro)
values

('Usuario', @id_usuario, 'PROGRESSO_USUARIO', 10.00,
 timestamp(date_sub(current_date, interval 4 day), '11:00:00')),

('Usuario', @id_usuario, 'PROGRESSO_USUARIO', 26.67,
 timestamp(date_sub(current_date, interval 3 day), '11:00:00')),

('Usuario', @id_usuario, 'PROGRESSO_USUARIO', 43.33,
 timestamp(date_sub(current_date, interval 2 day), '11:00:00')),

('Usuario', @id_usuario, 'PROGRESSO_USUARIO', 56.67,
 timestamp(date_sub(current_date, interval 1 day), '11:00:00')),

('Usuario', @id_usuario, 'PROGRESSO_USUARIO', 66.67,
 timestamp(current_date, '11:00:00'));