# Simulador Educacional

Este projeto está sendo transformado em um simulador educacional aberto, construído a partir da base visual do Win11React. A versão atual ainda é majoritariamente frontend: uma SPA em React/Vite que simula uma área de trabalho com janelas, aplicativos, barra de tarefas, menu iniciar, widgets, PWA e assets estáticos.

O objetivo do novo contexto é evoluir essa base para uma plataforma completa de simulação, com cenários educacionais, usuários, progresso persistente e instalação em servidor dedicado via imagem Docker.

## Estado Atual

- Frontend em React 18, Redux, Vite, SCSS/CSS e PWA.
- Backend inicial em Express, com autenticação, sessão HTTP-only e API protegida.
- PostgreSQL para usuários, papéis, classificação de alunos, turmas com código de vínculo e sessões.
- Diretório persistente para discos virtuais por usuário.
- Stack Docker pronta para aplicação e banco.
- Experiência visual inspirada em ambiente desktop, com aplicativos simulados em `src/containers/applications/apps`.
- Suíte inicial de testes automatizados com Vitest.

## Direção Do Produto

O projeto deverá crescer como um simulador educacional guiado por boas práticas de código, segurança e testes. A evolução planejada inclui:

- Evolução da API backend para progresso, cenários e administração.
- Ampliação do PostgreSQL para dados relacionais do domínio educacional.
- Ampliação do diretório persistente para arquivos e dados gerados pelo simulador.
- Imagem Docker de produção com `docker build`.
- `docker compose` para ambiente local e hospedagem em servidor dedicado.
- Testes unitários, de integração e de fluxo crítico antes de mudanças de maior risco.

## Documentação

A documentação viva do projeto fica em `docs/` e deve ser atualizada junto com as decisões técnicas:

- [Índice de documentos](docs/README.md)
- [Visão do produto](docs/product-vision.md)
- [Arquitetura](docs/architecture.md)
- [Segurança](docs/security.md)
- [Estratégia de testes](docs/testing-strategy.md)
- [Deploy e infraestrutura](docs/deployment.md)
- [Roadmap técnico](docs/roadmap.md)

O arquivo [AGENTS.md](AGENTS.md) é o guia operacional para agentes e colaboradores automatizados. Ele deve ser atualizado sempre que uma regra, decisão de arquitetura, comando, fluxo de teste ou documento-chave mudar.

## Desenvolvimento Local

Requisitos atuais:

- Node.js compatível com o lockfile existente.
- npm.

Comandos disponíveis hoje:

```bash
npm install
npm run dev
npm run test
npm run build
npm run start
```

O comando `npm run dev` inicia o Vite para desenvolvimento. O comando `npm run test` executa a suíte Vitest. O comando `npm run start` inicia o servidor Express e serve a build gerada em `build/`.

Variáveis principais do backend:

- `DATABASE_URL`: conexão PostgreSQL.
- `PERSISTENT_DATA_DIR`: diretório persistente dos discos virtuais.
- `BOOTSTRAP_TOKEN`: token exigido para criar o primeiro professor em produção.
- `SESSION_DAYS`: duração da sessão em dias.
- `PORT`: porta do servidor Express. O padrão local é `3001`.
- `SEED_ADMIN_*`: define o usuário inicial automático quando o banco está vazio.

Para desenvolvimento local, `compose.dev.yml` sobe apenas o PostgreSQL:

```bash
docker compose -f compose.dev.yml up -d
npm run build
npm run start
```

Para subir a stack completa com Docker:

```bash
docker compose up -d --build
```

Na primeira implantação com banco vazio, a aplicação cria automaticamente o usuário `Admin` com senha `Admin` e papel de professor. Isso atende ao fluxo pedido para bootstrap operacional, mas a troca dessa senha deve ser tratada como passo obrigatório após a subida inicial.

Alunos podem criar conta pela tela de login usando o código de uma turma ativa. O cadastro cria sessão automaticamente e vincula o aluno à turma informada.

## Qualidade E Segurança

Novas mudanças devem seguir estes princípios:

- Evitar APIs perigosas no frontend, como `eval`, HTML bruto sem sanitização e navegação externa sem validação.
- Tratar `localStorage`, parâmetros de URL, respostas de API e conteúdo persistido como dados não confiáveis.
- Não colocar segredos em código cliente, assets públicos ou variáveis expostas ao bundle.
- Tratar isolamento de dados sempre no servidor, não apenas na interface.
- Criar ou atualizar testes quando houver alteração de comportamento.
- Documentar decisões técnicas antes de implementar componentes estruturais como backend, banco, persistência e Docker.

Os detalhes estão em [docs/security.md](docs/security.md) e [docs/testing-strategy.md](docs/testing-strategy.md).

## Créditos

Este projeto parte da base open source [Win11React](https://github.com/blueedgetechno/win11React), criada originalmente por BlueEdgeTechno e contribuidores. A nova direção educacional mantém o código aberto e preserva os créditos da base original.

## Licença

A base original usa licença CC0-1.0. Antes de publicar distribuições derivadas, mantenha os créditos acima e revise a compatibilidade da licença com qualquer novo componente, asset ou dependência adicionada.
