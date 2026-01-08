<script setup lang="ts">

definePageMeta({
    layout: "email"
  })

  useHead({
    title: "Modifier un modèle"
  })

  const route = useRoute()
  const templateId = decodeUrlUuid(route.params.id.toString())

  const selfStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfStore)

  // Redirect to main page if there's no profile
  if (!selectedProfile.value) {
    navigateTo("/")
  }
</script>

<template>
  <EmailTemplateEditor :template-id="templateId"></EmailTemplateEditor>
</template>
