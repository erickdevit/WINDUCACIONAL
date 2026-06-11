# WINDUCACIONAL

WINDUCACIONAL é um simulador educacional aberto com experiência desktop web. A migração em andamento reescreve a aplicação para uma stack formada por API Rails e frontend React/TypeScript, preservando o código Express/Vite legado apenas até a nova stack atingir paridade funcional e deploy próprio.

## Estado Atual

- Backend alvo em `winducacional-api`: Rails API, PostgreSQL, sessões HTTP-only, usuários com papéis, turmas, discos virtuais persistidos, ActionCable, apostilas, frequência, avaliações, chat, digitação, PVP, Gestor e proxy autenticado para geração de imagens.
- Frontend alvo em `winducacional-web`: React, TypeScript, Vite, Redux Toolkit, RTK Query, React Router e Tailwind.
- Recursos compartilhados em `shared/`: biblioteca de PDFs em `shared/booklets` e árvore base do disco virtual em `shared/base-tree/dir.json`.
- Código legado ainda presente em `src/`, `server/` e `public/` para transição, sem ser a stack alvo.
- Compose Rails em `docker-compose.rails.yml`, com `web`, `rails_api`, `postgres` e `redis`.

## Documentação

A documentação viva fica em `docs/` e deve ser atualizada junto com decisões técnicas:

- [Índice de documentos](docs/README.md)
- [Visão do produto](docs/product-vision.md)
- [Arquitetura](docs/architecture.md)
- [Segurança](docs/security.md)
- [Estratégia de testes](docs/testing-strategy.md)
- [Deploy e infraestrutura](docs/deployment.md)
- [Roadmap técnico](docs/roadmap.md)

O arquivo [AGENTS.md](AGENTS.md) é o guia operacional para agentes e colaboradores automatizados.

## Desenvolvimento Local

Requisitos:

- Ruby compatível com `winducacional-api/.ruby-version`.
- Bundler.
- Node.js e npm compatíveis com `winducacional-web/package-lock.json`.
- PostgreSQL e Redis, localmente ou via Docker.

API Rails:

```bash
cd winducacional-api
bundle install
bin/rails db:prepare
bin/rails server -p 3002
bundle exec rspec
```

Frontend React/TypeScript:

```bash
cd winducacional-web
npm install
npm run dev
npm run test
npm run lint
npm run build
```

O Vite roda em `http://localhost:5173` e faz proxy de `/api` e `/cable` para a API Rails em `http://localhost:3002`.

## Docker Da Nova Stack

Para subir a nova stack Rails + React/TypeScript com PostgreSQL e Redis:

```bash
docker compose -f docker-compose.rails.yml up -d --build
```

Por padrão, o frontend fica disponível em `http://localhost:8080`. O serviço
`web` serve o build de `winducacional-web` por Nginx e faz proxy de `/api` e
`/cable` para o Rails na rede interna do Compose. O serviço `rails_api` não é
publicado diretamente no host nesse compose.

O compose monta:

- `app_data` em `/rails/data` para discos virtuais.
- `shared/booklets` em `/rails/booklets`.
- `shared/base-tree` em `/rails/base-tree`.

## Bootstrap

A criação do primeiro professor na stack Rails é feita pelo endpoint autenticado de bootstrap:

- `GET /api/bootstrap/status`
- `POST /api/bootstrap`

Em produção, defina `BOOTSTRAP_TOKEN` e informe esse token no `POST /api/bootstrap`. A nova stack não depende de seed automático `Admin`/`Admin`; qualquer senha operacional padrão existente pertence apenas ao legado e deve ser removida com ele.

## Qualidade E Segurança

Antes de commitar mudanças na nova stack, rode:

```bash
cd winducacional-api && bundle exec rspec
cd ../winducacional-web && npm run test && npm run lint && npm run build
```

Segredos devem ficar somente em variáveis de ambiente do servidor. O frontend nunca deve receber tokens de provedores externos, incluindo `IMAGEGEN_API_TOKEN`.
