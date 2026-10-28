CREATE DATABASE sistema_cursos;

USE sistema_cursos;

-- Plano --
create table Plano(
	id_plano int primary key auto_increment,
    nome varchar(100) not null,
    descricao varchar(255)
    );
    
-- Empresa --
create table Empresa(
	id_empresa int primary key auto_increment,
	id_plano int not null,
    nome varchar (150) not null,
    cnpj varchar(18) not null unique,
    
    constraint fk_emrpesa_plano -- mais facil de mexer com fk --
	foreign key (id_plano) references Plano(id_plano)
    );
    
  -- Setor --
  
create table Setor(
	id_setor int primary key auto_increment,
    id_empresa int not null, 
    nome varchar (100) not null,
    
    constraint fk_setor_empresa
    foreign key (id_empresa) references Empresa(id_empresa)
    on delete cascade, -- principal exclido deleta os outros tbm--
    
  
	constraint uq_setor_empresa -- regra p verifivar no usuario -- 
		unique (id_setor, id_empresa)
    );
    
 -- Usuario  --
 create table Usuario(
	id_usuario int primary key auto_increment,
    id_empresa int not null,
    id_setor int not null,
    id_gestor int null,
    nome varchar(100) not null,
    email varchar(150) not null,
    senha_hash varchar(255) not null,
    papel_acesso enum('ADMINISTRADOR','GESTOR','COLABORADOR') not null,
	
    constraint fk_usuaio_empresa
    foreign key (id_empresa) references Empresa(id_empresa)
    on delete cascade,
    
    constraint fk_usuario_setor_empresa
    foreign key (id_setor, id_empresa) references Setor(id_setor, id_empresa),
    
    constraint fk_usuario_gestor 
    foreign key (id_gestor) references Usuario(id_usuario)
    on delete set null
    );
    
    -- Plataforma --
create table Plataforma(
	id_plataforma int primary key auto_increment,
    nome varchar(100) not null,
    descricao varchar(255),
    url varchar(255)
    );
    
    -- Empresa-Plataforma --
create table Empresa_plataforma(
	id_empresa int not null,
	id_plataforma int not null,
    primary key (id_empresa, id_plataforma), -- chave de dois campos -- 
    
    constraint fk_empresa_plataforma_empresa
    foreign key (id_empresa) references Empresa(id_empresa)
    on delete cascade,
    
    constraint fk_empresa_plataforma_plataforma
    foreign key (id_plataforma) references Plataforma(id_plataforma)
    on delete cascade
    );
    
    -- Curso --
create table Curso(
	id_curso int primary key auto_increment,
    nome varchar(150) not null,
    descricao varchar(255),
    carga_horaria int not null
);

  -- Competencia --
create table Competencia(
	id_competencia int primary key auto_increment,
    id_empresa int not null,
    nome varchar (100) not null,
    descricao varchar(255),
    
    constraint fk_competencia_empresa
    foreign key (id_empresa) references Empresa(id_empresa)
    on delete cascade
);

-- Curso_Competencia -- 
create table Curso_Competencia(
	id_curso int not null,
    id_competencia int not null,
    
    primary key (id_curso, id_competencia),
    
    constraint fk_curso_competencia_curso
    foreign key (id_curso) references Curso(id_curso)
    on delete cascade,
    
    constraint fk_curso_competencia_competencia
    foreign key (id_competencia) references Competencia(id_competencia)
    on delete cascade
    );
    
    -- Curso-Usuario --
    create table Curso_Usuario(
		id_curso_usuario int primary key auto_increment,
        id_usuario int not null,
        id_curso int not null,
        id_plataforma int not null,
        status enum('NAO_INICIADO','EM_ANDAMENTO','CONCLUIDO') not null default 'NAO_INICIADO',
        
        data_conclusao date null,
        percentual_atual decimal(5,2) not null default 0.00,
        
        constraint un_usuario_curso
			unique (id_usuario, id_curso),
		
        constraint fk_curso_usuario_usuario
		foreign key (id_usuario) references Usuario(id_usuario)
        on delete cascade,
        
        constraint fk_curso_usuario_curso
        foreign key (id_curso) references Curso(id_curso)
        on delete cascade,
        
        constraint fk_curso_usuario_plataforma
        foreign key (id_plataforma) references Plataforma(id_plataforma)
        );
        
	-- Registro_Progresso --
	create table Registro_Progresso(
		id_curso_usuario int not null,
        data_registro datetime not null,
        percentual_progresso decimal(5,2) not null,
        observacao varchar(255),
        
        primary key (id_curso_usuario, data_registro),
        
        constraint fk_registro_progresso_curso_usuario
        foreign key (id_curso_usuario) references Curso_Usuario(id_curso_usuario)
        on delete cascade
        );
