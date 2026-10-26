#!/usr/bin/env bash
# Установка или обновление сайта на сервере (Ubuntu 24.04). Запускается из GitHub Actions.
# Код приходит архивом /tmp/prodservis-release/site.tgz; .env и данные (тома Docker) сохраняются.
set -euo pipefail

# Полный журнал — на сервере; при ошибке хвост журнала уходит в отчёт GitHub Actions (аннотация).
LOG=/root/prodservis-deploy.log
: > "$LOG"
exec > >(tee -a "$LOG") 2>&1
report_failure() {
  local code=$?
  sleep 1
  {
    [ -d "$HOME/prodservis" ] && cd "$HOME/prodservis" && docker compose -f docker-compose.prod.yml ps 2>/dev/null
    [ -d "$HOME/prodservis" ] && docker compose -f docker-compose.prod.yml logs --tail 30 app 2>/dev/null
  } >> "$LOG" 2>&1 || true
  echo "::error title=Выкладка не удалась (код $code)::$(tail -n 60 "$LOG" | sed 's/%/%25/g' | sed ':a;N;$!ba;s/\n/%0A/g')"
}
trap report_failure ERR

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

# 1a. Защита сервера (повторяет cloud-init на случай, если он не применился).
if [ ! -f /etc/ssh/sshd_config.d/01-prodservis.conf ]; then
  log "Включаю вход только по ключу"
  # Файл с именем 01-… читается раньше 50-cloud-init.conf, а в sshd действует первое значение.
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/01-prodservis.conf
  sshd -t && systemctl reload ssh
fi
if ! systemctl is-active --quiet fail2ban; then
  log "Включаю защиту от подбора пароля (fail2ban)"
  apt-get install -y -q fail2ban
  printf '[sshd]\nenabled = true\nmaxretry = 5\nbantime = 1h\n' > /etc/fail2ban/jail.d/sshd.local
  systemctl enable --now fail2ban
fi
if ! ufw status | grep -q 'Status: active'; then
  log "Включаю брандмауэр: открыты 22, 80, 443"
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
  ufw default deny incoming && ufw default allow outgoing
  ufw --force enable
fi

# 2. Файл подкачки — запас памяти на небольшом сервере.
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
if [ -n "${SITE_DOMAIN:-}" ]; then
  DOMAIN="$SITE_DOMAIN"; URL="https://$SITE_DOMAIN"; CADDY_TLS=""
else
  # Без домена — только http://IP (HTTPS по голому IP браузеры и Caddy толком не поддерживают).
  DOMAIN=":80"; URL="http://$IP"; CADDY_TLS=""
fi
sed -i '/^SITE_DOMAIN=/d;/^NEXT_PUBLIC_SERVER_URL=/d;/^CADDY_TLS=/d' .env
echo "SITE_DOMAIN=$DOMAIN" >> .env
echo "NEXT_PUBLIC_SERVER_URL=$URL" >> .env
echo "CADDY_TLS=$CADDY_TLS" >> .env
# Переменные окружения важнее .env, поэтому выставляем их явно (пустой SITE_DOMAIN из выкладки иначе перекроет файл).
export SITE_DOMAIN="$DOMAIN" NEXT_PUBLIC_SERVER_URL="$URL" CADDY_TLS="$CADDY_TLS"

# 5. Запуск готового образа (собран в GitHub Actions). Миграции базы применяются при старте сайта.
log "Загружаю образ сайта"
docker load -i /tmp/prodservis-release/image.tgz
log "Запускаю ($URL)"
docker compose -f docker-compose.prod.yml up -d --no-build --remove-orphans
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
