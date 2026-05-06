// Генератор PDF-инструкции «Карта панели TutorCRM» для клиента.
//
// Поднимает Next.js dev-сервер на отдельном порту (через child_process),
// логинится под admin, проходит по основным разделам, накладывает красные
// обводки с цифрами на нужные элементы, делает скриншоты и собирает HTML →
// PDF через Chromium (page.pdf()).
//
// Запуск: `pnpm --filter @tutorcrm/web guide`.
// Результат: docks/guide-client.pdf (в корне репо).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WEB_ROOT = path.resolve(__dirname, '..');
const OUT_PDF = path.join(REPO_ROOT, 'docks', 'guide-client.pdf');

let PORT = Number(process.env.GUIDE_PORT ?? 0);
let BASE = '';

async function pickPort() {
  if (PORT) return PORT;
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3030;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* */
      }
    }
  }
}

const ADMIN_EMAIL = 'admin@tutorcrm.local';
const ADMIN_PASSWORD = 'admin123';

// ====== Поднятие dev-сервера ======

const ENV_LOCAL = path.join(WEB_ROOT, '.env.local');
const ENV_LOCAL_BACKUP = path.join(WEB_ROOT, '.env.local.guide-bak');

async function ensureEnvLocal() {
  // На Windows env через child_process иногда не передаётся в pnpm exec.
  // Кладём временный .env.local рядом с приложением — Next.js сам его подхватит.
  if (existsSync(ENV_LOCAL)) {
    await rename(ENV_LOCAL, ENV_LOCAL_BACKUP);
  }
  const content = [
    `NEXTAUTH_URL=${BASE}`,
    `NEXTAUTH_SECRET=guide-pdf-secret-not-for-prod-32b-min`,
    `MOCK_ENABLED=true`,
    `MOCK_LATENCY_MS=0`,
    `MOCK_ERROR_RATE=0`,
    `NEXT_PUBLIC_APP_NAME=TutorCRM`,
    `NEXT_PUBLIC_DEFAULT_LOCALE=ru`,
    `NEXT_PUBLIC_DEFAULT_TZ=Europe/Kyiv`,
    '',
  ].join('\n');
  await writeFile(ENV_LOCAL, content, 'utf8');
}

async function restoreEnvLocal() {
  try {
    await unlink(ENV_LOCAL);
  } catch {
    /* */
  }
  if (existsSync(ENV_LOCAL_BACKUP)) {
    await rename(ENV_LOCAL_BACKUP, ENV_LOCAL);
  }
}

