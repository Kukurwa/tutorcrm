# CHANGELOG

Записи добавляются **после** выполнения пункта роадмапа, не до. Планы — только в `docks/ROADMAP.md`.

Формат:

```
### ГГГГ-ММ-ДД — Краткое описание
- Что конкретно сделано
- Какие файлы/модули затронуты
```

---

### 2026-04-30 — Большая партия UX-правок по фидбеку клиента (Inbox, Заявки, Контракты, Клиенты, Репетиторы, Лидген)

**Модель данных (zod-контракты):**
- `Request` — убрана обязательность `description`; добавлены `studentName`, `age`, `grade`, `pricePerHour` и `requestPrice` (string|null — поддерживают «Договірна»), `extraInfo`, `republishedAt`/`republishCount`. Старые `budgetFrom`/`budgetTo` сохранены nullable для обратной совместимости.
- `Tutor` — добавлены: `viberPhone`, `telegramHandle`, `age`, `isOffline`/`offlineCity`, `additionalSubject`, `education`, `teachesInRussian`, `workingLevels[]`, `workingAgeRange`, `teachingMethodNotes`, `additionalInfo`, `isBlacklisted` (ЧС), `termsKind` (`contract`/`regular`); `TutorEffectiveness` тип.
- `Contract` — добавлены: `code` (А-1, М-5, НДК-1.1), `studentName`, `parentName`, `age`, `level`, `contactInfo`, `tutorContact`, `pricePerLesson`, `lessonsPerWeek`, `requestPrice`, `trialAt`, `paidAt`, `amountReceived`, `accountantVerified` (галочка бухгалтера), `onFop`, `comment`. `updateContractSchema` для редактирования карточки ученика.
- `Lesson` — новая модель: дата + статус (`success`/`rescheduled`/`cancelled`) + заметка. `WeeklyLessonCount` оставлен как fallback.
- `OneTimeDealPayment` — добавлен `accountantVerified`.
- `Subject` — добавлены `code` (А, М, Ф, У, З, Н) и `contractCode` (НДК и т.п.) для генерации кодов заказов.
- `Lead` — упрощён до `text` + `contact` + опциональный `dispatcherId`/`autoAssign` (старые поля в схеме сохранены для совместимости).
- `Inbox` — `Dialog.partyKind` (`client`/`tutor`/`work_group`), `Dialog.tutorId`, `Dialog.folderId`. `InboxFolder` (CRUD, owner-scoped). Новые контракты `createRequestFromDialogSchema`, `updateDialogSchema`. В `createLeadFromDialogSchema` `subject: string` заменено на `subjectId: string`.

**Моки и API:**
- Расширены сиды subjects (с code), tutors (полные поля), contracts (А-1/АК-1.1 коды), inbox (диалоги c партиями `tutor`/`work_group` для демонстрации папок), lessons (2 урока seed), leads (`text`+`contact`+`autoAssigned`).
- Новые route handlers: `POST /api/requests/[id]/republish`, `GET/POST /api/lessons` + `PATCH/DELETE /api/lessons/[id]`, `GET/POST /api/inbox-folders` + `DELETE /api/inbox-folders/[id]`, `POST /api/dialogs/[id]/create-request`, `PATCH /api/dialogs/[id]` (смена `stage`/`folderId`).
- `POST /api/leads` принимает упрощённый payload, реализовано round-robin авто-распределение по диспетчерам.
- `POST /api/contracts` генерирует `code` через утилиту `lib/order-code.ts` (regular: subject.code-N; contract: subject.contractCode-tutorIdx.clientIdx) и переносит в контракт `studentName`/`age`/`pricePerLesson`/`requestPrice`/`tutorContact`.
- `GET /api/dialogs` фильтрует по `channel`, `partyKind`, `folderId`, `stage`. `GET /api/contracts` и `GET /api/requests` — по `subjectId`/`dispatcherId`.

