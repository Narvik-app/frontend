import type { FetchContext } from 'ofetch'

/**
 * Builds the backend Authorization header of each proxied nuxt-api-party request, server-side:
 *
 * - localApi: `Bearer <user JWT>`, taken from the USER_TOKEN_HEADER the browser sends. The
 *   browser never sends a real Authorization header, so reverse proxies in front of the app
 *   (e.g. Traefik basicauth) don't consume or reject it - see shared/utils/apiAuth.ts.
 * - localApiClientAuth / badgerApi: the OAuth client Basic credentials, from private
 *   runtimeConfig, so the client secret is never shipped to the browser.
 *
 * This has to happen per-request via nuxt-api-party's request hook rather than by setting
 * a static `headers` option on the endpoint config at boot: Nitro's runtimeConfig tree is
 * deep-frozen, so the endpoint config object can't be mutated after startup.
 */
export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig()

  function basicAuth(clientId: string, clientSecret: string) {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  }

  const clientAuthByEndpoint: Record<string, () => string> = {
    localApiClientAuth: () => basicAuth(config.oauthClientId, config.oauthClientSecret),
    // The badger OAuth client is public (no real secret - see narvik-back's install:oauth),
    // so this carries no secret either; it exists purely for OAuth client_id identification.
    badgerApi: () => basicAuth(config.oauthBadgerClientId, ''),
  }

  nitro.hooks.hook('api-party:request', (ctx: FetchContext, _event, endpointId: string) => {
    const headers = new Headers(ctx.options.headers)

    // Never forward the user token header itself to the backend
    const userToken = headers.get(USER_TOKEN_HEADER)
    headers.delete(USER_TOKEN_HEADER)

    if (endpointId === 'localApi') {
      if (userToken) {
        headers.set('Authorization', `Bearer ${userToken}`)
      }
    } else {
      const getAuthorization = clientAuthByEndpoint[endpointId]
      if (getAuthorization) {
        headers.set('Authorization', getAuthorization())
      }
    }

    ctx.options.headers = headers
  })
})
