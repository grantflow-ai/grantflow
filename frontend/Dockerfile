# Frontend Dockerfile for GrantFlow monorepo
FROM node:22-slim AS base
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS install
WORKDIR /workspace

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy all package.json files for workspace resolution
COPY frontend/package.json ./frontend/
COPY editor/package.json ./editor/

# Copy source files (needed for editor postinstall build)
COPY editor ./editor
COPY frontend ./frontend

# Install dependencies (skip scripts to avoid postinstall issues during Docker build)
RUN pnpm install --filter ./frontend --filter ./editor --no-frozen-lockfile --ignore-scripts

# Build editor manually (since we skipped postinstall)
WORKDIR /workspace/editor
RUN pnpm run build

# Build the frontend
WORKDIR /workspace/frontend

# Build arguments for environment variables
ARG RESEND_API_KEY
ARG NEXT_PUBLIC_BACKEND_API_BASE_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_SITE_URL

# Set environment variables for build
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV NEXT_PUBLIC_BACKEND_API_BASE_URL=$NEXT_PUBLIC_BACKEND_API_BASE_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID=$NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build with increased memory
ARG NODE_OPTIONS="--max-old-space-size=4096"
RUN NODE_OPTIONS="${NODE_OPTIONS}" pnpm run build

# Production dependencies stage
FROM base AS production-deps
WORKDIR /workspace

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy package files for workspace structure
COPY frontend/package.json ./frontend/
COPY editor/package.json ./editor/

# Install production dependencies for frontend (this will also install editor as it's a workspace dependency)
RUN pnpm install --filter ./frontend --prod --no-frozen-lockfile --ignore-scripts

# Production runtime stage
FROM base AS app
ARG NODE_ENV=production
ARG PORT=3000
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=${PORT}

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy the built Next.js standalone files (self-contained)
COPY --from=install --chown=nodejs:nodejs /workspace/frontend/.next/standalone ./
COPY --from=install --chown=nodejs:nodejs /workspace/frontend/.next/static ./.next/static
COPY --from=install --chown=nodejs:nodejs /workspace/frontend/public ./public

# Copy built editor dist folder
COPY --from=install --chown=nodejs:nodejs /workspace/editor/dist ./editor/dist

# Copy workspace structure for proper module resolution
COPY --from=production-deps --chown=nodejs:nodejs /workspace/package.json ./package.json
COPY --from=production-deps --chown=nodejs:nodejs /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=production-deps --chown=nodejs:nodejs /workspace/frontend/package.json ./frontend/package.json
COPY --from=production-deps --chown=nodejs:nodejs /workspace/editor/package.json ./editor/package.json
COPY --from=production-deps --chown=nodejs:nodejs /workspace/node_modules ./node_modules

USER nodejs
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "import('http').then(http => http.get('http://localhost:${PORT}/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "frontend/server.js"]
