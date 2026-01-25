<script lang="ts" setup>

definePageMeta({
    layout: "email"
  })

  useHead({
    title: "Nouveau modèle"
  })

  const selfStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfStore)

  // Redirect to main page if there's no profile
  if (!selectedProfile.value) {
    navigateTo("/")
  }

</script>

<template>
  <EmailTemplateEditor/>
</template>
