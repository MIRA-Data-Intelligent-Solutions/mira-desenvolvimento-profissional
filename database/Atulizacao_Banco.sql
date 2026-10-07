use sistema_cursos;

alter table Usuario
    add column ativo boolean not null DEFAULT TRUE;

create table Categoria (
    id_categoria int primary key AUTO_INCREMENT,
    nome varchar(100) not null,

    constraint uq_categoria_nome
        unique (nome)
);

alter table Curso
    add column ativo boolean not null DEFAULT TRUE,
    add column id_categoria int null,

    add constraint fk_curso_categoria
        foreign key (id_categoria)
        references Categoria(id_categoria);