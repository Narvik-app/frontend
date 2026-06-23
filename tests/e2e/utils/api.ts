import type { Page, Response } from '@playwright/test';

/**
 * All API calls go through the nuxt-api-party server-side proxy (POST to
 * /api/__api_party/localApi). The actual backend path and query string are
 * in the request body, not the URL.
 *
 * These helpers let tests intercept and inspect those proxied requests in a
 * readable way without duplicating the URL/body-parsing boilerplate.
 */

/**
 * Wait for the next proxied API response whose backend path satisfies the
 * given predicate. The `path` passed to the predicate is already decoded
 * (percent-encoding resolved) so comparisons like `includes('/sales')` work
 * as expected.
 */
export function waitForApiResponse(
  page: Page,
  predicate: (path: string) => boolean,
): Promise<Response> {
  return page.waitForResponse(r => {
    if (!r.url().includes('__api_party')) return false;
    try {
      const body = r.request().postDataJSON();
      if (typeof body?.path !== 'string') return false;
      return predicate(decodeURIComponent(body.path));
    } catch {
      return false;
    }
  });
}

/**
 * Extract and decode the backend path (including query string) from the
 * request body of a proxied API response.
 *
 * Example return value: "clubs/.../sales?page=1&createdAt[after]=2026-06-21"
 */
export function getProxyRequestPath(response: Response): string {
  return decodeURIComponent(response.request().postDataJSON().path as string);
}
