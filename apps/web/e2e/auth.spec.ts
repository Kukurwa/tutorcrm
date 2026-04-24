import { expect, test } from '@playwright/test';

test.describe('Auth', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    const res = await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    expect(res?.status()).toBeLessThan(500);
  });

  test('login with demo admin account', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@tutorcrm.local');
    await page.getByLabel('Пароль').fill('admin123');
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText(/Здравствуйте/)).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@tutorcrm.local');
    await page.getByLabel('Пароль').fill('wrong');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText(/неверный/i)).toBeVisible();
  });
});
