import { expect, test } from '@playwright/test';
import { STORAGE_STATE } from './utils/auth';
import { getProxyRequestPath, waitForApiResponse } from './utils/api';
import { createSaleViaUi, navigateViaNav, peekFirstItemName, readPerItemCount, readStatCounts, selectPresetRange } from './utils/sale';

/**
 * Regression coverage for the "stale listing after a date change" bug:
 * /admin/sales/history and /admin/sales (per-article) render the same SaleList.vue
 * component backed by useSaleStore, but fetch from two independent endpoints
 * (getSales() vs getSalePerItemStats()). Changing the date range on one and then
 * navigating to the other used to keep showing data fetched for the *previous*
 * range, until the "Dernière mise à jour" button was clicked.
 *
 * These tests assert against the intercepted API response / a captured "before"
 * count rather than loose inequalities, so a regression can't slip through again
 * the way `sixMonthCount >= todayCount` did.
 */

test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe.serial('Sale counts', () => {
  test('changing the range on history and navigating to per-article shows the new range, unrefreshed', async ({ page }) => {
    await page.goto('/admin/sales/history');
    await readStatCounts(page); // wait for the initial load to settle

    // Visit per-article once first, so its cache is seeded for the *default* range - this
    // is what exposes the bug: switching the range afterwards on history, then coming back
    // to per-article, must not keep showing that already-seeded, now-stale cache.
    await navigateViaNav(page, 'Par Articles');
    await readStatCounts(page);
    await navigateViaNav(page, 'Par Ventes');

    const historyResponse = await selectPresetRange(page, '30 derniers jours');
    const historyCount = (await historyResponse.json()).value;

    // Navigate away client-side (the Pinia store survives, unlike a full page.goto)
    // without touching the "Dernière mise à jour" button.
    const [perItemResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('sales-per-item-stats')),
      navigateViaNav(page, 'Par Articles'),
    ]);
    const requestPath = getProxyRequestPath(perItemResponse);

    // The per-article page must fetch for the *new* range on its own, not reuse
    // whatever was cached before the range changed on the other page.
    expect(requestPath).toContain('sales-per-item-stats');

    const { saleCount } = await readStatCounts(page);
    expect(saleCount).toBe(historyCount);
  });

  test('changing the range on per-article and navigating to history shows the new range, unrefreshed', async ({ page }) => {
    await page.goto('/admin/sales');
    await readStatCounts(page);

    // Seed history's cache for the default range first, symmetrically to the test above.
    await navigateViaNav(page, 'Par Ventes');
    await readStatCounts(page);
    await navigateViaNav(page, 'Par Articles');

    const perItemResponse = await selectPresetRange(page, '30 derniers jours');
    const expectedCount = (await perItemResponse.json()).value;

    const [salesResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/sales') && path.includes('createdAt')),
      navigateViaNav(page, 'Par Ventes'),
    ]);
    const requestPath = getProxyRequestPath(salesResponse);
    expect(requestPath).toContain('createdAt[after]');

    const { saleCount } = await readStatCounts(page);
    expect(saleCount).toBe(expectedCount);

    // "Ventes (N)" (totalItems from the paginated collection) must also agree.
    const body = await salesResponse.json();
    expect(body.totalItems).toBe(expectedCount);
  });

  for (const routePath of ['/admin/sales/history', '/admin/sales']) {
    test(`stat-sale-count matches the intercepted sales-stats value on ${routePath}`, async ({ page }) => {
      await page.goto(routePath);
      await readStatCounts(page);

      const response = await selectPresetRange(page, 'Saison actuelle');
      const expectedCount = (await response.json()).value;

      const { saleCount } = await readStatCounts(page);
      expect(saleCount).toBe(expectedCount);
    });
  }

  test('"Ventes (N)" heading matches totalItems and stat-sale-count on history', async ({ page }) => {
    const [salesResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/sales') && !path.includes('sales-')),
      page.goto('/admin/sales/history'),
    ]);
    const totalItems = (await salesResponse.json()).totalItems;

    const { saleCount } = await readStatCounts(page);
    expect(saleCount).toBe(totalItems);

    const ventesHeading = page.getByText(/^Ventes \(\d+\)$/);
    await expect(ventesHeading).toHaveText(`Ventes (${totalItems})`);
  });

  test('pagination does not change the totals', async ({ page }) => {
    await page.goto('/admin/sales/history');
    const { saleCount: countBefore } = await readStatCounts(page);

    const [pageSizeResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('itemsPerPage=5')),
      page.getByTestId('table-items-per-page').click().then(() => page.getByRole('option', { name: '5' }).click()),
    ]);
    expect((await pageSizeResponse.json()).totalItems).toBe(countBefore);

    const { saleCount: countAfterPageSize } = await readStatCounts(page);
    expect(countAfterPageSize).toBe(countBefore);

    // Walk to page 2 if there is one - a no-op (but not a failure) below 6 fixture sales.
    const nextPageButton = page.getByRole('button', { name: '2', exact: true });
    if (await nextPageButton.count() > 0) {
      const [page2Response] = await Promise.all([
        waitForApiResponse(page, path => path.includes('page=2')),
        nextPageButton.first().click(),
      ]);
      expect((await page2Response.json()).totalItems).toBe(countBefore);

      const { saleCount: countOnPage2 } = await readStatCounts(page);
      expect(countOnPage2).toBe(countBefore);
    }
  });

  test('a newly created sale is reflected on both pages without a manual refresh', async ({ page }) => {
    // Peek which item will be sold before touching anything, so we can snapshot its
    // per-article count ahead of the sale (inventory ordering is stable).
    const itemName = await peekFirstItemName(page);

    // Capture the "before" counts (today's range is the default on both pages). Navigate
    // client-side throughout so the Pinia store survives, matching a real user clicking
    // between sidebar tabs instead of reloading the page.
    await navigateViaNav(page, 'Par Ventes');
    const { saleCount: historyCountBefore } = await readStatCounts(page);

    await navigateViaNav(page, 'Par Articles');
    const { saleCount: perItemCountBefore } = await readStatCounts(page);
    const itemCountBefore = await readPerItemCount(page, itemName);

    const created = await createSaleViaUi(page, 1);
    expect(created.itemName).toBe(itemName);

    // The sale flow redirects to the detail page - go back to each list without ever
    // touching "Dernière mise à jour".
    await navigateViaNav(page, 'Par Ventes');
    const { saleCount: historyCountAfter } = await readStatCounts(page);
    expect(historyCountAfter).toBe(historyCountBefore + 1);

    await navigateViaNav(page, 'Par Articles');
    const { saleCount: perItemCountAfter } = await readStatCounts(page);
    expect(perItemCountAfter).toBe(perItemCountBefore + 1);

    const itemCountAfter = await readPerItemCount(page, created.itemName);
    expect(itemCountAfter).toBeGreaterThanOrEqual(itemCountBefore + created.itemCount);
  });

  test('per-article totals reconcile with the sale total amount', async ({ page }) => {
    await page.goto('/admin/sales');
    await readStatCounts(page);

    const cards = page.getByTestId('per-item-payment-mode-row');
    const count = await cards.count();
    let sumAmount = 0;
    for (let i = 0; i < count; i++) {
      sumAmount += parseFloat(await cards.nth(i).getAttribute('data-amount') ?? '0');
    }

    const { saleTotal } = await readStatCounts(page);
    const parsedTotal = parseFloat(saleTotal.replace(/[^\d,.-]/g, '').replace(',', '.'));

    // Rounding to 2 decimals absorbs float/format noise, not a wide tolerance.
    expect(sumAmount).toBeCloseTo(parsedTotal, 2);
  });
});
