import type { FetchContext } from 'ofetch'

/**
 * Injects the OAuth client Authorization header for the localApiClientAuth and badgerApi
 * endpoints (see nuxt.config.ts) on each proxied request, from private runtimeConfig, so
 * the client secret is never shipped to the browser.
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
    const getAuthorization = clientAuthByEndpoint[endpointId]
    if (!getAuthorization) return

    const headers = new Headers(ctx.options.headers)
    if (!headers.has('Authorization')) {
      headers.set('Authorization', getAuthorization())
    }
    ctx.options.headers = headers
  })
})
