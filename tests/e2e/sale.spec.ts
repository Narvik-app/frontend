import {expect, test} from './fixtures';
import {STORAGE_STATE} from './utils/auth';

// Use admin authenticated state — regular users don't have sale access
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe.serial('Sale creation flow', () => {
  let initialSaleCount = 0;

  test('can create a sale with articles', async ({ page }) => {
    // Record initial sale count for today before creating a new one
    await page.goto('/admin/sales/history');
    await page.waitForTimeout(3000);
    initialSaleCount = await page.getByRole('link', { name: 'Voir le détail' }).count();

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
      const cartButton = itemRows.nth(i).locator('button').last();
      await cartButton.click();
    }

    // Verify cart shows items
    await expect(page.getByText('Aucun articles')).not.toBeVisible({ timeout: 5000 });

    // --- Select a seller ---
    const sellerTrailingIcon = page.locator('[data-slot="trailing"]').first();
    await expect(sellerTrailingIcon).toBeVisible({ timeout: 15000 });
    await sellerTrailingIcon.click();

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

  test('sale count increased by 1 in history', async ({ page }) => {
    await page.goto('/admin/sales/history');

    // Wait for sales to load and verify count increased by exactly 1
    const detailLinks = page.getByRole('link', { name: 'Voir le détail' });
    await expect(detailLinks).toHaveCount(initialSaleCount + 1, { timeout: 30000 });
  });
});
