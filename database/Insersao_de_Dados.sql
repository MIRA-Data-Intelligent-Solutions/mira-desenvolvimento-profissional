use sistema_cursos;
show tables;
-- Plano --
insert into Plano (id_plano, nome, descricao)
values (1, 'Premium', 'Plano Premium');

-- Empresa --
Insert into Empresa(id_empresa, id_plano, nome, cnpj)
values(1,1, 'Mira Desencolvimento Profissional', '12.345.678/900-01');

-- Setor --
insert into Setor(id_setor, id_empresa, nome) 
values(1,1, 'Tecnologia'),
		(2, 1, 'Dados'),
		(3, 1, 'Recursos Humanos'),
		(4, 1, 'Produto');
        
-- Plataforma --
insert into Plataforma (id_plataforma, nome, descricao, url)
values (1, 'Alura', 'Plataforma ficticia utilizada para testes do projeto', 'https://www.alura.com.br'); 

-- Empresa_plataforma -- 
insert into Empresa_plataforma (id_empresa, id_plataforma)
values (1,1);

-- Categoria --
insert into Categoria(id_categoria, nome)
values(1, 'Programacao'),
		(2, 'Dados'),
		(3, 'Banco de Dados'),
		(4, 'Cloud e DevOps'),
		(5, 'Seguranca'),
		(6, 'Gestao');
        
-- usuario -- 
insert into Usuario
(id_usuario, id_empresa, id_setor, id_gestor, nome, email, senha_hash, papel_acesso, ativo)
values (1,1,1,NULL,'Marina Alves','marina.alves@empresa.com','hash_teste_1','ADMINISTRADOR',TRUE),
(2,1,1,NULL,'Carlos Lima','carlos.lima@empresa.com','hash_teste_2','GESTOR',TRUE),
(3,1,2,NULL,'Mariana Silva','mariana.silva@empresa.com','hash_teste_3','GESTOR',TRUE),
(4,1,1,2,'Ana Souza','ana.souza@empresa.com','hash_teste_4','COLABORADOR',TRUE),
(5,1,1,2,'Bruno Martins','bruno.martins@empresa.com','hash_teste_5','COLABORADOR',TRUE),
(6,1,1,2,'Lucas Santos','lucas.santos@empresa.com','hash_teste_6','COLABORADOR',TRUE),
(7,1,1,2,'Beatriz Almeida','beatriz.almeida@empresa.com','hash_teste_7','COLABORADOR',TRUE),
(8,1,1,2,'Rafael Costa','rafael.costa@empresa.com','hash_teste_8','COLABORADOR',TRUE),
(9,1,1,2,'Felipe Nunes','felipe.nunes@empresa.com','hash_teste_9','COLABORADOR',TRUE),
(10,1,2,3,'Joao Oliveira','joao.oliveira@empresa.com','hash_teste_10','COLABORADOR',TRUE),
(11,1,2,3,'Camila Ferreira','camila.ferreira@empresa.com','hash_teste_11','COLABORADOR',TRUE),
(12,1,2,3,'Daniel Carvalho','daniel.carvalho@empresa.com','hash_teste_12','COLABORADOR',TRUE),
(13,1,2,3,'Isabela Moraes','isabela.moraes@empresa.com','hash_teste_13','COLABORADOR',TRUE),
(14,1,2,3,'Gustavo Melo','gustavo.melo@empresa.com','hash_teste_14','COLABORADOR',TRUE),
(15,1,3,2,'Renata Barros','renata.barros@empresa.com','hash_teste_15','COLABORADOR',TRUE),
(16,1,3,2,'Amanda Freitas','amanda.freitas@empresa.com','hash_teste_16','COLABORADOR',TRUE),
(17,1,4,2,'Thiago Lopes','thiago.lopes@empresa.com','hash_teste_17','COLABORADOR',TRUE),
(18,1,4,2,'Larissa Gomes','larissa.gomes@empresa.com','hash_teste_18','COLABORADOR',TRUE),
(19,1,4,2,'Pedro Ribeiro','pedro.ribeiro@empresa.com','hash_teste_19','COLABORADOR',TRUE),
(20,1,4,2,'Juliana Rocha','juliana.rocha@empresa.com','hash_teste_20','COLABORADOR',FALSE);

