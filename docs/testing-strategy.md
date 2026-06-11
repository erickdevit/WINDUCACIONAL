# Estratégia De Testes

## Estado Atual

Há suítes separadas para a nova stack:

- `winducacional-api`: RSpec para requests, controllers e regras de backend Rails.
- `winducacional-web`: Vitest e Testing Library para utilitários, slices, contratos de tela e fluxos principais do frontend React/TypeScript.

O legado ainda possui testes próprios na raiz, mas novas funcionalidades devem ser protegidas prioritariamente nas pastas da nova stack.

## Objetivo

Criar uma suíte objetiva, rápida e útil para proteger a evolução do simulador educacional. Os testes devem focar comportamento, segurança básica e fluxos críticos, evitando snapshots frágeis de toda a interface.

## Pirâmide Alvo

- Unitários: reducers, utilitários, validadores e regras de domínio.
- Componentes: janelas, menus, taskbar, aplicativos simulados e estados responsivos.
- Integração: fluxos com Redux, persistência local atual e futura API.
- End-to-end: jornadas educacionais críticas no navegador.
- Segurança: entradas perigosas, renderização segura, links externos e endpoints futuros.

## Cenários Mínimos Do Frontend Atual

- Inicialização da aplicação sem crash.
- Boot/lock screen e transição para desktop.
- Abrir, minimizar, maximizar e fechar aplicativos.
- Menu iniciar, busca, widgets e menu contextual.
- Persistência de configurações em `localStorage` com dados válidos e inválidos.
- Renderização responsiva em desktop e mobile.
- Falha de API externa sem quebrar a interface.
- Login carrega o ambiente do usuário autenticado.
- Alterações no Explorer são persistidas no disco virtual do usuário.

## Cenários Do Simulador Educacional Futuro

- Usuário autentica e acessa ambiente correto.
- Aluno não acessa diretórios de outros alunos.
- Professor acessa `C:\Users` e visualiza discos dos alunos.
- Professor cria, edita, ativa e desativa usuários.
- Professor cria turmas como `Kids` ou `Normal`, e alunos vinculados herdam obrigatoriamente o tipo da turma.
- Alunos `Kids` veem apenas os apps educacionais Kids, alunos `Normal` veem apenas os apps educacionais normais, e professores veem todos.
- Professor cria turmas com código único de 6 letras ou números maiúsculos.
- Aluno cria cadastro na tela de login usando código de turma ativo e já entra vinculado à turma.
- Professor edita o tipo de uma turma e todos os alunos vinculados passam a usar automaticamente o novo tipo.
- Professor zera o ranking de digitação de uma turma usando o código da turma, sem afetar pontuações de outras turmas ou tipos.
- Professor salva metas de PPM e precisão dos apps de digitação Normal e Kids, e alunos recebem os novos valores em tempo real mesmo com uma lição aberta.
- Game solo do app de Digitação Normal usa missões separadas das lições, aceita apenas palavras, calcula vidas, PPM e precisão, recebe configurações próprias em tempo real e mantém rankings global e por turma separados das lições.
- PVP de digitação valida pareamento por turma, sincroniza progresso em tempo real, finaliza por conclusão ou perda de vidas, exibe o placar final dos dois jogadores e grava histórico próprio do modo.
- Backend registra presença automaticamente ao criar sessão de aluno dentro dos dias e horários configurados para a turma, mantendo um registro único por aluno/data com primeiro login, último login e contador de logins.
- Professor configura dias da semana e horário de aula na área de Turmas; o app Frequência usa essa agenda para calcular presença e ausência sem contar dias sem aula.
- Professor filtra frequência por turma e período, confere métricas de presença/ausência baseadas na agenda da turma e imprime relatório; aluno visualiza apenas o próprio histórico.
- A rota `/frequencia` renderiza a Frequência em modo web direto, sem desktop, taskbar ou menus do simulador, preservando a mesma autenticação e os mesmos endpoints do app em janela.
- Em celular no modo retrato, a Frequência usa navegação inferior, filtros em painel inferior e cartões no lugar das tabelas largas, sem alterar a experiência de desktop.
- Professor cria prova com tempo global, configura tempo por questão, publica, atribui a alunos e acompanha resultados.
- Aluno confirma o nome completo antes de iniciar a avaliação, com autoformatação no cliente, normalização no backend e snapshot salvo na submissão.
- Aluno só abre avaliações atribuídas, responde múltipla escolha, executa a prática em container simulado e recebe nota calculada pelo backend.
- Backend de avaliação ignora pontuação enviada pelo cliente e calcula acertos com base nas respostas, regras persistidas e snapshot prático.
- Professor libera ou bloqueia módulos de apostilas para todos, concede módulos específicos para alunos selecionados por turma, aluno enxerga somente módulos liberados para seu caso e PDFs são abertos por rotas autenticadas sem expor caminho local.
- Explorador abre arquivos de imagem `png`, `jpg`, `jpeg`, `webp` e `gif` no app interno Fotos, sem exibir Fotos como app solto no menu Iniciar e sem renderizar conteúdo que não seja data URL de imagem raster válida.
- Gerador de Imagens usa apenas o proxy autenticado do backend, nunca expõe `IMAGEGEN_API_TOKEN` no frontend e salva imagens geradas no disco virtual pela pasta `Pictures` da árvore `/api/fs/tree`.
- Explorador cria pastas, cria arquivos de texto, renomeia e exclui itens persistindo a árvore em `/api/fs/tree`, sem sobrescrever nomes existentes por acidente.
- Quando a build muda, sessões são invalidadas, caches são limpos e o cliente recarrega automaticamente para a nova versão.
- Cenário educacional inicia, salva progresso e retoma.
- Ações do usuário geram eventos consistentes no backend.
- Permissões impedem acesso a progresso ou arquivos de outro usuário.
- Uploads ou arquivos gerados respeitam validação e quota.
- Backup/restore não quebra consistência entre banco e diretório persistente.

## Ferramentas Recomendadas

- Vitest para testes unitários e de componentes.
- React Testing Library para interação com componentes.
- Playwright para fluxos end-to-end.
- RSpec para requests da API Rails.
- Testcontainers ou banco PostgreSQL em Compose para integração, quando houver backend.

## Política Para Novas Mudanças

- Mudança de comportamento deve incluir teste.
- Correção de bug deve incluir teste que falha antes da correção quando viável.
- Mudança de segurança deve incluir teste de regressão.
- Refatoração sem comportamento novo deve manter a suíte passando.
- Endpoints backend novos devem ter teste de sucesso, erro de validação e autorização quando aplicável.
- Fluxos em tempo real devem ter teste cobrindo contrato do endpoint de evento ou do cliente que consome o evento, além da atualização do estado visível no frontend.

## Critério De Aceite Futuro

Antes de merges importantes, o mínimo esperado será:

```bash
cd winducacional-api && bundle exec rspec
cd winducacional-web && npm run test
cd winducacional-web && npm run lint
cd winducacional-web && npm run build
```

Quando a alteração também tocar o legado de transição, rode os testes/builds correspondentes da raiz antes do commit.
