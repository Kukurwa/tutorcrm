# TutorCRM — ТЗ по бэкенду v1.0

Источник требований: `BUSINESS_LOGIC_Client.pdf` (бизнес-логика v1.0).
Модуль интеграции с Telegram (Userbot + Bot API, сессии, парсинг откликов, публикация в каналы) будет описан отдельным документом. Ниже — только точки соприкосновения и placeholder-секция.

---

## 1. Общее

### 1.1 Архитектура
Монорепо (pnpm workspaces) с несколькими процессами. На старте — без микросервисов-маркетинга, но с чётким разделением:

- **`apps/web`** — Next.js 14+ (App Router). Отдаёт UI (SSR + RSC) и все REST API через Route Handlers (`app/api/v1/**/route.ts`).
- **`apps/worker`** — отдельный Node.js-процесс с BullMQ-consumer: еженедельная генерация инвойсов, SLA-таймеры, cron-задачи, обработка отложенных нотификаций, ретраи интеграций.
- **`apps/realtime`** — отдельный Node.js-процесс с Socket.IO. Подписывается на доменные события (Redis pub/sub) и пушит их подключённым клиентам. Next.js App Router не умеет долгоживущие WS — поэтому realtime вынесен.
- **`apps/messenger`** — отдельный процесс(ы) для интеграций мессенджеров. Принимает входящие, публикует исходящие. Обменивается с ядром через BullMQ и REST-API.
- **`packages/core`** — доменная логика (сервисы, state machines, репозитории). Используется и из `web` (Route Handlers + RSC), и из `worker`.
- **`packages/db`** — Prisma schema, клиент, миграции, сиды.
- **`packages/contracts`** — zod-схемы DTO, общие типы, события.
- **`packages/integrations`** — абстракции мессенджеров и конкретные адаптеры.

Единая шина событий — Redis pub/sub + BullMQ (для отложенных и cron-задач).

### 1.2 Стек
- **Язык**: TypeScript 5.
- **Фреймворк**: **Next.js 14+** (App Router, RSC, Route Handlers, Middleware).
- **БД**: PostgreSQL 16.
- **ORM / миграции**: **Prisma** + Prisma Migrate.
- **Кэш / очереди**: Redis 7 + **BullMQ**.
- **Auth**: **NextAuth.js** (credentials provider) с Prisma adapter; сессии в БД, cookie — HttpOnly Secure SameSite=Lax.
- **Валидация**: **Zod** на всех границах (API, BullMQ-джоб, внешние события).
- **Realtime**: **Socket.IO** (отдельный процесс `apps/realtime`).
- **Telegram**: разрабатывается отдельным разработчиком отдельным модулем. Технология и язык реализации — на его стороне; с нашим ядром интегрируется через общий контракт `MessengerAdapter` (REST + BullMQ/Redis). См. §7.1.
- **Логи**: **pino** + pino-http, структурированные JSON, единый request_id.
- **Мониторинг**: Sentry для ошибок, Prometheus-экспортер, Grafana (опционально).
- **Хранилище файлов**: S3-совместимое (MinIO в dev) через `@aws-sdk/client-s3`, pre-signed URL с коротким TTL.
- **Email**: провайдер-агностично (nodemailer + SMTP) либо сервис на выбор.
- **Контейнеризация**: Docker + docker-compose. Multi-stage сборка для каждого `apps/*`.

### 1.3 Нефункциональные требования
- Время ответа большинства API ≤ 200 мс p95 (исключая внешние вызовы мессенджеров).
- Горизонтальное масштабирование `web` и `worker` (stateless). Prisma connection pool — PgBouncer (transaction mode) для serverless-friendly сценариев.
- Нулевой простой при деплое (rolling).
- Резервное копирование БД: ежедневно, хранение 30 дней.
- Шифрование чувствительных данных в БД: телефоны — опционально; сессии Telegram Userbot — обязательно (envelope-encryption, ключ в KMS / отдельный Vault).

---

## 2. Роли и доступ (RBAC)

### 2.1 Роли
- `admin`
- `dispatcher`
- `leadgen`

### 2.2 Принципы
- RBAC + row-level security для данных диспетчера («Dispatcher видит только свои»).
- Каждый запрос API проверяет (role, ownership).
- Admin имеет override-флаг `view_all`.
- Все изменения настроек, ставок, ролей — только `admin`.

### 2.3 Матрица прав (ключевые действия)

