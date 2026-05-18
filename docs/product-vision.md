# Visão Do Produto

## Objetivo

Construir um simulador educacional aberto que use uma interface inspirada em desktop para organizar experiências de aprendizagem, cenários guiados, ferramentas simuladas e progresso do usuário.

## Baseline Atual

A base atual é o Win11React: uma experiência visual de Windows 11 feita com React, Redux, SCSS e assets estáticos. Ela oferece uma boa fundação de interface para janelas, aplicativos, menus e interações de desktop, mas ainda não possui backend, banco de dados ou modelo educacional próprio.

## Direção

O novo produto deve deixar de ser apenas uma réplica visual e passar a ser uma plataforma de simulação. A interface desktop deve ser usada como ambiente para atividades educacionais, com contexto, progresso, usuários e dados persistentes.

## Escopo Inicial

- Preservar a experiência frontend existente enquanto o novo domínio é especificado.
- Documentar arquitetura, segurança, testes e deploy antes de implementar backend.
- Identificar riscos técnicos da base atual que precisam ser tratados durante a evolução.

## Escopo Futuro

- Usuários e autenticação.
- Isolamento de disco virtual por aluno.
- Administração de usuários por professores.
- Perfil, progresso e histórico de atividades.
- Cenários educacionais versionados.
- Persistência em PostgreSQL.
- Armazenamento persistente em diretório dedicado para arquivos do simulador.
- Deploy em servidor dedicado via Docker.

## Fora De Escopo Por Enquanto

- Implementar backend imediatamente.
- Criar schema de banco definitivo.
- Criar Dockerfile e Compose antes da decisão de runtime/backend.
- Migrar todo o visual ou reescrever a aplicação sem especificação de produto.
