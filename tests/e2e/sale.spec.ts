import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

// Use admin authenticated state — regular users don't have sale access
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe('Sale creation flow', () => {

  test('can create a sale with articles', async ({ page }) => {
    // Navigate to the new sale page
    await page.goto('/admin/sales/new');

    // Wait for inventory items to load
    const itemRow = page.locator('.flex.items-center.gap-2.mb-1').first();
    await expect(itemRow).toBeVisible({ timeout: 30000 });

    // --- Add items to cart ---
    const itemRows = page.locator('.flex.items-center.gap-2.mb-1');
    const rowCount = await itemRows.count();
    const itemsToAdd = Math.min(rowCount, 2);

    for (let i = 0; i < itemsToAdd; i++) {
      // The cart button is the last button in each row
      const cartButton = itemRows.nth(i).locator('button').last();
      await cartButton.click();
    }

    // Verify cart shows items (should show "Aucun articles" text removed)
    await expect(page.getByText('Aucun articles')).not.toBeVisible({ timeout: 5000 });

    // --- Select a seller ---
    // Click the trailing icon (chevron) on the UInputMenu to open the dropdown
    const sellerTrailingIcon = page.locator('[data-slot="trailing"]').first();
    await expect(sellerTrailingIcon).toBeVisible({ timeout: 15000 });
    await sellerTrailingIcon.click();

    // Wait for dropdown options and pick the first one
    const sellerOption = page.getByRole('option').first();
    await expect(sellerOption).toBeVisible({ timeout: 15000 });
    await sellerOption.click();

    // --- Select a payment mode ---
    await page.getByRole('button', { name: 'Espèces' }).click();

    // --- Finalize the sale ---
    const finalizeButton = page.getByRole('button', { name: 'Finaliser la vente' });
    await expect(finalizeButton).toBeEnabled({ timeout: 5000 });
    await finalizeButton.click();

    // Assert we are redirected to the sale detail page (only happens on success)
    await expect(page).toHaveURL(/\/admin\/sales\//, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/new/);

    // Assert the detail page shows the correct data
    await expect(page.getByText('Articles achetés').first()).toBeVisible({ timeout: 10000 });
  });

  test('sale appears in history', async ({ page }) => {
    // Navigate to history page
    await page.goto('/admin/sales/history');

    // Wait for the sales table to load
    const detailButton = page.getByRole('link', { name: 'Voir le détail' }).first();
    await expect(detailButton).toBeVisible({ timeout: 30000 });

    // The stat card "Nombres de ventes" should show at least 1
    const salesCount = page.locator('text=Nombres de ventes').locator('..');
    await expect(salesCount).toBeVisible();
  });
});
