# Deploy E Infraestrutura

## Estado Atual

O projeto atual gera uma build estática com Vite em `build/`, possui um servidor Express inicial para API e arquivos estáticos, e já conta com `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` e `compose.dev.yml`.

## Objetivo De Hospedagem

O ponto de hospedagem será um servidor dedicado. A aplicação deverá ser distribuída como imagem Docker e executada por `docker compose`, incluindo serviços necessários para frontend/backend, PostgreSQL e volume persistente.

## Arquitetura De Deploy Alvo

- Aplicação: container principal com frontend e backend, ou containers separados se a arquitetura final pedir.
- PostgreSQL: container ou serviço gerenciado, com volume próprio.
- Diretório persistente: volume montado em `PERSISTENT_DATA_DIR` para discos virtuais e arquivos gerados pelo simulador.
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

## Compose Atual

- Serviço `app`.
- Serviço `postgres`.
- Volume `app_data` para discos virtuais.
- Volume `postgres_data` para o banco.
- Healthcheck de banco e healthcheck de aplicação no container.
- Arquivo `.env.example` sem segredos reais.
- O schema executado na inicialização inclui migrações idempotentes para colunas adicionadas em bancos já existentes.
- A imagem final copia a biblioteca de PDFs de `src/containers/applications/apps/booklets/library`, usada pelo app Apostilas e servida pelo backend por rotas autenticadas.
- O serviço `app` aceita `IMAGEGEN_API_TOKEN` e `IMAGEGEN_API_URL` para habilitar o proxy de geração de imagens no backend. O token real deve existir apenas no ambiente do servidor.

O arquivo `.env.example` documenta as variáveis mínimas atuais para execução do backend.

Para desenvolvimento, `compose.dev.yml` fornece apenas o PostgreSQL local.

## Variáveis Futuras Esperadas

Os nomes finais ainda devem ser definidos, mas a aplicação provavelmente precisará de:

- `DATABASE_URL`
- `PERSISTENT_DATA_DIR`
- `BOOTSTRAP_TOKEN`
- `SESSION_DAYS`
- `SEED_ADMIN_ENABLED`
- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_DISPLAY_NAME`
- `APP_VERSION`
- `SOURCE_VERSION`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_PORT`
- `IMAGEGEN_API_TOKEN`
- `IMAGEGEN_API_URL`

Segredos reais devem existir apenas no ambiente do servidor, nunca no frontend ou no repositório. A configuração padrão de `Admin`/`Admin` existe apenas para bootstrap operacional e deve ser substituída assim que a implantação estiver disponível.

`APP_VERSION` ou `SOURCE_VERSION` podem ser definidos pelo pipeline de deploy para identificar a build publicada. Se não forem definidos, o servidor deriva a versão a partir de `build/index.html`. Quando a versão muda, o backend invalida as sessões armazenadas e o frontend limpa caches/service workers antes de recarregar, evitando que usuários continuem usando assets antigos após uma recompilação.

## Bootstrap Inicial

Quando `SEED_ADMIN_ENABLED=true` e o banco está vazio, a aplicação cria automaticamente:

- Usuário: `Admin`
- Senha: `Admin`
- Papel: `professor`

Se você quiser outro bootstrap, defina `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` e `SEED_ADMIN_DISPLAY_NAME` antes da primeira subida.

## Antes De Produção

- Evoluir modelo de autenticação e autorização conforme os cenários educacionais.
- Criar fluxo formal de migrations do banco.
- Definir estratégia de backup.
- Configurar TLS e cabeçalhos de segurança.
- Rodar suíte de testes automatizados.
- Validar restore de backup em ambiente separado.
