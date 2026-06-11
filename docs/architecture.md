# Arquitetura

## Arquitetura Atual Em Migração

A arquitetura alvo em implementação é composta por:

- `winducacional-api`: Rails API com PostgreSQL, sessões HTTP-only, ActionCable, controllers por domínio e services para regras de negócio.
- `winducacional-web`: React/TypeScript com Vite, Redux Toolkit, RTK Query, React Router e Tailwind.
- `winducacional-web/Dockerfile` e `winducacional-web/nginx.conf`: build estático do frontend novo e proxy de `/api` e `/cable` para o Rails no compose alvo.
- `winducacional-web/src/components/windows/AppWindow.tsx`: moldura compartilhada das janelas do frontend novo, com foco, minimização, maximização, movimentação, redimensionamento e limites na área útil acima da barra de tarefas.
- `winducacional-web/src/components/icons/SystemIcon.tsx`: ícones SVG internos do shell novo, usados pelo menu Iniciar, apps e Explorador sem depender de emojis.
- `shared/booklets`: biblioteca neutra de PDFs usada pelo app Apostilas.
- `shared/base-tree/dir.json`: árvore base neutra do disco virtual usada pela API Rails e pelo legado enquanto a migração não termina.

O código Express/Vite legado em `server/`, `src/` e `public/` permanece apenas para transição. Não trate essas pastas como arquitetura alvo para novas funcionalidades.

O legado ainda combina uma SPA React com um backend inicial em Express:

- `src/index.jsx`: entrada React e Provider Redux.
- `src/App.jsx`: composição principal da experiência desktop.
- `src/lib/api.js`: cliente HTTP para autenticação, usuários e disco virtual.
- `src/reducers/`: estado global Redux para wallpaper, taskbar, apps, menus, arquivos e configurações.
- `src/actions/`: ações e operações compartilhadas, incluindo leitura/escrita em `localStorage`.
- `src/containers/applications/apps/`: aplicativos simulados.
- `src/components/`: taskbar, start menu, menu contextual, login e PWA prompt.
- `public/`: assets, scripts estáticos, manifest e imagens.

### Estrutura Padrão de Janelas de Apps

Todos os novos aplicativos do simulador devem seguir a estrutura base de classes no container pai para garantir a correta renderização, animação e comportamento de redimensionamento em relação à `ToolBar` e estado do Redux:

```jsx
<div
  className={`meuApp darkWindow floatTab dpShad flex flex-col font-sans ${
    wnapp.size === "cstm" ? "windowMode" : ""
  }`}
  data-size={wnapp.size}
  data-max={wnapp.max}
  style={{ ...(wnapp.size === "cstm" ? wnapp.dim : null), zIndex: wnapp.z }}
  data-hide={wnapp.hide}
  id={wnapp.icon + "App"}
>
  <ToolBar
    app={wnapp.action}
    icon={wnapp.icon}
    size={wnapp.size}
    name="Meu App"
  />
  <div className="windowScreen flex flex-col" data-dock="true">
    {/* Conteúdo */}
  </div>
</div>
```

A ausência das classes `flex` e `flex-col` associadas ao `floatTab` causará problemas de renderização na `ToolBar` (que não respeitará a altura e não deslocará o conteúdo interno). O teste unitário `appWindowStructure.test.jsx` valida passivamente essas classes nos apps implementados.

As janelas devem permanecer sempre dentro da área útil do desktop, limitada pela borda superior da barra de tarefas. A altura base vem de `--desktop-workarea-height`, derivada de `--taskbar-height`, e o redimensionamento/arraste das janelas compartilhadas precisa ser travado contra o container `.desktop`, nunca contra a altura total da viewport.

