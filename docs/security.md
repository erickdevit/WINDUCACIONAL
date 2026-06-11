# Segurança

## Princípios

- Segurança deve ser padrão, não ajuste posterior.
- Qualquer dado vindo do usuário, URL, `localStorage`, API externa ou arquivo persistente deve ser tratado como não confiável.
- Segredos nunca devem ir para o bundle frontend, assets públicos ou repositório.
- A API Rails deve centralizar validação, autorização, auditoria e acesso a dados.
- Toda exceção de segurança deve ser documentada com motivo, impacto e plano de remoção.

## Riscos Atuais Observados

- `src/reducers/apps.js` usa `window.open` com payload de action.
- Vários reducers e utilitários leem `localStorage` diretamente e assumem formato válido.
- `public/dycalendar.js` manipula `innerHTML` diretamente.
- A aplicação carrega scripts estáticos em `index.html`, e cabeçalhos de segurança de produção ainda não estão definidos no repositório.
- O cadastro público de aluno usa código de turma e ainda precisa de rate limit e monitoramento antes de uso com dados reais.

O comando `eval` legado do terminal foi removido durante a primeira implementação de autenticação. Os demais pontos devem ser tratados antes de usar a aplicação com dados reais de usuários.

## Requisitos Para Frontend

- Evitar `eval`, `new Function`, string timers e execução dinâmica de código.
- Evitar `dangerouslySetInnerHTML`; quando inevitável, sanitizar com biblioteca revisada e centralizar o uso.
- Validar e normalizar dados lidos de `localStorage`.
- Links externos e novas janelas devem usar proteções contra opener, como `rel="noopener noreferrer"`, e uma política clara de URLs permitidas.
- Dados de API devem ser renderizados por JSX normal sempre que possível.
- Variáveis expostas ao frontend devem ser consideradas públicas.
- PWA/service worker deve ter política clara de cache para não expor dados sensíveis.
- Frontend pode ocultar opções, mas nunca deve ser a única barreira de autorização.

## Requisitos Para Backend Rails

- Validar entrada em todas as rotas.
- Usar queries parametrizadas ou ORM seguro para PostgreSQL.
- Aplicar autorização por recurso, não apenas por rota.
- Garantir que alunos só acessem o próprio disco virtual.
- Permitir acesso a discos de alunos apenas a usuários com papel `professor`.
- Manter secretaria em modo somente leitura para `/api/fs/tree`.
- Validar que cada home persistida em disco virtual seja um objeto antes de gravar `disk.json`.
- Usar IDs públicos não previsíveis para recursos expostos.
- Definir CORS restrito para origens conhecidas.
- Aplicar rate limit em login, endpoints sensíveis e operações caras.
- Criar o primeiro professor pelo fluxo `/api/bootstrap`, protegido por `BOOTSTRAP_TOKEN` em produção; não reintroduzir seed automático `Admin`/`Admin` na nova stack.
- Registrar eventos relevantes sem gravar senhas, tokens ou dados sensíveis em logs.
- Tratar erros sem vazar stack trace em produção.
- Canais em tempo real, como SSE, devem reutilizar a sessão HTTP-only, validar autorização antes de abrir a conexão e não aceitar parâmetros de aluno como fonte de permissão.
- Notificações em tempo real devem ser enviadas somente para usuários autorizados a receber o evento. Mensagens de chat não devem ser notificadas para o próprio remetente, e convites PVP devem carregar apenas dados públicos do desafiante.
- Geração de imagens deve passar pelo backend autenticado. O frontend nunca deve receber `IMAGEGEN_API_TOKEN`; prompts enviados por usuários devem ser tratados como entrada não confiável e erros do provedor externo não devem vazar segredos.
- A classificação Kids/Normal deve ser derivada da turma no backend. O frontend não pode escolher livremente o tipo de aluno durante cadastro público ou edição de usuário vinculado a turma.
- Nomes completos podem ser autoformatados no frontend, mas a normalização final deve ocorrer no backend antes de persistir usuário ou snapshot de avaliação.
- Frequência de alunos deve ser registrada no backend a partir da sessão autenticada, nunca por envio livre de `userId` pelo frontend. Alunos só podem consultar o próprio histórico, e relatórios por turma/período são restritos a professores.
- Dias e horários de aula usados pela Frequência devem vir da agenda da turma persistida no backend; o frontend não pode enviar livremente dias esperados para alterar presença ou ausência.
- Apostilas em PDF devem ser servidas pelo backend a partir do catálogo escaneado no diretório interno do app. O cliente recebe IDs seguros, nunca caminhos de arquivo; alunos só podem abrir módulos liberados em `booklet_module_access` ou concedidos diretamente ao próprio usuário em `booklet_student_module_access`, enquanto professores podem ver e configurar todos os módulos.
- Configurações e rankings do game de digitação devem ser separados das lições, reutilizando autorização por sessão e filtro de turma/tipo no backend.
- O PVP de digitação deve manter convites, salas e histórico restritos à turma autorizada. A finalização calcula vencedor e placar no servidor a partir do progresso sincronizado da sala e ignora placares enviados pelo cliente; a validação autoritativa de cada palavra digitada ainda é dívida de segurança antes de uso competitivo real.
- O app Avaliação deve corrigir notas no backend. O cliente pode enviar respostas e snapshot do container prático, mas não pode enviar `isCorrect`, pontuação concedida, resposta correta ou regras de validação como autoridade. Alunos só podem abrir e enviar provas publicadas e atribuídas ao próprio usuário.
- Mudança de versão da build invalida sessões no banco e força limpeza de caches no cliente; esse fluxo não deve expor tokens nem depender de dados sensíveis em `localStorage`.

## Requisitos Para PostgreSQL

- Usar usuário de banco com privilégios mínimos.
- Rodar migrations versionadas.
- Nunca construir SQL por concatenação com entrada do usuário.
- Planejar backup, restore e retenção antes de produção.
- Separar dados sensíveis e aplicar hash forte para senhas, se houver autenticação local.

## Requisitos Para Arquivos Persistentes

- Validar nome, tipo, tamanho e extensão de arquivos.
- Evitar path traversal e nunca confiar em caminhos enviados pelo cliente.
- Separar arquivos por usuário/tenant quando aplicável.
- Armazenar metadados no banco e arquivos no diretório persistente.
- Planejar limpeza, quota e backup.

## Cabeçalhos E Deploy

Em produção, o servidor ou reverse proxy deve definir pelo menos:

- `Content-Security-Policy` compatível com o frontend.
- `X-Content-Type-Options: nosniff`.
- Proteção contra clickjacking via `frame-ancestors` ou política equivalente.
- `Referrer-Policy` restritiva.
- HTTPS no ponto público de entrada.
