import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

test.describe('account page of a club member', () => {
  test.use({ storageState: STORAGE_STATE.MEMBER });

  test('shows the identity, membership, presences and security sections', async ({ page }) => {
    await page.goto('/self');

    const header = page.getByTestId('self-header');
    await expect(header).toContainText('member@club1.fr');
    await expect(header).toContainText(/Saison .*à jour|Saison non renouvelée/);

    await expect(page.getByTestId('self-membership')).toContainText('Mon adhésion');
    await expect(page.getByTestId('self-presences')).toContainText('Mes présences');
    await expect(page.getByText('Connexion & sécurité')).toBeVisible();
    await expect(page.getByTestId('passkeys-card')).toBeVisible();
  });
});

test.describe('account page without club', () => {
  test.use({ storageState: STORAGE_STATE.SUPER_ADMIN });

  test('explains how to link the account to a club', async ({ page }) => {
    await page.goto('/self');

    await expect(page.getByTestId('self-header')).toContainText('admin@admin.com');
    await expect(page.getByText('Compte lié à aucun club')).toBeVisible();
    await expect(page.getByText('Connexion & sécurité')).toBeVisible();
  });
});
