<script setup lang="ts">
  import type { GroupedNavigationLinks } from '~/types/groupedNavigationLinks';
  import {useSelfUserStore} from "~/stores/useSelfUser";
  import {Permission} from "~/types/api/permissions";

  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Email - Narvik` : 'Email - Narvik';
    }
  })

  const selfStore = useSelfUserStore();
  const isAdmin = selfStore.isAdmin();

  // Email section - show if admin or has EMAIL_SEND permission
  const mailSection = [];
  if (isAdmin || selfStore.can(Permission.EmailSend)) {
    mailSection.push(
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
    )
  }

  // Template section - show if admin or has EMAIL_TEMPLATE permission
  const templateSection = [];
  if (isAdmin || selfStore.can(Permission.EmailTemplate)) {
    templateSection.push(
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
    )
  }

  let links: GroupedNavigationLinks[] = []

  if (mailSection.length > 0) {
    links.push({
      title: 'Emails',
      links: mailSection
    })
  }

  if (templateSection.length > 0) {
    links.push({
      title: 'Modèles',
      links: templateSection
    })
  }
</script>

<template>
  <GenericLayoutAdmin :items="links">
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>
