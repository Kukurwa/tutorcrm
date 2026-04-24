# TutorCRM — Правила разработки

## Проект

CRM-система для компании-посредника между клиентами и репетиторами. Автоматизация переписки в мессенджерах, воронки заявок, подбора репетиторов, контрактов, комиссий и инвойсов.

- Бизнес-логика: `BUSINESS_LOGIC_Client.pdf`
- ТЗ фронтенд: `TZ_FRONTEND.md`
- ТЗ бэкенд: `TZ_BACKEND.md`
- Роадмап: `docks/ROADMAP.md`
- Чейнджлог: `docks/CHANGELOG.md`
- Telegram-модуль: ждём отдельный документ — в ТЗ помечено placeholder-ами.

## Стек

| Слой           | Технологии                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| Frontend / BFF | Next.js 14+ (App Router, RSC), TypeScript, shadcn/ui + Tailwind, TanStack Query, Zustand |
| API            | Next.js Route Handlers (`app/api/**`) — REST                                     |
| Worker         | Node.js + **BullMQ** (Redis) — инвойсы, SLA, нотификации, ретраи интеграций      |
| Realtime       | Отдельный Node.js-процесс на **Socket.IO** (WS не запускать из App Router)       |
| Мессенджер-сервис | Отдельный процесс(ы) за общим интерфейсом `MessengerAdapter`. WhatsApp / Viber / FB / IG — на Node.js. **Telegram-модуль разрабатывается отдельным разработчиком** и подключится как ещё одна реализация адаптера (см. §7.1 `TZ_BACKEND.md`) |
| БД             | PostgreSQL 16 + **Prisma ORM** (миграции — Prisma Migrate)                       |
| Кэш / Queue    | Redis 7                                                                          |
| Auth           | **NextAuth.js** (credentials), сессии в БД, RBAC                                 |
| Валидация      | **Zod** — единые схемы для API, форм, внешних интеграций                         |
| Хранилище      | S3-совместимое (MinIO в dev) через `@aws-sdk/client-s3`                          |
| Логи           | **pino** (структурированные), единый request-logger; ошибки → Sentry             |
| Аудит          | Таблица `AuditLog` в БД (каждое значимое действие)                               |
| Мониторинг     | Sentry + Prometheus-экспортер                                                    |
| Инфраструктура | Docker + Docker Compose (multi-stage билды)                                      |

Роли: **Admin**, **Dispatcher**, **LeadGen** (см. `TZ_BACKEND.md` §2).

## SOLID

Соблюдать на всех уровнях:

- **S** — один файл/модуль = одна ответственность. Не смешивать роут, бизнес-логику, доступ к БД.
- **O** — интеграции (мессенджеры, платежи, нотификации) через абстрактные интерфейсы. Новый канал = новая реализация, без правки существующего кода.
- **L** — все реализации `MessengerAdapter` (Telegram, WhatsApp, Viber, FB, IG) взаимозаменяемы: работают через единый контракт `IncomingMessage` / `OutgoingMessage`.
- **I** — дробить интерфейсы по назначению: `MessageSender`, `ChannelPublisher`, `SessionManager` — раздельно. Не делать «god-интерфейсов».
- **D** — сервисы зависят от абстракций, не от конкретных SDK мессенджеров / HTTP-клиентов. Все внешние клиенты — через DI.

## Чистая архитектура (монорепо pnpm workspaces)

Репозиторий — монорепо. Основные пакеты:

```
apps/
  web/            — Next.js (App Router): страницы, API-роуты, middleware
  worker/         — Node.js, BullMQ-consumer
  realtime/       — Node.js + Socket.IO
  messenger/      — процессы адаптеров мессенджеров (WhatsApp / Viber / FB / IG); Telegram подключит внешний разработчик
packages/
  db/             — Prisma-схема, клиент, миграции, сиды
  core/           — доменные модели, state machines, сервисы, репозитории
  contracts/      — zod-схемы DTO, типы событий, OpenAPI (опц.)
  ui/             — shadcn/ui + собственные компоненты, Storybook
  integrations/   — абстракции мессенджеров и адаптеры (TG, WA, Viber, FB/IG)
  config/         — конфигурация, чтение env через zod
```

### Next.js (`apps/web`)

