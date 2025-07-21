<script setup lang="ts">
  import type { GroupedNavigationLinks } from '~/types/groupedNavigationLinks';

  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Email - Narvik` : 'Email - Narvik';
    }
  })

  const mainSection = [
    {
      label: 'Historique',
      icon: 'i-heroicons-archive-box',
      to: '/admin/email'
    },
    {
      label: 'Nouveau mail',
      icon: 'i-heroicons-pencil',
      to: '/admin/email/new'
    }
  ]

  let links: GroupedNavigationLinks[] = [
    {
      links: mainSection
    }
  ]
</script>

<template>
  <GenericLayoutAdmin :items="links">
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>