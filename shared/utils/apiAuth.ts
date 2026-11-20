/**
 * Header carrying the user's JWT from the browser to the nuxt-api-party proxy.
 *
 * The browser must not send a real `Authorization` header: a reverse proxy in front of
 * the app (e.g. Traefik basicauth on preprod) would consume or reject it. The Nitro plugin
 * server/plugins/configure-api-party-auth.ts turns this header into
 * `Authorization: Bearer <token>` before the request reaches the backend.
 */
export const USER_TOKEN_HEADER = 'X-Narvik-User-Token'