```
app/
  (auth)/login/               — страницы без основного layout
  (app)/
    dashboard/
    inbox/
    funnel/
    requests/
    contracts/
    clients/
    tutors/
    leadgen/
    dispatchers/
    scripts/
    settings/
    tasks/
    calendar/
    profile/
  api/v1/{domain}/route.ts    — Route Handlers (тонкие: валидация → вызов core-сервиса)
  layout.tsx, providers.tsx
components/
  ui/                         — shadcn/ui (без бизнес-логики)
  layout/                     — sidebar, topbar, role-guards
  inbox/ funnel/ requests/ ...— компоненты по доменам
  shared/                     — data-table, page-header, empty-state
hooks/                        — клиентская логика (только UI-оркестрация)
lib/
  api-client.ts               — типизованный клиент поверх Route Handlers
  ws-client.ts                — Socket.IO клиент
  utils/, constants/, types/
```

Правила:

- Компоненты `components/ui/` не знают о бизнес-логике.
- Бизнес-логика — в `packages/core`, а не в `hooks/` и не в роутах.
- Страницы (`app/*/page.tsx`) — только композиция компонентов + серверная загрузка данных через RSC или `api-client`.

### API (`apps/web/app/api`)

- Route Handler = **только**: auth → zod-валидация запроса → вызов сервиса из `packages/core` → zod-схема ответа.
- Никаких обращений к Prisma из Route Handler напрямую — только через репозиторий/сервис.
- Ошибки — единый формат `{ error: { code, message, details? } }` через общий хелпер.
- Идемпотентность критических мутаций (публикация, отправка инвойса, назначение) — через `Idempotency-Key` header.

### Core (`packages/core`)

```
domain/
  funnel/           — state machine + правила переходов + unit-тесты
  invoices/
  contracts/
  notifications/
services/
  funnel.service.ts
  request.service.ts
  invoice.service.ts
  assignment.service.ts
  notification.service.ts
repositories/
  *.repository.ts   — инкапсулируют Prisma
events/             — доменные события (шина, WS, BullMQ)
rbac/               — матрица прав, middleware-хелперы
audit/              — логгер аудита
```

- Сервисы не трогают Prisma напрямую — через репозитории.
- Интеграции (`packages/integrations`) — через абстрактные интерфейсы (Strategy / Adapter).
- State machine воронки и инвойсов — чистый TS-код, покрывается unit-тестами.

## CHANGELOG

Файл: `docks/CHANGELOG.md`.

**Записывать после каждого выполненного пункта роадмапа**, не до. Формат:

```
### ГГГГ-ММ-ДД — Краткое описание
- Что конкретно сделано
- Какие файлы/модули затронуты
```

Не писать планы в CHANGELOG. Планы — только в `docks/ROADMAP.md`.

## Логирование

### AuditLog (БД) — каждое значимое действие:

- Создание/изменение/удаление клиентов, лидов, заявок, репетиторов, контрактов, инвойсов.
- Переход заявки по этапам воронки (с причиной, если отказ).
- Изменение ставок комиссии (только admin).
- Отправка / правка суммы / оплата / пропуск инвойса.
- Создание, блокировка, смена роли пользователя.
- Подключение / отключение аккаунтов мессенджеров.
- Публикация заявки в канал, отправка контактов, отправка инвойса.

### Серверные логи (pino):

- Каждый API-запрос через middleware: метод, путь, статус, время, user_id, request_id.
- Все вызовы внешних API (мессенджеры, инвойсинг): request/response, retry, ошибки.
- Ошибки — с полным стеком; продолжение — в Sentry.
- Уровни: error, warn, info, debug.

### Фронтенд:

- Ошибки API — toast.
- Единые состояния на всех экранах: **loading / empty / error / success**.
- Sentry для uncaught JS-ошибок.

## Проверка прав (RBAC)

- Backend: middleware проверяет роль и `ownership` на каждом запросе. Dispatcher видит только свои сущности.
- Frontend: скрывать недоступные разделы и кнопки по роли (не просто disabled).
- Роли: `admin`, `dispatcher`, `leadgen`.
- Матрица прав — в `TZ_BACKEND.md` §2.3; единый источник истины — таблица `permissions` / конфиг в коде (не разбрасывать по местам).
- Изменение ставок комиссии — только admin, всегда через audit_log.

## UI/UX правила

