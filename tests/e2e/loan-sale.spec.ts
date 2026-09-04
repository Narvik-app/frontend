import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';
import {waitForApiResponse} from './utils/api';

// Use admin authenticated state — sale/loan access requires admin permissions
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe.serial('Billing a loan from the sale page', () => {
  test('recording a loan with billing on adds a cart line at the loan price, and the sale carries it', async ({ page }) => {
    await page.goto('/admin/sales/new');

    // Loan items are only shown once the club/permission checks resolve — wait for at least one
    // available (not currently loaned) item to lend. Fixtures always give it a positive loanPrice.
    const lendButton = page.getByTestId('loan-item-lend').first();
    await expect(lendButton).toBeVisible({ timeout: 10000 });

    const loanItemRow = page.getByTestId('loan-item-row').filter({ has: page.getByTestId('loan-item-lend') }).first();
    const loanItemName = (await loanItemRow.getByTestId('loan-item-name').innerText()).trim();
    const loanItemPriceText = (await loanItemRow.getByTestId('loan-item-price').innerText()).trim();
    const loanItemPrice = loanItemPriceText.replace(/\s*€\/prêt$/, ''); // e.g. "15.00"

    await lendButton.click();

    // The modal opens with billing enabled by default — no price to enter, just add-or-not
    const submitButton = page.getByTestId('loan-modal-submit');
    await expect(submitButton).toBeVisible();

    const billingSwitch = page.getByTestId('loan-add-to-sale-switch');
    await expect(billingSwitch).toBeVisible();
    await expect(billingSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('loan-add-to-sale-price')).toHaveCount(0);

    const [loanResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/loans') && !path.includes('loan-items') && !path.includes('loan-categories')),
      submitButton.click(),
    ]);
    expect(loanResponse.ok()).toBeTruthy();

    // --- The billed loan now sits in the cart as a free-form line, at the loan item's price ---
    const cartRow = page.getByTestId('cart-item-row').filter({ hasText: loanItemName });
    await expect(cartRow).toBeVisible();
    await expect(cartRow.getByTestId('cart-item-total-price')).toHaveText(`${loanItemPrice.replace('.', ',')} €`);

    // --- Select a seller and payment mode, then finalize the sale ---
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

    const [saleResponse] = await Promise.all([
      waitForApiResponse(page, path => path.endsWith('/sales')),
      finalizeButton.click(),
    ]);

    // The outgoing sale payload must carry the loan fee as a free-form line, priced and
    // categorized so it groups correctly in the per-item sale stats instead of flooding
    // "Sans catégorie" — see app/pages/admin/sales/new.vue#buildPurchasedItems.
    const outgoingBody = saleResponse.request().postDataJSON().body as {
      salePurchasedItems: Array<{ item?: string; itemName?: string; itemCategory?: string; itemPrice?: string }>
    };
    const loanLine = outgoingBody.salePurchasedItems.find(line => line.itemName === loanItemName);
    expect(loanLine).toBeDefined();
    expect(loanLine?.item).toBeFalsy();
    expect(loanLine?.itemPrice).toBe(loanItemPrice);
    expect(loanLine?.itemCategory).toMatch(/^Prêt/);

    await expect(page).toHaveURL(/\/admin\/sales\//);
    await expect(page).not.toHaveURL(/\/new/);
  });

  test('declining to bill the loan leaves the cart untouched', async ({ page }) => {
    await page.goto('/admin/sales/new');

    const lendButton = page.getByTestId('loan-item-lend').first();
    await expect(lendButton).toBeVisible({ timeout: 10000 });
    await lendButton.click();

    const submitButton = page.getByTestId('loan-modal-submit');
    await expect(submitButton).toBeVisible();

    const billingSwitch = page.getByTestId('loan-add-to-sale-switch');
    await expect(billingSwitch).toBeVisible();
    await expect(billingSwitch).toHaveAttribute('aria-checked', 'true'); // checked by default
    await billingSwitch.click();
    await expect(billingSwitch).toHaveAttribute('aria-checked', 'false');

    const [loanResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/loans') && !path.includes('loan-items') && !path.includes('loan-categories')),
      submitButton.click(),
    ]);
    expect(loanResponse.ok()).toBeTruthy();

    // The loan was recorded, but nothing was added to the cart
    await expect(page.getByTestId('cart-empty')).toBeVisible();
  });
});
