# Выкладка на сервер

Один и тот же порядок для арендованного VPS (тестовый стенд) и для своего сервера.

## 1. Сервер
- Ubuntu 24.04, от 2 ядер и 4 ГБ памяти для теста (для рабочего — 4 ядра, 8 ГБ, SSD от 200 ГБ).
- Домен (поддомен) направлен A-записью на IP сервера; открыты порты 80 и 443.
- Установлены Docker и git: `curl -fsSL https://get.docker.com | sh`.

## 2. Первый запуск
```bash
git clone git@github.com:rustammukhtarov/prodservis.git ~/prodservis   # через deploy key
cd ~/prodservis
cp .env.example .env    # заполнить POSTGRES_PASSWORD, PAYLOAD_SECRET, SITE_DOMAIN, NEXT_PUBLIC_SERVER_URL
docker compose -f docker-compose.prod.yml up -d --build
```
Схема базы создаётся миграциями при запуске. Первый вход в админку `https://<домен>/admin` предложит создать администратора.

## 3. Автовыкладка из GitHub
В репозитории: Settings → Secrets and variables → Actions:
- секреты `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`;
- переменная `DEPLOY_ENABLED` = `true`.
После этого каждое изменение в `main` проверяется и выкладывается само.

## 4. Тестовые данные
Админка → «Обмен» → «Импорт из Excel» → загрузить `docs/Продсервис_импорт_тестовые_данные.xlsx`.

## 5. Переезд на свой сервер
`docker compose exec db pg_dump -U prodservis prodservis > backup.sql` + копия томов `media`, `private-uploads`;
на новом сервере — шаги 1–2, затем восстановление дампа и файлов.