async function startProdServer() {
  PORT = await pickPort();
  BASE = `http://localhost:${PORT}`;
  await ensureEnvLocal();
  console.log(`▶ Старт next start на порту ${PORT}… (требуется готовый .next от build)`);
  const isWin = process.platform === 'win32';
  const proc = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: WEB_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXTAUTH_URL: BASE,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'guide-pdf-secret-not-for-prod-32b-min',
      MOCK_ENABLED: 'true',
      MOCK_LATENCY_MS: '0',
      MOCK_ERROR_RATE: '0',
      NEXT_PUBLIC_APP_NAME: 'TutorCRM',
      NEXT_PUBLIC_DEFAULT_LOCALE: 'ru',
      NEXT_PUBLIC_DEFAULT_TZ: 'Europe/Kyiv',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin, // на Windows .cmd требует shell
  });

  proc.stdout?.on('data', (chunk) => {
    const line = chunk.toString();
    if (line.includes('Ready') || line.includes('Local') || line.includes('started'))
      process.stdout.write(`  next: ${line}`);
  });
  proc.stderr?.on('data', (chunk) => {
    process.stderr.write(`  next-err: ${chunk}`);
  });

  // Ждём пока /api/health вернёт 200
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) {
        console.log('▶ Сервер готов');
        return proc;
      }
    } catch {
      // ещё не запустился
    }
    await sleep(1000);
  }
  proc.kill();
  throw new Error(
    'next start не поднялся за 60 секунд. Запусти сначала `pnpm --filter @tutorcrm/web build`.',
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ====== Хелперы для обводок и скриншотов ======

/**
 * Накладывает красные обводки с номерами на указанные элементы.
 * `items`: [{ selector, text?, label?, occurrence? }]
 *  - selector: обычный CSS-селектор
 *  - text: фильтр по containsText (опционально, проверяется на innerText)
 */
async function highlight(page, items) {
  await page.evaluate((items) => {
    const oldOverlay = document.getElementById('__guide_overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = '__guide_overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
    document.body.appendChild(overlay);
    let n = 0;
    items.forEach((it) => {
      let candidates = Array.from(document.querySelectorAll(it.selector));
      if (it.text) {
        const needle = it.text.toLowerCase();
        candidates = candidates.filter((el) =>
          (el.textContent ?? '').toLowerCase().includes(needle),
        );
      }
      const idx = it.occurrence ?? 0;
      const el = candidates[idx];
      if (!el) return;
      n += 1;
      const rect = el.getBoundingClientRect();
      const box = document.createElement('div');
      box.style.cssText = `position:absolute;left:${rect.left - 6}px;top:${rect.top - 6}px;width:${
        rect.width + 12
      }px;height:${rect.height + 12}px;border:3px solid #ef4444;border-radius:8px;box-shadow:0 0 0 3px rgba(239,68,68,0.18);`;
      const num = document.createElement('div');
      num.textContent = String(n);
      num.style.cssText =
        'position:absolute;left:-16px;top:-16px;width:30px;height:30px;background:#ef4444;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;border:2px solid white;';
      box.appendChild(num);
      overlay.appendChild(box);
    });
  }, items);
}

async function clearHighlight(page) {
  await page.evaluate(() => document.getElementById('__guide_overlay')?.remove());
}

async function captureSection(page, def) {
  console.log(`  · ${def.title}`);
  if (def.url) {
    await page.goto(`${BASE}${def.url}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // даём время отрендериться SSR-данным и клиентским query
    try {
      await page.waitForLoadState('networkidle', { timeout: 8_000 });
    } catch {
      /* networkidle не достигнут — это нормально для SSE/poll */
    }
  }
  if (def.beforeShot) await def.beforeShot(page);
  await page.waitForTimeout(600);
  await highlight(page, def.callouts ?? []);
  await page.waitForTimeout(200);
  const buffer = await page.screenshot({ fullPage: false });
  await clearHighlight(page);
  return {
    title: def.title,
    blurb: def.blurb,
    notes: (def.callouts ?? []).map((c) => c.label),
    image: buffer.toString('base64'),
  };
}

// ====== Логин ======

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

// ====== Описания разделов ======

const sections = [
  {
    title: 'Главный экран — Дашборд',
    url: '/dashboard',
    blurb:
      'То, что видит руководитель, когда заходит в систему. Сводка по операциям и финансам за выбранный период.',
    callouts: [
      { selector: 'aside[data-sidebar="sidebar"]', label: 'Боковое меню — все разделы системы' },
      { selector: 'header', label: 'Шапка — поиск, уведомления, профиль' },
      { selector: 'main h1, main h2', label: 'Заголовок раздела' },
    ],
  },
  {
    title: 'Inbox — переписка с клиентами',
    url: '/inbox',
    blurb:
      'Все диалоги из мессенджеров (Telegram / WhatsApp / Viber / Instagram / Facebook) в одном месте. Слева — список диалогов, в центре — переписка, справа — карточка клиента и действия.',
    callouts: [
      {
        selector: '[class*="dialog-list"], aside:has(input[placeholder*="оиск"])',
        label: 'Список диалогов с фильтрами и папками',
      },
      { selector: 'main', label: 'Переписка и поле ввода со скриптами' },
    ],
  },
  {
    title: 'Воронка — этапы заявок',
    url: '/funnel',
    blurb:
      'Канбан-доска со стадиями заявки. Карточку можно перетаскивать между колонками — система не даст нарушить правильный порядок этапов.',
    callouts: [
      { selector: 'main', label: 'Колонки этапов: лид → заявка → поиск → пробный → активный' },
    ],
  },
  {
    title: 'Заявки',
    url: '/requests',
    blurb:
      'Все активные и закрытые заявки с возможностью фильтрации. Здесь же кнопка «Перевыставить» для устаревших заявок без откликов.',
    callouts: [
      {
        selector: 'main [role="tablist"]',
        label: 'Вкладки по предметам — быстрый фильтр',
      },
    ],
  },
  {
    title: 'Контракты',
    url: '/contracts',
    blurb:
      'Список всех учеников на контрактных условиях. Клик по строке открывает карточку с уроками, платежами, инвойсами и историей событий.',
    callouts: [{ selector: 'main', label: 'Excel-таблица контрактов' }],
  },
  {
    title: 'Клиенты',
    url: '/clients',
    blurb:
      'База всех клиентов с компактной таблицей заказов. Открыть клиента целиком — клик по имени или коду заказа (А-1, АК-1.1 и т.п.).',
    callouts: [{ selector: 'main', label: 'Список клиентов и заказов' }],
  },
  {
    title: 'Репетиторы',
    url: '/tutors',
    blurb:
      'База репетиторов разделена на «Контрактных» и «Обычных», внутри — подвкладки по предметам. В карточке репетитора — украинские поля, история заявок, флаг чёрного списка.',
    callouts: [
      {
        selector: 'main [role="tablist"]',
        label: 'Вкладки Контрактные / Обычные → подвкладки по предметам',
      },
    ],
  },
  {
    title: 'Календарь',
    url: '/calendar',
    blurb: 'Все пробные и регулярные уроки на ленте по дням.',
  },
  {
    title: 'Пользователи',
    url: '/users',
    blurb:
      'Сотрудники системы. Здесь администратор создаёт диспетчеров и лидогенов, меняет роли и блокирует.',
    callouts: [{ selector: 'main', label: 'Список сотрудников + смена роли inline' }],
  },
  {
    title: 'Зарплаты — РОП',
    url: '/payroll',
    blurb:
      'Расчёт зарплаты руководителя отдела продаж по прогрессивной шкале от оборота. Цифры в шкале редактируются прямо здесь — изменения сохраняются по кнопке «Сохранить» справа.',
    beforeShot: async (page) => {
      // первая вкладка по умолчанию активна
    },
    callouts: [
      { selector: 'main [role="tablist"]', label: 'Переключение РОП / Диспетчеры' },
      {
        selector: 'main table',
        label: 'Прогрессивная шкала — диапазоны оборота, % и фикс. ставка',
      },
      {
        selector: 'main button',
        text: 'Сохран',
        label: 'Сохранение изменений (активно только если есть несохранённые правки)',
      },
    ],
  },
  {
    title: 'Зарплаты — Диспетчеры',
    url: '/payroll',
    blurb:
      'Матрица 5×5: строки — диапазон оборота, колонки — стаж работы. На каждый случай — свой % и фикс. ставка. Ниже — итог по каждому диспетчеру за выбранный месяц.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: 'ЗП диспетчеров' }).click();
      await page.waitForTimeout(400);
    },
    callouts: [{ selector: 'main table', label: 'Матрица 5×5 (стаж × оборот)' }],
  },
  {
    title: 'Метрики — Прибыль',
    url: '/metrics',
    blurb:
      'Прибыль за выбранный месяц с разбивкой по типам сделок и диспетчерам. Месяц меняется в верхней панели.',
    callouts: [
      { selector: 'input[type="month"]', label: 'Период — выбор месяца' },
      { selector: 'main [role="tablist"]', label: 'Шесть вкладок метрик' },
    ],
  },
  {
    title: 'Метрики — План / Факт',
    url: '/metrics',
    blurb:
      'Сколько денег планировалось получить и сколько реально получили. Разбивка по диспетчерам, предметам и причинам отказа. Учитываются только заявки с конечным результатом.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: /План/ }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    title: 'Метрики — Контрактные',
    url: '/metrics',
    blurb:
      'Прибыль по контрактным сделкам помесячно — по предметам, диспетчерам и репетиторам за последние 6 месяцев.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: 'Контрактные' }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    title: 'Метрики — Рентабельность',
    url: '/metrics',
    blurb:
      'Сравнение: сколько мы заработали с репетитора на контракте против того, сколько заработали бы на обычных условиях. Параметры расчёта (сколько дней не учитываем, прайс «обычных») — в кнопке «Параметры» справа.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: 'Рентабельность' }).click();
      await page.waitForTimeout(400);
    },
    callouts: [
      {
        selector: 'button',
        text: 'Параметры',
        label: 'Настройки расчёта (cutoff и прайс)',
      },
    ],
  },
  {
    title: 'Метрики — Удержание',
    url: '/metrics',
    blurb:
      'Сколько клиентов остаются на контрактах. По месяцам и предметам: кто пришёл, кто отвалился сразу, кто через месяц-два, кто через 3+.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: 'Удержание' }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    title: 'Метрики — Диспетчеры',
    url: '/metrics',
    blurb:
      'Активность каждого диспетчера за месяц: сколько лидов, заявок, успехов и отказов. Плюс SLA — насколько быстро диспетчер отвечает на новый диалог и находит репетитора.',
    beforeShot: async (page) => {
      await page.getByRole('tab', { name: 'Диспетчеры' }).click();
      await page.waitForTimeout(400);
    },
  },
];

// ====== HTML-сборка для PDF ======

function buildHtml(captures) {
  const cssReset = `
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; }
    h1 { font-size: 22pt; margin: 0 0 8pt; }
    h2 { font-size: 14pt; margin: 0 0 6pt; }
    .cover { page-break-after: always; padding: 20mm 0; }
    .cover .lead { color: #64748b; font-size: 11pt; line-height: 1.5; max-width: 130mm; }
    .cover ul { padding-left: 18pt; line-height: 1.7; font-size: 10pt; }
    .section { page-break-inside: avoid; margin-bottom: 14pt; }
    .section + .section { page-break-before: always; }
    .blurb { color: #475569; font-size: 10pt; line-height: 1.5; margin: 0 0 10pt; max-width: 175mm; }
    .shot { width: 100%; max-width: 180mm; border: 1px solid #cbd5e1; border-radius: 4pt; }
    .callouts { margin: 8pt 0 0; padding-left: 22pt; }
    .callouts li { font-size: 10pt; line-height: 1.5; padding-left: 4pt; margin-bottom: 2pt; }
    .num { display: inline-block; width: 14pt; height: 14pt; border-radius: 50%; background: #ef4444; color: white; text-align: center; font-size: 9pt; font-weight: 700; line-height: 14pt; margin-right: 4pt; }
    .footer { position: fixed; bottom: 4mm; right: 4mm; color: #94a3b8; font-size: 8pt; }
  `;
  const cover = `
    <div class="cover">
      <h1>TutorCRM — Карта панели</h1>
      <p class="lead">Краткий путеводитель по разделам системы. Каждая страница — один экран с подсказками.</p>
      <h2 style="margin-top: 18pt;">Что внутри</h2>
      <ul>
        <li>Дашборд — общая сводка</li>
        <li>Inbox — переписка с клиентами в одном месте</li>
        <li>Воронка и Заявки — стадии работы по заявке</li>
        <li>Контракты, Клиенты, Репетиторы, Календарь — рабочие справочники</li>
        <li>Пользователи — сотрудники и их доступ</li>
        <li>Зарплаты — расчёт ЗП РОПа и диспетчеров</li>
        <li>Метрики — прибыль, план/факт, рентабельность, удержание, активность</li>
      </ul>
      <p class="lead" style="margin-top: 18pt;">
        Демо-доступ: <b>admin@tutorcrm.local</b> / <b>admin123</b> (а также <b>dispatcher@…</b> и <b>leadgen@…</b> с паролями <b>dispatcher123</b> / <b>leadgen123</b>).
      </p>
    </div>
  `;
  const body = captures
    .map(
      (c) => `
    <div class="section">
      <h2>${escapeHtml(c.title)}</h2>
      <p class="blurb">${escapeHtml(c.blurb ?? '')}</p>
      <img class="shot" src="data:image/png;base64,${c.image}" />
      ${
        c.notes && c.notes.length
          ? `<ol class="callouts">${c.notes
              .map((n, i) => `<li><span class="num">${i + 1}</span>${escapeHtml(n)}</li>`)
              .join('')}</ol>`
          : ''
      }
    </div>
  `,
    )
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><style>${cssReset}</style></head><body>${cover}${body}<div class="footer">TutorCRM — карта панели</div></body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ====== Главная функция ======

async function run() {
  await mkdir(path.dirname(OUT_PDF), { recursive: true });

  const dev = await startProdServer();

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();

    console.log('▶ Логин под admin…');
    await login(page);

    console.log('▶ Скриншоты разделов…');
    const captures = [];
    for (const def of sections) {
      try {
        captures.push(await captureSection(page, def));
      } catch (err) {
        console.error(`  ! Раздел "${def.title}" пропущен:`, err.message ?? err);
      }
    }

    console.log('▶ Сборка HTML и экспорт PDF…');
    const html = buildHtml(captures);
    const pdfPage = await context.newPage();
    await pdfPage.setContent(html, { waitUntil: 'networkidle' });
    await pdfPage.pdf({
      path: OUT_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });

    console.log(`✓ PDF готов: ${OUT_PDF}`);
  } finally {
    if (browser) await browser.close();
    killTree(dev.pid);
    await restoreEnvLocal();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
