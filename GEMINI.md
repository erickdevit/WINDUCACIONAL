# Diretrizes do Projeto

## Autenticação em Aplicativos

Todos os novos aplicativos que necessitarem identificar o usuário logado devem:

1. Utilizar o estado global do Redux (`state.setting.person`) para obter informações como nome, username e cargo (role).
2. Sincronizar automaticamente com o usuário autenticado no simulador.
3. Utilizar os endpoints da API que já validam a sessão via cookies.

## Ranking

Aplicativos com sistema de pontuação devem oferecer:

1. Ranking Global: Melhores pontuações de todos os usuários do simulador.
2. Ranking por Turma: Melhores pontuações apenas dos usuários que pertencem à mesma turma do usuário atual.
