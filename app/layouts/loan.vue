<script setup lang="ts">
import {useSelfUserStore} from '~/stores/useSelfUser'
import type {GroupedNavigationLinks} from '~/types/groupedNavigationLinks'
import {Permission} from '~/types/api/permissions'

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Prêts - Narvik` : 'Prêts - Narvik'
  }
})

const selfStore = useSelfUserStore()

const canAccessLoans = selfStore.can(Permission.LoanAccess)
const canAccessItems = selfStore.can(Permission.LoanItemsAccess)
const canAccessCategories = selfStore.can(Permission.LoanCategoriesAccess)
const canEditRecordingTypes = selfStore.can(Permission.LoanRecordingsEdit)

const loansSection: { label: string; icon: string; to: string }[] = []

if (canAccessLoans) {
  loansSection.push({
    label: 'Prêts',
    icon: 'i-heroicons-archive-box-arrow-down',
    to: '/admin/loans'
  })
}

const itemsSection: { label: string; icon: string; to: string }[] = []

if (canAccessItems) {
  itemsSection.push({
    label: 'Articles',
    icon: 'i-heroicons-archive-box',
    to: '/admin/loans/items'
  })
}

if (canAccessCategories) {
  itemsSection.push({
    label: 'Catégories',
    icon: 'i-heroicons-tag',
    to: '/admin/loans/categories'
  })
}

if (canEditRecordingTypes) {
  itemsSection.push({
    label: 'Types d\'enregistrement',
    icon: 'i-heroicons-squares-2x2',
    to: '/admin/loans/recording-types'
  })
}

const links: GroupedNavigationLinks[] = []

if (loansSection.length > 0) {
  links.push({
    links: loansSection
  })
}

if (itemsSection.length > 0) {
  links.push({
    title: 'Gestion',
    links: itemsSection
  })
}
</script>

<template>
  <GenericLayoutAdmin :items="links">
    <ErrorModuleNotEnabled v-if="!selfStore.selectedProfile?.club.loansEnabled" />
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>
