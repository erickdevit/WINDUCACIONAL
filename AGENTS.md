# AGENTS.md

Este é um arquivo vivo para agentes, automações e colaboradores que trabalham neste repositório. Atualize este documento sempre que uma decisão, regra, comando, documento ou fluxo importante mudar.

## Resumo Do Projeto

- Produto alvo: WINDUCACIONAL, simulador educacional aberto com experiência desktop web.
- Estado atual: migração para `winducacional-api` (Rails API) e `winducacional-web` (React/TypeScript) em andamento.
- Estado atual de backend alvo: Rails API, PostgreSQL, sessões HTTP-only, usuários com papéis, classificação Kids/Normal para alunos, turmas com código de vínculo, discos virtuais persistidos por usuário, ActionCable, permissões de módulos de apostilas, avaliações, frequência, chat, digitação/PVP, Gestor e proxy autenticado para geração de imagens.
- Estado atual de frontend alvo: React, TypeScript, Vite, Redux Toolkit, RTK Query, React Router e Tailwind em `winducacional-web`.
- Estado atual de deploy alvo: `docker-compose.rails.yml` com `web`, `rails_api`, `postgres` e `redis`; o frontend novo é servido por container Nginx próprio e faz proxy de `/api` e `/cable` para o Rails.
- Estado do legado: `src/`, `server/`, `public`, `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` e `compose.dev.yml` permanecem apenas para transição até a nova stack atingir paridade funcional.
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
- `docs/commit-convention.md`: formato obrigatório de mensagens de commit e tipos permitidos.

## Stack Alvo

- Backend Rails API em `winducacional-api`.
- Frontend React/TypeScript em `winducacional-web`.
- Redux Toolkit e RTK Query para estado e API no frontend novo.
- React Router para rotas autenticadas, incluindo `/frequencia`.
- PostgreSQL como banco principal e Redis para ActionCable.
- Recursos compartilhados fora do legado em `shared/booklets` e `shared/base-tree/dir.json`.
- O foco de distribuição é web/PWA com Rails atrás de proxy para `/api` e `/cable`. Não manter empacotadores desktop sem decisão explícita.

## Comandos Atuais

```bash
cd winducacional-api && bundle exec rspec
cd winducacional-web && npm run dev
cd winducacional-web && npm run test
cd winducacional-web && npm run lint
cd winducacional-web && npm run build
```

`winducacional-web/npm run dev` inicia o Vite com proxy para a Rails API em `http://localhost:3002`. `bundle exec rspec` executa a suíte Rails. `npm run test` executa a suíte Vitest do frontend novo.

Comandos de infraestrutura atuais:

```bash
docker compose -f docker-compose.rails.yml up -d --build
docker compose -f docker-compose.rails.yml down
```

Esse compose publica o frontend novo em `WEB_PORT` (`8080` por padrão). O
Rails fica acessível apenas dentro da rede do Compose, atrás do proxy do
serviço `web`.

## Fluxo Git

