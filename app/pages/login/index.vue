<script setup lang="ts">
import type {FormError, FormSubmitEvent} from '#ui/types'
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  WebAuthnAbortService
} from "@simplewebauthn/browser";
import {useLoginPasskey, useLoginUser} from "~/composables/api/api";
import PasskeyQuery from "~/composables/api/query/PasskeyQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import ModalLegalsAcceptance from "~/components/Modal/ModalLegalsAcceptance.vue";
import {convertUuidToUrlUuid} from "~/utils/resource";
import {isPasskeyCancelled} from "~/utils/passkey";

definePageMeta({
  layout: "empty",
});


const toast = useToast()
const overlay = useOverlay()
const isLoading = ref(false)
const isPasskeyLoading = ref(false)
const showPassword = ref(false)

// Checked on mount: WebAuthn is a browser API (and only available on HTTPS or localhost)
const canUsePasskey = ref(false)
// Passkeys suggested in the email field autofill (conditional UI)
let canUsePasskeyAutofill = false
// The backend login challenge expires after 5 minutes: renew the pending autofill request before
const AUTOFILL_RENEW_MS = 4 * 60 * 1000
let autofillTimer: ReturnType<typeof setTimeout> | undefined
// Only the latest passkey ceremony may continue after an await (a click replaces the autofill one)
let ceremonyId = 0

onMounted(async () => {
  canUsePasskey.value = browserSupportsWebAuthn()
  canUsePasskeyAutofill = canUsePasskey.value && await browserSupportsWebAuthnAutofill()
  startPasskeyAutofill()
})

onBeforeUnmount(() => {
  canUsePasskeyAutofill = false
  ceremonyId++
  clearTimeout(autofillTimer)
  document.removeEventListener('visibilitychange', renewPasskeyAutofill)
  WebAuthnAbortService.cancelCeremony()
})

const state = reactive({
  email: undefined,
  password: undefined
})

const selfStore = useSelfUserStore();

const validate = (state: { email?: string; password?: string }): FormError[] => {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Champ requis' })
  if (!state.password) errors.push({ name: 'password', message: 'Champ requis' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<{email: string, password: string}>) {
  isLoading.value = true

  const { error } = await useLoginUser(event.data.email, event.data.password);
  if (error) {
    toast.add({
      color: "error",
      title: error.statusCode === 400 ? "Erreur de connexion" : "Trop de tentative",
      description: error.statusCode === 400 ? 'Mauvais email/mot de passe' : 'Veuillez réessayer dans 5 minutes.'
    })
    console.error(error)
    isLoading.value = false
    return;
  }

  await onLoggedIn()
  isLoading.value = false
}

function startPasskeyAutofill() {
  if (canUsePasskeyAutofill) {
    passkeyLogin(true)
  }
}

// A hidden tab doesn't renew its request (a new challenge each time): it does when it's shown again
function renewPasskeyAutofill() {
  if (document.visibilityState === 'hidden') {
    document.addEventListener('visibilitychange', renewPasskeyAutofill, { once: true })
    return
  }
  startPasskeyAutofill()
}

function toastPasskeyError(statusCode: number | undefined, description: string) {
  toast.add({
    color: "error",
    title: statusCode === 429 ? "Trop de tentative" : "Erreur de connexion",
    description: statusCode === 429 ? 'Veuillez réessayer dans 5 minutes.' : description
  })
}

/**
 * Passwordless login. With autofill, the browser waits in the background for the user to pick a
 * passkey in the email field suggestions, so only a failed login (after a pick) is reported.
 */
async function passkeyLogin(autofill: boolean) {
  const id = ++ceremonyId
  clearTimeout(autofillTimer)
  if (!autofill) {
    isPasskeyLoading.value = true
  }

  // After a click, or a failed login with a picked passkey, keep suggesting passkeys in the email field.
  // Not after an autofill setup failure (rate limit...), it would loop.
  let restartAutofill = !autofill
  try {
    const { item: options, error } = await new PasskeyQuery().loginOptions()
    if (id !== ceremonyId) return
    if (!options) {
      if (!autofill) toastPasskeyError(error?.statusCode, "Connexion par clé d'accès indisponible")
      return
    }
    if (autofill) {
      autofillTimer = setTimeout(renewPasskeyAutofill, AUTOFILL_RENEW_MS)
    }

    let credential
    try {
      credential = await startAuthentication({ optionsJSON: options.publicKey, useBrowserAutofill: autofill })
    } catch (e) {
      if (!isPasskeyCancelled(e)) {
        console.error(e)
        if (!autofill) toastPasskeyError(undefined, "La clé d'accès n'a pas pu être utilisée")
      }
      return
    }

    clearTimeout(autofillTimer)
    isPasskeyLoading.value = true
    const { error: loginError } = await useLoginPasskey(options.challengeId, credential)
    if (loginError) {
      restartAutofill = true
      console.error(loginError)
      toastPasskeyError(loginError.statusCode, "Clé d'accès non reconnue")
      return
    }

    restartAutofill = false
    await onLoggedIn()
  } finally {
    if (id === ceremonyId) {
      isPasskeyLoading.value = false
      if (restartAutofill) startPasskeyAutofill()
    }
  }
}

async function onLoggedIn() {
  if (!selfStore.isLegalsAccepted()) {
    const modal = overlay.create(ModalLegalsAcceptance)
    const instance = modal.open({
      onAccepted() {
        redirectSuccessLogin()
      }
    })
    await instance.result
  } else {
    redirectSuccessLogin()
  }
}

function redirectSuccessLogin() {
  const { proxy } = useScriptUmamiAnalytics()
  if (selfStore.user?.uuid) {
    proxy.identify(convertUuidToUrlUuid(selfStore.user.uuid))
  }
  if (selfStore.isSuperAdmin()) {
    navigateTo('/super-admin');
  }
  navigateTo('/');
}
</script>

<template>
  <div>
    <HeaderDefaultLayout :back-login-button="false" />

    <UCard>
      <UForm :state="state" class="space-y-4" :validate="validate" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" autocomplete="username webauthn" data-testid="login-email" />
        </UFormField>

        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            data-testid="login-password"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                :padded="false"
                class="pointer-events-auto"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <div class="flex justify-end !-mt-0 ">
          <UButton class="text-xs" variant="link" @click="navigateTo('login/password-reset')">
            Mot de passe oublié
          </UButton>
        </div>

        <div class="flex flex-col justify-center gap-4">
          <UButton block type="submit" :loading="isLoading" :disabled="isPasskeyLoading" data-testid="login-submit">
            Connexion
          </UButton>

          <UButton
            v-if="canUsePasskey"
            block
            variant="outline"
            icon="i-heroicons-finger-print"
            :loading="isPasskeyLoading"
            :disabled="isLoading"
            data-testid="login-passkey"
            @click="passkeyLogin(false)"
          >
            Se connecter avec une clé d'accès
          </UButton>

          <USeparator label="Ou" />

          <UButton block :disabled="isLoading" variant="soft" to="login/register">
            S'enregistrer
          </UButton>

          <div class="flex justify-end !-mt-0 ">
            <UButton class="text-[.6rem]" variant="link" data-testid="login-badger-quick" @click="navigateTo('login/badger-quick-login')">
              Connexion pointeuse
            </UButton>
          </div>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<style lang="css" scoped>

</style>