| Действие (API)                                  | admin | dispatcher            | leadgen |
|-------------------------------------------------|:-----:|:---------------------:|:-------:|
| CRUD users                                      | ✓     | ✗                     | ✗       |
| CRUD subjects, funnel stages, templates         | ✓     | ✗                     | ✗       |
| Изменение ставок комиссии                       | ✓     | ✗                     | ✗       |
| Создание лида вручную                           | ✓     | ✓ (свои)              | ✓       |
| Назначение диспетчера на лид                    | ✓     | ✓ (только себя)       | ✓       |
| Чтение чатов / сообщений                        | ✓     | ✓ (только свои)       | ✗       |
| Создание / ведение заявок                       | ✓     | ✓ (только свои)       | ✗       |
| Публикация заявки                               | ✓     | ✓ (только свои)       | ✗       |
| Назначение репетитора                           | ✓     | ✓ (только свои)       | ✗       |
| Создание / ведение контрактов                   | ✓     | ✓ (только свои)       | ✗       |
| Генерация / отправка инвойсов                   | ✓     | ✓ (только свои)       | ✗       |
| Отметка оплаты инвойса                          | ✓     | ✓ (только свои)       | ✗       |
| Просмотр глобальных метрик                      | ✓     | ✓ (только своё)       | ✗       |

---

## 3. Модель данных

Источник истины — `packages/db/prisma/schema.prisma`. Ниже — логические сущности; поля приведены в snake_case для ясности, в Prisma будут camelCase с `@map("snake_case")` по договорённости команды. Все таблицы имеют `id` (uuid, `@default(uuid())`), `createdAt`, `updatedAt`, `createdBy`, `updatedBy`. «Мягкое удаление» (`deletedAt`) — только для справочников; операционные сущности не удаляются.

### 3.1 Пользователи и каналы

**users**
- id, email (unique), password_hash, full_name, role (`admin`|`dispatcher`|`leadgen`), is_active, avatar_url, timezone.
- last_login_at.

**user_settings**
- user_id (FK), notification_prefs (JSONB: категории в TG-бот и в CRM), quiet_hours (JSONB: { start, end, tz }), theme.

**messenger_accounts**
- id, user_id (FK → users, только dispatcher), channel (`telegram_userbot`|`telegram_bot`|`whatsapp`|`viber`|`facebook`|`instagram`), external_id, display_name, session_data (encrypted), status (`connected`|`disconnected`|`error`), last_sync_at, error_text.
- Уникальность (user_id, channel, external_id).

**company_bot** (один на систему, Telegram Bot API)
- id, bot_id, token (encrypted), username, is_active.

### 3.2 Справочники

**subjects**
- id, name, default_client_commission_rate (decimal), default_tutor_commission_rate (decimal), is_active.

**subject_channels**
- id, subject_id (FK), deal_type (`contract`|`one_time`), telegram_channel_id, post_template_id (FK → message_templates).
- Уникальность (subject_id, deal_type).

**funnel_stages**
- id, code, name, color, order_index, sla_seconds (nullable), escalate_to_role, scripts (JSONB: { stage_hints: [] }).
- Признак терминального этапа, тип терминала (`success`|`refused`).

**rejection_reasons**
- id, name, is_active.

**message_templates**
- id, category (`lead_publish_contract`|`lead_publish_one_time`|`assignment_client`|`assignment_tutor`|`invoice_client`|`invoice_tutor`|`reminder_payment`|`system_notification`|`custom`), name, body (с переменными), is_active.

**scripts** (скрипты-подсказки для диспетчера на этапах)
- id, stage_id (FK funnel_stages, nullable), category, title, body, order_index.

**system_settings**
- key (PK), value (JSONB).
- Ключи: `invoice_generation_day` (0–6), `invoice_payment_deadline_days` (int, default 2), `feedback_delay_seconds`, `auto_actions` (JSONB тумблеры), `global_new_dialog_sla_seconds`.

### 3.3 Клиенты и лиды

**clients**
- id, full_name, phone, phone_normalized, email (nullable), source, tags (text[]), notes, computed_type (enum автоматический: `new`|`regular`|`contract`|`mixed`).
- Индексы: phone_normalized.

**client_contacts**
- id, client_id (FK), channel (`telegram`|`whatsapp`|`viber`|`facebook`|`instagram`|`phone`|`email`), external_id, display.
- Уникальность (client_id, channel, external_id).

**leads**
- id, client_id (FK), dispatcher_id (FK → users), source, manual (bool — создан вручную или из входящего), initial_message_preview, status (`new`|`qualified`|`converted`|`rejected`|`duplicate`).
- dialog_id (FK → dialogs, nullable).

