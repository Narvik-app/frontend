import {expect, test} from '@playwright/test';
import {STORAGE_STATE} from './utils/auth';
import {waitForApiResponse} from './utils/api';

// Member role required — these are the self-service "Mes déclarations" / "Mes véhicules" boards.
test.use({ storageState: STORAGE_STATE.MEMBER });

test.describe.serial('Time and travel self-service', () => {
  const uniqueSuffix = Date.now().toString();
  const declarationDescription = `Réunion e2e ${uniqueSuffix}`;
  const editedDescription = `Réunion e2e ${uniqueSuffix} (modifiée)`;
  const vehicleBrand = `E2E Brand ${uniqueSuffix}`;
  const vehicleLicensePlate = `E2E-${uniqueSuffix.slice(-6)}`;

  test('can create an hours-only declaration', async ({ page }) => {
    const [summaryResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/-/summary')),
      page.goto('/time-and-travel'),
    ]);
    expect(summaryResponse.ok()).toBeTruthy();

    const declarationCount = page.getByTestId('stat-declaration-count').getByTestId('stat-value');
    const initialCount = parseInt(await declarationCount.innerText());

    await page.getByTestId('declaration-create').click();

    await page.getByTestId('declaration-description').fill(declarationDescription);
    await page.getByTestId('declaration-hours').fill('2');

    const [response] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/time-and-travel-declarations') || path.includes('time_and_travel_declarations')),
      page.getByTestId('declaration-submit').click(),
    ]);
    expect(response.ok()).toBeTruthy();

    const row = page.locator('tbody tr', { hasText: declarationDescription });
    await expect(row).toBeVisible();

    await expect(declarationCount).toHaveText((initialCount + 1).toString());
  });

  test('can edit the declaration', async ({ page }) => {
    await page.goto('/time-and-travel');

    const row = page.locator('tbody tr', { hasText: declarationDescription });
    await expect(row).toBeVisible();
    await row.getByTestId('declaration-edit').click();

    const descriptionInput = page.getByTestId('declaration-description');
    await expect(descriptionInput).toHaveValue(declarationDescription);
    await descriptionInput.fill(editedDescription);

    await page.getByTestId('declaration-submit').click();

    const editedRow = page.locator('tbody tr', { hasText: editedDescription });
    await expect(editedRow).toBeVisible();
  });

  test('can create a vehicle', async ({ page }) => {
    await page.goto('/time-and-travel/vehicles');

    await page.getByTestId('vehicle-create').click();

    await page.getByTestId('vehicle-brand').fill(vehicleBrand);
    await page.getByTestId('vehicle-license-plate').fill(vehicleLicensePlate);
    await page.getByTestId('vehicle-fiscal-power').fill('6');

    const [response] = await Promise.all([
      waitForApiResponse(page, path => path.includes('member-vehicles') || path.includes('member_vehicles')),
      page.getByTestId('vehicle-submit').click(),
    ]);
    expect(response.ok()).toBeTruthy();

    const row = page.locator('tbody tr', { hasText: vehicleLicensePlate });
    await expect(row).toBeVisible();
  });

  test('can create a kilometers-based declaration using the vehicle, doubled as a round trip', async ({ page }) => {
    await page.goto('/time-and-travel');

    await page.getByTestId('declaration-create').click();

    await page.getByTestId('declaration-description').fill(`Trajet e2e ${uniqueSuffix}`);
    await page.getByTestId('declaration-kilometers').fill('10');

    await page.getByTestId('declaration-departure').fill('Domicile');
    await page.getByTestId('declaration-arrival').fill('Club');

    const vehicleSelect = page.getByTestId('declaration-vehicle');
    await vehicleSelect.locator('[data-slot="trailing"]').first().click();
    const vehicleOption = page.getByRole('option', { name: new RegExp(vehicleBrand) });
    await expect(vehicleOption).toBeVisible();
    await vehicleOption.click();

    // Round trip is on by default — the one-way distance (10) should be doubled to 20 in the preview.
    await expect(page.getByText('20 km')).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, path => path.includes('/time-and-travel-declarations') || path.includes('time_and_travel_declarations')),
      page.getByTestId('declaration-submit').click(),
    ]);
    expect(response.ok()).toBeTruthy();

    const outgoingBody = response.request().postDataJSON().body as { kilometers?: number };
    expect(outgoingBody.kilometers).toBe(20);

    const row = page.locator('tbody tr', { hasText: 'Domicile' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Club');
  });

  test('can delete the declarations and the vehicle', async ({ page }) => {
    const [listResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('time-and-travel-declarations')),
      page.goto('/time-and-travel'),
    ]);
    expect(listResponse.ok()).toBeTruthy();

    const declarationRows = page.locator('tbody tr', { hasText: `e2e ${uniqueSuffix}` });
    // Both declarations created above are dated today, so they always sort first (order[date]=desc) —
    // no need to worry about pagination here, but the list must have finished loading before we count.
    await expect(declarationRows).toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      const [deleteResponse] = await Promise.all([
        waitForApiResponse(page, path => path.includes('time-and-travel-declarations')),
        declarationRows.first().getByTestId('declaration-delete').click().then(() => page.getByRole('button', { name: 'Supprimer' }).click()),
      ]);
      expect(deleteResponse.ok()).toBeTruthy();
      await expect(declarationRows).toHaveCount(1 - i);
    }

    const [vehicleListResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('vehicles')),
      page.goto('/time-and-travel/vehicles'),
    ]);
    expect(vehicleListResponse.ok()).toBeTruthy();

    const vehicleRow = page.locator('tbody tr', { hasText: vehicleLicensePlate });
    await expect(vehicleRow).toBeVisible();

    const [vehicleDeleteResponse] = await Promise.all([
      waitForApiResponse(page, path => path.includes('member-vehicles')),
      vehicleRow.getByTestId('vehicle-delete').click().then(() => page.getByRole('button', { name: 'Supprimer' }).click()),
    ]);
    expect(vehicleDeleteResponse.ok()).toBeTruthy();
    await expect(vehicleRow).not.toBeVisible();
  });
});
