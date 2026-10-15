# Продсервис: сборка и запуск сайта (Next.js + Payload) в контейнере.
# Образы берутся с зеркала Google: Docker Hub часто недоступен с российских серверов.
FROM mirror.gcr.io/library/node:22-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Во время сборки база не нужна: страницы с данными собираются при запросе.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
RUN PAYLOAD_SECRET=build-only DATABASE_URL=postgres://build:build@localhost:5432/build pnpm build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
COPY --from=builder --chown=app:app /app ./
# Каталоги загрузок — тома (см. docker-compose.prod.yml).
RUN mkdir -p media private-uploads private-imports && chown -R app:app media private-uploads private-imports
USER app
EXPOSE 3000
CMD ["pnpm", "start"]