### 3.4 Чаты и сообщения

**dialogs**
- id, client_id (FK), dispatcher_id (FK → users), messenger_account_id (FK → messenger_accounts), channel, external_thread_id, last_message_at, unread_count, status (`active`|`archived`).
- Уникальность (messenger_account_id, external_thread_id).

**messages**
- id, dialog_id (FK), direction (`in`|`out`), external_message_id, sent_by_user_id (FK → users, nullable), text, media (JSONB: [{type, url, meta}]), reply_to_message_id (self FK, nullable), delivery_status, created_at.
- Индексы: (dialog_id, created_at).

### 3.5 Заявки, репетиторы, отклики

**tutors**
- id, full_name, phone (nullable), telegram_user_id (nullable), telegram_username (nullable), other_contacts (JSONB), subjects (array int FK subjects), experience_years, rating (nullable), status (`registered`|`unregistered`|`blocked`), registered_via (`self_bot`|`dispatcher`|`assignment`), notes.
- Уникальность: telegram_user_id (where not null).

**requests** (Заявки)
- id, lead_id (FK), client_id (FK), subject_id (FK), level, lessons_per_week, schedule (JSONB), price_per_lesson (decimal), request_price (decimal, для разового), deal_type (`contract`|`one_time`), trial_preferences (text), comments, dispatcher_id (FK → users).
- stage_id (FK → funnel_stages).
- client_commission_rate (decimal, снимок с subject на момент создания; редактируется).
- tutor_commission_rate (decimal, snapshot).
- published_at (nullable), publication_channel_id (nullable), publication_message_id (nullable).
- assigned_tutor_id (FK → tutors, nullable).
- trial_scheduled_at, trial_result (`success`|`fail`|null), closure_type (`contract`|`one_time_paid`|`rejected`|null), rejection_reason_id (nullable).
- Индексы: (dispatcher_id, stage_id), (client_id), (assigned_tutor_id).

**request_responses** (отклики под постом)
- id, request_id (FK), tutor_id (FK tutors, nullable), raw_author (JSONB — если не привязан), text, posted_at.
- is_hidden (bool).

**request_stage_transitions** (аудит переходов по воронке)
- id, request_id (FK), from_stage_id, to_stage_id, by_user_id, reason (nullable, для отказов), payload (JSONB), created_at.

**trials** (пробные занятия)
- id, request_id (FK), scheduled_at, status (`scheduled`|`held_success`|`held_fail`|`cancelled`), feedback (text).

### 3.6 Контракты и финансы

**contracts**
- id, request_id (FK), client_id (FK), tutor_id (FK), subject_id (FK), schedule (JSONB), price_per_lesson (decimal), client_commission_rate (decimal snapshot, редактируется только admin), tutor_commission_rate (decimal snapshot), dispatcher_id (FK), status (`active`|`paused`|`closed`), started_at, paused_at (nullable), closed_at (nullable), close_reason (nullable).

**contract_events** (пауза, возобновление, замена репетитора, изменение ставок)
- id, contract_id (FK), event_type, payload (JSONB), by_user_id, created_at.

**weekly_lesson_counts**
- id, contract_id (FK), week_start_date, lessons_count (int), comment, entered_by_user_id, skipped (bool), created_at.
- Уникальность (contract_id, week_start_date).

**invoices**
- id, contract_id (FK, nullable — для разовых может быть null), request_id (FK, nullable — для разовых), payer_type (`client`|`tutor`), payer_id (uuid, polymorphic via type), amount (decimal), original_amount (decimal), currency, status (`draft`|`sent`|`paid`|`overdue`|`skipped`), period_start, period_end, due_date, sent_at, paid_at, skipped_at, notes.
- sender_user_id (FK users, кто отправил).
- invoice_number (unique, формат настраиваемый).
- external_message_ids (JSONB — чтобы знать, через какой чат отправлено).

**invoice_events** (аудит: изменение суммы, отправка, оплата)
- id, invoice_id (FK), event_type, payload (JSONB), by_user_id, created_at.

**one_time_deal_payments**
- id, request_id (FK), tutor_id (FK), amount (decimal, = request_price), status (`pending`|`paid`), due_hint_sent_at (nullable), paid_at (nullable), sender_user_id.

### 3.7 Задачи и уведомления

**tasks**
- id, type (`feedback_needed`|`enter_weekly_lessons`|`invoice_unpaid_followup`|`sla_breach`|`manual`|...), title, description, assignee_user_id, due_at, status (`open`|`done`|`cancelled`|`snoozed`), snoozed_until (nullable), related_entity (JSONB: {type, id}), completed_at, created_at.

