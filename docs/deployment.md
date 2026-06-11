# Deploy E Infraestrutura

## Estado Atual

O projeto está em migração para `winducacional-api` + `winducacional-web`. A stack alvo atual sobe a API Rails com PostgreSQL e Redis por `docker-compose.rails.yml`. O frontend React/TypeScript ainda roda separadamente em desenvolvimento e deve ganhar container estático/proxy próprio antes da remoção do legado.

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

- Serviço `rails_api`.
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
- `IMAGEGEN_API_TOKEN`
- `IMAGEGEN_API_URL`

Segredos reais devem existir apenas no ambiente do servidor, nunca no frontend ou no repositório. A stack Rails cria o primeiro professor por `/api/bootstrap`; não use seed automático `Admin`/`Admin` como bootstrap da nova stack.

`APP_VERSION` ou `SOURCE_VERSION` podem ser definidos pelo pipeline de deploy para identificar a build publicada. Se não forem definidos, o servidor deriva a versão a partir de `build/index.html`. Quando a versão muda, o backend invalida as sessões armazenadas e o frontend limpa caches/service workers antes de recarregar, evitando que usuários continuem usando assets antigos após uma recompilação.

## Bootstrap Inicial

Na stack Rails, consulte:

- `GET /api/bootstrap/status`

Se `needsBootstrap` for verdadeiro, envie `POST /api/bootstrap` com usuário, nome, senha e `token` quando `BOOTSTRAP_TOKEN` estiver configurado.

## Antes De Produção

- Criar container final do frontend `winducacional-web`.
- Configurar proxy público para frontend, `/api` e `/cable`.
- Definir estratégia de backup.
- Configurar TLS e cabeçalhos de segurança.
- Rodar suíte de testes automatizados.
- Validar restore de backup em ambiente separado.
