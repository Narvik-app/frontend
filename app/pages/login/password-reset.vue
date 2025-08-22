<script setup lang="ts">
import type {FormError, TabsItem} from '#ui/types'
import UserQuery from "~/composables/api/query/UserQuery";
import {isMobile, isTablet, watchBreakpoint} from "~/utils/browser";
import type {NuxtTurnstile} from "#components";

const toast = useToast()
const isLoading = ref(false)
const securityEmailSent = ref(false)

const queryParams = useRoute().query

const state = reactive({
  turnstileToken: undefined,
  securityCode: queryParams.security_code ?? undefined as string|undefined,

  email: queryParams.email ? decodeURI(queryParams.email.toString()) : undefined as string|undefined,
  password: undefined as string|undefined,
})

const turnstile = ref<InstanceType<typeof NuxtTurnstile>>()
const requireTurnstile = useRuntimeConfig().public.clientTurnstile

const userQuery = new UserQuery()

const isMobileDisplay = isMobile()
const isHorizontal = ref(false)
watchEffect(() => {
  isHorizontal.value = !isMobileDisplay.value
})

const selected = ref(queryParams.security_code ? '1' : '0')
const items = ref<TabsItem[]>([{
  slot: 'initial' as const,
  label: 'Demande de réinitialisation',
  icon: 'i-heroicons-lock-closed',
}, {
  slot: 'reset' as const,
  label: 'Vérification et modification',
  icon: 'i-heroicons-envelope-open',
}])

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Champ requis' })
  if (!state.password || state.password.length < 8) errors.push({ name: 'password', message: 'Champ requis (8 caractères minimum)' })
  if (!state.securityCode) errors.push({ name: 'securityCode', message: 'Champ requis' })
  return errors
}

async function resetPassword() {
  if (!state.email || !state.password || !state.securityCode) {
    return
  }

  isLoading.value = true
  const { error } = await userQuery.passwordReset(state.email, state.password, state.securityCode)
  isLoading.value = false

  if (error) {
    toast.add({
      color: "error",
      title: "Impossible d'effectuer la modification du mot de passe. Le mot de passe ou le code est incorrect.",
    });
    return;
  }

  toast.add({
    color: "success",
    title: "Le mot de passe a été modifié avec succès",
  });

  navigateTo('/login');
}

async function initiatePasswordReset() {
  if (!state.email) {
    return
  }

  if (requireTurnstile && !state.turnstileToken) {
    turnstile.value?.reset()
    return
  }

  isLoading.value = true
  const { error } = await userQuery.passwordResetInitialise(state.email, state.turnstileToken)
  isLoading.value = false
  turnstile.value?.reset()

  if (error) {
    toast.add({
      color: "error",
      title: "Impossible d'effectuer la demande de réinitialisation.",
      description: "Compte non trouvé ou bloqué. Veuillez réessayer dans 24h."
    });
    return;
  }

  toast.add({
    color: "success",
    title: "Un code de vérification a été envoyé par mail",
  });

  selected.value = '1'
  securityEmailSent.value = true
}

onMounted(() => {
  watchBreakpoint()
  window.addEventListener('resize', watchBreakpoint)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', watchBreakpoint)
})
</script>

<template>
  <div>
    <UCard>

      <UTabs v-model="selected" :items="items">
        <template #initial>
          <UForm :state="state" class="space-y-4" @submit="initiatePasswordReset">
            <UFormField label="Email" name="email">
              <UInput v-model="state.email" type="email" />
            </UFormField>

            <NuxtTurnstile v-if="requireTurnstile" v-model="state.turnstileToken" />

            <UButton type="submit" :loading="isLoading">
              Valider
            </UButton>
          </UForm>
        </template>

        <template #reset>
          <UAlert v-if="securityEmailSent"
            icon="i-heroicons-megaphone"
            color="success"
            variant="soft"
            title="Un email contenant le code de sécurité vous a été envoyé."
            description="Celui-ci peut se trouver dans votre dossier SPAM."
          />
          <UForm :state="state" class="space-y-4 mt-4" :validate="validate" @submit="resetPassword">
            <UFormField label="Code de sécurité" name="securityCode" help="En cas de code invalide, un nouveau sera envoyé. Seul le dernier code de sécurité reçu est valide.">
              <UInput v-model.trim="state.securityCode" />
            </UFormField>

            <UFormField label="Email" name="email">
              <UInput v-model.trim="state.email" type="email" />
            </UFormField>

            <UFormField label="Nouveau mot de passe" name="password">
              <UInput v-model="state.password" type="password" />
            </UFormField>

            <div class="flex justify-between">
              <UButton type="submit" :loading="isLoading">
                Modifier
              </UButton>
            </div>
          </UForm>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>

<style lang="css" scoped>

</style>
