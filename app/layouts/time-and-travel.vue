<script setup lang="ts">
import {useSelfUserStore} from '~/stores/useSelfUser'
import type {GroupedNavigationLinks} from '~/types/groupedNavigationLinks'
import {Permission} from '~/types/api/permissions'

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Temps & kilomètres - Narvik` : 'Temps & kilomètres - Narvik'
  }
})

const selfStore = useSelfUserStore()

const canAccess = selfStore.can(Permission.TimeAndTravelAccess)
const canExport = selfStore.can(Permission.TimeAndTravelExport)

// Available to every member: their own declarations and vehicles, regardless of permission.
const selfSection = [
  {
    label: 'Mes déclarations',
    icon: 'i-heroicons-clock',
    to: '/time-and-travel'
  },
  {
    label: 'Mes véhicules',
    icon: 'i-heroicons-truck',
    to: '/time-and-travel/vehicles'
  }
]

// Admins/supervisors with the permission additionally get the club-wide management area.
const managementSection: { label: string; icon: string; to: string }[] = []

if (canAccess) {
  managementSection.push({
    label: 'Déclarations',
    icon: 'i-heroicons-clock',
    to: '/admin/time-and-travel'
  })
  managementSection.push({
    label: 'Véhicules',
    icon: 'i-heroicons-truck',
    to: '/admin/time-and-travel/vehicles'
  })
}

if (canExport) {
  managementSection.push({
    label: 'Exports',
    icon: 'i-heroicons-document-arrow-down',
    to: '/admin/time-and-travel/exports'
  })
}

const links: GroupedNavigationLinks[] = [
  {
    links: selfSection
  }
]

if (managementSection.length > 0) {
  links.push({
    title: 'Gestion',
    links: managementSection
  })
}
</script>

<template>
  <GenericLayoutAdmin :items="links">
    <ErrorModuleNotEnabled v-if="!selfStore.selectedProfile?.club.timeAndTravelEnabled" />
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>
