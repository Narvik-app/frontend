import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

// Use authenticated state from setup
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe('Authentication', () => {
  test('logged in user can access admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Should be on admin page, not redirected to login
    await expect(page).not.toHaveURL(/\/login/);

    // Should see some admin content
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
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

  test('can logout', async ({ page }) => {
    await page.goto('/');

    // Use the helper
    const { logout } = await import('./utils/auth');
    await logout(page);

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Connexion', exact: true })).toBeVisible();
  });
});

test.describe('Login page', () => {
  // Don't use authenticated state for login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Mot de passe')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Connexion', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid@test.com');
    await page.getByLabel('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: 'Connexion', exact: true }).click();

    // Should show an error message (adjust based on your error handling)
    await expect(page.getByText(/erreur|invalide|incorrect/i).first()).toBeVisible({ timeout: 10000 });
  });
});
