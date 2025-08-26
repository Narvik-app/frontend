<script setup lang="ts">
  import type { GroupedNavigationLinks } from '~/types/groupedNavigationLinks';

  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Email - Narvik` : 'Email - Narvik';
    }
  })

  const mailSection = [
    {
      label: 'Historique',
      icon: 'i-heroicons-archive-box',
      to: '/admin/email'
    },
    {
      label: 'Écrire un mail',
      icon: 'i-heroicons-pencil',
      to: '/admin/email/new'
    }
  ]

  const templateSection = [
    {
      label: 'Bibliothèque',
      icon: 'i-heroicons-document',
      to: '/admin/email/templates'
    },
    {
      label: 'Nouveau modèle',
      icon: 'i-heroicons-document-plus',
      to: '/admin/email/templates/new'
    }
  ]

  let links: GroupedNavigationLinks[] = [
    {
      title: 'Emails',
      links: mailSection
    },
    {
      title: 'Modèles',
      links: templateSection
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