- `vite.config.js`: build Vite e configuração PWA.
- `server/index.cjs`: raiz de composição do backend. Concentra configuração, pool PostgreSQL, helpers compartilhados, middleware de autenticação, estado em memória (clientes SSE, usuários online) e a função `start()`. Monta `routeContext` com as dependências compartilhadas e injeta os módulos de rota. Exporta `{ app, start }` e só executa `start()` quando rodado diretamente (`require.main === module`), permitindo carregá-lo em testes sem subir o servidor.
- `server/routes/*.cjs`: rotas agrupadas por domínio (`auth`, `users`, `turmas`, `booklets`, `attendance`, `fs`, `exams`, `typing`, `notifications`, `chat`, `gestor`, `edgeProxy`, `imagegen`). Cada módulo exporta uma função injetora `inject<Dominio>Routes(ctx)` que recebe o `routeContext`, seguindo o mesmo padrão de `server/typingPvp.cjs`.
- `server/db/migrations/`: migrations versionadas do PostgreSQL (`0001_baseline.sql` consolida o schema inicial).
- `server/db/migrate.cjs`: runner de migrations executado no boot.
- `Dockerfile`: empacotamento da aplicação.
- `docker-compose.yml`: stack completa de aplicação e PostgreSQL.

## Persistência Atual

A persistência atual está dividida:

- PostgreSQL guarda usuários, papéis, turmas com classificação Kids/Normal e código público de vínculo, sessões, metadados de versão da aplicação e configurações de dificuldade dos apps de digitação.
- `PERSISTENT_DATA_DIR` guarda um `disk.json` por usuário com o conteúdo do disco virtual.
- `localStorage` ainda guarda preferências visuais legadas e não deve ser usado para autorização ou dados sensíveis.
- Na stack Rails, o primeiro professor é criado por `/api/bootstrap`; o seed automático por `SEED_ADMIN_*` pertence apenas ao legado Express enquanto ele existir.

Alunos recebem apenas o próprio diretório em `C:\Users`. Professores recebem a visão completa de `C:\Users` e podem gravar discos de usuários ativos. Secretaria tem leitura da árvore visível, mas não pode persistir alterações em `/api/fs/tree`. O backend valida que o disco gravado é um objeto antes de escrever `disk.json`, impedindo payloads que corrompam a estrutura do disco virtual. Professores podem administrar usuários e turmas nas Configurações. Turmas possuem `student_type` (`kids` ou `normal`) e `code`, um identificador único de 6 letras ou números maiúsculos usado no cadastro público de aluno. A turma é a fonte de verdade da classificação Kids/Normal: ao vincular ou editar alunos, o backend deriva automaticamente o `student_type` do aluno a partir da turma, e ao alterar o tipo da turma todos os alunos vinculados herdam o novo tipo. A interface usa essa classificação derivada para exibir somente os apps educacionais correspondentes ao tipo do aluno, mantendo os apps padrão do Windows visíveis para todos e liberando tudo para professores. Nomes completos são normalizados no cadastro, edição e inicialização do backend, que também ajusta registros antigos de usuários. Professores também podem zerar o ranking de digitação de uma turma informando esse código, operação que remove apenas as pontuações dos alunos vinculados à turma indicada e ao tipo da turma.

As configurações de aprovação dos apps de digitação ficam em `typing_settings`, separadas por `student_type` (`normal` e `kids`). Professores alteram PPM mínimo e precisão mínima nos respectivos apps e salvam pelo backend; no app Kids também é persistido o limite de vidas por lição. Sessões de alunos mantêm uma conexão SSE autenticada em `/api/typing/settings/events`, recebendo mudanças do tipo derivado da sua turma em tempo real, inclusive durante uma lição em andamento. Rankings globais, rankings por turma e reset de pontuação também são filtrados pelo tipo da turma, impedindo mistura entre turmas Kids e Normal. O `localStorage` pode manter apenas cache de inicialização visual, mas a fonte de verdade é o PostgreSQL.

