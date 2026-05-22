# AGENTS.md

Este é um arquivo vivo para agentes, automações e colaboradores que trabalham neste repositório. Atualize este documento sempre que uma decisão, regra, comando, documento ou fluxo importante mudar.

## Resumo Do Projeto

- Produto alvo: WINDUCACIONAL, simulador educacional aberto com experiência desktop web.
- Estado atual: frontend React/Vite/Redux com PWA, assets estáticos e simulação de desktop.
- Estado atual de backend: Express, PostgreSQL, sessões HTTP-only, usuários com papéis, classificação Kids/Normal para alunos, turmas com código de vínculo, discos virtuais persistidos por usuário e permissões de módulos de apostilas.
- Estado atual de deploy: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` e `compose.dev.yml`.
- Estado futuro: ampliação para cenários educacionais, progresso e operação endurecida em servidor dedicado.
- Prioridade técnica: boas práticas de código, segurança, testes objetivos e documentação viva.

## Idioma E Escrita

- Escreva documentação, comentários novos, mensagens de usuário, issues e descrições do projeto em português brasileiro correto.
- **REGRA ABSOLUTA:** Todo e qualquer texto em português exibido no sistema (aplicativos, lições, diálogos, etc.) deve seguir estritamente a ortografia correta do Brasil, incluindo todas as acentuações, cedilhas e pontuações adequadas. NUNCA utilize texto sem acentos (como "digitacao" em vez de "digitação") se a palavra exigir na gramática correta.
- Evite texto sem acentos quando o conteúdo for em português.
- Não use emojis em documentação, commits, issues, templates ou mensagens de projeto, salvo pedido explícito.
- Preserve nomes técnicos, comandos, APIs, bibliotecas e identificadores no idioma original quando isso evitar ambiguidade.

## Documentos De Referência

Leia estes documentos antes de planejar mudanças estruturais:

- `README.md`: contexto principal do projeto e comandos atuais.
- `docs/README.md`: índice e função de cada documento.
- `docs/product-vision.md`: objetivo do simulador educacional e escopo.
- `docs/architecture.md`: arquitetura atual e direção futura.
- `docs/security.md`: regras de segurança e dívidas técnicas conhecidas.
- `docs/testing-strategy.md`: estratégia de testes e cenários esperados.
- `docs/deployment.md`: direção de Docker, Postgres, volume persistente e servidor dedicado.
- `docs/roadmap.md`: ordem recomendada de evolução.

## Stack Atual

- React 18 com `react-dom/client`.
- Redux clássico com reducers em `src/reducers`.
- Vite 3 como build/dev server.
- SCSS/CSS e Tailwind configurado, sem design system formal.
- PWA via `vite-plugin-pwa` e assets em `public/`.
- O foco de distribuição é web/PWA com backend Express e Docker. Não manter empacotadores desktop sem decisão explícita.

## Comandos Atuais

```bash
npm run start
npm run dev
npm run test
npm run build
npm run prettier
```

`npm run dev` inicia o Vite. `npm run test` executa a suíte Vitest. `npm run start` inicia o servidor Express e espera uma build em `build/`.

Comandos de infraestrutura atuais:

```bash
docker compose up -d
docker compose down
docker compose -f compose.dev.yml up -d
```

## Fluxo Git

- Use apenas a branch `main` por enquanto.
- Ao finalizar cada rodada de execução, crie um commit com as alterações realizadas.
- Antes de commitar, é estritamente obrigatório rodar a compilação (ex: `npm run build`) e validar os testes garantindo que fechem "tudo verde" (sem erros). Só realize o commit se a compilação tiver sucesso total.
- Commits devem ter mensagens objetivas, em português brasileiro correto ou inglês consistente com o histórico recente.
- Não misture alterações não relacionadas no mesmo commit quando houver como separar com segurança.

## Regras De Trabalho

- Antes de implementar, entenda o estado atual do código e confirme se a mudança é frontend, backend, infraestrutura ou documentação.
- Preserve o comportamento existente enquanto a migração para simulador educacional não tiver uma especificação detalhada.
- Não implemente backend, banco, Docker ou autenticação sem atualizar primeiro os documentos relevantes.
- Regras de autenticação, autorização e isolamento de disco devem ser implementadas no servidor.
- A implantação padrão cria automaticamente o usuário inicial `Admin` com senha `Admin` e papel `professor` quando o banco está vazio.
- A tela de login permite cadastro público de aluno usando código de turma ativa, criando a sessão e vinculando o aluno à turma informada.
- Mudanças estruturais devem atualizar `docs/architecture.md`, `docs/security.md`, `docs/testing-strategy.md` ou `docs/deployment.md` quando aplicável.
- Não reverta alterações de outros colaboradores sem pedido explícito.
- Prefira alterações pequenas e revisáveis, com testes correspondentes ao risco.
- Evite refatorações amplas que não estejam diretamente ligadas ao objetivo da tarefa.
- Novas janelas internas do simulador devem seguir o padrão das janelas de apps: moldura própria, barra superior, foco visual, controles de janela, movimentação e redimensionamento, como no Windows.
- Todo novo app com janela principal deve usar o wrapper compartilhado `src/components/shared/AppWindow.jsx`, preservando o shell padrão antigo antes de adicionar conteúdo específico.
- O app Apostilas mantém os PDFs em `src/containers/applications/apps/booklets/library`; não deixe a biblioteca de apostilas solta na raiz do projeto.
- O acesso de alunos a apostilas é controlado no backend pela tabela `booklet_module_access`; professores podem ver todos os módulos e alunos só podem abrir módulos liberados.
- Games dentro do app de Digitação Normal devem ficar separados das lições tradicionais. O modo PVP só deve ser liberado como partida real depois de existir backend com convite, sincronização em tempo real, validação de mesma turma, cálculo de vencedor no servidor e ranking persistido separado.

## Regras De Segurança

- Nunca coloque segredos no frontend, em `public/`, no README ou em arquivos versionados.
- Trate `localStorage`, parâmetros de URL, dados de APIs externas e conteúdo persistido como não confiáveis.
- Não introduza `eval`, `new Function`, `dangerouslySetInnerHTML`, `innerHTML` ou `window.open` sem validação centralizada, sanitização e justificativa documentada.
- Links externos com `target="_blank"` devem usar `rel="noopener noreferrer"` ou proteção equivalente.
- O backend futuro deve validar entrada no servidor, usar queries parametrizadas, limitar CORS, aplicar rate limit quando necessário e isolar arquivos persistentes por regras claras de acesso.
- Autenticação futura deve preferir sessões/cookies seguros ou tokens de curta duração com escopo mínimo; nunca guarde segredos sensíveis em `localStorage`.
- Alunos só podem acessar o próprio disco virtual. Professores podem acessar os discos dos alunos via `C:\Users`, com autorização validada no backend.
- Sempre documente quando um segredo ou senha padrão existir. Se a senha inicial for mantida por exigência operacional, a documentação deve alertar para troca imediata após a implantação.

## Testes Esperados

A suíte inicial usa Vitest. A estratégia alvo está em `docs/testing-strategy.md` e deve cobrir:

- Testes unitários para reducers, utilitários e regras de simulação.
- Testes de componentes para janelas, menus, taskbar, apps e estados responsivos.
- Testes de integração para fluxos de usuário, persistência local e futura API.
- Testes end-to-end para fluxos educacionais críticos.
- Testes de segurança básicos para entradas, HTML renderizado, links externos e endpoints futuros.

## Dívidas Técnicas Conhecidas

- `src/reducers/apps.js` abre URLs externas com `window.open`; precisa de allowlist e proteção equivalente a `noopener noreferrer`.
- Dados persistidos em `localStorage` são usados como estado confiável em vários pontos; validar antes de migrar ou sincronizar com backend.
- `public/dycalendar.js` manipula HTML diretamente; manter isolado ou substituir por componente seguro quando mexer no calendário.
- A cobertura automatizada ainda é inicial e precisa evoluir para testes de componentes, integração e e2e.

## Política De Atualização

Atualize este arquivo quando:

- Um novo comando obrigatório for adicionado.
- Uma decisão de arquitetura for tomada.
- A estrutura de pastas mudar.
- Um novo serviço, banco, volume ou dependência crítica entrar no projeto.
- A estratégia de teste ou segurança mudar.
- Uma dívida técnica relevante for resolvida ou descoberta.
