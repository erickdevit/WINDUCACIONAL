# Política De Segurança

## Escopo Atual

O projeto ainda está em fase de transição para um simulador educacional completo. A base atual é principalmente frontend e ainda não deve ser usada com dados reais de usuários sem as melhorias de segurança documentadas em `docs/security.md`.

## Como Reportar

Reporte vulnerabilidades abrindo uma issue com o mínimo de detalhe necessário para reproduzir o problema. Não publique segredos, dados reais, tokens, credenciais, dumps de banco ou informações privadas.

Se o problema permitir exploração ativa, vazamento de dados ou execução remota, descreva o impacto em alto nível e ofereça os detalhes sensíveis apenas por canal privado definido pelos mantenedores.

## Regras Para Reports

- Inclua versão, commit ou branch afetada.
- Descreva passos de reprodução quando for seguro.
- Informe impacto esperado e pré-condições.
- Evite explorar ambientes de terceiros.
- Não use scanners agressivos contra instâncias públicas sem autorização.

## Prioridades

As prioridades iniciais de segurança estão documentadas em `docs/security.md`, incluindo remoção de `eval`, redução de HTML bruto, validação de `localStorage`, política de links externos e requisitos para backend, PostgreSQL e arquivos persistentes.
