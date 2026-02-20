import path from 'path';
import {fileURLToPath} from 'url';
import {expect, type Page} from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The .auth directory is relative to this utils file: ../.auth
const AUTH_DIR = path.resolve(__dirname, '../.auth');

export const STORAGE_STATE = {
  ADMIN: path.join(AUTH_DIR, 'admin.json'),
  SUPER_ADMIN: path.join(AUTH_DIR, 'superadmin.json'),
  MEMBER: path.join(AUTH_DIR, 'member.json'),
  BADGER: path.join(AUTH_DIR, 'badger.json'),
  SUPERVISOR: path.join(AUTH_DIR, 'supervisor.json'),
};

/**
 * Logs out the current user via the UI.
 */
export async function logout(page: Page) {
  const logoutItem = page.getByRole('menuitem', { name: 'Déconnexion' });
  const userMenuButton = page.getByTestId('user-menu');

  // Wait for the user menu to be visible before interacting
  await expect(userMenuButton).toBeVisible();

  if (!await logoutItem.isVisible()) {
    await userMenuButton.click();
  }

  await logoutItem.click();

  // Verify redirected to login and it has fully loaded
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('login-submit')).toBeVisible();
}

/**
 * Logs in a user via the UI.
 * @param page The Playwright Page object
 * @param email User email
 * @param pass User password
 * @param storagePath Optional path to save the authenticated state
 */
export async function login(page: Page, email: string, pass: string, storagePath?: string) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(pass);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
  
  // Wait for the user menu to be visible to ensure auth state and dashboard have fully loaded
  await expect(page.getByTestId('user-menu')).toBeVisible();

  if (storagePath) {
    await page.context().storageState({ path: storagePath });
  }
}
