# Visão Do Produto

## Objetivo

Construir o WINDUCACIONAL, um simulador educacional aberto que use uma interface inspirada em desktop para organizar experiências de aprendizagem, cenários guiados, ferramentas simuladas e progresso do usuário.

## Baseline Atual

A base atual é uma aplicação React/Vite/Redux com backend Express, PostgreSQL, autenticação por sessão HTTP-only, turmas, usuários com papéis e discos virtuais persistidos. A experiência desktop é usada como ambiente visual para atividades educacionais.

## Direção

O novo produto deve deixar de ser apenas uma réplica visual e passar a ser uma plataforma de simulação. A interface desktop deve ser usada como ambiente para atividades educacionais, com contexto, progresso, usuários e dados persistentes.

## Escopo Inicial

- Preservar a experiência de janelas e aplicativos enquanto o domínio educacional evolui.
- Manter documentação, segurança, testes e deploy atualizados junto das mudanças estruturais.
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

- Migrar todo o visual ou reescrever a aplicação sem especificação de produto.
