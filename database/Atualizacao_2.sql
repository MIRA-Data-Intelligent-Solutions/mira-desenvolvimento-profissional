USE sistema_cursos;
show tables;

-- Retirando o papel ADM--
set SQL_SAFE_UPDATES = 0;

update Usuario
set papel_acesso = 'GESTOR'
where papel_acesso = 'ADMINISTRADOR';

set SQL_SAFE_UPDATES = 1;

alter table  Usuario
modify column papel_acesso
enum('GESTOR', 'COLABORADOR')
not null ;

-- Email para unique--
alter table  Usuario
add constraint  uq_usuario_email
unique (email);

-- Atualizando a tabela Setor--
alter table Setor
add column icone varchar(100) null,
add column cor varchar(20) null;

update Setor
set nome = 'Tecnologia', icone = 'code', cor = '#2b7fff'
where id_setor = 1;

update Setor
set nome = 'RH', icone = 'users', cor = '#6f78db'
where id_setor = 2;

update Setor
set nome = 'Financeiro', icone = 'dollar-sign', cor = '#00bc7d'
where id_setor = 3;

update Setor
set nome = 'Comercial', icone = 'briefcase', cor = '#df4d48'
where id_setor = 4;

insert into Setor (id_empresa, nome, icone, cor)
values
(1, 'Atendimento', 'phone', '#f5a524'),
(1, 'Marketing', 'megaphone', '#e0529c'),
(1, 'Logística', 'truck', '#14b8a6'),
(1, 'Jurídico', 'shield', '#9b6bff');
select * from Setor;

-- Add funcao em usuario--
alter table Usuario
add column funcao varchar(200);

-- Add certifica em Curso_usuario --
alter table Curso_Usuario
add column certificado varchar(255) null;

-- tabela para habilidades do usuario --
create table Habilidades (
    id_habilidade int primary key auto_increment,
    id_usuario int not null,
    texto varchar(255),

    constraint fk_habilidades_usuario
        foreign key (id_usuario)
        references Usuario(id_usuario)
        on delete cascade 
);

insert into Habilidades (id_usuario, texto)
values
(4, 'Python'),
(4, 'SQL'),
(4, 'Git'),
(5, 'Power BI'),
(5, 'Banco de Dados');

-- Tabela para config-- 
create table Configuracoes (
    id_configuracao int primary key auto_increment,
    id_empresa int not null,
    formato_data varchar(20) not null,
    renovacao_senha int not null,

    constraint fk_configuracoes_empresa
        foreign key (id_empresa)
        references Empresa(id_empresa)
        on delete cascade,

    constraint uq_configuracoes_empresa
        unique (id_empresa)
);

insert into Configuracoes
(id_empresa, formato_data, renovacao_senha)
values
(1, 'DD/MM/AAAA', 90);

-- apagar a tabela antiga
drop table  Registro_Progresso;

-- tabela de progressos--
create table Registro_Progresso (
    id int primary key auto_increment,
    nome_tabela varchar(100) not null,
    id_registro int not null,
    tipo varchar(100) not null,
    valor decimal(10,2) not null,
    data_registro datetime not null
);

insert into Registro_Progresso
(nome_tabela, id_registro, tipo, valor, data_registro)
values
('Empresa', 1, 'QTD_SETORES', 3, '2026-08-31 10:00:00'),
('Empresa', 1, 'QTD_COLABORADORES', 12, '2026-08-31 10:00:00'),
('Empresa', 1, 'PROGRESSO_MEDIO', 42.50, '2026-08-31 10:00:00'),
('Empresa', 1, 'HORAS_DESENVOLVIMENTO', 120, '2026-08-31 10:00:00'),
('Usuario', 4, 'PROGRESSO_USUARIO', 30, '2026-08-31 10:00:00'),
('Usuario', 4, 'QTD_CURSO_CONCLUIDO', 0, '2026-08-31 10:00:00'),

('Empresa', 1, 'QTD_SETORES', 4, '2026-09-30 10:00:00'),
('Empresa', 1, 'QTD_COLABORADORES', 15, '2026-09-30 10:00:00'),
('Empresa', 1, 'PROGRESSO_MEDIO', 55.80, '2026-09-30 10:00:00'),
('Empresa', 1, 'HORAS_DESENVOLVIMENTO', 175, '2026-09-30 10:00:00'),
('Usuario', 4, 'PROGRESSO_USUARIO', 50, '2026-09-30 10:00:00'),
('Usuario', 4, 'QTD_CURSO_CONCLUIDO', 1, '2026-09-30 10:00:00'),

('Empresa', 1, 'QTD_SETORES', 4, '2026-10-28 10:00:00'),
('Empresa', 1, 'QTD_COLABORADORES', 16, '2026-10-28 10:00:00'),
('Empresa', 1, 'PROGRESSO_MEDIO', 68.50, '2026-10-28 10:00:00'),
('Empresa', 1, 'HORAS_DESENVOLVIMENTO', 230, '2026-10-28 10:00:00'),
('Usuario', 4, 'PROGRESSO_USUARIO', 70, '2026-10-28 10:00:00'),
('Usuario', 4, 'QTD_CURSO_CONCLUIDO', 2, '2026-10-28 10:00:00');

