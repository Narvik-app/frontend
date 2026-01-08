<script lang="ts" setup>
import {useSelfUserStore} from '~/stores/useSelfUser';

definePageMeta({
    layout: "email"
  })

  useHead({
    title: 'Historique'
  })

  const selfUserStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfUserStore)

  // Redirect to main page if there's no profile
  if (!selectedProfile.value) {
    navigateTo("/")
  }
</script>

<template>
  <EmailList v-if="selectedProfile"></EmailList>
</template>
