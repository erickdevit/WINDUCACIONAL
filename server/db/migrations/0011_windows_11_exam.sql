-- Migration 0011: Prova do Módulo Windows 11 (Nível Fácil)
-- Baseada nas apostilas do curso Windows 11 (Introdução, Aplicativos I e II, Edge, Explorador I e II, Personalização, Acessibilidade I e II e Barra de Tarefas).

INSERT INTO exams (
  id,
  turma_id,
  title,
  description,
  container_initial_state,
  time_limit,
  is_published,
  active,
  created_at,
  updated_at
) VALUES (
  'e1100000-0000-4000-a000-000000000011',
  NULL,
  'Prova: Módulo Windows 11',
  'Avaliação teórica introdutória sobre os principais conceitos do Windows 11 com base nas apostilas do curso: Introdução ao Windows 11, Aplicativos, Microsoft Edge, Explorador de Arquivos, Personalização do Sistema, Acessibilidade e Barra de Tarefas.',
  '{}'::jsonb,
  30,
  TRUE,
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  time_limit = EXCLUDED.time_limit,
  is_published = TRUE,
  active = TRUE,
  updated_at = NOW();

-- Questão 1: Introdução ao Windows 11 (Apostila 1)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000001',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'No Windows 11, qual elemento da interface fica posicionado de forma centralizada por padrão na Barra de Tarefas?',
  '["A Lixeira do sistema", "O Menu Iniciar", "O Painel de Controle", "O relógio e a data"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  1
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 2: Aplicativos Parte I (Apostila 2 - Bloco de Notas)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000002',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual aplicativo nativo do Windows 11 é um editor de texto simples, ideal para anotações rápidas e que salva arquivos com a extensão .txt?',
  '["Bloco de Notas", "Calculadora", "Microsoft Edge", "Paint"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  2
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 3: Microsoft Edge (Apostila 3)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000003',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual é o navegador de Internet padrão desenvolvido pela Microsoft e integrado ao Windows 11?',
  '["Explorador de Arquivos", "Bloco de Notas", "Microsoft Edge", "Outlook"]'::jsonb,
  'c',
  '[]'::jsonb,
  1,
  0,
  3
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 4: Explorador de Arquivos Parte I (Apostila 4 - Unidades de medida)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000004',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Na informática básica, quantos bits formam 1 Byte (quantidade necessária para representar um caractere no computador)?',
  '["2 bits", "4 bits", "16 bits", "8 bits"]'::jsonb,
  'd',
  '[]'::jsonb,
  1,
  0,
  4
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 5: Explorador de Arquivos Parte II (Apostila 5 - Lixeira)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000005',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Para onde vão temporariamente os arquivos excluídos do computador, permitindo que eles sejam restaurados caso necessário?',
  '["Lixeira", "Barra de Tarefas", "Área de Transferência", "Menu Iniciar"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  5
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 6: Personalizando o Sistema (Apostila 6 - Plano de fundo e temas)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000006',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Em qual seção das Configurações do Windows 11 é possível alterar o plano de fundo (papel de parede), as cores e os temas da tela?',
  '["Rede e Internet", "Personalização", "Hora e Idioma", "Dispositivos e Impressoras"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  6
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 7: Acessibilidade Parte I (Apostila 7 - Painéis de acessibilidade)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000007',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Nas configurações de Acessibilidade do Windows 11, os recursos são organizados em três categorias principais. Quais são elas?',
  '["Visão, Audição e Interação", "Jogos, Músicas e Filmes", "Arquivos, Pastas e Discos", "Teclado, Mouse e Monitor"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  7
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 8: Aplicativos Parte II (Apostila 8 - Paint)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000008',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual programa tradicional do Windows permite criar desenhos, recortar imagens e pintar usando formas geométricas básicas?',
  '["Microsoft To Do", "Outlook", "Paint", "Bloco de Notas"]'::jsonb,
  'c',
  '[]'::jsonb,
  1,
  0,
  8
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 9: Barra de Tarefas (Apostila 10 - Relógio, data e calendário)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000009',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Em qual local da Barra de Tarefas ficam situados o relógio do sistema e a data, permitindo abrir o calendário com um clique?',
  '["No canto inferior esquerdo", "No canto inferior direito", "No topo da Área de Trabalho", "Centralizado junto ao Menu Iniciar"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  9
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 10: Acessibilidade Parte II (Apostila 11 - Narrador do Windows)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000010',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual ferramenta de acessibilidade do Windows 11 realiza a leitura em voz alta do conteúdo exibido na tela para auxiliar pessoas com deficiência visual?',
  '["Gravador de Passos", "Gerenciador de Tarefas", "Lupa", "Narrador"]'::jsonb,
  'd',
  '[]'::jsonb,
  1,
  0,
  10
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 11: Snap Layout (Apostila 1 - Introdução ao Windows 11)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000011',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'O que é o recurso Snap Layout no Windows 11 e qual é a sua principal função?',
  '["Um recurso para desenhar formas geométricas no Paint", "Uma ferramenta de organização que ajuda a dividir e posicionar janelas na tela com facilidade", "Um antivírus integrado que remove arquivos da Lixeira", "Um reprodutor de vídeos e músicas"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  11
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 12: Como acionar o Snap Layout (Apostila 1 - Introdução ao Windows 11)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000012',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Como o usuário pode abrir o menu flutuante com as opções de Snap Layout em uma janela?',
  '["Posicionando o ponteiro do mouse sobre o botão Maximizar/Restaurar da janela", "Clicando duas vezes na Lixeira", "Pressionando a tecla Esc dez vezes", "Desligando o monitor do computador"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  12
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 13: Personalização da Área de Trabalho (Apostila 6 - Personalizando o Sistema)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000013',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Na personalização da tela de fundo da Área de Trabalho, qual opção permite alternar automaticamente várias fotos de uma pasta ao longo do tempo?',
  '["Cor sólida", "Imagem única", "Apresentação de slides", "Bloqueio de tela"]'::jsonb,
  'c',
  '[]'::jsonb,
  1,
  0,
  13
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 14: Modos de Cores do Sistema (Apostila 6 - Personalizando o Sistema)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000014',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Ao personalizar as cores do Windows 11, quais são os três modos de cores disponíveis para o sistema e aplicativos?',
  '["Claro, Escuro e Personalizado", "Azul, Vermelho e Amarelo", "Econômico, Turbo e Silencioso", "Manhã, Tarde e Noite"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  14
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 15: Personalização do Microsoft Edge - Layouts (Apostila 3 - Microsoft Edge)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000015',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Ao personalizar a página inicial do navegador Microsoft Edge, quais são as opções de layout que o usuário pode escolher?',
  '["Em foco, Inspirador, Informativo e Personalizado", "Rápido, Médio, Lento e Parado", "Desenho, Pintura, Escultura e Foto", "Word, Excel, PowerPoint e Access"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  15
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 16: Buscador Padrão do Microsoft Edge (Apostila 3 - Microsoft Edge)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000016',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual é o motor de busca (buscador) padrão integrado ao Microsoft Edge para pesquisar sites, notícias e imagens na Internet?',
  '["Bing", "Paint", "Bloco de Notas", "Lixeira"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  16
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 17: Personalização do Bloco de Notas (Apostila 2 - Aplicativos Parte I)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000017',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Como o usuário pode alterar o tema (Claro ou Escuro) e o estilo de fonte dentro do Bloco de Notas no Windows 11?',
  '["Clicando no ícone de engrenagem (Configurações) no canto superior direito do aplicativo", "Excluindo o arquivo de texto", "Pressionando o botão de desligar do computador", "Abrindo a calculadora do sistema"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  17
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 18: Barra de Tarefas - Fixar Aplicativos (Apostila 10 - Barra de Tarefas)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000018',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'O que acontece quando você escolhe a opção \"Fixar na barra de tarefas\" em um aplicativo no Windows 11?',
  '["O aplicativo é desinstalado do computador", "É criado um atalho permanente do aplicativo na Barra de Tarefas para acesso rápido", "O computador é reiniciado imediatamente", "O aplicativo passa a abrir somente no Bloco de Notas"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  18
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 19: Widgets no Windows 11 (Apostila 10 - Barra de Tarefas)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000019',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual recurso da Barra de Tarefas permite acompanhar rapidamente previsões do clima, notícias recentes e informações úteis do dia?',
  '["Widgets", "Prompt de Comando", "Desfragmentador de Disco", "Lixeira"]'::jsonb,
  'a',
  '[]'::jsonb,
  1,
  0,
  19
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;

-- Questão 20: Gerenciamento de Tarefas com Microsoft To Do (Apostila 8 - Aplicativos Parte II)
INSERT INTO exam_questions (
  id,
  exam_id,
  type,
  text,
  options,
  correct_answer,
  validation_rules,
  points,
  time_limit,
  order_index
) VALUES (
  'e1100000-0000-4000-a000-000000000020',
  'e1100000-0000-4000-a000-000000000011',
  'mcq',
  'Qual aplicativo da Microsoft incluído no Windows 11 é dedicado à criação e organização de listas de tarefas para o dia a dia?',
  '["Paint", "Microsoft To Do", "Bloco de Notas", "Calculadora"]'::jsonb,
  'b',
  '[]'::jsonb,
  1,
  0,
  20
) ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index;