**notifications**
- id, user_id, category, payload (JSONB), channel (`in_app`|`telegram_bot`|`both`), is_read, delivered_at, created_at.

**calendar_events**
- id, type (`trial`|`lesson`|`task_reminder`), related_entity (JSONB), scheduled_at, duration_minutes, participants (JSONB: [{user_id / client_id / tutor_id}]), notes, status.

### 3.8 Системный аудит

**audit_log**
- id, user_id (nullable, null для системных), action, entity_type, entity_id, before (JSONB), after (JSONB), ip, user_agent, created_at.
- Заполняется на изменение ключевых сущностей (users, subjects, rates, requests stage, contracts, invoices).

---

## 4. Внешние API

База: `/api/v1`. Реализация — Next.js Route Handlers (`app/api/v1/**/route.ts`). Авторизация — NextAuth-сессия (cookie). Все ответы JSON. Валидация входа — zod-схемами из `packages/contracts`.

### 4.1 Auth
- `POST /api/auth/[...nextauth]` — стандартные endpoint'ы NextAuth (signin, signout, session, csrf).
- `GET /api/v1/auth/me` — расширенные данные пользователя (роль, настройки, разрешения).
- `PUT /api/v1/auth/me` — смена базовых полей.
- `POST /api/v1/auth/change-password`.

### 4.2 Users
- `GET /users` (admin).
- `POST /users` (admin).
- `GET /users/:id`.
- `PUT /users/:id` (admin).
- `DELETE /users/:id` (admin; soft) — фактически деактивация.
- `GET /users/:id/messenger-accounts`.
- `POST /users/:id/messenger-accounts` — начать подключение (для TG — см. Telegram-модуль).
- `DELETE /users/:id/messenger-accounts/:accountId`.

### 4.3 Справочники
- `GET/POST/PUT/DELETE /subjects` + `/subjects/:id/channels`.
- `GET/POST/PUT/DELETE /funnel-stages` + `PUT /funnel-stages/reorder`.
- `GET/POST/PUT/DELETE /rejection-reasons`.
- `GET/POST/PUT/DELETE /message-templates`.
- `GET/POST/PUT/DELETE /scripts`.
- `GET /system-settings`, `PUT /system-settings` (admin).

### 4.4 Клиенты / лиды
- `GET /clients` — фильтры, поиск, пагинация.
- `POST /clients`.
- `GET /clients/:id` — с вложенными лидами, заявками, контрактами, контактами.
- `PUT /clients/:id`.
- `POST /clients/:id/contacts`, `DELETE /clients/:id/contacts/:contactId`.
- `POST /clients/check-duplicates` — по phone/telegram.
- `GET /leads`.
- `POST /leads` — вручную. Параметры: client / создать нового, source, dispatcher_id, manual_channel (для исходящего — автоматически инициируется чат).
- `GET /leads/:id`, `PUT /leads/:id`.
- `POST /leads/:id/convert-to-request` — создать заявку.
- `POST /leads/:id/initiate-chat` — тело: channel, external_id/phone.

### 4.5 Чаты / сообщения
- `GET /dialogs` — фильтры: my/all, channel, unread, needs_reply.
- `GET /dialogs/:id` — детали + участники.
- `GET /dialogs/:id/messages` — пагинация курсор по created_at.
- `POST /dialogs/:id/messages` — отправка.
- `POST /dialogs/:id/mark-read`.
- `POST /dialogs/:id/create-lead` — из диалога.

WebSocket: через `apps/realtime` (Socket.IO) — события `dialog.message`, `dialog.updated`, `notification.new`, `request.stage_changed`, `invoice.updated`, `task.*`. Авторизация клиента — по NextAuth session cookie (проверка серверным хелпером при подключении).

### 4.6 Заявки
- `GET /requests` — фильтры по этапу, предмету, диспетчеру, клиенту, типу сделки; группировка для Kanban.
- `POST /requests` — из лида.
- `GET /requests/:id`.
- `PUT /requests/:id` — редактирование до публикации.
- `POST /requests/:id/publish` — публикация (определяет канал по subject + deal_type).
- `POST /requests/:id/change-stage` — ручной переход; проверяет правила.
- `GET /requests/:id/responses` — отклики.
- `POST /requests/:id/responses/:responseId/assign` — назначение репетитора (body: customize_client_msg, customize_tutor_msg, auto_send flags).
- `POST /requests/:id/trial-result` — `success`/`fail`, причина, действия (new_search / reject).
- `POST /requests/:id/close-contract` — создать контракт (для success + deal_type=contract).
- `POST /requests/:id/one-time-payment/remind` — отправить напоминание репетитору.
- `POST /requests/:id/one-time-payment/mark-paid`.
- `POST /requests/:id/reject` — причина.

