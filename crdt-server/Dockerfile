FROM node:22-slim AS base
RUN corepack enable

FROM base AS install
WORKDIR /app

COPY .npmrc pnpm-workspace.yaml package.json tsconfig.json ./
COPY crdt-server/package.json crdt-server/tsconfig.json crdt-server/tsup.config.ts ./crdt-server/
RUN pnpm install -r --ignore-scripts

FROM install AS build
WORKDIR /app

COPY crdt-server/src ./crdt-server/src
RUN cd crdt-server && pnpm run build

FROM base AS app
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /app/crdt-server/dist ./crdt-server/dist
COPY --from=build --chown=nodejs:nodejs /app/crdt-server/node_modules ./crdt-server/node_modules
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/crdt-server/package.json ./crdt-server/package.json
COPY --from=build --chown=nodejs:nodejs /app/.npmrc ./

USER nodejs
ENV NODE_ENV=production
ENV PORT=1234
ENV CRDT_SERVER_NAME=crdt-server
EXPOSE 1234
CMD ["node", "crdt-server/dist/index.js"]
