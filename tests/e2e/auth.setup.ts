import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '.auth/admin.json');

/**
 * Authentication setup - logs in as club admin and saves state
 * This runs before other tests via the 'setup' project dependency
 */
setup('authenticate as club admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials (from _InitStory: admin@club1.fr / admin123)
  await page.getByLabel('Email').fill('admin@club1.fr');
  await page.getByLabel('Mot de passe').fill('admin123');

  // Submit login form
  await page.getByRole('button', { name: 'Connexion', exact: true }).click();

  // Wait for successful login - should redirect away from login page
  await expect(page).not.toHaveURL(/\/login/);

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