### 4.7 Репетиторы
- `GET /tutors` — фильтры, поиск.
- `POST /tutors` — ручное создание.
- `GET /tutors/:id`.
- `PUT /tutors/:id`.
- `POST /tutors/:id/block` / `unblock`.
- `GET /tutors/:id/responses`, `GET /tutors/:id/requests`, `GET /tutors/:id/contracts`, `GET /tutors/:id/finances`.

### 4.8 Контракты
- `GET /contracts`.
- `POST /contracts` — из заявки.
- `GET /contracts/:id`.
- `PUT /contracts/:id` — только разрешённые поля; изменение ставок — admin.
- `POST /contracts/:id/pause`, `POST /contracts/:id/resume`.
- `POST /contracts/:id/close` — причина.
- `POST /contracts/:id/replace-tutor` — параметры: reason, pause (bool).
- `POST /contracts/:id/weekly-count` — ввод уроков за неделю → триггерит генерацию инвойсов.
- `GET /contracts/:id/invoices`.

### 4.9 Инвойсы
- `GET /invoices` — фильтры: статус, период, контракт, заявка, payer.
- `GET /invoices/:id`.
- `PUT /invoices/:id` — только amount/notes; запись в invoice_events.
- `POST /invoices/:id/send` — отправка через Userbot (телеграм-канал соответствующего клиента/репетитора).
- `POST /invoices/:id/mark-paid`.
- `POST /invoices/:id/skip`.

### 4.10 Задачи / уведомления / календарь
- `GET/POST /tasks`, `PUT /tasks/:id`, `POST /tasks/:id/complete`, `POST /tasks/:id/snooze`.
- `GET /notifications`, `POST /notifications/read`, `POST /notifications/read-all`.
- `GET /calendar-events`.

### 4.11 Метрики и экспорт
- `GET /metrics/funnel` — параметры: период, предмет, диспетчер.
- `GET /metrics/speed`.
- `GET /metrics/finance`.
- `GET /metrics/operations`.
- `GET /metrics/tutors`.
- `GET /metrics/export?format=csv|xlsx&report=...` — стримом.

### 4.12 LeadGen
- Использует общие ручки `/leads` + `/clients` с ограничениями по правам.
- `GET /leads/my-created` — вкладка «мои лиды» для LeadGen.

---

## 5. Бизнес-процессы (state machines)

### 5.1 Lead → Request
- lead.status: `new` → `qualified` (после создания заявки) / `rejected` / `duplicate`.

### 5.2 Воронка заявки
Переходы между funnel_stages регулируются таблицей разрешённых переходов (хранится в конфиге или настраивается админом). Базовые правила:

- `formed → search` (по действию «Опубликовать»). Триггеры: публикация поста, запись publication_*, установка SLA.
- `search → selected` (по «Назначить»): триггеры — создание записи об отправке контактов, события календаря (пробный), автозадача «Нужен фидбек».
- `selected → trial_scheduled` (автомат при установке даты пробного).
- `trial_scheduled → trial_done` (по «Результат»).
- `trial_done → closed_success` (успех, запускается ветка по deal_type).
- `trial_done → search` («Новый поиск» — сбрасывается assigned_tutor_id, можно публиковать повторно).
- `* → closed_rejected` (с причиной).

Ограничения:
- Нельзя откатывать этап назад, кроме `trial_done → search`.
- Любой переход фиксируется в `request_stage_transitions`.
- При попытке перехода, не разрешённого правилами — 409 + текст ошибки.

### 5.3 Контракт
- `active ⇄ paused`.
- `active → closed`, `paused → closed`.
- При закрытии неоплаченные инвойсы остаются активными.

### 5.4 Инвойс
- `draft → sent → paid`.
- `sent → overdue` (автоматически воркером по invoice_payment_deadline_days).
- `draft → skipped` (вручную).
- Изменение amount возможно на draft и sent; каждое изменение → invoice_events.

### 5.5 Автоматические действия

**Автозадача «Нужен фидбек»**: после назначения репетитора + X секунд (из system_settings.feedback_delay_seconds) — создаётся task для диспетчера.

