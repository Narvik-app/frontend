<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {GroupedNavigationLinks} from "~/types/groupedNavigationLinks";

useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Administration - Narvik` : 'Administration - Narvik';
    }
  });

  const selfStore = useSelfUserStore()

  const globalSection = [
    {
      label: 'Accueil',
      icon: 'i-heroicons-home',
      to: '/super-admin'
    }
  ]

  const configsSection = [
    {
      label: 'Email',
      icon: 'i-heroicons-envelope',
      to: '/super-admin/config/email'
    },
    {
      label: 'Documents légaux',
      icon: 'i-heroicons-scale',
      to: '/super-admin/config/legals'
    }
  ]

  const entitiesSection = [
    {
      label: 'Clubs',
      icon: 'i-heroicons-building-storefront',
      to: '/super-admin/clubs'
    },
    {
      label: 'Utilisateurs',
      icon: 'i-heroicons-users',
      to: '/super-admin/users'
    },
    {
      label: 'Saisons',
      icon: 'i-heroicons-calendar-date-range',
      to: '/super-admin/seasons'
    },
    {
      label: 'Catégories d\'âge',
      icon: 'i-heroicons-cake',
      to: '/super-admin/age-categories'
    },
  ]

  const links: GroupedNavigationLinks[] = [
    {
      links: globalSection
    },
    {
      title: '',
      links: entitiesSection
    },
    {
      title: 'Configurations',
      links: configsSection,
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
