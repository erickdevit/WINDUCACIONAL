# winducacional-api

API Rails do WINDUCACIONAL. Esta é a API alvo da migração e mantém o contrato `/api/*` usado pelo frontend novo em `winducacional-web`.

## Desenvolvimento

```bash
bundle install
bin/rails db:prepare
bin/rails server -p 3002
```

## Testes

```bash
bundle exec rspec
```

## Configuração

Use `.env.example` como referência. Variáveis principais:

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `REDIS_URL`
- `PERSISTENT_DATA_DIR`
- `BOOKLET_LIBRARY_DIR`
- `BASE_TREE_PATH`
- `BOOTSTRAP_TOKEN`
- `RAILS_FORCE_SSL`
- `RAILS_ASSUME_SSL`
- `IMAGEGEN_API_TOKEN`
- `IMAGEGEN_API_URL`
- `CORS_ORIGINS`

O primeiro professor é criado por `POST /api/bootstrap` quando `GET /api/bootstrap/status` indicar `needsBootstrap: true`. Em produção, defina `BOOTSTRAP_TOKEN`.

## Recursos Compartilhados

Por padrão, a API lê:

- apostilas em `../shared/booklets`;
- árvore base do disco virtual em `../shared/base-tree/dir.json`.

Esses caminhos podem ser sobrescritos por `BOOKLET_LIBRARY_DIR` e `BASE_TREE_PATH`.