- Use apenas a branch `main` por enquanto.
- Ao finalizar cada rodada de execução, crie um commit com as alterações realizadas.
- Antes de commitar, é estritamente obrigatório rodar a compilação (ex: `npm run build`) e validar os testes garantindo que fechem "tudo verde" (sem erros). Só realize o commit se a compilação tiver sucesso total.
- Commits devem ter mensagens objetivas seguindo estritamente o padrão definido em `docs/commit-convention.md` e usando tipos como `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `perf`, `build`, `chore`, `revert`, `ci` ou `security`. Nenhuma outra forma de mensagem deve ser usada.
- Não misture alterações não relacionadas no mesmo commit quando houver como separar com segurança.

## Regras De Trabalho

- Antes de implementar, entenda o estado atual do código e confirme se a mudança é frontend, backend, infraestrutura ou documentação.
- **REGRA ABSOLUTA:** JAMAIS entregue uma tela ou funcionalidade no frontend se o backend do qual ela depende (rotas, migrações, controllers) não existir ou estiver incompleto, a menos que seja explicitamente solicitado pelo usuário. Se a tarefa exige salvar/ler dados, você deve implementar o fluxo completo (fullstack) na mesma tarefa.
- Preserve o comportamento existente enquanto a migração para simulador educacional não tiver uma especificação detalhada.
- Não implemente backend, banco, Docker ou autenticação sem atualizar primeiro os documentos relevantes.
- Regras de autenticação, autorização e isolamento de disco devem ser implementadas no servidor.
- Na stack Rails, o primeiro professor deve ser criado pelo fluxo `/api/bootstrap`; em produção, defina `BOOTSTRAP_TOKEN`. Não reintroduza seed automático `Admin`/`Admin` na nova stack.
- A tela de login permite cadastro público de aluno usando código de turma ativa, criando a sessão e vinculando o aluno à turma informada.
- A agenda de dias e horários de aula deve ser configurada na área de Turmas das Configurações e usada como fonte de verdade pelos apps que precisem calcular presença, ausência ou disponibilidade por turma.
- O app Frequência também deve funcionar pela rota direta `/frequencia`, como app web normal autenticado, sem montar desktop, taskbar ou menus do simulador; mantenha esse modo em sincronia com o app aberto pela janela do simulador.
- Mudanças estruturais devem atualizar `docs/architecture.md`, `docs/security.md`, `docs/testing-strategy.md` ou `docs/deployment.md` quando aplicável.
- Não reverta alterações de outros colaboradores sem pedido explícito.
- Prefira alterações pequenas e revisáveis, com testes correspondentes ao risco.
- Evite refatorações amplas que não estejam diretamente ligadas ao objetivo da tarefa.
- Novas janelas internas do simulador devem seguir o padrão das janelas de apps: moldura própria, barra superior, foco visual, controles de janela, movimentação e redimensionamento, como no Windows.
- Todo novo app com janela principal no frontend novo deve usar o gerenciador de janelas compartilhado de `winducacional-web/src/components/windows/AppWindow.tsx`, preservando o shell padrão antes de adicionar conteúdo específico.
- Apps novos devem prever as barras de rolagem necessárias ao cenário, incluindo rolagem vertical e horizontal em painéis, listas, leitores, tabelas, grids ou conteúdos que possam exceder o espaço da janela.
- O app Apostilas mantém os PDFs em `shared/booklets`; não volte a acoplar a biblioteca a `src/containers/applications/apps/booklets/library`.
- O acesso de alunos a apostilas é controlado no backend pelas tabelas `booklet_module_access` e `booklet_student_module_access`; professores podem ver todos os módulos, liberar módulos para todos ou conceder módulos específicos a alunos selecionados por turma.
- O app Gerador de Imagens usa proxy autenticado no backend; o token da API externa fica apenas em `IMAGEGEN_API_TOKEN` no servidor, e imagens baixadas pelo usuário devem ser salvas no disco virtual pela persistência existente.
- O app Fotos é o visualizador interno de imagens do sistema no frontend novo; arquivos `png`, `jpg`, `jpeg`, `webp` e `gif` abertos pelo Explorador devem abrir a janela interna `photos` com payload de caminho do arquivo, sem expor arquivos reais do host.
- Games dentro do app de Digitação Normal devem ficar separados das lições tradicionais. O modo PVP só deve ser liberado como partida real depois de existir backend com convite, sincronização em tempo real, validação de mesma turma, cálculo de vencedor no servidor e ranking persistido separado.

## Regras De Segurança

- Nunca coloque segredos no frontend, em `public/`, no README ou em arquivos versionados.
- Tokens de provedores externos, incluindo `IMAGEGEN_API_TOKEN`, devem ficar somente em variáveis de ambiente do servidor.
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

- O legado em `src/reducers/apps.js` abre URLs externas com `window.open`; trate como dívida até a remoção do legado.
- Dados persistidos em `localStorage` no legado são usados como estado confiável em vários pontos; validar antes de migrar ou sincronizar com backend.
- `public/dycalendar.js` no legado manipula HTML diretamente; manter isolado ou substituir por componente seguro se ainda for migrado.
- A cobertura automatizada ainda é inicial e precisa evoluir para testes de componentes, integração e e2e.
- **Refatoração pendente de componentes gigantes do frontend:** `typing/typing.jsx` (~1970 linhas) e `attendance/attendance.jsx` (~1630 linhas) ainda são dominados por um único componente extenso (`TypingApp` e `AttendanceView`). A divisão segura desses componentes exige extrair lógica/estado interno e, idealmente, testes de renderização antes, para garantir preservação de comportamento. Tratar em sessão dedicada. O app de Configurações já foi modularizado (`settings.jsx`, `settingsShared.jsx`, `UserManagement.jsx`, `TurmaManagement.jsx`) e serve de referência de padrão.

## Organização Do Backend

- A stack alvo usa Rails API em `winducacional-api`.
- Rotas ficam em `winducacional-api/config/routes.rb` e arquivos de domínio em `winducacional-api/config/routes/*.rb`.
- Controllers ficam em `winducacional-api/app/controllers/api/`, services em `winducacional-api/app/services/` e modelos em `winducacional-api/app/models/`.
- Preserve autorização por papel em concerns como `Authenticatable` e `ProfessorRequired`; secretaria tem acesso somente leitura onde o concern permitir.
- O Express em `server/` é legado de transição. Não crie endpoints novos nele sem pedido explícito.

## Migrations Versionadas

- O schema da stack alvo é aplicado por migrations Rails em `winducacional-api/db/migrate/`.
- `winducacional-api/db/baseline/0001_baseline.sql` representa o ponto de adoção do legado e não deve ser editado para mudanças futuras.
- **REGRA:** toda mudança estrutural no banco deve ser uma nova migration Rails em `winducacional-api/db/migrate/`, nunca edição da baseline nem `ALTER` solto no boot.

## Política De Atualização

Atualize este arquivo quando:

- Um novo comando obrigatório for adicionado.
- Uma decisão de arquitetura for tomada.
- A estrutura de pastas mudar.
- Um novo serviço, banco, volume ou dependência crítica entrar no projeto.
- A estratégia de teste ou segurança mudar.
- Uma dívida técnica relevante for resolvida ou descoberta.
- O padrão de commits for alterado ou documentado em `docs/commit-convention.md`.