- **shadcn/ui** — единственный UI-кит, не смешивать с другими.
- Формы: **react-hook-form + zod** (одни и те же zod-схемы шарятся с API через `packages/contracts`).
- Серверные данные — **TanStack Query**; клиентский UI-state — **Zustand** (при необходимости).
- Server Components — для чтения тяжёлых списков (клиенты, заявки, контракты). Интерактивный UI (Inbox, Kanban) — Client Components с TanStack Query + WS.
- Даты/валюты — через `Intl.*`, хранение времён — UTC, отображение — в часовом поясе пользователя (по умолчанию Europe/Kyiv).
- Адаптив: desktop-first, от 1280×800. Inbox — 3-колоночный, контекстная панель справа адаптируется к стадии заявки (см. `TZ_FRONTEND.md` §5.5).
- Skeleton-загрузка вместо спиннеров.
- Toast — на каждое действие с изменением состояния.
- Деструктивные действия (отказ, закрытие контракта, удаление) — через ConfirmDialog с пояснением последствий.
- Kanban — drag-n-drop только по разрешённым переходам (см. state machine).

## Интеграции мессенджеров

- Все каналы реализуют единый интерфейс `MessengerAdapter` (receive / send / initiate / publish / register).
- Нормализованные события в ядро: `IncomingMessage`, `ChannelResponse`, `BotCommand`.
- Сессии Userbot — шифруются (envelope), ключ — отдельно от БД.
- Добавление нового мессенджера не должно требовать правок в ядре — только новый адаптер.
- Telegram-модуль — по отдельному документу; в коде заложить точки расширения.

## Docker

Всё окружение — через Docker Compose:

- **web** — Next.js (SSR + API) в prod, `next dev` в dev.
- **worker** — Node.js + BullMQ-consumer.
- **realtime** — Node.js + Socket.IO.
- **messenger** — контейнер(ы) адаптеров: WhatsApp / Viber / FB / IG. Telegram — отдельный контейнер от внешнего разработчика, подключается как ещё один `MessengerAdapter`.
- **postgres**, **redis**, **minio** — инфраструктура.
- **volumes** — персистентные: БД, медиа, сессии Userbot.

Правила:

- Разработка и продакшн — через Docker, без локальных зависимостей.
- `docker-compose.yml` — основной, `docker-compose.override.yml` — локальный.
- Multi-stage `Dockerfile` для каждого `apps/*` (deps → build → run).
- `.dockerignore` исключает `node_modules`, `.git`, `.env`, `.next`.
- Переменные окружения — через `.env` (не коммитить); чтение через zod-валидацию в `packages/config`.
- **Prisma Migrate** — автозапуск `prisma migrate deploy` при старте контейнера `web`.

## Git

- Осмысленные коммиты; привязка к пункту роадмапа в описании желательна.
- Не коммитить `.env`, секреты, `node_modules`, сессии Userbot, дампы БД.
- Перед коммитом: `pnpm typecheck`, `pnpm lint`, тесты на затронутые модули.
- Ветки: `feature/<scope>`, `fix/<scope>`, `chore/<scope>`. Merge через PR, без прямых пушей в `main`.

## Тесты

- Backend: Vitest. Unit — для сервисов и state machines (воронка, инвойсы); integration — для Route Handlers; покрыть все правила перехода воронки и RBAC.
- Frontend: Vitest + React Testing Library для фич; Storybook для shared-компонентов.
- e2e: Playwright — ключевые сценарии (логин, полный цикл контрактной заявки, полный цикл разового заказа, генерация и отправка инвойса, SLA-эскалация).

## Запреты

- Не добавлять функциональность сверх текущего этапа в `docks/ROADMAP.md`.
- Не создавать файлы документации без запроса.
- Не хардкодить данные: роли, этапы воронки, ставки, шаблоны, каналы — всё через БД/справочники/константы.
- Не писать `any` в TypeScript без явной причины; `unknown` + zod-валидация вместо `any`.
- Не оставлять `console.log` / `print` в продакшн-коде.
- Не трогать ставки комиссии ни из какого кода, кроме сервиса `CommissionRateService` (и только с правами admin).
- Не публиковать в каналы мессенджеров и не слать сообщения клиентам напрямую из роутов/сервисов — только через `MessengerAdapter`.
- Не смешивать логику мессенджеров между собой: Telegram не знает про WhatsApp.
- Не ломать state machine воронки правками в обход — все переходы через `FunnelService`.
- Не логировать ПДн (телефоны, имена) в обычные логи без маскирования. AuditLog — да, обычные логи — нет.
