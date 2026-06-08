# Evita o download do Chromium pelo puppeteer (devDependency usada apenas em
# testes). Esse postinstall é o ponto mais frágil do build em Docker: depende
# de rede externa e de libs glibc que não existem no node:20-alpine (musl).
FROM node:20-alpine AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Copia o manifesto e, se existir, o lockfile. Usamos `npm install` (e não
# `npm ci`) de propósito: `npm ci` aborta o build em qualquer divergência entre
# package.json e package-lock.json, enquanto `npm install` reconcilia o lockfile
# e instala mesmo com drift, mantendo o build reprodutível sem exigir sync exato.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
COPY --from=build /app/src/reducers/dir.json ./src/reducers/dir.json
COPY --from=build /app/src/containers/applications/apps/booklets/library ./src/containers/applications/apps/booklets/library
RUN mkdir -p /app/data
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start"]
