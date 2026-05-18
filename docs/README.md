# Documentação Do Projeto

Esta pasta contém os documentos-chave do simulador educacional. Ela deve evoluir junto com o código e servir como fonte primária para decisões técnicas.

## Documentos

- `product-vision.md`: define o objetivo do produto, público-alvo, escopo atual e escopo futuro.
- `architecture.md`: descreve a arquitetura existente, a arquitetura alvo e as regras para evolução técnica.
- `security.md`: registra princípios de segurança, riscos atuais e requisitos para frontend, backend, banco e arquivos persistentes.
- `testing-strategy.md`: define a estratégia de testes, cenários mínimos e critérios para novas mudanças.
- `deployment.md`: descreve a direção de hospedagem em servidor dedicado, Docker, Compose, PostgreSQL e volumes.
- `roadmap.md`: organiza a ordem recomendada de evolução sem iniciar implementação prematura.

## Regra De Manutenção

Toda mudança estrutural deve atualizar o documento correspondente e, quando afetar agentes ou fluxo de trabalho, também atualizar `../AGENTS.md`.

## Fluxo Git

Por enquanto, o projeto deve usar apenas a branch `main`. Cada rodada concluída de trabalho deve terminar com um commit contendo as alterações realizadas e uma mensagem objetiva.

## Idioma

Todos os documentos do projeto devem usar português brasileiro correto, com acentuação, cedilha e pontuação adequadas. Não use emojis em documentação, templates, commits ou mensagens de projeto, salvo pedido explícito.
