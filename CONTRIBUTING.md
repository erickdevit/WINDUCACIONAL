# Contribuindo

Este projeto está evoluindo para um simulador educacional aberto. A base atual ainda é majoritariamente frontend, portanto contribuições devem preservar o comportamento existente enquanto a arquitetura completa é definida.

## Antes De Começar

- Leia `README.md`, `AGENTS.md` e os documentos em `docs/`.
- Verifique se a mudança afeta produto, frontend, segurança, testes, deploy ou documentação.
- Abra uma issue para mudanças grandes, novas dependências, backend, banco, Docker ou alterações de arquitetura.

## Padrão De Trabalho

- Use apenas a branch `main` enquanto essa regra estiver registrada em `AGENTS.md`.
- Mantenha as mudanças pequenas, revisáveis e focadas.
- Atualize a documentação quando alterar uma decisão, fluxo, comando ou regra relevante.
- Não inclua segredos, tokens, chaves privadas, dados reais de usuários ou configurações sensíveis.
- Não introduza APIs perigosas sem justificativa documentada e mitigação clara.
- Use português brasileiro correto, com acentuação e sem emojis, em documentação, issues, PRs e mensagens de projeto.

## Qualidade

Antes de enviar uma mudança, rode as verificações disponíveis:

```bash
npm run build
```

A suíte de testes automatizados ainda será criada. Quando existir, mudanças de comportamento deverão incluir testes correspondentes.

## Pull Requests

Todo PR deve informar:

- O objetivo da mudança.
- Os arquivos ou áreas afetadas.
- Como a mudança foi validada.
- Se existe impacto em segurança, testes, documentação ou deploy.

## Créditos

Este repositório deriva da base open source Win11React. Contribuições novas devem preservar os créditos da base original e manter a nova direção educacional do projeto.
