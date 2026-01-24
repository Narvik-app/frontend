<script setup lang="ts">

import {useAppConfigStore} from "~/stores/useAppConfig";

const _props = defineProps({
  backLoginButton: {
    type: Boolean,
    default: true
  },
})

const appConfigStore = useAppConfigStore();
const siteLogo: Ref<string> = appConfigStore.getLogo()

</script>

<template>
  <div>
    <div v-if="siteLogo" class="h-24 flex justify-center mb-4">
      <NuxtImg :src="siteLogo" class="h-full" />
    </div>

    <div v-if="backLoginButton" class="mb-2">
      <UButton size="xs" variant="link" to="/login" label="Se connecter" icon="i-heroicons-arrow-uturn-left" />
    </div>
  </div>
</template>

<style scoped lang="css">

</style>
