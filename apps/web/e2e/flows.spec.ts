import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, role: 'admin' | 'dispatcher' | 'leadgen') {
  const creds = {
    admin: { email: 'admin@tutorcrm.local', password: 'admin123' },
    dispatcher: { email: 'dispatcher@tutorcrm.local', password: 'dispatcher123' },
    leadgen: { email: 'leadgen@tutorcrm.local', password: 'leadgen123' },
  } as const;
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds[role].email);
  await page.getByLabel('Пароль').fill(creds[role].password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Sidebar & RBAC', () => {
  test('admin sees settings, dispatcher does not', async ({ page, context }) => {
    await login(page, 'admin');
    await expect(page.getByRole('link', { name: 'Настройки' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Диспетчеры' })).toBeVisible();

    const dispatcherPage = await context.browser()!.newContext().then((c) => c.newPage());
    await login(dispatcherPage, 'dispatcher');
    await expect(dispatcherPage.getByRole('link', { name: 'Настройки' })).toHaveCount(0);
    await expect(dispatcherPage.getByRole('link', { name: 'Диспетчеры' })).toHaveCount(0);
    await dispatcherPage.close();
  });

  test('leadgen сreates a lead', async ({ page }) => {
    await login(page, 'leadgen');
    await page.getByRole('link', { name: 'Лидогенерация' }).click();
    await page.getByRole('button', { name: /Новый лид/ }).click();
    await page.getByLabel('Имя клиента').fill('Тестовый Лид');
    await page.getByLabel('Предмет').fill('Физика');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page.getByText('Тестовый Лид')).toBeVisible();
  });
});

test.describe('Contract flow', () => {
  test('dispatcher opens contract and sees pause button', async ({ page }) => {
    await login(page, 'dispatcher');
    await page.getByRole('link', { name: 'Контракты' }).click();
    await page.getByText('Наталя Шевченко').first().click();
    await expect(page.getByRole('button', { name: 'Поставить на паузу' })).toBeVisible();
  });
});

test.describe('Funnel Kanban', () => {
  test('dispatcher sees kanban columns', async ({ page }) => {
    await login(page, 'dispatcher');
    await page.getByRole('link', { name: 'Воронка' }).click();
    await expect(page.getByText('Заявка сформирована')).toBeVisible();
    await expect(page.getByText('Поиск репетитора')).toBeVisible();
  });
});

test.describe('Invoices generation', () => {
  test('generate invoice pair from weekly count', async ({ page }) => {
    await login(page, 'dispatcher');
    await page.getByRole('link', { name: 'Контракты' }).click();
    await page.getByText('Наталя Шевченко').first().click();
    await page.getByRole('tab', { name: /Инвойсы/ }).click();
    await page.getByRole('button', { name: /Сгенерировать/ }).first().click();
    await expect(page.getByText(/Отправить/).first()).toBeVisible();
  });
});
