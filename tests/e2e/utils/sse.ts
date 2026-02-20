import type { Page } from '@playwright/test';

/**
 * Blocks Mercure SSE connections to prevent them from keeping the page
 * loading indefinitely during e2e tests.
 *
 * Mercure uses Server-Sent Events (EventSource) which maintain a long-lived
 * HTTP connection. During Playwright tests, these open connections:
 * - Block page navigation and cause timeouts
 * - Can interfere with session/cookie handling across browsers
 * - Keep the Nuxt dev server busy with concurrent connections
 *
 * Call this before any navigation in tests that interact with pages
 * using real-time updates.
 */
export async function blockSSE(page: Page) {
  await page.route('**/.well-known/mercure**', route => route.abort());
}
