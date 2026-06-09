# Convenção De Commits

Este documento define o padrão de mensagens de commit para o WINDUCACIONAL. Todos os commits devem seguir a estrutura definida aqui, inclusive quando produzidos por agentes automatizados ou ferramentas.

## Formato Base

```
<tipo>(<escopo>): <descrição imperativa em português brasileiro>
```

- **`<tipo>`**: obrigatório. Define a natureza da alteração.
- **`<escopo>`**: obrigatório sempre que possível. Indica o módulo, app, camada ou área afetada.
- **`<descrição>`**: obrigatória. Texto curto em tom imperativo, sem ponto final, sem texto em maiúsculo desnecessário e com acentuação correta.

Exemplo:

```
fix(login): corrige sobreposição de botões na tela mobile
feat(aulas): adiciona export de lista de presença em PDF
```

Quando houver mudança quebra de compatibilidade, acrescente `BREAKING CHANGE:` no corpo do commit:

```
feat(auth): remove suporte a sessões sem senha

BREAKING CHANGE: senha é obrigatória para todos os cadastros
```

## Tipos Permitidos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade, novo app, novo endpoint, novo cenário educacional |
| `fix` | Correção de bug, ajuste visual quebrado, falha em fluxo existente |
| `refactor` | Reestruturação sem mudança de comportamento: separação de componente, renomeação, limpeza |
| `docs` | Apenas documentação, sem alteração de código |
| `style` | Formatação, espaçamento, cores, temas visuais sem mudança de comportamento |
| `test` | Criação ou ajuste de testes automatizados |
| `perf` | Melhoria de desempenho mensurável |
| `build` | Mudanças em build, dependências, Dockerfile, configurações de empacotamento |
| `chore` | Manutenção rotineira que não afeta usuário nem código fonte direto |
| `revert` | Reversão de commit anterior. Incluir o hash do commit revertido na descrição |
| `ci` | Mudanças em pipelines, GitHub Actions, scripts de deploy e automação |
| `security` | Correção ou endurecimento de segurança, remoção de segredo, ajuste de autorização |

## Escopos Recomendados

Use escopos curtos e alinhados com a estrutura do projeto:

- `auth`, `login`, `turmas`, `users`, `files`, `fs`, `notifications`
- `attendance`, `exams`, `booklets`, `typing`, `typing-pvp`, `imagegen`
- `photos`, `notepad`, `chat`, `edge`, `terminal`, `camera`
- `settings`, `gestor`, `mobile`, `toolbar`, `taskbar`, `desktop`
- `db`, `migrations`, `docker`, `compose`, `backend`, `frontend`
- `docs`, `agentes`, `tests`

`docs/agentes` é reservado para atualizações no `AGENTS.md` ou documentos de referência para agentes.

## Corpo Do Commit

Após a linha de título, pode-se usar uma linha em branco e um corpo explicando **o que** mudou e **por que**. O corpo deve:

- usar português brasileiro correto, com acentuação;
- evitar texto sem acentos quando a palavra exigir na gramática correta;
- ter no máximo 72 caracteres por linha;
- listar impactos visíveis ou riscos quando relevante.

Exemplo:

```
fix(notepad): alinha scroll e atalho Ctrl+S no mobile

O scroll da área de texto estava preso pela regra genérica de janela
no mobile.scss. O atalho não salvava quando a janela não tinha foco,
porque o listener estava no elemento raiz errado.
```

Exemplo com escopo amplo:

```
refactor(auth): separa lógica de bootstrap em helpers compartilhados

Extrai validação de token e seed do admin para helpers reutilizáveis
no módulo de autenticação, reduzindo acoplamento com o boot do app.
```

## Regras De Uso

- Não misture alterações não relacionadas no mesmo commit quando houver como separar com segurança.
- Commits devem ser objetivos: se a mudança é só de docs, use `docs`; se tem código, use `feat`, `fix` ou `refactor` conforme o caso.
- Não use `refactor` quando o commit também introduz comportamento novo; use `feat`.
- Não use `feat` para correção de bug; use `fix`.
- Mensagens de commit devem ser em português brasileiro correto ou inglês consistente com o histórico recente do repositório.
- Nenhum segredo, token ou senha deve aparecer em mensagens de commit.

## Validação

Commits são validados no fluxo do repositório. Antes de commitar:

1. Confirme que o tipo escolhido representa corretamente a alteração.
2. Verifique que o escopo é informado quando houver área afetada clara.
3. Certifique-se de que não há segredos no diff.
4. Rode a compilação (`npm run build`) e os testes (`npm run test`) e confira que estão verdes.
