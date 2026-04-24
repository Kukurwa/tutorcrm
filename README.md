# TutorCRM

CRM для посредника между клиентами и репетиторами. Подробности — в `CLAUDE.md`, `TZ_FRONTEND.md`, `TZ_BACKEND.md`, `docks/ROADMAP.md`.

## Стек этапа FE-0

- pnpm workspaces + Turborepo
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui (в `@tutorcrm/ui`)
- next-intl (RU), next-themes
- zod-контракты в `@tutorcrm/contracts`, env в `@tutorcrm/config`
- Storybook в `@tutorcrm/ui`
- In-memory моки в `apps/web/mocks/*` с управляемой задержкой / частотой ошибок

## Структура

```
apps/
  web/              Next.js 14, App Router
packages/
  ui/               shadcn/ui + базовые компоненты + Storybook
  contracts/        zod-схемы DTO
  config/           env через zod
  tsconfig/         общие tsconfig-пресеты
docks/
  ROADMAP.md
  CHANGELOG.md
```

## Запуск

### Локально

```bash
pnpm install
cp .env.example .env
pnpm --filter @tutorcrm/web dev      # http://localhost:3000
pnpm --filter @tutorcrm/ui storybook # http://localhost:6006
```

### Через Docker

```bash
cp .env.example .env
docker compose up --build            # dev-режим через override
```

Прод-сборка:

```bash
docker compose -f docker-compose.yml up --build
```

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @tutorcrm/web e2e   # Playwright e2e (FE-10)
```

## Мок-инфраструктура

В `.env`:

- `MOCK_ENABLED=true|false` — включить моки.
- `MOCK_LATENCY_MS=300` — искусственная задержка для всех мок-операций.
- `MOCK_ERROR_RATE=0.2` — вероятность искусственной ошибки (0..1).

Здоровье мока: `GET /api/health`.
