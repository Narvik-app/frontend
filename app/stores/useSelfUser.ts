import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {usePostRawJson} from "~/composables/api/api";
import type {NuxtError} from "#app";
import {JwtToken} from "~/types/jwtTokens";
import type {Ref} from "vue";
import FileQuery from "~/composables/api/query/FileQuery";
import {defineStore} from "pinia";
import dayjs from "dayjs";
import UserQuery from "~/composables/api/query/UserQuery";
import type {LinkedProfile} from "~/types/api/linkedProfile";
import type {User} from "~/types/api/item/user";
import {UserRole} from "~/types/api/item/user";
import {type Club, ClubRole} from "~/types/api/item/club";
import type {Permission} from "~/types/api/permissions";
import ClubQuery from "~/composables/api/query/ClubQuery";
import ClubSettingQuery from "~/composables/api/query/clubDependent/ClubSettingQuery";

export const useSelfUserStore = defineStore('selfUser', () => {
  const member: Ref<Member | undefined> = ref(undefined)
  const user: Ref<User | undefined> = ref(undefined)
  const selectedProfile: Ref<LinkedProfile | undefined> = ref(undefined)

  const isImpersonating = ref(false)
  const impersonatedUser: Ref<string | undefined> = ref(undefined)

  const appConfigStore = useAppConfigStore()

  // Session Management
  const selfJwtToken: Ref<JwtToken | null> = ref(null)

  // Promise singleton to prevent race conditions during token refresh
  let refreshTokenPromise: Promise<Ref<JwtToken | null>> | null = null

  // Mutex to prevent multiple logout calls
  const isLoggingOut = ref(false)

  function getSelfJwtToken(): Ref<JwtToken | null> {
    return selfJwtToken
  }

  function setSelfJwtToken(payload: JwtToken) {
    selfJwtToken.value = payload
  }

  function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time))
  }

  /**
   * Check if the access token is still valid.
   * Handles both Date objects and ISO strings (from localStorage deserialization).
   */
  function isAccessTokenValid(token: JwtToken): boolean {
    if (!token.access?.token || !token.access?.date) {
      return false
    }
    // Parse the date - handles both Date objects and ISO strings from localStorage
    const expiryDate = dayjs(token.access.date)
    return expiryDate.isValid() && expiryDate.isAfter(dayjs())
  }

  /**
   * Check if we should attempt a refresh.
   * Returns TRUE if we should try, FALSE only if we know for sure it's expired.
   * If date is missing or invalid, we assume the token might still be valid and try anyway.
   */
  function shouldAttemptRefresh(token: JwtToken): boolean {
    // No refresh token at all
    if (!token.refresh?.token) {
      return false
    }

    // If no date, we can't know if it's expired - try the refresh
    if (!token.refresh.date) {
      return true
    }

    const expiryDate = dayjs(token.refresh.date)

    // If date is invalid (parsing failed), try the refresh anyway
    if (!expiryDate.isValid()) {
      console.warn('Refresh token date is invalid, attempting refresh anyway')
      return true
    }

    // Only return false if we KNOW the token is expired (date is in the past)
    return expiryDate.isAfter(dayjs())
  }


  // Discriminated outcome for token refresh — fatal means log out, transient means keep session and retry later
  type RefreshOutcome =
    | { status: 'ok'; token: JwtToken }
    | { status: 'fatal' }
    | { status: 'transient' }

  /**
   * Classify a /token error as fatal (invalid_grant → log out) or transient (network/5xx → keep session).
   * Classifies on statusCode / data.error, never on message text.
   */
  function isFatalRefreshError(error: NuxtError | undefined): boolean {
    if (!error) return false
    const status = error.statusCode
    const oauthError = (error.data as Record<string, unknown>)?.error
    if (oauthError === 'invalid_grant' || oauthError === 'invalid_request') return true
    return status === 400 || status === 401
  }

  /**
   * Handle token errors - logs, shows toast if needed, and triggers logout.
   * Returns ref(null) to allow chaining in async functions.
   */
  function handleTokenError(message: string, showToast: boolean = true): Ref<null> {
    console.error('JWT Error: ' + message)

    if (showToast) {
      const toast = useToast()
      toast.add({
        color: "error",
        title: "Erreur d'authentification",
        description: message
      })
    }

    logout(showToast) // Only redirect if we're showing the toast
    return ref(null)
  }

  /**
   * Performs the actual token refresh API call.
   * Returns a discriminated RefreshOutcome: ok (new token), fatal (invalid_grant → log out),
   * or transient (network/5xx → keep session and retry on the next poll tick).
   */
  async function performTokenRefresh(): Promise<RefreshOutcome> {
    const token = selfJwtToken.value
    if (!token?.refresh?.token) {
      return { status: 'fatal' }
    }

    const { data, error } = await usePostRawJson("token", {
      grant_type: "refresh_token",
      refresh_token: token.refresh.token
    }, token.isBadger)

    if (error) {
      if (isFatalRefreshError(error)) {
        console.error('Token refresh rejected (invalid_grant), logging out:', error.message)
        return { status: 'fatal' }
      }
      console.warn('Token refresh transient failure, keeping session:', error.message)
      return { status: 'transient' }
    }

    const apiData = data as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!apiData?.access_token || !apiData?.refresh_token) {
      // Unexpected response shape — treat as transient, not a reason to log out
      console.warn('Token refresh returned unexpected response, keeping session')
      return { status: 'transient' }
    }

    return { status: 'ok', token: setJwtSelfJwtTokenFromApiResponse(apiData as { access_token: string; refresh_token: string; expires_in?: number }, token.isBadger) }
  }

  /**
   * Re-read the stored token from localStorage and adopt it if it is newer than what is in memory.
   * Runs synchronously inside the Web Lock so another tab's just-written token is visible
   * before we decide whether to call /token again.
   */
  function rehydrateFromLocalStorageIfNewer(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem('narvik_selfUser')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.selfJwtToken) hydrateJwtFromStorage(parsed.selfJwtToken)
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Adopt a token that was persisted by another tab.
   * Never regresses: ignores incoming token if our in-memory access token is already newer.
   */
  function hydrateJwtFromStorage(raw: Record<string, any>): void {
    if (!raw?.access?.token && !raw?.refresh?.token) return

    // Never overwrite a newer in-memory token with an older persisted one
    if (selfJwtToken.value?.access?.date && raw?.access?.date) {
      const inMemory = dayjs(selfJwtToken.value.access.date)
      const incoming = dayjs(raw.access.date)
      if (incoming.isValid() && inMemory.isValid() && incoming.isBefore(inMemory)) return
    }

    const t = new JwtToken(!!raw.isBadger)
    if (raw.access) {
      t.access = {
        token: raw.access.token,
        date: raw.access.date ? new Date(raw.access.date) : null
      }
    }
    if (raw.refresh) {
      t.refresh = {
        token: raw.refresh.token,
        date: raw.refresh.date ? new Date(raw.refresh.date) : null
      }
    }
    selfJwtToken.value = t
  }

  /**
   * Run the token refresh in a cross-tab serialized manner using the Web Locks API.
   * Inside the lock we re-read localStorage — if another tab already refreshed,
   * we adopt its token and skip the network call (prevents double-spending rotated tokens).
   * Falls back to a plain async call when Web Locks are unavailable.
   */
  async function coordinatedRefresh(): Promise<RefreshOutcome> {
    const run = async (): Promise<RefreshOutcome> => {
      rehydrateFromLocalStorageIfNewer()
      // If re-hydration gave us a fresh access token, skip the network call
      const current = selfJwtToken.value
      if (current && isAccessTokenValid(current)) {
        return { status: 'ok', token: current }
      }
      return performTokenRefresh()
    }

    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request('narvik-token-refresh', run)
    }
    return run()
  }

  /**
   * Ensures a valid JWT token is available for API calls.
   * Uses a promise singleton pattern to prevent concurrent refresh attempts.
   */
  async function enhanceJwtTokenDefined(): Promise<Ref<JwtToken | null>> {
    const jwtToken = getSelfJwtToken()

    // No token at all
    if (!jwtToken.value) {
      return handleTokenError("Aucune session active.")
    }

    // Access token is still valid
    if (isAccessTokenValid(jwtToken.value)) {
      return jwtToken
    }

    // No refresh token available
    if (!jwtToken.value.refresh?.token) {
      return handleTokenError("Session invalide.")
    }

    // Refresh token is definitely expired (valid date in the past)
    if (!shouldAttemptRefresh(jwtToken.value)) {
      return handleTokenError("Session expirée.")
    }

    // If already refreshing in this tab, wait for that operation to complete
    if (refreshTokenPromise) {
      return refreshTokenPromise
    }

    // Start the refresh operation wrapped in our singleton promise (per-tab inner guard)
    // coordinatedRefresh adds the cross-tab Web Lock as the outer guard
    refreshTokenPromise = (async (): Promise<Ref<JwtToken | null>> => {
      const outcome = await coordinatedRefresh()

      if (outcome.status === 'fatal') {
        return handleTokenError("Impossible de rafraîchir la session.")
      }

      // 'ok' or 'transient': keep the session.
      // On 'transient', the access token is stale — useApi will detect this and return
      // undefined for this call, keeping last displayed data until the next poll tick retries.
      return jwtToken
    })()

    try {
      return await refreshTokenPromise
    } finally {
      refreshTokenPromise = null
    }
  }

  /**
   * Derive the access token expiry from the JWT payload `exp` claim when available.
   * Falls back to `expires_in` from the response, then to the historical 58-minute constant.
   * A 2-minute buffer ensures we refresh before the server actually rejects the token.
   */
  function deriveAccessExpiry(accessToken: string, expiresIn?: number): Date {
    try {
      const parts = accessToken.split('.')
      const payloadPart = parts[1]
      if (parts.length === 3 && payloadPart) {
        const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
        if (payload?.exp && typeof payload.exp === 'number') {
          return new Date((payload.exp - 120) * 1000)
        }
      }
    } catch {
      // Opaque token or malformed JWT — fall through to next strategy
    }
    if (typeof expiresIn === 'number' && expiresIn > 0) {
      return new Date(Date.now() + (expiresIn - 120) * 1000)
    }
    return new Date(Date.now() + 3480 * 1000) // historical fallback (58 min)
  }

  function setJwtSelfJwtTokenFromApiResponse(data: { access_token: string; refresh_token: string; expires_in?: number }, isBadger: boolean = false): JwtToken {
    const jwtToken = new JwtToken(isBadger);

    jwtToken.access = {
      date: deriveAccessExpiry(data.access_token, data.expires_in),
      token: data.access_token
    }

    // The backend does not return refresh_token_expiration — we let the server be the
    // source of truth (invalid_grant on an expired/revoked token). Store null cleanly;
    // shouldAttemptRefresh treats null as "try anyway".
    jwtToken.refresh = {
      date: null,
      token: data.refresh_token
    }

    setSelfJwtToken(jwtToken);

    return jwtToken;
  }


  // End Session Management


  async function refresh() {
    const userQuery = new UserQuery()
    const {retrieved} = await userQuery.self()

    if (retrieved) {
      user.value = retrieved

      if (!retrieved.linkedProfiles || retrieved.linkedProfiles.length === 0) {
        return
      }

      if (selectedProfile.value === undefined) {
        selectedProfile.value = retrieved.linkedProfiles[0]
      } else {
        if (selectedProfile.value && !selectedProfile.value.id.startsWith('sc-')) {
          selectedProfile.value = retrieved.linkedProfiles.find( (profile) => profile.id === selectedProfile.value?.id)
        }
      }

      // We refresh the club in an async way
      refreshSelectedClub()

      const memberQuery = new MemberQuery()
      member.value = selectedProfile.value?.member
      if (member.value && member.value.uuid) {
        const { retrieved:retrievedMember } = await memberQuery.get(member.value.uuid.toString())
        if (retrievedMember) {
          member.value = retrievedMember

          // We load the profile image
          const image = await loadProfileImage()
          if (image) {
            member.value.profileImageBase64 = image
          }
        }
      }
    }

    // We refresh the config we got from the api
    appConfigStore.refresh()
  }

  async function refreshSelectedClub() {
    if (selectedProfile.value?.club) {
      const clubQuery = new ClubQuery()
      const { retrieved: retrievedClub } = await clubQuery.getCurrentClub()
      if (retrievedClub) {
        selectedProfile.value.club = retrievedClub
        await refreshSelectedClubSettings()
      }
    }
  }

  async function refreshSelectedClubSettings() {
    if (selectedProfile.value?.club.settings?.uuid) {
      const clubSettingQuery = new ClubSettingQuery()
      const { retrieved: clubSettings } = await clubSettingQuery.get(selectedProfile.value.club.settings.uuid)
      if (clubSettings) {
        selectedProfile.value.club.settings = clubSettings

        // We load the club logo
        const image = await loadClubLogo()
        if (image) {
          selectedProfile.value.club.settings.logoBase64 = image
        }
      }
    }
  }

  async function impersonateClub(club: Club) {
    if (!isSuperAdmin()) return false

    const fakeProfile: LinkedProfile = {
      id: 'sc-' + club.uuid,
      club: club,
      displayName: `${club.name}`,
      role: ClubRole.Admin
    }

    selectedProfile.value = fakeProfile
    await refresh()
    await refreshSelectedClubSettings()
    isImpersonating.value = true

    return true
  }

  async function impersonateUser(userImpersonated: User) {
    if (!isSuperAdmin()) return false

    selectedProfile.value = undefined
    member.value = undefined
    user.value = userImpersonated
    impersonatedUser.value = userImpersonated.email
    await refresh()
    isImpersonating.value = true

    navigateTo('/') // We always send to the homepage

    return true
  }


  async function stopImpersonation() {
    selectedProfile.value = undefined
    impersonatedUser.value = undefined
    isImpersonating.value = false
    await refresh()

    if (isSuperAdmin()) {
      navigateTo('/super-admin')
    } else {
      navigateTo('/admin')
    }
  }

  async function loadProfileImage() {
    if (!member.value || !member.value.profileImage?.privateUrl) return null;

    const fileQuery = new FileQuery();
    const { retrieved } = await fileQuery.getFromUrl(member.value.profileImage.privateUrl);

    if (!retrieved || !retrieved.base64) return null

    return retrieved.base64
  }

  async function loadClubLogo() {
    if (!selectedProfile.value?.club.settings.logo?.publicUrl) return null;
    const fileQuery = new FileQuery();
    const { retrieved } = await fileQuery.getFromUrl(selectedProfile.value.club.settings.logo.publicUrl);

    if (!retrieved || !retrieved.base64) return null

    return retrieved.base64
  }

  function logout(redirect: boolean = true) {
    // Prevent multiple simultaneous logout calls (race condition protection)
    if (isLoggingOut.value) return

    // Already logged out
    if (!selfJwtToken.value && member.value === undefined) return

    isLoggingOut.value = true

    // Clear all auth state
    selfJwtToken.value = null
    member.value = undefined
    user.value = undefined
    selectedProfile.value = undefined

    // Refresh the config with logged-out state
    appConfigStore.refresh(false)

    // Show toast and redirect only if requested
    if (redirect) {
      const toast = useToast()
      toast.add({
        title: "Vous avez été déconnecté."
      })
      navigateTo('/login')
    }

    // Reset mutex after a short delay to allow state to settle
    setTimeout(() => { isLoggingOut.value = false }, 500)
  }

  function isLegalsAccepted() {
    if (!isLogged()) {
      return true
    }

    // We check the user accepted the latest legals conditions
    if (!isBadger()) {
      if (!user.value?.legalsAccepted) {
        return false
      }

      return !user.value.legalsExpired
    }
    return true
  }

  function isLogged(): boolean {
    const selfToken = getSelfJwtToken();

    if (
      !selfToken.value ||
      !selfToken.value?.refresh
    ) return false

    return true
  }

  function isSuperAdmin(): boolean {
    if (!isLogged()) return false;
    if (user.value) {
      return user.value.role === UserRole.SuperAdmin
    }

    return false
  }

  function isAdmin(): boolean {
    if (!isLogged()) return false;

    if (isSuperAdmin()) return true;

    if (selectedProfile.value && selectedProfile.value.role) {
      return selectedProfile.value.role === ClubRole.Admin
    }
    return false;
  }

  function hasSupervisorRole(): boolean {
    if (!isLogged()) return false;

    if (isSuperAdmin()) return true;

    if (selectedProfile.value && selectedProfile.value.role) {
      return selectedProfile.value.role === ClubRole.Supervisor || isAdmin()
    }

    return false;
  }

  function isBadger(): boolean {
    if (!isLogged()) return false;

    if (user.value) {
      return user.value.role === UserRole.Badger
    }
    return false;
  }

  /**
   * Check if the current user has a specific permission.
   * Returns true for admins and super admins (they have all permissions).
   * For supervisors, checks the permissions array from the selected profile.
   * Hierarchy: EDIT permission implies ACCESS permission.
   */
  function can(permission: Permission): boolean {
    if (!isLogged()) return false;

    // Super admins and admins have all permissions
    if (isSuperAdmin() || isAdmin()) return true;

    // Check if permission is in the selected profile's permissions
    if (selectedProfile.value && selectedProfile.value.permissions) {
      // Direct match
      if (selectedProfile.value.permissions.includes(permission)) {
        return true;
      }

      // Hierarchy check: EDIT implies ACCESS
      // If checking for ACCESS and user has the corresponding EDIT, return true
      if (permission.endsWith('_ACCESS')) {
        const editPermission = permission.replace('_ACCESS', '_EDIT') as Permission;
        if (selectedProfile.value.permissions.includes(editPermission)) {
          return true;
        }
      }
    }

    return false;
  }

  return {
    user,
    member,
    selectedProfile,

    isImpersonating,
    impersonatedUser,
    impersonateClub,
    impersonateUser,
    stopImpersonation,

    delay,
    refresh,
    refreshSelectedClub,
    refreshSelectedClubSettings,
    logout,

    isLegalsAccepted,

    isLogged,
    isSuperAdmin,
    isAdmin,
    isBadger,

    hasSupervisorRole,
    can,

    // Session management
    selfJwtToken,
    isAccessTokenValid,
    setJwtSelfJwtTokenFromApiResponse,
    hydrateJwtFromStorage,
    enhanceJwtTokenDefined,
  }
}, {
  persist: {
    // We only save those attributes
    pick: [
      // 'user',
      // 'member',
      'isImpersonating',
      'selectedProfile.id',
      'selectedProfile.club.@id',
      'selectedProfile.club.uuid',
      'selfJwtToken',
    ],
  }
})
