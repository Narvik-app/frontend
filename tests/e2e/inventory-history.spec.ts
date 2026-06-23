import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

// Admin role required — inventory management is admin-only
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe('Inventory item history', () => {
  let itemDetailUrl: string;

  // Navigate to the first managed-stock item's detail page before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/inventories');

    // Expand the first category section (they start collapsed by default)
    const firstCategoryHeader = page.getByTestId('inventory-category-header').first();
    await expect(firstCategoryHeader).toBeVisible();
    await firstCategoryHeader.click();

    // Get the first "Détails" link and navigate to the item detail page
    const detailLink = page.getByTestId('inventory-item-detail-link').first();
    await expect(detailLink).toBeVisible();
    itemDetailUrl = (await detailLink.getAttribute('href')) ?? '';
    await page.goto(itemDetailUrl);

    // Wait for the page to finish loading: period buttons, table, AND the initial chart response.
    // Without the chart wait, the default 1y chart response can still be in-flight when the
    // first period-button test starts and gets captured as the 6m response.
    await expect(page.getByTestId('period-1y')).toBeVisible();
    await expect(page.getByTestId('daily-history-table')).toBeVisible();
    await expect(
      page.locator('canvas').or(page.getByText('Aucun historique sur la période sélectionnée.'))
    ).toBeVisible();
  });
});
