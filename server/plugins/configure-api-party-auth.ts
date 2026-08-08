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

  function injectBasicAuth(clientId: string, clientSecret: string) {
    return (ctx: { options: { headers?: HeadersInit } }) => {
      const headers = ctx.options.headers instanceof Headers
        ? ctx.options.headers
        : new Headers(ctx.options.headers)

      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`)
      }

      ctx.options.headers = headers
    }
  }

  nitro.hooks.hook('api-party:request:localApiClientAuth' as never, injectBasicAuth(config.oauthClientId, config.oauthClientSecret) as never)

  // The badger OAuth client is public (no real secret - see narvik-back's install:oauth),
  // so this carries no secret either; it exists purely for OAuth client_id identification.
  nitro.hooks.hook('api-party:request:badgerApi' as never, injectBasicAuth(config.oauthBadgerClientId, '') as never)
})
