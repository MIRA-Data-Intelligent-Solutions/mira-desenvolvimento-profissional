use sistema_cursos;

insert into Registro_Progresso
(nome_tabela, id_registro, tipo, valor, data_registro)

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.35, 0),
    '2026-05-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.45, 0),
    '2026-06-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.55, 0),
    '2026-07-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.65, 0),
    '2026-08-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.75, 0),
    '2026-09-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual * 0.85, 0),
    '2026-10-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso

union all

select
    'Usuario',
    id_usuario,
    'PROGRESSO_USUARIO',
    round(progresso_atual, 0),
    '2026-11-27 10:00:00'
from (
    select id_usuario, avg(percentual_atual) as progresso_atual
    from Curso_Usuario
    group by id_usuario
) as progresso;