O app de Digitação Normal também contém uma área de games separada das lições tradicionais. O modo solo inicial, Defesa Orbital, usa missões próprias de palavras, nave e tiros por letra. Suas configurações ficam em `typing_game_settings`, também por `student_type`, com PPM mínimo, precisão mínima, vidas do game, velocidade percentual de descida das palavras e aceleração percentual por palavra destruída. Essas duas últimas opções são exclusivas do game e não afetam as lições tradicionais. Alunos recebem mudanças em tempo real por SSE em `/api/typing/game/settings/events`, e os rankings oficiais do game usam `typing_game_scores` e a view `typing_game_ranking`, com listagens global e por turma e reset próprio por código de turma. O histórico em `localStorage` pode existir apenas como fallback visual quando a API não estiver disponível. O modo PVP usa endpoints autenticados em `/api/typing-pvp/*` para lobby, convite, pareamento aleatório, sincronização SSE, finalização e histórico persistido em `typing_pvp_matches`; o app novo exibe placares por escopo global ou turma consumindo `GET /api/typing-pvp/scores`, filtrando a turma do aluno ou a turma selecionada pelo professor no backend. A finalização identifica os participantes da sala no servidor, exige progresso completo sincronizado antes de encerrar e calcula vencedor e placar a partir do estado da sala no Redis, ignorando placares enviados no corpo da requisição. A validação autoritativa de cada palavra digitada no servidor permanece como etapa futura de endurecimento.

O app Frequência usa `attendance_records` para registrar automaticamente a presença diária de alunos no momento em que uma sessão é criada dentro da agenda da turma. Cada turma mantém `schedule_days`, `schedule_start_time` e `schedule_end_time`, configurados na área de Turmas das Configurações, e essa agenda é a fonte de verdade para apps que precisem saber dias e horários de aula. Cada aluno tem no máximo um registro por data, com primeiro login, último login e contador de logins do dia. O cálculo de data usa o fuso `America/Sao_Paulo`. Professores e secretaria acessam painéis por turma e período, com métricas de presença, ausências e lista analítica calculadas apenas sobre dias esperados de aula; apenas professor registra presença manual em lote por turma. Alunos acessam apenas o próprio resumo e histórico. A mesma visualização roda dentro da janela do simulador ou diretamente pela rota `/frequencia`, que mantém autenticação por sessão e evita montar desktop, taskbar e menus do simulador.

O app Avaliação usa `exams`, `exam_questions`, `exam_assignments`, `exam_submissions` e `exam_answers`. Professores criam provas, definem tempo global em minutos, publicam e atribuem avaliações a alunos. Cada questão também pode ter um tempo próprio em minutos, usado pela interface do aluno para avançar a questão quando o tempo expira. Antes de iniciar a avaliação, o aluno confirma o nome completo puxado do cadastro; se editar, o frontend aplica a autoformatação e o backend normaliza e atualiza o cadastro. A submissão mantém `student_display_name` como snapshot do nome confirmado. Alunos só listam e abrem provas publicadas e atribuídas a eles. A correção de múltipla escolha e das regras práticas é calculada no backend a partir das respostas e de um snapshot do container prático; o frontend não envia pontuação nem resposta correta como fonte de verdade. As regras práticas iniciais cobrem existência de arquivo, conteúdo de arquivo e ação/atalho executado no container simulado.

As aplicações de prova são rastreadas em `exam_application_batches` e `exam_application_items`. Cada rodada registra o professor que aplicou, o modo usado (`all` ou `balanced`), totais solicitados, criados, já existentes e ignorados, além de um item por aluno/prova. A tela “Provas aplicadas” usa esses registros combinados com `exam_submissions` para mostrar se cada aluno ainda está pendente, em andamento, concluiu ou se a tentativa de aplicação foi ignorada. A remoção de uma aplicação é um cancelamento auditável: apenas atribuições criadas naquela rodada e ainda sem submissão são removidas de `exam_assignments`; itens já iniciados, concluídos, existentes antes da rodada ou ignorados são mantidos e marcados com o motivo.

Notificações do usuário usam SSE autenticado em `/api/notifications/events` e aparecem como cartões no canto inferior direito, acima da barra de tarefas. Por enquanto o canal recebe mensagens novas do Chat da Turma e convites de duelo do modo PVP; ao clicar, o frontend abre e foca o app de destino usando payload interno do app, levando diretamente para a conversa ou para a tela de aceite do desafio.

O backend mantém a versão atual da build em `app_metadata`. Quando a versão muda, as sessões persistidas são apagadas, o frontend detecta `/api/app/version`, limpa caches de navegador/service worker e recarrega com parâmetro de versão para forçar o uso da nova build.

