import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

// Use admin authenticated state — regular users don't have sale access
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe.serial('Sale flow', () => {
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

  test('6 derniers mois shows more or equal results', async ({ page }) => {
    await page.goto('/admin/sales/history');

    // Wait for today's sales to load
    await page.waitForTimeout(3000);
    const todayCount = await page.getByRole('link', { name: 'Voir le détail' }).count();

    // Open the date range popover (button shows current date like "20 février 2026")
    const datePickerButton = page.getByTestId('date-range-picker-trigger');
    await datePickerButton.click();

    // Select "6 derniers mois" preset
    await page.getByRole('button', { name: '6 derniers mois' }).click();

    // Wait for the data to reload
    await page.waitForTimeout(3000);

    // The 6-month range should show at least as many sales as today
    const sixMonthCount = await page.getByRole('link', { name: 'Voir le détail' }).count();
    expect(sixMonthCount).toBeGreaterThanOrEqual(todayCount);
  });

  test('selecting today twice filters back to today', async ({ page }) => {
    await page.goto('/admin/sales/history');
    await page.waitForTimeout(3000);

    // Open the date range popover
    const datePickerButton = page.getByTestId('date-range-picker-trigger');
    await datePickerButton.click();

    // The calendar shows the current month. Click today's date twice to set range = today only.
    // Today's date is highlighted with a dot in v-calendar
    const today = new Date();
    const todayDay = today.getDate().toString();

    // v-calendar renders day cells as buttons with aria-label containing the full date
    // Click the current day button twice (start + end of range)
    const todayButton = page.locator('.vc-day-content').getByText(todayDay, { exact: true }).first();
    await todayButton.click();
    await todayButton.click();

    // Popover closes after range selection, wait for data reload
    await page.waitForTimeout(3000);

    // Should show the same count as initial + 1 (today's sales only)
    const todayFilteredCount = await page.getByRole('link', { name: 'Voir le détail' }).count();
    expect(todayFilteredCount).toBe(initialSaleCount + 1);
  });

  test('selecting today to a month ago shows more results', async ({ page }) => {
    await page.goto('/admin/sales/history');
    await page.waitForTimeout(3000);
    const todayCount = await page.getByRole('link', { name: 'Voir le détail' }).count();

    // Open the date range popover
    const datePickerButton = page.getByTestId('date-range-picker-trigger');
    await datePickerButton.click();

    // Navigate to previous month in the calendar
    const prevMonthButton = page.locator('.vc-arrow.vc-prev').first();
    await expect(prevMonthButton).toBeVisible({ timeout: 5000 });
    await prevMonthButton.click();
    await page.waitForTimeout(500);

    // Click the 1st of the previous month as range start
    const firstDayPrevMonth = page.locator('.vc-day-content').getByText('1', { exact: true }).first();
    await firstDayPrevMonth.click();

    // Navigate back to current month
    const nextMonthButton = page.locator('.vc-arrow.vc-next').first();
    await nextMonthButton.click();
    await page.waitForTimeout(500);

    // Click today as range end
    const today = new Date();
    const todayDay = today.getDate().toString();
    const todayButton = page.locator('.vc-day-content').getByText(todayDay, { exact: true }).first();
    await todayButton.click();

    // Wait for data reload
    await page.waitForTimeout(3000);

    // A month range should show at least as many sales as today
    const monthRangeCount = await page.getByRole('link', { name: 'Voir le détail' }).count();
    expect(monthRangeCount).toBeGreaterThanOrEqual(todayCount);
  });
});
