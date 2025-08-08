<script setup lang="ts">
  import type { GroupedNavigationLinks } from '~/types/groupedNavigationLinks';

  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Email - Narvik` : 'Email - Narvik';
    }
  })

  const mainSection = [
    {
      label: 'Écrire un mail',
      icon: 'i-heroicons-pencil',
      to: '/admin/email/new'
    }
  ]

  const bottomSection = [
    {
      label: 'Historique',
      icon: 'i-heroicons-archive-box',
      to: '/admin/email'
    },
  ]

  let links: GroupedNavigationLinks[] = [
    {
      links: mainSection
    },
    {
      title: '',
      links: bottomSection
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
