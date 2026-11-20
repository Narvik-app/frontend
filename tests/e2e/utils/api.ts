import type { Page, Response } from '@playwright/test';

/**
 * All API calls go through the nuxt-api-party server-side proxy, which serves
 * `/api/__api_party/{endpointId}/{backend path}?{query}` and forwards the
 * request with its original method, headers and body.
 *
 * These helpers let tests intercept and inspect those proxied requests in a
 * readable way without duplicating the URL-parsing boilerplate.
 */

const PROXY_SEGMENT = /\/__api_party\/[^/]+\//;

/**
 * Extract the decoded backend path (including query string) from a proxied
 * request URL, or undefined when the URL is not a proxied API call.
 */
function extractBackendPath(url: string): string | undefined {
  const parsed = new URL(url);
  const match = PROXY_SEGMENT.exec(parsed.pathname);
  if (!match) return undefined;
  const path = parsed.pathname.slice(match.index + match[0].length);
  return decodeURIComponent(path + parsed.search);
}

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
    const path = extractBackendPath(r.url());
    return path !== undefined && predicate(path);
  });
}

/**
 * Extract and decode the backend path (including query string) from a
 * proxied API response.
 *
 * Example return value: "clubs/.../sales?page=1&createdAt[after]=2026-06-21"
 */
export function getProxyRequestPath(response: Response): string {
  return extractBackendPath(response.request().url()) ?? '';
}
