use sistema_cursos;

alter table Usuario
add column telefone varchar(20),
add column sobre_mim varchar(500);

select * from Usuario;

update Usuario
set telefone = '(19) 99999-0001',
    sobre_mim = 'Responsável pela gestão e acompanhamento da empresa.'
where id_usuario = 1;

update Usuario
set telefone = '(19) 99999-0002',
    sobre_mim = 'Atua na gestão da equipe de tecnologia.'
where id_usuario = 2;

update Usuario
set telefone = '(19) 99999-0003',
    sobre_mim = 'Atua na gestão e acompanhamento da equipe.'
where id_usuario = 3;

update Usuario
set telefone = '(19) 99999-0004',
    sobre_mim = 'Profissional da área de tecnologia com foco em DevOps.'
where id_usuario = 4;

update Usuario
set telefone = '(19) 99999-0005',
    sobre_mim = 'Profissional da área de tecnologia.'
where id_usuario = 5;
git pull origin main
update Usuario
set telefone = '(19) 99999-0006',
    sobre_mim = 'Profissional da área de tecnologia.'
where id_usuario = 6;

update Usuario
set telefone = '(19) 99999-0007',
    sobre_mim = 'Profissional da área de tecnologia.'
where id_usuario = 7;

update Usuario
set telefone = '(19) 99999-0008',
    sobre_mim = 'Profissional da área de tecnologia.'
where id_usuario = 8;

update Usuario
set telefone = '(19) 99999-0009',
    sobre_mim = 'Profissional da área de tecnologia.'
where id_usuario = 9;

update Usuario
set telefone = '(19) 99999-0010',
    sobre_mim = 'Profissional da área de recursos humanos.'
where id_usuario = 10;

update Usuario
set telefone = '(19) 99999-0011',
    sobre_mim = 'Profissional da área de recursos humanos.'
where id_usuario = 11;

update Usuario
set telefone = '(19) 99999-0012',
    sobre_mim = 'Profissional da área de recursos humanos.'
where id_usuario = 12;

update Usuario
set telefone = '(19) 99999-0013',
    sobre_mim = 'Profissional da área de recursos humanos.'
where id_usuario = 13;

update Usuario
set telefone = '(19) 99999-0014',
    sobre_mim = 'Profissional da área de recursos humanos.'
where id_usuario = 14;

update Usuario
set telefone = '(19) 99999-0015',
    sobre_mim = 'Profissional da área financeira.'
where id_usuario = 15;

update Usuario
set telefone = '(19) 99999-0016',
    sobre_mim = 'Profissional da área financeira.'
where id_usuario = 16;

update Usuario
set telefone = '(19) 99999-0017',
    sobre_mim = 'Profissional da área comercial.'
where id_usuario = 17;

update Usuario
set telefone = '(19) 99999-0018',
    sobre_mim = 'Profissional da área comercial.'
where id_usuario = 18;

update Usuario
set telefone = '(19) 99999-0019',
    sobre_mim = 'Profissional da área comercial.'
where id_usuario = 19;

update Usuario
set telefone = '(19) 99999-0020',
    sobre_mim = 'Profissional da área comercial.'
where id_usuario = 20;