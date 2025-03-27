FROM node:22-slim AS base
RUN npm install -g pnpm

FROM base AS install
WORKDIR /app/
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM install AS build
WORKDIR /app/
COPY src src
COPY next.config.ts tsconfig.json postcss.config.mjs next-env.d.ts ./
RUN mkdir -p public
RUN pnpm run build

FROM base AS app
WORKDIR /app/
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
ARG PORT=3000
ARG NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"
EXPOSE $PORT
USER nextjs
CMD ["pnpm", "start"]