**Еженедельный цикл инвойсов**:
- По расписанию (cron, день из system_settings.invoice_generation_day):
  1. Для каждого активного контракта: проверить, введено ли кол-во уроков за предыдущую неделю.
  2. Если введено — создать 2 инвойса (client + tutor).
  3. Если не введено — создать task «Не внесено кол-во уроков за неделю».
  4. Если инвойсы уже созданы — отправить (или сформировать черновик, зависит от `auto_actions.auto_send_invoices`).

**Просрочка оплаты**: через `invoice_payment_deadline_days` дней после `sent_at` — если статус ещё `sent` → статус `overdue` + уведомление + task.

**Авто-overdue для разовых**: аналогично, через настраиваемое число дней после назначения.

**SLA-таймеры**:
- На вход в этап воронки с ненулевым `sla_seconds` — ставится таймер.
- По истечении — уведомление диспетчеру + эскалация по `escalate_to_role`.
- На «нет ответа на новый диалог» — отдельный таймер `global_new_dialog_sla_seconds`.

**Автоотправка контактов** (`auto_actions.auto_send_contacts`):
- При назначении репетитора сразу отправлять 2 сообщения без шага превью.

**Автосмена статуса при указании даты пробного** (`auto_actions.auto_change_stage_on_trial_date`):
- При сохранении даты пробного — автоматический переход `selected → trial_scheduled`.

---

## 6. Финансы

### 6.1 Ставки комиссии
- Наследование: `subjects.default_*_rate` → `requests.*_commission_rate` (snapshot на создание) → `contracts.*_commission_rate` (snapshot на создание контракта).
- Изменение на любом уровне — только admin.
- Все изменения — в audit_log + contract_events для контрактов.

### 6.2 Формирование инвойсов (контракт)
```
invoice_client.amount = weekly_lessons * contract.client_commission_rate
invoice_tutor.amount  = weekly_lessons * contract.tutor_commission_rate
period_start = неделя_начало
period_end   = неделя_конец
due_date     = now + invoice_payment_deadline_days
```
Валюта — грн (currency code `UAH`) на старте; предусмотреть поле currency.

### 6.3 Разовый заказ
- После успешного пробного + deal_type=one_time: создать `one_time_deal_payments` amount = request_price.
- Возможность отправить напоминание (шаблон).
- Отметка оплаты = закрытие заявки (closed_success, closure_type=one_time_paid).

### 6.4 Редактирование сумм / пропуск
- `invoice.status = draft|sent`: amount меняется, event пишется.
- `skip`: допустим до момента `paid`.
- Все действия требуют права.

---

## 7. Интеграции мессенджеров

Все каналы следуют общему контракту: нормализованное событие `IncomingMessage` с полями (channel, messenger_account_id, external_thread_id, external_message_id, author, text, media, timestamp).

Отправка — через аналогичный `OutgoingMessage`. Любая отправка фиксируется в `messages` с `external_message_id` и `delivery_status`.

### 7.1 Telegram — **PLACEHOLDER**
Разрабатывается отдельным разработчиком отдельным модулем. Стек и технология реализации — на стороне этого разработчика (мы их не диктуем). С нашим ядром подключается как ещё одна реализация `MessengerAdapter`.

Минимальные точки соприкосновения с ядром (контракт, который должен предоставить модуль):
- Две технологии Telegram: **Userbot** (MTProto, личные аккаунты диспетчеров) и **Bot** (Bot API, единый бот компании).
- Userbot отвечает за: переписку в Inbox, инициацию чата (по ID/телефону), отправку контактов репетитору/клиенту, отправку инвойсов.
- Bot отвечает за: публикацию заявок в каналы, парсинг откликов (комментариев под постом), уведомления диспетчерам, регистрацию репетиторов.
- Входящие события в ядро — через Redis pub/sub / BullMQ: `on_incoming_message`, `on_channel_response`, `on_bot_command`.
- Исходящие действия из ядра — через HTTP/queue: `send_message`, `initiate_dialog`, `publish_to_channel`, `send_contacts`, `send_invoice`.
- Сессии Userbot — шифруются (envelope), ключ — отдельно от БД.
- Каналы Telegram привязываются к (subject_id, deal_type) через `subject_channels`.
- Детали (API-форматы, хранение сессий, UI привязки аккаунтов) — придут отдельным документом от Telegram-разработчика.

### 7.2 WhatsApp
- Node.js-ориентированный выбор (для монорепо): **Baileys** (неофициальный, бесплатный, похож на Userbot) либо **WhatsApp Cloud API** (официальный, платный, стабильнее). Решение — по согласованию.
- Модель работы полностью повторяет Telegram Userbot: `messenger_accounts.channel = 'whatsapp'`, сообщения попадают в Inbox того диспетчера, чей это аккаунт.