O app Apostilas armazena os PDFs em `shared/booklets`, fora de `src/`, para que Rails, Docker e qualquer frontend em transição usem a mesma biblioteca sem depender da árvore legado. O backend faz a leitura desse diretório, expõe o catálogo em `/api/booklets/modules`, serve PDFs por IDs de módulo/arquivo validados e persiste em `booklet_module_access` quais módulos ficam visíveis para alunos em geral. A tabela `booklet_student_module_access` registra liberações específicas por aluno, usadas quando o professor precisa dar acesso a módulos pontuais para estudantes selecionados por turma. Professores veem todos os módulos e gerenciam liberações globais e individuais; secretaria tem leitura; alunos recebem módulos liberados globalmente ou por exceção individual.

O app Gerador de Imagens consome `/api/imagegen/config` e `/api/imagegen/generate`. O backend atua como proxy autenticado para o provedor externo configurado por `IMAGEGEN_API_TOKEN` e `IMAGEGEN_API_URL`, mantendo o token fora do frontend. A imagem gerada retorna ao cliente como data URL de imagem e pode ser salva diretamente no disco virtual pela API `/api/fs/tree`; o frontend localiza a pasta `Pictures` pelo `spid` `%pictures%`, cria um arquivo raster com nome derivado do prompt e evita sobrescrever nomes existentes.

O app Fotos é o visualizador interno para imagens armazenadas no disco virtual. No frontend novo, o Explorador abre arquivos `png`, `jpg`, `jpeg`, `webp` e `gif` pela janela interna `photos`, passando o caminho do arquivo como payload. O app lê a árvore autenticada de `/api/fs/tree`, valida que o nó é imagem raster e renderiza apenas conteúdo `data:image/...` compatível, sem acessar arquivos reais do host. O app é oculto do menu Iniciar e funciona como visualizador de sistema acionado pelo Explorador.

O Explorador do frontend novo lê e grava a árvore autenticada por `/api/fs/tree`. Ele navega por pastas, abre arquivos `.txt` no Bloco de Notas, abre imagens no Fotos, cria novas pastas, cria arquivos de texto, renomeia itens e exclui itens selecionados. As operações usam atualização imutável da árvore, nomes sanitizados para regras do Windows e geração de nomes únicos para evitar sobrescrita acidental.

## Arquitetura Alvo Final

A arquitetura alvo final deve separar responsabilidades:

- Frontend React/TypeScript: simulador, interface desktop, rotas diretas autenticadas, fluxos educacionais e consumo de API.
- Rails API: autenticação, usuários, progresso, administração, validação de entrada, ActionCable e regras de negócio.
- PostgreSQL: dados relacionais como usuários, perfis, sessões, progresso e auditoria.
- Diretório persistente: discos virtuais, arquivos gerados, uploads permitidos, exports e dados não relacionais que exigem volume.
- Docker: empacotamento reprodutível para servidor dedicado, com frontend público e Rails atrás de proxy para `/api` e `/cable`.

## Princípios

- O frontend nunca deve conter segredos.
- O servidor deve ser a fronteira de confiança para validação, autorização e persistência.
- O isolamento entre alunos deve ser garantido no backend, nunca apenas por ocultação de interface.
- Dados persistidos pelo usuário devem ser modelados antes de migrar do `localStorage`.
- Cada novo módulo deve ter testes compatíveis com seu risco.
- Decisões de arquitetura devem ser registradas antes de implementações grandes.

## Decisões Pendentes

- Política de backups e restore.
- Servidor web/reverse proxy em produção.

## Decisões Tomadas

- **Migrations versionadas (resolvido):** O schema passou a ser aplicado por migrations versionadas em `server/db/migrations/`, executadas no boot pelo runner `server/db/migrate.cjs`. O runner cria `schema_migrations`, usa `pg_advisory_lock` e aplica cada arquivo em transação própria, registrando apenas os bem-sucedidos. `0001_baseline.sql` consolida o estado atual (incluindo os `ALTER`/`DO $$` idempotentes que migravam bancos legados, como agenda de turmas e código de turma); por ser idempotente, converge tanto bancos vazios quanto legados. Toda mudança estrutural futura deve ser uma nova migration numerada, nunca uma edição da baseline. Ver `server/db/migrations/README.md` e `AGENTS.md`.
