# Продсервис: сборка и запуск сайта (Next.js + Payload) в контейнере.
# Образы берутся с зеркала Google: Docker Hub часто недоступен с российских серверов.
FROM mirror.gcr.io/library/node:22-alpine AS base
# pnpm скачивается один раз в общий слой образа; дальше сеть для него не нужна.
ENV COREPACK_HOME=/usr/local/share/corepack
RUN apk add --no-cache libc6-compat && corepack enable && \
    for i in 1 2 3 4 5; do corepack prepare pnpm@10.28.0 --activate && break || sleep 10; done && \
    chmod -R a+rX /usr/local/share/corepack
ENV COREPACK_ENABLE_NETWORK=0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.fetch-retries=5 --config.fetch-timeout=120000

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Во время сборки база не нужна: страницы с данными собираются при запросе.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
RUN PAYLOAD_SECRET=build-only DATABASE_URL=postgres://build:build@localhost:5432/build pnpm build

FROM mirror.gcr.io/library/node:22-alpine AS runner
# Только собранный сайт (standalone): сборка идёт в GitHub Actions, серверу не нужны ни pnpm, ни исходники.
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 NODE_OPTIONS=--no-deprecation
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
# Каталоги загрузок — тома (см. docker-compose.prod.yml).
RUN mkdir -p media private-uploads private-imports && chown -R app:app media private-uploads private-imports
USER app
EXPOSE 3000
CMD ["node", "server.js"]
