FROM node:22-slim AS base
RUN corepack enable

FROM base AS install
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json tsconfig.json ./
COPY crdt/package.json crdt/tsconfig.json crdt/vite.config.ts ./crdt/
RUN pnpm install -r --ignore-scripts

FROM install AS build
WORKDIR /app
COPY crdt/src ./crdt/src
RUN cd crdt && pnpm run build

FROM base AS app
ARG PORT=8080
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /app/crdt/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/crdt/package.json ./package.json
COPY .npmrc crdt/package.json ./

RUN pnpm install

ENV NODE_ENV=production

USER nodejs
ENV PORT=$PORT
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "import('http').then(http => http.get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
