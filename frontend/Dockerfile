FROM node:22-slim AS base
RUN corepack enable
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_OPTIONS=${NODE_OPTIONS}
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS install
WORKDIR /app

COPY .npmrc pnpm-workspace.yaml package.json tsconfig.json ./
COPY frontend/package.json frontend/tsconfig.json ./frontend/
COPY editor/package.json editor/tsconfig.json ./editor/
RUN pnpm install -r --ignore-scripts

FROM install AS build
WORKDIR /app
# Required build args
ARG NEXT_PUBLIC_BACKEND_API_BASE_URL
ARG NEXT_PUBLIC_CRDT_SERVER_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_SITE_URL

# Optional build args with defaults
ARG NEXT_PUBLIC_DEBUG=false

ENV NEXT_PUBLIC_BACKEND_API_BASE_URL=$NEXT_PUBLIC_BACKEND_API_BASE_URL
ENV NEXT_PUBLIC_CRDT_SERVER_URL=$NEXT_PUBLIC_CRDT_SERVER_URL
ENV NEXT_PUBLIC_DEBUG=$NEXT_PUBLIC_DEBUG
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID=$NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY frontend/next.config.ts frontend/postcss.config.mjs ./frontend/
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
COPY editor/src ./editor/src
COPY editor/vite.config.ts editor/postcss.config.mjs ./editor/
# Build editor package first (required by frontend)
RUN cd editor && pnpm build
# Then build frontend
RUN cd frontend && pnpm build

FROM base AS app
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy standalone build
COPY --from=build --chown=nodejs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=nodejs:nodejs /app/frontend/public ./frontend/public

USER nodejs
EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "frontend/server.js"]