**UI:**
- **Inbox**: системные папки (Клиенты / Репетиторы / Раб. группы — авто-фильтр по `partyKind`) + пользовательские папки (CRUD); фильтры мессенджер + стадия воронки; смена стадии прямо в контекст-панели; кнопка «Скрипты» в инпуте — выпадающий список (релевантные стадии — наверх, переменные `{{client_name}}` подставляются); рабочая кнопка «Сформировать заявку» из чата — диалог с новыми полями; в «Создать лид» предмет теперь `<Select>` из справочника.
- **Воронка**: для admin — фильтр по диспетчеру над доской; карточки заявки показывают новые цены вместо `budgetFrom/To`.
- **Заявки**: вкладки-листы по предметам (`Все` + по каждому subject.code); сортировка по дате публикации (новые сверху); кнопка «Перевыставить» появляется при `publishedAt > 1ч` без откликов и открывает диалог редактирования цен; форма создания и карточка перешли на новую модель полей; превью поста в канал — без бюджета, с новыми данными.
- **Контракты**: индексная страница теперь показывает все ученики с разбивкой по предметам и фильтром диспетчера для admin; клик по строке открывает **отдельную страницу `/contracts/[id]`** с табами Карточка / Уроки / Платежи / Инвойсы / События. Уроки — список с датами и статусами (success/rescheduled/cancelled) + блок «по неделям» как fallback. Платежи — со checkbox «Оплата найдена (бухгалтер)». Карточка — все новые поля (`code`, `pricePerLesson`, `lessonsPerWeek`, `trialAt`, `paidAt`, `amountReceived`, `onFop`, `comment`).
- **Клиенты**: Excel-стиль таблица заказов (каждая строка = `Contract`) — Код, Дата, Имя ученика, Контакты, Возраст, Цена 1 ур., Уроков/нед, Цена заявки, Контакт+ФИО репа, Дата пробного, По факту, Получено + ✓ бухгалтера, ФОП, Комментарии. Вкладки-листы по предметам + фильтр диспетчера для admin. Клик по коду/имени → отдельная страница `/clients/[id]` с заказами и заявками.
- **Репетиторы**: вкладки `Контрактные`/`Обычные` → внутри подвкладки по предметам. Список — Имя, TG-ник, Возраст, Опыт, Эффективность (% closed_won от назначений). Карточка с украинскими полями (Ім'я, Viber, Telegram, Освіта, Рівні, Метод…), флаг «В чёрном списке», история заявок (свои/все), кнопки «Связаться в TG» / «Позвонить» (заглушки на MVP).
- **Лидген**: убран пункт «Воронка» из меню; на дашборде вместо CTA на воронку — форма «Новый лид» (только Текст + Контакт + Select диспетчера или «Авто-распределение») и таблица «Мои лиды» с категорией/диспетчером/auto-меткой.

**Прочее:**
- Утилита `lib/order-code.ts` для генерации кодов заказов.
- Telegram-deeplink (`https://t.me/...`) и `viber://chat?number=...` подключены как ссылки в карточке репетитора.

**Приёмка**: `pnpm --filter @tutorcrm/web typecheck` чисто; `pnpm --filter @tutorcrm/web build` собирает 21 страницу + новые API роуты.

### 2026-04-24 — Полный адаптив (mobile / tablet / desktop)

- Новый UI-компонент `Sheet` в `@tutorcrm/ui` (Radix Dialog + variants left/right/top/bottom) для мобильных drawer'ов.
- `components/layout/sidebar-nav.tsx` — выделены переиспользуемые `SidebarNav` + `SidebarBrand`; `sidebar.tsx` теперь только десктопная обёртка (`hidden lg:flex`).
- `mobile-sidebar.tsx` — бургер (`<lg`) открывает Sheet со всеми пунктами навигации; клик по пункту автоматически закрывает sheet.
- Topbar: бургер слева + адаптивные паддинги (`px-3 sm:px-4`).
- `app/(app)/layout.tsx` — `main` с `p-3 sm:p-4 md:p-6`.
- **Inbox** — адаптивная 3-колоночная раскладка: `<md` одна колонка с pane-переключением (список → чат → контекст, шапка с «К диалогам»/«Контекст»); `md–xl` две колонки (список + чат); `xl+` три колонки как раньше.
- `DataTable` теперь `overflow-x-auto` на обёртке + `min-w-[640px]` на `<table>`.
- Funnel Kanban — колонки доступны горизонтальной прокруткой.
- Проверено в Playwright на 375×800 и 1440×900: бургер, меню-шторка, pane-навигация Inbox, скроллящиеся таблицы, десктоп не сломан.

### 2026-04-24 — Hotfix: next-themes hydration mismatch (Sun/Moon icon)

- На сервере `useTheme()` возвращает `undefined` (нет доступа к localStorage), клиент после гидратации резолвит тему и подменяет иконку Moon↔Sun — несовпадение `<circle>` в SVG валило гидратацию.
- В `components/layout/topbar.tsx` — `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`. До маунта рисую пустой placeholder 16×16, затем реальную иконку из `resolvedTheme`. На кнопку добавлен `suppressHydrationWarning`.
- Аналогично в `profile-form.tsx` — тема в Select видна только после маунта (`mounted ? theme : 'system'`), `suppressHydrationWarning` на триггере.

### 2026-04-24 — Hotfix: прозрачный фон DropdownMenu / Select / Dialog

- В `@tutorcrm/ui` компоненты поповеров используют `bg-popover`, но в `tailwind-preset.cjs` не был объявлен цвет `popover`, а в `globals.css` — CSS-переменные `--popover` / `--popover-foreground`. В итоге Tailwind фоллбечил на прозрачность — меню было без фона.
- Добавлен цвет `popover` в preset и переменные в оба топика (light/dark) `globals.css`.

### 2026-04-24 — Hotfix: Radix Select empty value + SSR hydration

- Radix UI запрещает `<SelectItem value="" />`; в `/requests` (фильтр стадии) и `/dashboard` (фильтры «Предмет» / «Диспетчер») заменено на sentinel `__all` с маппингом в state ↔ UI.
- Hydration mismatch из-за разного ICU Node/браузер: `Intl.NumberFormat('ru-RU', 'currency', 'UAH')` возвращает `грн.` на сервере и `₴` в браузере. В `lib/format.ts` удалён Intl — валюта форматируется вручную (`${grouped} ${symbol}`), даты — через константный `MONTHS_RU` + `pad()`. Удалены `toLocaleString('ru-RU')` из client-компонентов `/requests`, `/leadgen`, карточки заявки — везде `formatFull()`.
- Проверено через headless Chromium: все страницы (dashboard, requests, settings, inbox, funnel, contracts, calendar, leadgen, tasks) — 0 ошибок в консоли.

### 2026-04-24 — FE-10: Приёмка фронтенда

- Playwright: `apps/web/playwright.config.ts` + `e2e/auth.spec.ts` (login/redirect/invalid password) + `e2e/flows.spec.ts` (sidebar RBAC admin vs dispatcher, LeadGen создание лида, карточка контракта, Funnel Kanban, генерация инвойсов). Скрипт `pnpm --filter @tutorcrm/web e2e`.
- Storybook coverage дополнен: Card, ConfirmDialog, FormField, Switch, ColorPicker, SortableList (плюс существующие Button/Input/Select/Skeleton/EmptyState/RoleBadge/StatusBadge/DataTable).
- Проверено: все состояния (loading — через Skeleton в DataTable/Inbox, empty — через EmptyState на пустых списках, error — через toast + ApiClientError, success — на всех экранах). Адаптив вне 1280–1440 визуально проверен, Inbox/Kanban скроллят, Sidebar скрывается на <lg. Клавиатура: логин Enter, Inbox Enter=send / Shift+Enter=newline, Radix-компоненты (Dialog/DropdownMenu/Select/Tabs) имеют встроенную a11y.
- README обновлён командой `pnpm --filter @tutorcrm/web e2e`.
- Финальный `next build` — 21 страница + 30+ route handlers; typecheck всего монорепо чист.
- Приёмка: все сценарии работают на моках, готово к демонстрации заказчику и переходу к BE-0.

### 2026-04-24 — FE-9: Дашборд и метрики

- Route Handlers: `/api/metrics` (агрегатор с фильтрами from/to/subjectId/dispatcherId + RBAC-фильтр для dispatcher; возвращает funnel counts, finance (invoiced/paid/commission projection/overdue), operations (unread dialogs / new leads / overdue tasks / active contracts), bySubject, tutors), `/api/metrics/export?type=contracts|requests|invoices` (CSV с quoted escaping).
- UI `/dashboard` для admin/dispatcher — `DashboardView` с фильтрами, блоками «Операции», «Финансы», «Воронка» (по стадиям), «По предметам» (таблица), «Топ репетиторов» и «Экспорт» (3 кнопки скачать CSV). Переключение фильтров автоматически перезапрашивает метрики.
- LeadGen-дашборд оставлен упрощённым (свои лиды + CTA).
- RBAC: admin видит селект диспетчера, dispatcher — нет (ограничен собой).

### 2026-04-24 — FE-8: Уведомления, SLA, задачи

- `packages/contracts/src/notifications.ts`: `Notification` с категориями (inbox/responses/feedback/invoices/sla/system), link на целевую страницу.
- Моки: 3 seeded уведомления под dispatcher (inbox/sla/responses — разные времена, часть прочитанных).
- Route Handlers: `/api/notifications` (GET мои + POST — создание), `/api/notifications/mark-read` (POST, отмечает один или все).
- `components/layout/notification-bell.tsx`: Bell с unread-бейджем (количество красным), DropdownMenu с списком, категорийным StatusBadge, клик по ссылке — mark-read, кнопка «Отметить всё прочитанным». Подключён к `useFakeRealtimePoll` — новые уведомления приходят через 20-сек поллинг и всплывают как `toast.info`.
- Topbar теперь содержит `<NotificationBell />` слева от theme-toggle.
- SLA-бейджи присутствуют в DialogList, FunnelBoard, Dashboard (блок «Требуют внимания»).
- Приёмка: события (сообщения / SLA / отклики) попадают в колокольчик, toast всплывает при поллинге, «отметить всё прочитанным» работает.

### 2026-04-24 — FE-7: Инвойсы и финансы

- `packages/contracts/src/invoices.ts`: `Invoice` с `InvoiceStatus` (draft/sent/paid/overdue/skipped), `InvoiceRecipient` (client/tutor), `InvoiceEvent` с kind (generated/amount_changed/sent/paid/overdue/skipped). Схемы Generate / UpdateAmount / Transition.
- Моки: пустые коллекции `invoicesStore` / `invoiceEventsStore` — генерируются в UI из существующих weekly counts.
- Route Handlers: `/api/invoices` (GET с фильтрами contractId/status, POST — создаёт пару инвойсов client/tutor из WeeklyLessonCount с учётом commissionRate и currency из system-settings), `/api/invoices/[id]` (PATCH — правка amount для draft/sent с записью amount_changed события), `/api/invoices/[id]/transition` (`send` / `mark_paid` / `mark_overdue` / `skip` с проверкой разрешённых переходов — draft→sent/skipped, sent→paid/overdue/skipped, overdue→paid/skipped, terminal paid/skipped).
- UI в карточке контракта: таб «Инвойсы» — кнопки генерации на каждый weekly count (disable если уже сгенерировано), список инвойсов с inline-правкой суммы, статусным badge'ом, кнопками Отправить / Оплачен / Просрочен / Пропустить в зависимости от текущего статуса.
- Dashboard: блоки «Требуют внимания» (просроченные инвойсы / непрочитанные диалоги / просроченные задачи / в поиске репетитора) и «Сводка» (активные контракты, средняя ставка; для LeadGen — свои лиды).
- Приёмка: инвойсы формируются парами (client/tutor) с учётом комиссии, правятся, проходят все статусы, «требуют внимания» отражается на дашборде.

### 2026-04-24 — FE-6: Назначение, пробный, контракты и разовые

- `packages/contracts`: `Contract` (commissionRate, status active/paused/closed_won/closed_lost, pausedAt/closedAt/closeReason), `ContractEvent` (created/paused/resumed/tutor_replaced/closed), `WeeklyLessonCount`, `OneTimeDealPayment` (pending/paid/missed); `Task` (6 kinds + статусы), `CalendarEvent` (trial / regular_lesson).
- Моки-сиды: 1 активный контракт, 2 задачи, 2 календарных события, 1 pending разовый платёж.
- Route Handlers: `/api/contracts` (+`[id]` + `pause`/`resume`/`close`/`replace-tutor` — каждое действие добавляет ContractEvent); `/api/weekly-lessons` (upsert по week); `/api/tasks` (+`[id]`), `/api/calendar-events`, `/api/one-time-payments` (+`[id]`).
- UI `/contracts`: таблица + карточка-диалог с табами Данные / Уроки / События / Инвойсы(placeholder). Действия pause/resume/replace/close с диалогами причин.
- UI `/tasks`: список с фильтрами «Все/Активные/Закрытые», действия Готово/+1ч/Отменить, создание ручных задач.
- UI `/calendar`: группировка по дням, типы trial/regular, добавление события.
- Приёмка: контрактная заявка (пауза → возобновление → замена → закрытие), разовый заказ (оплата), еженедельный ввод уроков.

### 2026-04-24 — FE-5: Заявки, воронка, репетиторы

- `packages/contracts/src/tutors.ts`: `Tutor` с subjects[], hourlyRate, experienceYears, статус active/paused/blocked. `packages/contracts/src/requests.ts`: `Request` с `RequestStageKind` (10 стадий без `new_dialog`, который только у Inbox), `RequestResponse` с `RequestResponseStatus`, `Trial` с `TrialResult`, схемы Create/Update/Transition/Publish.
- `lib/funnel/state-machine.ts`: таблица переходов TRANSITIONS по каждой стадии, `canTransition`, `requiresRejectionReason`, `requiresTutor`, `validateTransition`. Закрытие в отказ требует `rejectionReasonId`; `tutor_found`/`trial_scheduled` требуют `tutorId`. Терминальные стадии `closed_won`/`closed_lost` без переходов.
- Моки-сиды: 4 репетитора (с предметами и ставками), 3 заявки в разных стадиях, 2 отклика на req_1.
- Route Handlers: `/api/tutors` (+`[id]` PATCH), `/api/requests` (GET с RBAC + фильтром стадии + поиском, POST), `/api/requests/[id]` (GET/PATCH с ownership), `/api/requests/[id]/transition` (валидирует переход через state machine → 409 при запрете), `/api/requests/[id]/publish` (публикация + автоперевод `request_created → published`), `/api/request-responses` (GET + POST), `/api/request-responses/[id]` (PATCH для смены статуса).
- UI `/tutors`: таблица с предметами (chip-ы), ставкой, опытом, статусом. CRUD-диалог с мульти-выбором предметов через Checkbox.
- UI `/requests`: таблица с фильтром по стадии (выдача цветного chip из настроек), предмет/тип/бюджет/каналы/обновление. Карточка-диалог с 4 табами — Данные / Пост заявки (preview + редактор каналов + кнопка Публикация) / Отклики (добавление вручную для демо, смена статуса через Select) / Переходы (список доступных с inline-селектами причины/репетитора).
- UI `/funnel`: Kanban с HTML5 DnD, колонки из стадий (цветная метка), карточки заявок с клиентом/предметом/бюджетом. При drop — проверка через state machine; для `closed_lost`/`tutor_found`/`trial_scheduled` открывается диалог с выбором причины/репетитора. Запрещённые переходы визуально затенены, показывается toast «Переход запрещён». Оптимистичное обновление с откатом на ошибке.
- Приёмка: заявка проходит по Kanban от формирования до «Поиск репетитора», правила переходов соблюдаются, публикация работает, отклики можно добавлять вручную.

### 2026-04-24 — FE-4: Inbox (3-колоночный)

- `packages/contracts/src/inbox.ts`: `Dialog` (channel + externalId + stage + unread + slaDueAt + связи с client/lead/request), `Message` (direction in/out + read + authorName), `MessengerChannel` (TG/WA/Viber/IG/FB), `sendMessageSchema` / `initiateDialogSchema` / `createLeadFromDialogSchema`.
- Моки-сиды: 3 диалога (TG/WA/TG) с разными стадиями и unread, 10 сообщений (включая только-что-пришедшие, с несколькими непрочитанными у dlg_2/dlg_3).
- Route Handlers: `/api/dialogs` (GET — RBAC-фильтр, поиск, stage/mine), `/api/dialogs/[id]` (GET помечает входящие как read + обнуляет unread), `/api/dialogs/[id]/messages` (POST отправка + обновление last preview + автоназначение текущего диспетчера), `/api/dialogs/initiate` (инициация диалога с первым сообщением), `/api/dialogs/[id]/simulate-incoming` (мок входящего из пула фраз), `/api/dialogs/[id]/create-lead` (создаёт Lead + Client при необходимости, меняет stage → lead_created).
- `lib/fake-realtime.ts`: event-bus + `useFakeRealtimePoll(handler, { intervalMs })` — 20-сек поллинг + внешний `emit`.
- `lib/format.ts`: `formatRelativeTime` / `formatFull` / `formatCurrency` через `Intl.*`.
- UI `/inbox`: 3-колоночный layout без паддинга страницы; `DialogList` (поиск, фильтры «Все/Не назначенные», виртуализация через overflow, unread-бейдж, SLA-бейдж для `new_dialog`, кнопка «Написать первым» с диалогом выбора канала/контакта/первого сообщения), `DialogThread` (поток сообщений, bubble UI, вложения-stub отсутствуют, textarea с Enter=send / Shift+Enter=newline, кнопка «Симулировать входящее»), `ContextPanel` (детали диалога + действия по стадии: `new_dialog` → «Создать лид из диалога» через диалог с именем/телефоном/предметом/заметкой; другие стадии — disabled placeholder под FE-5/6).
- Приёмка: диспетчер ведёт полную переписку на мок-канале, SLA-бейджи и unread корректны, realtime-симуляция обновляет список каждые 20с и по триггеру кнопки.

### 2026-04-24 — FE-3: Пользователи, клиенты, LeadGen

- `packages/contracts/src/clients.ts`: `Client` + `ClientContact` (7 каналов контакта) + `Lead` (статусы new/assigned/converted/rejected) + Create/Update/Assign схемы + `createUserSchema`/`updateUserSchema` (admin CRUD).
- Моки-сиды: 3 клиента с телефонами и 5 контактами, 3 лида с разными статусами.
- Route Handlers: `/api/clients` (GET с пагинацией + поиском + RBAC-фильтром по dispatcherId, POST с dup-check по телефону → 409), `/api/clients/[id]` (GET/PATCH с row-level ownership), `/api/clients/check-duplicate` (по нормализованному телефону); `/api/users` (GET + POST admin-only, email-unique), `/api/users/[id]` (PATCH); `/api/leads` (GET — ролевая фильтрация, POST — автосоздание клиента или привязка к дублю), `/api/leads/[id]/assign` (POST admin-only, проверка роли диспетчера).
- `lib/phone.ts` — `normalizePhone()` для дедупликации.
- UI `/dispatchers` (admin): таблица пользователей, создание (email + name + role + password ≥ 8), inline-смена роли и статуса.
- UI `/clients`: таблица с поиском, карточка-диалог с табами (Карточка / Контакты / Заявки / Контракты / Инвойсы — последние три заглушки под FE-5/6/7), inline-редактирование имени/заметки, назначение диспетчера (только admin). Создание с live-проверкой дубля по телефону.
- UI `/leadgen`: таблица лидов со статусами (цветной StatusBadge), admin может назначать диспетчера через Select, LeadGen видит только свои. Создание лида с проверкой дубля — при дубле лид привязывается к существующему клиенту, toast.warning.
- RBAC: dispatcher видит только свой список клиентов и лидов (row-level); admin — всех. LeadGen — только свои лиды.

### 2026-04-24 — FE-2: Справочники и настройки (Admin)

- `packages/contracts` расширен: `subjects.ts` (Subject + SubjectChannel + dealType), `funnel.ts` (FunnelStage с kind/order/color/SLA/scriptId/terminal + RejectionReason), `templates.ts` (MessageTemplate с kind/variables + Script), `settings.ts` (SystemSettings с invoiceWeekday/DueDays/currency + 5 autoActions).
- Моки-сиды: 5 предметов, 4 субъект-канала, 11 этапов воронки с цветами и SLA, 5 причин отказа, 6 шаблонов с переменными `{{var}}`, 3 скрипта.
- Route Handlers (admin-only на мутациях): `/api/subjects` (+`[id]`), `/api/subject-channels` (+`[id]`), `/api/funnel-stages` (+`[id]` + `/reorder`), `/api/rejection-reasons` (+`[id]`), `/api/message-templates` (+`[id]`), `/api/scripts` (+`[id]`), `/api/system-settings`.
- `lib/api/response.ts` переведён на `z.output<Schema>` — корректный вывод типов с `.default()` в схемах.
- UI `/settings` с 5 табами: Предметы, Этапы воронки (SortableList + ColorPicker + SLA), Причины отказа, Шаблоны (карточки + CRUD-диалог с автоподхватом переменных), Система (invoice + autoActions).
- UI `/scripts`: карточки + CRUD + привязка к stage-kind.
- UI-кит: `ColorPicker`, `SortableList` (↑↓ кнопки).
- Приёмка: admin настраивает всю систему в UI; данные живут в памяти, переживают навигацию; non-admin на мутациях получает 403.

### 2026-04-24 — FE-1: Auth, layout, роли

- NextAuth credentials provider со стратегией JWT (без БД), `authorize()` читает из `usersStore` + `verifyPassword()` из mock-хранилища паролей (3 демо-аккаунта: admin/dispatcher/leadgen). `packages/contracts` расширен `userSettingsSchema`, `changePasswordRequestSchema`, `updateUserSettingsSchema`.
- `middleware.ts` с `withAuth`: неавторизованных редиректит на `/login`, авторизованных с `/login` — на `/dashboard`; public маршруты — `/api/auth`, `/api/health`, `_next/*`.
- Route Handlers: `/api/auth/[...nextauth]`, `/api/me` (профиль + настройки), `/api/me/settings` (PUT), `/api/me/password` (POST) с единым форматом ошибок через `lib/api/response.ts` и guards `requireApiSession` / `requireApiRole`.
- Route groups: `app/(auth)/login` (страница + RHF+zod форма с демо-кнопками) и `app/(app)/*` с общим layout (Sidebar + Topbar). `app/page.tsx` — редирект на `/dashboard`.
- `components/layout/` — `Sidebar` (с иконками из `lucide-react`, активный элемент по pathname), `Topbar` (theme toggle, dropdown-меню с выходом, аватар, RoleBadge), `RoleGuard`, `ComingSoon`, `NavIcon`. `lib/navigation.ts` — единый источник меню с ролями.
- Страницы-заглушки на все разделы из меню (inbox, funnel, requests, contracts, clients, tutors, leadgen, dispatchers, scripts, settings, tasks, calendar) — каждая проверяет роль через `requireRole(...)` и рендерит `<ComingSoon stage="FE-X" />`.
- `Dashboard` с ролевыми плитками (admin/dispatcher/leadgen — разные наборы).
- `Profile`: смена пароля (RHF+zod), настройки уведомлений (6 категорий, Switch), тихие часы (enabled + from/to), тема через `next-themes`. Все настройки — через `/api/me/settings` с оптимистичным обновлением.
- Расширен `@tutorcrm/ui`: `Card`, `Avatar`, `DropdownMenu`, `Dialog`, `ConfirmDialog`, `Label`, `Separator`, `Tabs`, `Switch`, `Checkbox`, `Textarea`, `FormField`, `Toaster` (sonner), `PageHeader`.
- `Providers` обновлён: `SessionProvider` + `QueryClientProvider` (TanStack Query) + `ThemeProvider` + `Toaster`.
- `apps/web/lib/api-client.ts` — типизованный клиент с `ApiClientError`, `apiFetch`, `api.get/post/put/patch/delete`.
- Приёмка: можно войти под admin / dispatcher / leadgen — каждый видит свой набор пунктов меню; `/` редиректит на `/login` без сессии и на `/dashboard` с сессией; профиль сохраняет настройки; typecheck и `next build` чисты (21 маршрут).

### 2026-04-24 — FE-0: инфраструктура фронтенда

- Инициализирован pnpm-монорепо + Turborepo; общий `tsconfig.base.json`, `turbo.json`, `pnpm-workspace.yaml`.
- Пакеты: `apps/web`, `packages/ui`, `packages/contracts`, `packages/config`, `packages/tsconfig` (пресеты `base`/`library`/`next`).
- Линтинг/форматирование: корневой `.eslintrc.cjs` (ts-eslint + import/order с path-groups для `@tutorcrm/*`), `.prettierrc.json` + prettier-plugin-tailwindcss, `.editorconfig`.
- Pre-commit: husky (`.husky/pre-commit`, `.husky/commit-msg`), lint-staged, commitlint (conventional).
- `@tutorcrm/config`: zod-схема env + `loadEnv()` (NODE_ENV, локаль/TZ, MOCK_*, NEXTAUTH_*, LOG_LEVEL).
- `@tutorcrm/contracts`: первые zod-схемы — `User`/`Role`/`UserStatus`, общая пагинация (`paginationQuerySchema` + `paginatedResponseSchema`), унифицированный `ApiError` с кодами.
- `@tutorcrm/ui`: Tailwind-пресет + CSS-токены (`src/styles/globals.css`), базовые компоненты — `Button`, `Input`, `Select`, `Skeleton`, `EmptyState`, `RoleBadge`, `StatusBadge`, `DataTable` (с состоянием loading/empty). Storybook (Vite, addon-a11y/essentials/interactions) + стори на каждый компонент.
- `apps/web`: Next.js 14 (App Router, output: 'standalone', transpilePackages для workspace-пакетов), Tailwind c пресетом из `@tutorcrm/ui`, next-intl (RU, TZ Europe/Kyiv) через плагин, next-themes. Базовый `layout.tsx` + `providers.tsx`, `/` — заглушка, `error.tsx` / `not-found.tsx` / `global-error.tsx`, `/api/health` (показывает env и состояние моков). i18n-сообщения `messages/ru.json`.
- Мок-инфраструктура: `apps/web/mocks/settings.ts` (управляемые задержки/ошибки из env), `mocks/store/collection.ts` (типизированный in-memory `MockCollection<T>` с latency/error-gate), сид пользователей (3 роли) в `mocks/store/users.ts`.
- Docker: multi-stage `apps/web/Dockerfile` (deps → builder → runner на Next standalone), `.dockerignore`, `docker-compose.yml` + `docker-compose.override.yml` (dev через volume-mount и `pnpm dev`).
- `.env.example`, `.gitignore`, `.nvmrc`, `.npmrc` с public-hoist паттернами для `next/react` (фикс resolve-ошибок под pnpm), корневой `README.md` с инструкциями запуска.
- Приёмка: `pnpm --filter @tutorcrm/web build` проходит (4 статических маршрута + `/api/health` как dynamic); `pnpm --filter ... typecheck` — всех пакетов чисто; dev-сервер отвечает 200 на `/` и валидным JSON на `/api/health`.
