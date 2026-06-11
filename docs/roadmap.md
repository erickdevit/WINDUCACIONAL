# Roadmap Técnico

Este roadmap organiza a evolução recomendada. Ele não substitui issues ou planejamento detalhado, mas evita implementar infraestrutura sem base definida.

## Fase 1: Documentação E Baseline

- Consolidar `README.md`, `AGENTS.md` e `docs/`.
- Registrar riscos atuais de segurança.
- Registrar ausência de testes e estratégia alvo.
- Mapear fluxos principais da interface atual.

## Fase 2: Qualidade Do Frontend

- Adicionar ferramenta de teste.
- Criar testes para reducers e fluxos principais.
- Eliminar HTML bruto sem sanitização.
- Centralizar abertura de links externos.
- Validar dados vindos de `localStorage`.

## Fase 3: Modelo Educacional

- Definir entidades: usuário, perfil, cenário, progresso, evento e arquivo.
- Definir fluxos principais do simulador.
- Separar aplicativos puramente visuais de aplicativos educacionais.
- Definir critérios de sucesso para cada cenário.

## Fase 4: Backend E Banco

- Evoluir API inicial.
- Formalizar migrations PostgreSQL.
- Ampliar autenticação e autorização.
- Implementar persistência de progresso.
- Adicionar testes de API e integração.

## Fase 5: Persistência De Arquivos

- Definir layout do diretório persistente.
- Criar validação de arquivos.
- Relacionar metadados no PostgreSQL.
- Criar política de quota, limpeza e backup.

## Fase 6: Docker E Servidor Dedicado

- Criar Dockerfile do frontend novo. Concluído para `winducacional-web`.
- Criar Compose com frontend, Rails, banco, Redis e volumes. Concluído em `docker-compose.rails.yml`.
- Configurar variáveis e `.env.example`. Concluído para a stack Rails + React/TypeScript.
- Configurar healthcheck. Concluído para Rails e imagem do frontend.
- Documentar backup, restore e operação. Concluído em `docs/deployment.md`.
- Validar deploy em ambiente de teste antes de produção.
