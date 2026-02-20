import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Playwright global teardown: generates coverage reports from collected Istanbul data.
 * Only runs when COVERAGE=true.
 */
export default async function globalTeardown() {
  if (!process.env.COVERAGE) return;

  const nycOutputDir = path.join(process.cwd(), '.nyc_output');
  if (!fs.existsSync(nycOutputDir) || fs.readdirSync(nycOutputDir).length === 0) {
    console.log('No coverage data found — skipping report generation.');
    return;
  }

  console.log('Generating coverage report…');
  execSync('npx nyc report --reporter=html --reporter=lcov --reporter=text', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('Coverage report written to coverage/');
}
