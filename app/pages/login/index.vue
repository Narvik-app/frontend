<script setup lang="ts">
import type {FormError, FormSubmitEvent} from '#ui/types'
import {browserSupportsWebAuthn, startAuthentication, WebAuthnError} from "@simplewebauthn/browser";
import {useLoginPasskey, useLoginUser} from "~/composables/api/api";
import PasskeyQuery from "~/composables/api/query/PasskeyQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import ModalLegalsAcceptance from "~/components/Modal/ModalLegalsAcceptance.vue";
import {convertUuidToUrlUuid} from "~/utils/resource";

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
onMounted(() => {
  canUsePasskey.value = browserSupportsWebAuthn()
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

async function onPasskeyLogin() {
  isPasskeyLoading.value = true
  try {
    const passkeyQuery = new PasskeyQuery()
    const { options, error } = await passkeyQuery.loginOptions()
    if (!options) {
      toast.add({
        color: "error",
        title: error?.statusCode === 429 ? "Trop de tentative" : "Erreur de connexion",
        description: error?.statusCode === 429 ? 'Veuillez réessayer dans 5 minutes.' : 'Connexion par clé d\'accès indisponible'
      })
      return
    }

    let credential
    try {
      credential = await startAuthentication({ optionsJSON: options.publicKey })
    } catch (e) {
      // The user closed the browser prompt: nothing to report
      if ((e as Error).name === 'NotAllowedError' || (e instanceof WebAuthnError && e.code === 'ERROR_CEREMONY_ABORTED')) {
        return
      }
      console.error(e)
      toast.add({ color: "error", title: "Erreur de connexion", description: "La clé d'accès n'a pas pu être utilisée" })
      return
    }

    const { error: loginError } = await useLoginPasskey(options.challengeId, credential)
    if (loginError) {
      toast.add({
        color: "error",
        title: loginError.statusCode === 429 ? "Trop de tentative" : "Erreur de connexion",
        description: loginError.statusCode === 429 ? 'Veuillez réessayer dans 5 minutes.' : "Clé d'accès non reconnue"
      })
      console.error(loginError)
      return
    }

    await onLoggedIn()
  } finally {
    isPasskeyLoading.value = false
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
          <UInput v-model="state.email" type="email" data-testid="login-email" />
        </UFormField>

        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
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
            @click="onPasskeyLogin"
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
