<script setup lang="ts">
import type {GroupedNavigationLinks} from '~/types/groupedNavigationLinks';
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";

useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Email - Narvik` : 'Email - Narvik';
    }
  })

  const selfStore = useSelfUserStore();

  // can() already checks for admin status, so no need for explicit isAdmin check
  const mailSection = [];
  if (selfStore.can(Permission.EmailAccess)) {
    mailSection.push({
      label: 'Historique',
      icon: 'i-heroicons-archive-box',
      to: '/admin/email'
    })
  }
  if (selfStore.can(Permission.EmailEdit)) {
    mailSection.push({
      label: 'Écrire un mail',
      icon: 'i-heroicons-pencil',
      to: '/admin/email/new'
    })
  }

  const templateSection = [];
  if (selfStore.can(Permission.EmailTemplateAccess)) {
    templateSection.push({
      label: 'Bibliothèque',
      icon: 'i-heroicons-document',
      to: '/admin/email/templates'
    })
  }
  if (selfStore.can(Permission.EmailTemplateEdit)) {
    templateSection.push({
      label: 'Nouveau modèle',
      icon: 'i-heroicons-document-plus',
      to: '/admin/email/templates/new'
    })
  }

  const links: GroupedNavigationLinks[] = []

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
