import { test as base } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const COVERAGE_DIR = path.join(process.cwd(), '.nyc_output');

/**
 * Extended test fixture that automatically collects Istanbul coverage
 * from `window.__coverage__` after each test when COVERAGE=true.
 */
export const test = base.extend<{ autoCollectCoverage: void }>({
  autoCollectCoverage: [async ({ page }, use) => {
    await use();

    if (process.env.COVERAGE) {
      const coverage = await page.evaluate(() => (window as unknown as { __coverage__: unknown }).__coverage__);
      if (coverage) {
        fs.mkdirSync(COVERAGE_DIR, { recursive: true });
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
        fs.writeFileSync(path.join(COVERAGE_DIR, filename), JSON.stringify(coverage));
      }
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
