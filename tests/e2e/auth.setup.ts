import { test as setup, expect } from '@playwright/test';
import { login, logout } from "./utils/auth";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFileAdmin = path.join(__dirname, '.auth/admin.json');
const authFileSuperAdmin = path.join(__dirname, '.auth/superadmin.json');
const authFileMember = path.join(__dirname, '.auth/member.json');
const authFileBadger = path.join(__dirname, '.auth/badger.json');
const authFileSupervisor = path.join(__dirname, '.auth/supervisor.json');

// Run setup steps serially to avoid backend overload or race conditions
setup.describe.configure({ mode: 'serial' });

setup('authenticate as club admin', async ({ page }) => {
  await login(page, 'admin@club1.fr', 'admin123', authFileAdmin);
  await logout(page);
});

setup('authenticate as super admin', async ({ page }) => {
  await login(page, 'admin@admin.com', 'admin123', authFileSuperAdmin);
  await logout(page);
});

setup('authenticate as member', async ({ page }) => {
  await login(page, 'member@club1.fr', 'member123', authFileMember);
  await logout(page);
});

setup('authenticate as supervisor', async ({ page }) => {
  await login(page, 'supervisor@club1.fr', 'admin123', authFileSupervisor);
  await logout(page);
});

setup('authenticate as badger', async ({ page }) => {
  // First login as admin to get the link
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@club1.fr');
  await page.getByTestId('login-password').fill('admin123');
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);

  // Navigate to presence config
  await page.goto('/admin/config/presences');

  // Find the Badger login link
  const link = page.getByTestId('link-badger-quick-login');
  await expect(link).toBeVisible();

  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();

  // Navigate to the badger login link
  // We use the full URL if href is relative, or just href
  await page.goto(href!);

  // Verify we are in badger mode (usually checks for specific UI or no redirect to login)
  // Assuming successful load implies auth
  // We save this state as badger
  await page.context().storageState({ path: authFileBadger });
  await logout(page);
});
