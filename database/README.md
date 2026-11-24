# Database — MIRA Evolution

Scripts do banco de dados MySQL (`sistema_cursos`) da plataforma MIRA Evolution.

## Ordem de execução

Os scripts dependem uns dos outros. Para montar um banco do zero, rode **nesta ordem**:

| # | Script | O que faz |
|---|---|---|
| 1 | `Criacao_Banco.sql` | Cria o banco e as tabelas base |
| 2 | `Atulizacao_Banco.sql` | `Usuario.ativo`, tabela `Categoria`, `Curso.ativo` e `Curso.id_categoria` |
| 3 | `Insersao_de_Dados.sql` | Dados de exemplo (empresa, setores, usuários, cursos, matrículas). Precisa do script 2 |
| 4 | `Atualizacao_2.sql` | Remove o papel ADMINISTRADOR, e-mail único, ícone e cor dos setores, `funcao`, `certificado`, tabelas `Habilidades` e `Configuracoes`, e **recria** `Registro_Progresso` no formato novo |
| 5 | `Att_3.sql` | `Usuario.telefone` e `Usuario.sobre_mim` (usados pelo "Meu perfil") |
| 6 | `registro.progressos.sql` | Histórico diário de exemplo em `Registro_Progresso` |

Para o back-end funcionar, **todos** precisam estar aplicados. Sem o script 5, por exemplo, a tela "Meu perfil" dá erro.

## Usuários de teste

Os usuários de `Insersao_de_Dados.sql` têm `senha_hash = 'hash_teste_N'`, que não é um hash bcrypt válido, então **não conseguem fazer login**. Para criar a senha de um usuário de teste, gere o hash com o próprio back-end (função `criptografar_senha` do `main.py`) e grave em `Usuario.senha_hash`.

Contas usadas no quadro "Acessos de demonstração" do login (`frontend/mira-evolution/js/comum/config.js`):

| Perfil | Usuário | Observação |
|---|---|---|
| Gestor | Carlos Lima (id 2) | Gestor de 12 colaboradores (Tecnologia, Financeiro e Comercial) |
| Colaborador | Ana Souza (id 4) | Subordinada ao Carlos. Única com histórico em `Registro_Progresso` |

As senhas dessas contas ficam visíveis no front. Use apenas contas de teste.

## Pontos de atenção nos dados de exemplo

- **Hierarquia:** todo colaborador precisa de um `id_gestor`. O gestor só enxerga os próprios subordinados, por isso Marina Alves (id 1) não vê ninguém.
- **CNPJ da empresa** (`12.345.678/900-01`) tem 13 dígitos. A tela de Configurações não deixa salvar até que ele seja corrigido.
- Nomes de cursos e categorias estão **sem acento** ("Programacao", "Gestao") e aparecem assim nas telas.
- O setor 2 foi renomeado de "Dados" para "RH" no script 4, mas os colaboradores dele continuam com cursos de dados.
- O histórico do usuário 4 em `Registro_Progresso` (até 78%) não bate com as matrículas atuais dele (38%). Os dados são fictícios até o job diário existir.
- A tabela `Curso` não tem empresa: o catálogo de cursos é o mesmo para todas.
