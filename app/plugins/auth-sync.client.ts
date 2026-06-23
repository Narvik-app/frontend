/**
 * Cross-tab auth token synchronisation plugin (client-only).
 *
 * Problem: pinia-plugin-persistedstate writes tokens to localStorage whenever this tab
 * refreshes its JWT, but it does NOT re-hydrate other open tabs from that new value.
 * With rotated (single-use) refresh tokens, a second tab that still holds the old
 * (now-revoked) token in memory will get an invalid_grant on its next refresh → logout.
 *
 * Solution: listen to the Web Storage "storage" event, which browsers fire in every
 * OTHER tab when localStorage changes. When the auth key changes, adopt the new token
 * immediately so each tab always has the latest refresh token before it attempts a call.
 *
 * The Web Locks in coordinatedRefresh (useSelfUser.ts) prevent two tabs from racing
 * to use the same refresh token simultaneously. This plugin handles the follow-up:
 * a tab that lost the race re-hydrates the winner's rotated token from storage.
 */
import type {RawJwtToken} from "~/types/jwtTokens";

export default defineNuxtPlugin(() => {
  // Must match the pinia-plugin-persistedstate key for the selfUser store.
  // Config: nuxt.config.ts → piniaPluginPersistedstate.key = 'narvik_%id', store id = 'selfUser'
  const STORAGE_KEY = 'narvik_selfUser'

  const selfStore = useSelfUserStore()

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return

    if (!event.newValue) {
      // Another tab cleared the auth state (logged out) — mirror it silently (no redirect toast)
      selfStore.logout(false)
      return
    }

    try {
      const parsed = JSON.parse(event.newValue) as { selfJwtToken?: RawJwtToken }
      if (parsed?.selfJwtToken) {
        selfStore.hydrateJwtFromStorage(parsed.selfJwtToken)
      }
    } catch (e) {
      console.warn('[auth-sync] Failed to parse storage event payload', e)
    }
  })
})