### 7.3 Viber
- Через сторонний интегратор (конкретный сервис согласовывается). Модель работы — аналогично.
- Интеграция реализуется как drop-in модуль, экспортирующий тот же контракт.

### 7.4 Facebook / Instagram
- **Вариант 1 (приоритетный)**: собственное приложение Facebook + Graph API. Требуется верификация Meta Business у заказчика. Реализация содержит поток OAuth, подписку на webhooks входящих сообщений.
- **Вариант 2 (запасной)**: через сторонний интегратор (SendPulse и аналоги).
- Выбор варианта — по факту статуса верификации; обе реализации пишутся за общим интерфейсом.

---

## 8. Уведомления

### 8.1 Каналы
- **in_app**: через WebSocket → UI-колокольчик + Toast.
- **telegram_bot**: через Bot API — в личку пользователю (если он привязал бота компании к себе; регистрация через `/start`).

### 8.2 События (см. раздел 7 бизнес-документа)
Центральная таблица событий-триггеров → кому и по каким каналам уходит:

| Событие                                 | Получатель                 | Каналы             |
|-----------------------------------------|----------------------------|--------------------|
| Новый диалог / сообщение                | Диспетчер владелец         | in_app + tg_bot    |
| Новый отклик под постом                 | Ответственный диспетчер    | in_app + tg_bot    |
| Нужен фидбек                            | Ответственный диспетчер    | in_app + tg_bot    |
| Просрочка SLA этапа воронки             | Диспетчер + эскалация      | in_app + tg_bot    |
| Инвойсы готовы к отправке               | Диспетчер                  | in_app             |
| Не внесено кол-во уроков за неделю      | Диспетчер                  | in_app + tg_bot    |
| Инвойс не оплачен через N дней          | Диспетчер                  | in_app + tg_bot    |
| Нет ответа на диалог за N мин           | Админ / старший            | in_app + tg_bot    |

### 8.3 Настройки
- У каждого пользователя `notification_prefs` — включает/отключает категории в TG-бот.
- Тихие часы: события категории `informational` не шлются в tg_bot; эскалации — шлются всегда.

---

## 9. Автодействия (feature flags)

Хранятся в `system_settings.auto_actions`. Тумблеры:
- `auto_send_contacts` — автоотправка контактов при назначении.
- `auto_change_stage_on_trial_date` — автосмена статуса при указании даты пробного.
- `auto_send_invoices` — автоотправка инвойсов без предпросмотра.
- `feedback_task_on_assignment` — **по умолчанию true**.

Все действия ядра проверяют соответствующий тумблер. Значение по умолчанию — выключено, кроме отмеченного.

---

## 10. Метрики и отчёты

### 10.1 Источники
- `request_stage_transitions` → конверсия по этапам.
- `requests`, `contracts`, `invoices`, `one_time_deal_payments` → финансовые метрики.
- `tasks`, SLA-события → операционные.
- `request_responses`, `trials` → метрики репетиторов.

### 10.2 Агрегаты
Для скорости — materialized views / отдельная БД-схема аналитики, обновляемая по cron или по событиям:
- funnel_conversion_daily (dispatcher, subject, stage).
- finance_daily (dispatcher, subject, tutor).
- tutor_stats (конверсия пробных, активные ученики).

### 10.3 Экспорт
- CSV / XLSX, стримом.
- Учёт фильтров и прав (dispatcher — только свои).

---

## 11. Файлы и медиа

- Хранилище — S3-совместимое.
- Загрузка только авторизованными пользователями.
- Доступ к приватным файлам — через pre-signed URL с коротким TTL.
- Антивирусная проверка (clamav) — опционально, по согласованию.
- Ограничения по размеру (по согласованию; предложение: 50 МБ на файл).

---

## 12. Безопасность