-- Curso --
insert into Curso (id_curso, nome, descricao, carga_horaria, ativo, id_categoria)
values (1,'Python para Iniciantes','Fundamentos da linguagem Python',20,TRUE,1),
(2,'Python para Ciencia de Dados','Python aplicado a analise de dados',40,TRUE,2),
(3,'SQL e Banco de Dados','Consultas SQL e fundamentos de bancos relacionais',25,TRUE,3),
(4,'MySQL Avancado','Consultas, indices e modelagem em MySQL',30,TRUE,3),
(5,'Power BI','Dashboards e visualizacao de dados',24,TRUE,2),
(6,'Excel para Analise de Dados','Planilhas e analise de dados',18,TRUE,2),
(7,'APIs REST com Flask','Criacao de APIs REST usando Python e Flask',30,TRUE,1),
(8,'Git e GitHub','Versionamento de codigo com Git e GitHub',12,TRUE,1),
(9,'JavaScript','Fundamentos de JavaScript',24,TRUE,1),
(10,'Analise de Dados com Pandas','Tratamento e analise de dados com Pandas',28,TRUE,2),
(11,'Fundamentos de Cloud','Conceitos iniciais de computacao em nuvem',20,TRUE,4),
(12,'Docker','Containers e fundamentos de Docker',16,TRUE,4),
(13,'Seguranca da Informacao','Fundamentos de seguranca digital',22,TRUE,5),
(14,'Scrum e Metodos Ageis','Fundamentos de Scrum e desenvolvimento agil',12,TRUE,6),
(15,'Lideranca de Equipes','Desenvolvimento de lideranca e gestao',15,TRUE,6);

-- Competencia --
insert into Competencia (id_competencia, id_empresa, nome , descricao)
values (1,1,'Programacao','Desenvolvimento de software'),
(2,1,'Banco de Dados','Modelagem e consultas SQL'),
(3,1,'Analise de Dados','Interpretacao e visualizacao de dados'),
(4,1,'APIs','Criacao e consumo de APIs'),
(5,1,'DevOps','Cloud, containers e entrega de software'),
(6,1,'Seguranca','Boas praticas de seguranca'),
(7,1,'Lideranca','Gestao e lideranca de equipes');

-- Curso_competencia --
insert into Curso_Competencia(id_curso, id_competencia)
values(1,1),
(2,1),
(2,3),
(3,2),
(4,2),
(5,3),
(6,3),
(7,1),
(7,4),
(8,1),
(9,1),
(10,3),
(11,5),
(12,5),
(13,6),
(14,7),
(15,7);

