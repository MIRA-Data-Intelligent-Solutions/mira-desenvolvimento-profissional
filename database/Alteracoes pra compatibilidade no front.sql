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

