import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {expect, test, type Page} from '@playwright/test';
import {STORAGE_STATE} from '../e2e/utils/auth';
import {screenshots} from './manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PNG_DIR = path.join(__dirname, 'out', 'png');

/** Only capture a subset: SCREENSHOT_ONLY=tt-,loan-liste pnpm screenshots */
const only = (process.env.SCREENSHOT_ONLY ?? '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * Waits for the SPA to be really done: no pending request, no skeleton, no spinner animation.
 */
async function waitForSettled(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.animate-pulse, [data-slot="skeleton"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

test.describe.configure({mode: 'parallel'});

for (const definition of screenshots) {
  if (only.length && !only.some(prefix => definition.id.startsWith(prefix))) continue;

  test.describe(definition.id, () => {
    test.use({storageState: STORAGE_STATE[definition.role]});

    test('capture', async ({page}) => {
      await page.goto(definition.url);
      // Nuxt devtools badge (dev server only)
      await page.addStyleTag({content: '#nuxt-devtools-container, nuxt-devtools-inspect-panel, #vue-tracer-overlay { display: none !important; }'});
      await waitForSettled(page);

      if (definition.prepare) {
        await definition.prepare(page);
        await waitForSettled(page);
      }

      fs.mkdirSync(PNG_DIR, {recursive: true});
      const file = path.join(PNG_DIR, `${definition.id}.png`);
      if (definition.locator) {
        await definition.locator(page).screenshot({path: file, animations: 'disabled'});
      } else {
        await page.screenshot({path: file, animations: 'disabled', fullPage: definition.fullPage ?? false});
      }
    });
  });
}
