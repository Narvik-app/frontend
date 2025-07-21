<script setup lang="ts">
import {useAppConfigStore} from "~/stores/useAppConfig";
import UserQuery from "~/composables/api/query/UserQuery";
import {displayApiError} from "~/utils/resource";
import type {NuxtTurnstile} from "#components";
import BadgerModalQuickLoginInformation from "~/components/User/BadgerModalQuickLoginInformation";

const overlay = useOverlay()
const isLoading = ref(false)

const state = reactive({
  turnstileToken: undefined,
  securityCode: '' as string,
})

const turnstile = ref<InstanceType<typeof NuxtTurnstile>>()
const requireTurnstile = useRuntimeConfig().public.clientTurnstile

const appConfigStore = useAppConfigStore();
const siteLogo: Ref<string> = appConfigStore.getLogo()

const userQuery = new UserQuery()

async function getBadgerLogin() {
  if (!state.securityCode) {
    return
  }

  if (requireTurnstile && !state.turnstileToken) {
    turnstile.value?.reset()
    return
  }

  isLoading.value = true
  const { item, error } = await userQuery.getBadgerQuickLoginInfo(state.securityCode, state.turnstileToken)
  isLoading.value = false
  turnstile.value?.reset()

  if (error) {
    displayApiError(error)
    return;
  }

  overlay.create(BadgerModalQuickLoginInformation).open({
    clubUuid: item.club,
    token: item.token
  })
}

</script>

<template>
  <div>
    <div v-if="siteLogo" class="h-24 flex justify-center mb-4">
      <NuxtImg :src="siteLogo" class="h-full"/>
    </div>

    <div class="mb-2">
      <UButton size="xs" variant="link" to="/login" label="Se connecter" icon="i-heroicons-arrow-uturn-left"/>
    </div>

    <UCard>

      <UForm :state="state" class="space-y-4" @submit="getBadgerLogin">
        <UFormField label="Code de connexion" name="securityCode">
          <UInput v-model="state.securityCode" />
        </UFormField>

        <NuxtTurnstile v-if="requireTurnstile" v-model="state.turnstileToken" />

        <UButton type="submit" :loading="isLoading">
          Connexion
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>

<style lang="css" scoped>

</style>
