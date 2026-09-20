import type { Page, Response } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForApiResponse } from './api';

/**
 * Shared helpers for the sale count/pagination regression tests
 * (tests/e2e/sale-counts.spec.ts) and for extracting the "create a sale" flow
 * out of sale.spec.ts so both specs can reuse it.
 */

export interface CreatedSale {
  itemName: string;
  itemCount: number;
}

const NAV_TARGETS = {
  'Faire une vente': '/admin/sales/new',
  'Par Articles': '/admin/sales',
  'Par Ventes': '/admin/sales/history',
} as const;

export type SalesNavLabel = keyof typeof NAV_TARGETS;

/**
 * Switches between the sales tabs ("Faire une vente" / "Par Articles" / "Par Ventes")
 * via the sidebar nav link (a client-side Vue Router navigation), instead of page.goto().
 *
 * This distinction matters: page.goto() always performs a full browser navigation, which
 * remounts the app and resets the Pinia store - every fetch would start from an empty
 * cache regardless of whether the invalidation logic is correct. The actual bug (and the
 * fix) only shows up when the SPA navigates client-side and the store singleton survives
 * the route change, exactly like a real user clicking between sidebar tabs. All three
 * pages share the same "pos" layout, so the nav is present on each of them.
 */
export async function navigateViaNav(page: Page, label: SalesNavLabel): Promise<void> {
  await page.getByRole('link', { name: label }).click();
  const expectedPath = NAV_TARGETS[label]
  await page.waitForURL(new RegExp(expectedPath.replace(/\//g, '\\/') + '$'));
}

/**
 * Navigates to /admin/sales/new (via the sidebar nav if already inside the app, or a
 * full page.goto for the very first navigation of a test) and returns the name of the
 * first sellable item, without adding anything to the cart. Useful to know, ahead of
 * calling createSaleViaUi(), which item's per-article count to snapshot beforehand.
 */
export async function peekFirstItemName(page: Page): Promise<string> {
  await goToSalesNew(page);

  const itemRow = page.getByTestId('inventory-item-row').first();
  await expect(itemRow).toBeVisible();

  return (await itemRow.getByTestId('item-name').innerText()).trim();
}

async function goToSalesNew(page: Page): Promise<void> {
  if (page.url().includes('/admin/sales/new')) return;

  // Already inside the app: use the nav link so the Pinia store survives the navigation.
  // Otherwise (first navigation of the test), a plain page.goto is fine and necessary.
  if (page.url().includes('/admin/')) {
    await navigateViaNav(page, 'Faire une vente');
  } else {
    await page.goto('/admin/sales/new');
  }
}

/**
 * Runs the /admin/sales/new flow: add `itemCount` distinct items to the cart,
 * pick a seller and a payment mode, then finalize. Returns the name of the
 * first item added (as shown in the "Par Articles" listing) so callers can
 * assert its per-article count increased.
 *
 * Assumes the caller is already authenticated (ADMIN storage state). Navigates via the
 * sidebar nav (client-side) when already inside the app - see navigateViaNav().
 */
export async function createSaleViaUi(page: Page, itemCount: number = 1): Promise<CreatedSale> {
  const itemName = await peekFirstItemName(page);

  const addToCartButtons = page.getByTestId('add-to-cart');
  const buttonCount = await addToCartButtons.count();
  const itemsToAdd = Math.min(buttonCount, itemCount);

  for (let i = 0; i < itemsToAdd; i++) {
    await addToCartButtons.nth(i).click();
  }

  await expect(page.getByTestId('cart-empty')).not.toBeVisible({ timeout: 5000 });

  const sellerWrapper = page.getByTestId('seller-input-wrapper');
  await sellerWrapper.locator('[data-slot="trailing"]').first().click();
  const sellerOption = page.getByRole('option').first();
  await expect(sellerOption).toBeVisible();
  await sellerOption.click();

  const paymentButton = page.getByTestId(/payment-mode-/).first();
  await expect(paymentButton).toBeVisible();
  await paymentButton.click();

  const finalizeButton = page.getByTestId('finalize-sale');
  await expect(finalizeButton).toBeEnabled({ timeout: 5000 });
  await finalizeButton.click();

  await expect(page).toHaveURL(/\/admin\/sales\//);
  await expect(page).not.toHaveURL(/\/new/);

  return { itemName, itemCount: itemsToAdd };
}

/**
 * Reads the "Nombres de ventes" / "Total" stat cards on /admin/sales/history
 * or /admin/sales (both render SaleList.vue, so both expose the same testids).
 */
export async function readStatCounts(page: Page): Promise<{ saleCount: number; saleTotal: string }> {
  const saleCountStat = page.getByTestId('stat-sale-count').getByTestId('stat-value');
  const saleTotalStat = page.getByTestId('stat-sale-total').getByTestId('stat-value');
  await expect(saleCountStat).not.toHaveText('');
  await expect(saleTotalStat).not.toHaveText('');

  return {
    saleCount: parseInt(await saleCountStat.innerText()),
    saleTotal: await saleTotalStat.innerText(),
  };
}

/**
 * Sums the per-article count for a given item name across every payment mode row
 * inside its card on /admin/sales ("Par Articles"). Returns 0 if the item has no
 * card at all (e.g. it hasn't been sold in the selected window).
 */
export async function readPerItemCount(page: Page, itemName: string): Promise<number> {
  // Filtered by visible text rather than embedding the (arbitrary, user-entered) item name
  // into a CSS attribute selector, which breaks on quotes/newlines - see the data-item-name
  // attribute for cross-checking in the DOM, but locate the card by content instead.
  const card = page.getByTestId('per-item-card').filter({ has: page.getByText(itemName, { exact: true }) });

  if (await card.count() === 0) return 0;

  const rows = card.first().getByTestId('per-item-payment-mode-row');
  const rowCount = await rows.count();
  let total = 0;
  for (let i = 0; i < rowCount; i++) {
    total += parseInt(await rows.nth(i).getAttribute('data-count') ?? '0');
  }
  return total;
}

/**
 * Opens the date range popover and clicks a preset button (e.g. "30 derniers jours",
 * "Saison actuelle"), waiting for the resulting sales-stats API response.
 */
export async function selectPresetRange(page: Page, label: string): Promise<Response> {
  await page.getByTestId('date-range-picker-trigger').click();

  const [response] = await Promise.all([
    waitForApiResponse(page, path => path.includes('sales-stats')),
    page.getByRole('button', { name: label }).click(),
  ]);

  return response;
}
