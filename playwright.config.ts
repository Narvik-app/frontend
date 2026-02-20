import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Narvik E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalTeardown: './tests/e2e/global-teardown.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://localhost:3001',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on first retry */
    video: 'on-first-retry',

    /* Ignore invalid SSL certificates for localhost */
    ignoreHTTPSErrors: true,

    /* Generous timeouts for Nuxt dev server + API calls */
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup', 
      testMatch: /auth\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'PORT=3001 pnpm dev',
    url: 'https://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    ignoreHTTPSErrors: true,
    env: {
      NUXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA', // Dummy key for testing
      NUXT_TURNSTILE_SITE_KEY: '1x0000000000000000000000000000000AA', // Dummy key for testing
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      NUXT_SESSION_PASSWORD: 'test-session-password-at-least-32-chars-long',
      NUXT_PUBLIC_CLIENT_ID: 'test',
      NUXT_PUBLIC_CLIENT_SECRET: 'secretTestOnly',
      NUXT_PUBLIC_BADGER_CLIENT_ID: 'badger',
      NUXT_PUBLIC_BADGER_CLIENT_SECRET: 'secretTestOnly',
      NUXT_PUBLIC_CLIENT_TURNSTILE: 'false',
      ...(process.env.COVERAGE ? { COVERAGE: 'true' } : {}),
      ...(process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL ? { NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL: process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL } : {}),
    },
  },
});
