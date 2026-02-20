import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';

// Use admin authenticated state — regular users don't have sale access
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe.serial('Sale flow', () => {
  let initialSaleCount = 0;

  test('can create a sale with articles', async ({ page }) => {
    // Record initial sale count for today before creating a new one
    await page.goto('/admin/sales/history');
    
    // Wait for stat card to load and capture initial count
    const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
    await expect(saleCountStat).toBeVisible({ timeout: 15000 });
    await expect(saleCountStat).not.toHaveText('', { timeout: 15000 });
    initialSaleCount = parseInt(await saleCountStat.innerText());

    // Navigate to the new sale page
    await page.goto('/admin/sales/new');

    // Wait for inventory items to load
    const itemRow = page.getByTestId('inventory-item-row').first();
    await expect(itemRow).toBeVisible({ timeout: 30000 });

    // Verify item prices are visible
    await expect(page.getByTestId('item-price').first()).toBeVisible();

    // --- Add items to cart ---
    const addToCartButtons = page.getByTestId('add-to-cart');
    const buttonCount = await addToCartButtons.count();
    const itemsToAdd = Math.min(buttonCount, 2);

    for (let i = 0; i < itemsToAdd; i++) {
      await addToCartButtons.nth(i).click();
    }

    // Verify cart shows items
    await expect(page.getByTestId('cart-empty')).not.toBeVisible({ timeout: 5000 });

    // Verify cart total and item total prices are visible
    await expect(page.getByTestId('cart-total-price')).not.toHaveText('0,00 €');
    await expect(page.getByTestId('cart-item-total-price').first()).toBeVisible();

    // --- Select a seller ---
    const sellerWrapper = page.getByTestId('seller-input-wrapper');
    // The trailing icon (arrow) is the most reliable way to open the UInputMenu dropdown
    await sellerWrapper.locator('[data-slot="trailing"]').first().click();
    
    const sellerOption = page.getByRole('option').first();
    await expect(sellerOption).toBeVisible({ timeout: 15000 });
    await sellerOption.click();

    // --- Select a payment mode ---
    const paymentButton = page.getByTestId(/payment-mode-/).first();
    await expect(paymentButton).toBeVisible();
    await paymentButton.click();

    // --- Finalize the sale ---
    const finalizeButton = page.getByTestId('finalize-sale');
    await expect(finalizeButton).toBeEnabled({ timeout: 5000 });
    await finalizeButton.click();

    // Assert we are redirected to the sale detail page (only happens on success)
    await expect(page).toHaveURL(/\/admin\/sales\//, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/new/);

    // Assert the detail page shows the correct data using stable IDs
    await expect(page.getByTestId('detail-total').getByTestId('stat-value')).not.toHaveText('0,00 €');
    await expect(page.getByTestId('detail-item-count').getByTestId('stat-value')).toHaveText(itemsToAdd.toString());
  });

  test('sale count increased by 1 in history', async ({ page }) => {
    await page.goto('/admin/sales/history');

    // Wait for sales to load and verify count increased by exactly 1
    const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
    await expect(saleCountStat).toHaveText((initialSaleCount + 1).toString(), { timeout: 30000 });
  });

  test('6 derniers mois shows more or equal results', async ({ page }) => {
    await page.goto('/admin/sales/history');

    // Wait for today's sales to load
    const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
    await expect(saleCountStat).toBeVisible({ timeout: 15000 });
    await expect(saleCountStat).not.toHaveText('', { timeout: 15000 });
    const todayCount = parseInt(await saleCountStat.innerText());

    // Open the date range popover (button shows current date like "20 février 2026")
    const datePickerButton = page.getByTestId('date-range-picker-trigger');
    await datePickerButton.click();

    // Select "6 derniers mois" preset
    await page.getByRole('button', { name: '6 derniers mois' }).click();

    // The 6-month range should show at least as many sales as today
    const sixMonthCount = parseInt(await saleCountStat.innerText());
    expect(sixMonthCount).toBeGreaterThanOrEqual(todayCount);
  });

  test('selecting today twice filters back to today', async ({ page }) => {
    await page.goto('/admin/sales/history');
    
    // Wait for stat card to load
    const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
    await expect(saleCountStat).toBeVisible({ timeout: 15000 });
    await expect(saleCountStat).not.toHaveText('', { timeout: 15000 });

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

    // Should show the same count as initial + 1 (today's sales only)
    await expect(saleCountStat).toHaveText((initialSaleCount + 1).toString(), { timeout: 15000 });
  });

  test('selecting today to a month ago shows more results', async ({ page }) => {
    await page.goto('/admin/sales/history');

    const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
    await expect(saleCountStat).toBeVisible({ timeout: 15000 });
    await expect(saleCountStat).not.toHaveText('', { timeout: 15000 });
    const todayCount = parseInt(await saleCountStat.innerText());

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

    // A month range should show at least as many sales as today
    const monthRangeCount = parseInt(await saleCountStat.innerText());
    expect(monthRangeCount).toBeGreaterThanOrEqual(todayCount);
  });
});
