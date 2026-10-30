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
  const loaders = page.locator('.animate-pulse, .animate-spin, [data-slot="skeleton"]');
  await expect(loaders).toHaveCount(0);
  // Some widgets (file download links) only start loading once the page rendered: check twice
  await page.waitForTimeout(1000);
  await expect(loaders).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Chart.js animates the drawing on render and on every resize: wait until the canvases are drawn
 * (not blank, the data can arrive after the first render) and stop changing for a while.
 */
async function waitForCharts(page: Page) {
  const canvases = page.locator('canvas');
  if (await canvases.count() === 0) return;

  let previous = '';
  let stableCount = 0;
  await expect.poll(async () => {
    const current = await canvases.evaluateAll(elements => elements.map((element) => {
      const canvas = element as HTMLCanvasElement;
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      return canvas.toDataURL() === blank.toDataURL() ? 'blank' : canvas.toDataURL();
    }).join('|'));

    stableCount = current === previous && !current.split('|').includes('blank') ? stableCount + 1 : 0;
    previous = current;
    return stableCount >= 3;
  }, {intervals: [700], timeout: 30_000, message: 'Charts are still moving'}).toBe(true);
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

      if (definition.fullPage) {
        // A full page capture resizes the viewport, which makes the charts redraw (and animate): do it first
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({width: page.viewportSize()?.width ?? 1680, height});
        await waitForSettled(page);
      }
      await waitForCharts(page);

      const crop = definition.crop ?? (definition.fullPage || definition.targets.some(t => t.repo === 'about') ? 'page' : 'content');

      fs.mkdirSync(PNG_DIR, {recursive: true});
      const file = path.join(PNG_DIR, `${definition.id}.png`);
      const target = definition.locator
        ? definition.locator(page)
        : crop === 'content' ? page.locator('main div.min-w-0').first() : undefined;

      if (crop === 'content') {
        // The sticky header would overlap the element while it is scrolled into view
        await page.addStyleTag({content: 'header { display: none !important; }'});
      }

      if (!target) {
        // With a full page capture the viewport has already been resized to the page height above:
        // letting Playwright resize it again would redraw (and animate) the charts during the capture
        await page.screenshot({path: file, animations: 'disabled', fullPage: false});
      } else if (definition.clipHeight) {
        const box = await target.boundingBox();
        if (!box) throw new Error(`Nothing to capture for ${definition.id}`);
        await page.screenshot({path: file, animations: 'disabled', fullPage: true, clip: {...box, height: Math.min(box.height, definition.clipHeight)}});
      } else {
        await target.screenshot({path: file, animations: 'disabled'});
      }
    });
  });
}
