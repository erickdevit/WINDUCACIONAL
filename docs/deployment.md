# Deploy E Infraestrutura

## Estado Atual

O projeto está em migração para `winducacional-api` + `winducacional-web`. A stack alvo atual sobe frontend React/TypeScript, API Rails, PostgreSQL e Redis por `docker-compose.rails.yml`. O frontend novo é servido por Nginx no serviço `web` e faz proxy de `/api` e `/cable` para o Rails na rede interna do Compose.

O Express/Vite legado ainda possui `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` e `compose.dev.yml`, mas esses arquivos são compatibilidade de transição, não o deploy alvo.

## Objetivo De Hospedagem

O ponto de hospedagem será um servidor dedicado. A aplicação deverá ser distribuída como imagem Docker e executada por `docker compose`, incluindo serviços necessários para frontend/backend, PostgreSQL e volume persistente.

## Arquitetura De Deploy Alvo

- Frontend público: container estático com build de `winducacional-web`, servido por Nginx, Caddy ou equivalente.
- Backend: container Rails API acessível somente atrás de proxy para `/api` e `/cable`.
- PostgreSQL: container ou serviço gerenciado, com volume próprio.
- Redis: container ou serviço gerenciado para ActionCable.
- Diretório persistente: volume montado em `PERSISTENT_DATA_DIR` para discos virtuais e arquivos gerados pelo simulador.
- Apostilas: montagem somente leitura de `shared/booklets`.
- Árvore base do disco: montagem somente leitura de `shared/base-tree`.
- Reverse proxy: Nginx, Caddy, Traefik ou proxy do ambiente, com TLS no ponto público.
- Backups: rotina para banco e arquivos persistentes.

## Requisitos Para Docker Atual

- Build reprodutível.
- Imagem final sem dependências de desenvolvimento desnecessárias.
- Usuário não-root quando possível.
- Healthcheck.
- Variáveis de ambiente documentadas.
- Volumes explícitos para dados persistentes.
- Logs em stdout/stderr para coleta pelo host.

## Compose Rails Atual

- Serviço `web`, entrada pública que serve o build de `winducacional-web`.
- Serviço `rails_api`, exposto apenas na rede interna do Compose.
- Serviço `postgres`.
- Serviço `redis`.
- Volume `app_data` para discos virtuais.
- Volume `postgres_data` para o banco.
- Volume `redis_data` para Redis.
- Healthcheck de banco e healthcheck de aplicação no container.
- Arquivos `.env.example` sem segredos reais.
- Rails usa migrations em `winducacional-api/db/migrate`.
- `shared/booklets` é montado em `/rails/booklets`.
- `shared/base-tree` é montado em `/rails/base-tree`.
- O serviço `rails_api` aceita `IMAGEGEN_API_TOKEN` e `IMAGEGEN_API_URL` para habilitar o proxy de geração de imagens no backend. O token real deve existir apenas no ambiente do servidor.
- O serviço `web` publica `WEB_PORT` (`8080` por padrão), aplica fallback de SPA e repassa WebSocket de `/cable`.

O arquivo `.env.example` documenta as variáveis mínimas atuais para execução do backend.

Para desenvolvimento, `compose.dev.yml` fornece apenas o PostgreSQL local.

## Variáveis Futuras Esperadas

Os nomes finais ainda devem ser definidos, mas a aplicação provavelmente precisará de:

- `DATABASE_URL`
- `PERSISTENT_DATA_DIR`
- `BOOTSTRAP_TOKEN`
- `SESSION_DAYS`
- `BOOKLET_LIBRARY_DIR`
- `BASE_TREE_PATH`
- `APP_VERSION`
- `SOURCE_VERSION`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_PORT`
- `WEB_PORT`
- `IMAGEGEN_API_TOKEN`
- `IMAGEGEN_API_URL`

Segredos reais devem existir apenas no ambiente do servidor, nunca no frontend ou no repositório. A stack Rails cria o primeiro professor por `/api/bootstrap`; não use seed automático `Admin`/`Admin` como bootstrap da nova stack.

`APP_VERSION` ou `SOURCE_VERSION` podem ser definidos pelo pipeline de deploy para identificar a build publicada. Se não forem definidos, o servidor deriva a versão a partir de `build/index.html`. Quando a versão muda, o backend invalida as sessões armazenadas e o frontend limpa caches/service workers antes de recarregar, evitando que usuários continuem usando assets antigos após uma recompilação.

## Bootstrap Inicial

Na stack Rails, consulte:

- `GET /api/bootstrap/status`

Se `needsBootstrap` for verdadeiro, envie `POST /api/bootstrap` com usuário, nome, senha e `token` quando `BOOTSTRAP_TOKEN` estiver configurado.

## Operação Com Docker

Subida da nova stack:

```bash
docker compose -f docker-compose.rails.yml up -d --build
```

Parada controlada:

```bash
docker compose -f docker-compose.rails.yml down
```

O ponto público padrão é `http://localhost:8080`. Em produção, coloque TLS no proxy externo do servidor ou no balanceador que encaminha tráfego para `WEB_PORT`. O Rails não deve receber porta pública direta nesse compose; chamadas HTTP e ActionCable entram por `/api` e `/cable` no serviço `web`.

## Backup E Restore

Backup do PostgreSQL:

```bash
docker compose -f docker-compose.rails.yml exec -T postgres pg_dump -U "${POSTGRES_USER:-simulador}" "${POSTGRES_DB:-simulador_educacional}" > backup-postgres.sql
```

Backup dos discos virtuais:

```bash
docker compose -f docker-compose.rails.yml exec -T rails_api tar czf - -C /rails/data . > backup-app-data.tar.gz
```

Restore do PostgreSQL em ambiente parado ou recém-criado:

```bash
docker compose -f docker-compose.rails.yml exec -T postgres psql -U "${POSTGRES_USER:-simulador}" "${POSTGRES_DB:-simulador_educacional}" < backup-postgres.sql
```

Restore dos discos virtuais:

```bash
docker compose -f docker-compose.rails.yml exec -T rails_api sh -c "rm -rf /rails/data/* && tar xzf - -C /rails/data" < backup-app-data.tar.gz
```

Valide o restore em ambiente separado antes de usar esses arquivos como rotina de produção. Banco e volume `app_data` devem pertencer ao mesmo ponto no tempo para evitar metadados sem arquivos ou arquivos sem registro correspondente.

## Antes De Produção

- Definir estratégia de backup.
- Configurar TLS e cabeçalhos de segurança.
- Rodar suíte de testes automatizados.
- Validar restore de backup em ambiente separado.
