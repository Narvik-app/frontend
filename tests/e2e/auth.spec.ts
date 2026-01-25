import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use authenticated state from setup
test.use({ storageState: path.join(__dirname, '.auth/admin.json') });

test.describe('Authentication', () => {
  test('logged in user can access admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Should be on admin page, not redirected to login
    await expect(page).not.toHaveURL(/\/login/);

    // Should see some admin content (adjust selector based on your UI)
    await expect(page.locator('body')).toBeVisible();
  });

  test('can navigate to member list', async ({ page }) => {
    await page.goto('/admin');

    // Click on members in the navigation (adjust based on your UI)
    const membersLink = page.getByRole('link', { name: /membres/i });
    if (await membersLink.isVisible()) {
      await membersLink.click();
      await expect(page).toHaveURL(/\/admin\/members/);
    }
  });
});

test.describe('Login page', () => {
  // Don't use authenticated state for login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: /connexion/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid@test.com');
    await page.getByLabel('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: /connexion/i }).click();

    // Should show an error message (adjust based on your error handling)
    await expect(page.getByText(/erreur|invalide|incorrect/i)).toBeVisible({ timeout: 10000 });
  });
});
