# Migrations do banco

As migrations são aplicadas automaticamente no boot do servidor pelo runner em
`server/db/migrate.cjs`, chamado a partir de `server/index.cjs`.

## Como funciona

- O runner cria a tabela `schema_migrations` (`version`, `checksum`, `applied_at`).
- Antes de aplicar qualquer arquivo, ele adquire um `pg_advisory_lock` fixo, de
  forma que apenas uma instância aplique migrations por vez quando várias
  réplicas sobem juntas.
- Cada arquivo `.sql` desta pasta roda dentro da própria transação e só é
  registrado em `schema_migrations` se aplicar com sucesso.
- Arquivos já registrados nunca são reexecutados. Se o conteúdo de uma migration
  já aplicada mudar, o runner apenas emite um aviso de checksum divergente.

## Convenção de nomes

`NNNN_descricao_curta.sql`, com numeração sequencial de quatro dígitos e descrição
em letras minúsculas separadas por sublinhado. Exemplo: `0002_progresso_aluno.sql`.

A ordem de aplicação é lexicográfica pelo nome do arquivo.

## Baseline

`0001_baseline.sql` consolida todo o estado atual do schema, incluindo as tabelas,
views, índices e os `ALTER`/`DO $$` idempotentes que migravam bancos anteriores
(código de turma, `student_type`, agenda de turmas, pontuações do PVP, etc.).
Por ser idempotente, ele converge tanto bancos vazios quanto bancos legados ao
mesmo estado na primeira aplicação.

A partir daqui, **toda mudança estrutural deve ser uma nova migration numerada**.
Não edite `0001_baseline.sql` nem reaproveite arquivos já aplicados: crie um novo
arquivo (`0002_...`, `0003_...`) com o `ALTER`/`CREATE` correspondente.
