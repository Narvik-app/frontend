import {expect, type Page, test} from '@playwright/test';
import {login, logout} from './utils/auth';

/**
 * Passkeys use a Chrome virtual authenticator (CDP), so this spec only runs on Chromium.
 * The backend must accept the e2e origin: FRONTEND_URL or WEBAUTHN_ALLOWED_ORIGINS must contain it.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Virtual authenticator is Chromium only');

// Fresh session: logging out must not revoke the shared storage states
test.use({ storageState: { cookies: [], origins: [] } });

async function addVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

/**
 * The virtual authenticator answers the login page autofill request (conditional UI) by itself,
 * which logs in without any click. window.__e2eNoAutofill turns autofill off to test the button.
 */
async function allowDisablingAutofill(page: Page) {
  await page.addInitScript(() => {
    const isAvailable = PublicKeyCredential.isConditionalMediationAvailable.bind(PublicKeyCredential);
    PublicKeyCredential.isConditionalMediationAvailable = () =>
      (window as unknown as { __e2eNoAutofill?: boolean }).__e2eNoAutofill ? Promise.resolve(false) : isAvailable();
  });
}

async function setAutofill(page: Page, enabled: boolean) {
  await page.evaluate((disabled) => {
    (window as unknown as { __e2eNoAutofill?: boolean }).__e2eNoAutofill = disabled;
  }, !enabled);
}

test('register a passkey, log in with it (button and autofill), then remove it', async ({ page }) => {
  await addVirtualAuthenticator(page);
  await allowDisablingAutofill(page);
  const passkeyName = `E2E ${Date.now()}`;

  // Register from the account page
  await login(page, 'supervisor@club1.fr', 'admin123');
  await page.goto('/self');
  const card = page.getByTestId('passkeys-card');
  await card.getByTestId('passkey-add').click();
  await page.getByTestId('passkey-name').fill(passkeyName);
  await page.getByTestId('passkey-create').click();
  await expect(page.getByText("Clé d'accès ajoutée", { exact: true })).toBeVisible();
  const item = card.getByTestId('passkey-item').filter({ hasText: passkeyName });
  await expect(item).toBeVisible();

  // Passwordless login with the button
  await setAutofill(page, false);
  await logout(page);
  await page.getByTestId('login-passkey').click();
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);

  // Passwordless login from the email field autofill: the login page logs in by itself
  await setAutofill(page, true);
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Déconnexion' }).click();
  await page.waitForURL(/\/login/);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByTestId('user-menu')).toBeVisible();

  // The last use is displayed, then we clean up
  await page.goto('/self');
  await expect(item).toContainText('Utilisée le');
  await item.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByText("Clé d'accès supprimée", { exact: true })).toBeVisible();
  await expect(item).toHaveCount(0);
});
