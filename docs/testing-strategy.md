# Estratégia De Testes

## Estado Atual

Há uma suíte inicial em Vitest, executada com `npm run test`, cobrindo verificações objetivas de schema, contrato básico do backend, cliente de API e utilitários. Ela ainda não substitui testes de integração reais com PostgreSQL nem testes de componentes no navegador.

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
- A composição do desktop renderiza apenas exports de componentes e ignora helpers utilitários exportados pelos módulos de apps.
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
- Professor configura no Gestor uma URL HTTP ou HTTPS para o ITB Ouro Moderno, alunos passam a usar o endereço persistido e usuários sem permissão não conseguem alterá-lo.
- Professor cria, edita e exclui atividades solo por turma; alunos visualizam somente as atividades da própria turma e podem marcar apenas o próprio progresso.
- Professor cria grupos com alunos da mesma turma e vincula atividades em grupo; cada aluno visualiza somente tarefas dos grupos dos quais participa, enquanto o professor acompanha todos os grupos e atividades da turma.
- Backend rejeita grupo com aluno de outra turma, atividade em grupo sem grupo válido, URL do Ouro Moderno com protocolo inseguro e tentativa de aluno de administrar atividades ou grupos.
- Montagem de PC aceita uma configuração completa e compatível, rejeita incompatibilidades de socket, memória, gabinete, vídeo, fonte, conectores, refrigeração e sistema operacional, e informa reduções de velocidade quando aplicáveis.
- Toda tentativa de ligar um PC é recalculada no backend e persistida como sucesso ou explosão; listagem, detalhe e exclusão da galeria são filtrados pelo usuário autenticado.
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
- Supertest ou equivalente quando o backend for criado.
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
npm run test
npm run build
```

O projeto ainda não possui comando de lint dedicado.