-- Curso_usuario--
insert into Curso_Usuario
(id_curso_usuario, id_usuario, id_curso, id_plataforma, status, data_conclusao, percentual_atual)
values(1,2,11,1,'NAO_INICIADO',NULL,0.00),
(2,2,2,1,'EM_ANDAMENTO',NULL,50.00),
(3,3,4,1,'EM_ANDAMENTO',NULL,25.00),
(4,3,15,1,'EM_ANDAMENTO',NULL,15.00),
(5,4,11,1,'EM_ANDAMENTO',NULL,15.00),
(6,4,12,1,'CONCLUIDO','2026-09-14',100.00),
(7,4,9,1,'NAO_INICIADO',NULL,0.00),
(8,5,1,1,'EM_ANDAMENTO',NULL,40.00),
(9,5,2,1,'EM_ANDAMENTO',NULL,90.00),
(10,5,4,1,'CONCLUIDO','2026-09-01',100.00),
(11,6,10,1,'EM_ANDAMENTO',NULL,60.00),
(12,6,7,1,'EM_ANDAMENTO',NULL,25.00),
(13,6,1,1,'CONCLUIDO','2026-09-05',100.00),
(14,7,2,1,'EM_ANDAMENTO',NULL,70.00),
(15,7,8,1,'CONCLUIDO','2026-09-08',100.00),
(16,7,9,1,'EM_ANDAMENTO',NULL,50.00),
(17,8,13,1,'EM_ANDAMENTO',NULL,40.00),
(18,8,11,1,'CONCLUIDO','2026-09-12',100.00),
(19,8,12,1,'EM_ANDAMENTO',NULL,80.00),
(20,9,8,1,'CONCLUIDO','2026-09-03',100.00),
(21,9,7,1,'EM_ANDAMENTO',NULL,60.00),
(22,9,14,1,'EM_ANDAMENTO',NULL,25.00),
(23,10,2,1,'EM_ANDAMENTO',NULL,90.00),
(24,10,3,1,'CONCLUIDO','2026-09-20',100.00),
(25,10,5,1,'EM_ANDAMENTO',NULL,50.00),
(26,11,5,1,'EM_ANDAMENTO',NULL,70.00),
(27,11,10,1,'CONCLUIDO','2026-09-18',100.00),
(28,11,6,1,'EM_ANDAMENTO',NULL,40.00),
(29,12,3,1,'EM_ANDAMENTO',NULL,80.00),
(30,12,4,1,'EM_ANDAMENTO',NULL,60.00),
(31,12,10,1,'EM_ANDAMENTO',NULL,25.00),
(32,13,2,1,'CONCLUIDO','2026-09-25',100.00),
(33,13,5,1,'EM_ANDAMENTO',NULL,50.00),
(34,13,6,1,'NAO_INICIADO',NULL,0.00),
(35,14,10,1,'EM_ANDAMENTO',NULL,70.00),
(36,14,11,1,'EM_ANDAMENTO',NULL,40.00),
(37,14,12,1,'CONCLUIDO','2026-09-26',100.00),
(38,15,14,1,'CONCLUIDO','2026-09-11',100.00),
(39,15,15,1,'EM_ANDAMENTO',NULL,80.00),
(40,15,6,1,'EM_ANDAMENTO',NULL,50.00),
(41,16,14,1,'EM_ANDAMENTO',NULL,60.00),
(42,16,15,1,'EM_ANDAMENTO',NULL,40.00),
(43,16,5,1,'NAO_INICIADO',NULL,0.00),
(44,17,9,1,'EM_ANDAMENTO',NULL,90.00),
(45,17,14,1,'CONCLUIDO','2026-09-17',100.00),
(46,17,7,1,'EM_ANDAMENTO',NULL,70.00),
(47,18,8,1,'CONCLUIDO','2026-09-10',100.00),
(48,18,14,1,'EM_ANDAMENTO',NULL,50.00),
(49,18,9,1,'EM_ANDAMENTO',NULL,25.00),
(50,19,11,1,'EM_ANDAMENTO',NULL,60.00),
(51,19,13,1,'EM_ANDAMENTO',NULL,40.00),
(52,19,12,1,'CONCLUIDO','2026-09-22',100.00),
(53,20,5,1,'NAO_INICIADO',NULL,0.00),
(54,20,6,1,'EM_ANDAMENTO',NULL,15.00),
(55,20,14,1,'EM_ANDAMENTO',NULL,25.00);


-- Registro_progresso --
insert into Registro_Progresso (id_curso_usuario, data_registro, percentual_progresso, observacao)
values (2,'2026-08-15 09:00:00',20.00,'Inicio do acompanhamento'),
(2,'2026-10-01 09:00:00',50.00,'Progresso atual'),
(3,'2026-08-15 09:00:00',20.00,'Inicio do acompanhamento'),
(3,'2026-10-01 09:00:00',25.00,'Progresso atual'),
(6,'2026-08-15 09:00:00',20.00,'Inicio do acompanhamento'),
(6,'2026-09-01 09:00:00',50.00,'Progresso intermediario'),
(6,'2026-09-14 18:00:00',100.00,'Curso concluido'),
(9,'2026-08-15 09:00:00',20.00,'Inicio do acompanhamento'),
(9,'2026-09-01 09:00:00',50.00,'Progresso intermediario'),
(9,'2026-10-01 09:00:00',90.00,'Progresso atual'),
(24,'2026-08-15 09:00:00',20.00,'Inicio do acompanhamento'),
(24,'2026-09-01 09:00:00',50.00,'Progresso intermediario'),
(24,'2026-09-20 18:00:00',100.00,'Curso concluido');