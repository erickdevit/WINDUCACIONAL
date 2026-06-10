# winducacional-web

Novo frontend do Simulador ITB: React 19 + TypeScript + Vite, Tailwind CSS,
React Router v7 e Redux Toolkit (RTK Query) consumindo a API Rails em
`winducacional-api`.

## Estrutura

```
src/
├── api/         # configuração base do RTK Query (baseApi)
├── app/         # store Redux e hooks tipados
├── components/  # componentes de UI e layout reutilizáveis
├── features/    # endpoints RTK Query por domínio (auth, ...)
├── pages/       # telas da aplicação
├── router/      # definição das rotas (React Router)
├── test/        # utilitários de teste
├── types/       # tipos TypeScript compartilhados
└── utils/       # funções utilitárias
```

## Desenvolvimento

```bash
npm install
npm run dev
```

O Vite roda em `http://localhost:5173` e faz proxy de `/api` e `/cable`
para a API Rails em `http://localhost:3002` (ver `vite.config.ts`).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — type-check (`tsc -b`) + build de produção
- `npm run lint` — ESLint
- `npm run test` — testes (Vitest + Testing Library)
