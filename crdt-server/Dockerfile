FROM node:22-slim AS base
RUN corepack enable

FROM base AS install
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json tsconfig.json ./
COPY crdt-server/package.json crdt-server/tsconfig.json crdt-server/vite.config.ts ./crdt-server/
RUN pnpm install -r --ignore-scripts

FROM install AS build
WORKDIR /app
COPY crdt-server/src ./crdt-server/src
RUN cd crdt-server && pnpm run build

FROM base AS app
ARG PORT=8080
WORKDIR /app

RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /app/crdt-server/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/crdt-server/package.json ./package.json
COPY .npmrc crdt-server/package.json ./

ENV NODE_ENV=production

RUN pnpm install

USER nodejs
ENV PORT=$PORT

CMD ["node", "dist/index.js"]
