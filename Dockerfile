# API image. Build from the repo root:  docker build -t cricket-api .
FROM node:22-bookworm-slim AS base
# openssl + ca-certificates: Prisma's query engine needs them on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS build
# 1) Dependencies first, so this layer is cached until a package.json or the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/cricket-engine/package.json packages/cricket-engine/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@cricket/api..."
# 2) Source, then build the shared packages and the API (prisma generate runs inside the api build).
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @cricket/shared build \
    && pnpm --filter @cricket/engine build \
    && pnpm --filter @cricket/api build

FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app/apps/api
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
