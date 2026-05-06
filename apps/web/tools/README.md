# Tools

## `guide.mjs` — генератор PDF-инструкции для клиента

Поднимает локальный prod-сервер, логинится под admin, проходит по разделам
системы, накладывает красные обводки с цифрами на ключевые элементы,
делает скриншоты и собирает их в PDF-документ через `page.pdf()` Chromium.

### Запуск

```bash
# 1. Сборка и установка Chromium для Playwright (один раз)
pnpm install
pnpm --filter @tutorcrm/web exec playwright install chromium
pnpm --filter @tutorcrm/web build

# 2. Генерация PDF
pnpm --filter @tutorcrm/web guide
```

Результат: `docks/guide-client.pdf`.

### Что под капотом

1. Скрипт берёт случайный свободный порт, кладёт временный
   `apps/web/.env.local` с `NEXTAUTH_URL` / `NEXTAUTH_SECRET` и т. п.
   (на Windows `child_process` не всегда корректно передаёт env через
   `pnpm exec`).
2. Запускает `next start` через `pnpm exec`, ждёт `/api/health`.
3. Логинится под `admin@tutorcrm.local / admin123`.
4. Для каждого раздела (`sections` в файле):
   - переходит на URL,
   - опционально выполняет `beforeShot` (например, переключает таб),
   - инжектирует overlay с красными обводками и пронумерованными
     кружками поверх элементов из `callouts`,
   - делает скриншот.
5. Собирает HTML с обложкой, текстами и скриншотами (data:URI).
6. Открывает HTML в Chromium и сохраняет в PDF (A4, печать с фоном).
7. Возвращает оригинальный `.env.local` (если был).
8. Убивает дерево процессов сервера.

### Как добавить новый раздел

В массиве `sections` добавить объект:

```js
{
  title: 'Название раздела',
  url: '/url',
  blurb: 'Короткое описание для клиента, без терминов.',
  beforeShot: async (page) => {
    // опционально: клик на таб, открытие dialog и т.п.
  },
  callouts: [
    { selector: 'CSS-селектор', label: 'Что это' },
    {
      selector: 'button',
      text: 'Сохранить', // фильтр по innerText
      label: 'Кнопка сохранения',
    },
  ],
}
```

`callouts` рисуются красными прямоугольниками с цифрами 1, 2, 3… в том
порядке, в каком указаны. Цифры повторяются в подписях под скриншотом.