- Пароли — argon2id (через `@node-rs/argon2`).
- Rate limiting на auth-ручках и `/messages` (по IP и user) — Upstash ratelimit / собственная реализация на Redis.
- CSRF-защита — встроена в NextAuth; для кастомных мутаций — проверка same-origin + CSRF-token header.
- CORS — whitelist (для `apps/realtime` и внешних webhook'ов).
- Аудит всех критических действий (раздел 3.8).
- Backup ключей шифрования отдельно от backup БД.
- Доступ к админским ручкам — MFA (в MVP — опционально, заложить архитектурно).
- Все внешние вызовы мессенджеров — через отдельного пользователя/контекст, без общих токенов.
- Webhook'и внешних сервисов (FB, WhatsApp Cloud API) — с проверкой подписи.

---

## 13. Фоновые задачи (cron / очереди)

| Задача                                   | Частота                                 |
|------------------------------------------|-----------------------------------------|
| Генерация еженедельных инвойсов          | cron еженедельно, настраиваемый день    |
| Проверка просрочек оплаты                | каждый час                              |
| SLA-таймеры по этапам                    | real-time (delayed queue)               |
| Пересчёт `clients.computed_type`         | событийно (изменение requests/contracts)|
| Пересчёт метрик (materialized views)     | каждые 15 мин                           |
| Синхронизация статусов мессенджер-сессий | каждые 5 мин                            |
| Очистка аудита > 2 лет                   | раз в месяц (по политике)               |

---

## 14. API: общие правила

- Все Route Handlers следуют шаблону: auth → zod-валидация входа → вызов сервиса из `packages/core` → zod-схема ответа.
- Все списки: пагинация `page` + `limit` **или** cursor (предпочтительно cursor для сообщений/уведомлений).
- Фильтры — через query-параметры, сложные — через `POST /search`.
- Все ответы — в формате `{ data, meta }` для списков и `{ data }` для одиночных.
- Ошибки — единый формат `{ error: { code, message, details? } }` через общий хелпер; коды — строковые (`REQUEST_ALREADY_PUBLISHED`, `INVALID_STAGE_TRANSITION`, ...).
- Идемпотентность критических мутаций (публикация, отправка инвойса, назначение) — через `Idempotency-Key` header (хранение ключей — Redis).
- OpenAPI-схема — автогенерация из zod (`zod-to-openapi`) для фронт-клиента и потенциальных внешних потребителей.

---

## 15. Миграция и начальные данные

Сиды:
- 1 admin-пользователь (из env на старте).
- Базовый набор этапов воронки (см. раздел 5.2).
- Базовые категории шаблонов.
- Базовые причины отказа.
- Ставки комиссии 0 по умолчанию (требуют настройки).

---

## 16. Интеграционные требования с фронтендом

- Схемы API — OpenAPI 3.1, автогенерация клиента для фронта.
- WebSocket-протокол — документирован (список событий, payload).
- Все длинные операции (публикация, отправка инвойса) — синхронные с быстрым ответом; фактическая доставка в мессенджер — асинхронно, статус возвращается событиями.

---

## 17. Критерии приёмки (бэкенд)

- Все API-ручки раздела 4 реализованы, покрыты интеграционными тестами.
- Правила перехода по воронке (5.2) покрыты unit-тестами (разрешённые/запрещённые переходы).
- Еженедельная генерация инвойсов отрабатывает корректно по cron, покрыта тестами.
- Просрочки оплаты и SLA — отрабатывают в unit-тестах с фиктивным временем.
- RBAC-правила раздела 2 проверяются в тестах на каждой ручке.
- Логи действий (audit_log) заполняются на все ключевые изменения.
- Бэкапы настроены и протестированы (restore drill).
- Внешние интеграции (WhatsApp, Viber, FB/IG) — реализованы за общим интерфейсом; каждая с набором тестов на контракт.
- Telegram-модуль подключается к готовым точкам расширения без изменений ядра.

---

## 18. Открытые вопросы (требуют подтверждения)

1. Валюта по умолчанию — только UAH или нужна мультивалютность?
2. Требования к хранению истории сообщений (срок)?
3. Какой именно сторонний сервис для Viber — на согласование.
4. WhatsApp — официальный Cloud API (стабильный, платный) vs Baileys (бесплатный, риск банов).
5. MFA для admin — в MVP или позже?
6. Хранение сессий Userbot — внутри БД (envelope-шифрование) или во внешнем Vault.
7. Часовой пояс: Europe/Kyiv везде, или мультитенантно?
8. Валидация и формат номеров инвойсов — нужен ли внешний формат под бухгалтерию?
9. Telegram-модуль — зона ответственности внешнего разработчика. От нас — зафиксированный контракт `MessengerAdapter` и точки интеграции. Все внутренние решения (GramJS / Telethon / иное, хранение сессий, процессы) — на его стороне.
10. Хостинг: `apps/web` как Node.js-контейнер (единый docker-compose) vs Vercel/Cloud-хостинг? Next.js с WS-оркестрацией и background worker комфортнее в Node-контейнере.
