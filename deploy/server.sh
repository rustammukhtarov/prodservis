#!/usr/bin/env bash
# Установка или обновление сайта на сервере (Ubuntu 24.04). Запускается из GitHub Actions.
# Код приходит архивом /tmp/prodservis-release/site.tgz; .env и данные (тома Docker) сохраняются.
set -euo pipefail

APP_DIR="$HOME/prodservis"
RELEASE=/tmp/prodservis-release/site.tgz
export DEBIAN_FRONTEND=noninteractive

log() { echo "==> $*"; }

# 1. Docker из репозитория Ubuntu (download.docker.com из России доступен не всегда).
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  log "Устанавливаю Docker"
  apt-get update -q
  apt-get install -y -q docker.io docker-compose-v2 openssl
  systemctl enable --now docker
fi

# 2. Файл подкачки: сборке сайта нужно больше памяти, чем есть на небольшом сервере.
if ! swapon --show | grep -q .; then
  log "Создаю файл подкачки 4 ГБ"
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 3. Новая версия кода, .env переносится из прошлой.
log "Распаковываю новую версию"
NEW_DIR="$APP_DIR.new"
rm -rf "$NEW_DIR" && mkdir -p "$NEW_DIR"
tar -xzf "$RELEASE" -C "$NEW_DIR"
[ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$NEW_DIR/.env"
rm -rf "$APP_DIR.old"
[ -d "$APP_DIR" ] && mv "$APP_DIR" "$APP_DIR.old"
mv "$NEW_DIR" "$APP_DIR"
cd "$APP_DIR"

# 4. .env: пароли создаются один раз и дальше не меняются.
if [ ! -f .env ]; then
  log "Создаю .env со случайными паролями"
  {
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
    echo "PAYLOAD_SECRET=$(openssl rand -hex 32)"
  } > .env
  chmod 600 .env
fi
# Домен и адрес сайта — из настроек выкладки; без домена сайт работает по http://IP.
IP=$(hostname -I | awk '{print $1}')
if [ -n "${SITE_DOMAIN:-}" ]; then DOMAIN="$SITE_DOMAIN"; URL="https://$SITE_DOMAIN"; else DOMAIN=":80"; URL="http://$IP"; fi
sed -i '/^SITE_DOMAIN=/d;/^NEXT_PUBLIC_SERVER_URL=/d' .env
echo "SITE_DOMAIN=$DOMAIN" >> .env
echo "NEXT_PUBLIC_SERVER_URL=$URL" >> .env

# 5. Сборка и запуск. Миграции базы применяются при старте сайта.
log "Собираю и запускаю ($URL)"
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f >/dev/null

log "Жду ответа сайта"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1/api/globals/site-settings" -H "Host: ${SITE_DOMAIN:-$IP}" 2>/dev/null \
    || docker compose -f docker-compose.prod.yml exec -T app wget -qO- http://127.0.0.1:3000/api/globals/site-settings >/dev/null 2>&1; then
    log "Сайт работает: $URL  (админка: $URL/admin)"
    rm -rf "$APP_DIR.old" /tmp/prodservis-release
    exit 0
  fi
  sleep 5
done
docker compose -f docker-compose.prod.yml logs --tail 80 app
echo "Сайт не ответил за 5 минут" >&2
exit 1
