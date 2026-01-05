<script setup lang="ts">
  import {useSelfUserStore} from "~/stores/useSelfUser";
  import FooterCopyright from "~/components/FooterCopyright.vue";
  import type {GroupedNavigationLinks} from "~/types/groupedNavigationLinks";
  import {Permission} from "~/types/api/permissions";

  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - POS - Narvik` : 'POS - Narvik';
    }
  });

  const selfStore = useSelfUserStore()
  const isAdmin = selfStore.isAdmin()
  const isSupervisor = selfStore.hasSupervisorRole()

  // Permission checks for conditional navigation
  const canAccessSaleNew = selfStore.can(Permission.SaleNew)
  const canAccessHistory = selfStore.can(Permission.SaleHistoryAccess)
  const canAccessInventory = selfStore.can(Permission.SaleInventoryAccess)
  const canAccessCategories = selfStore.can(Permission.SaleCategoriesAccess)
  const canAccessPaymentModes = selfStore.can(Permission.SalePaymentModesAccess)
  const canAccessImport = selfStore.can(Permission.SaleImportAccess)

  const salesSection: { label: string; icon: string; to: string }[] = []

  if (canAccessSaleNew) {
    salesSection.push({
      label: 'Faire une vente',
      icon: 'i-heroicons-banknotes',
      to: '/admin/sales/new'
    })
  }

  const historySection = [
    {
      label: 'Par Articles',
      icon: 'i-heroicons-shopping-cart',
      to: '/admin/sales'
    },
    {
      label: 'Par Ventes',
      icon: 'i-heroicons-receipt-refund',
      to: '/admin/sales/history'
    }
  ]

  // Build management section based on permissions
  const managementSection: { label: string; icon: string; to: string }[] = []

  if (canAccessInventory) {
    managementSection.push({
      label: 'Inventaire',
      icon: 'i-heroicons-calculator',
      to: '/admin/inventories'
    })
  }

  if (canAccessCategories) {
    managementSection.push({
      label: 'Catégories',
      icon: 'i-heroicons-tag',
      to: '/admin/inventories/categories'
    })
  }

  if (canAccessPaymentModes) {
    managementSection.push({
      label: 'Moyen de paiements',
      icon: 'i-heroicons-credit-card',
      to: '/admin/sales/payment-modes'
    })
  }

  if (canAccessImport) {
    managementSection.push({
      label: 'Imports',
      icon: 'i-heroicons-arrow-down-on-square-stack',
      to: '/admin/sales/import'
    })
  }

  let links: GroupedNavigationLinks[] = []

  // Add sales section if user can access new sale
  if (salesSection.length > 0) {
    links.push({
      links: salesSection
    })
  }

  // Add history section if user has access
  if (canAccessHistory) {
    links.push({
      title: 'Historique',
      links: historySection
    })
  }

  // Add management section if any management links are available
  if (managementSection.length > 0) {
    links.push({
      title: 'Gestion',
      links: managementSection
    })
  }

</script>

<template>
  <GenericLayoutAdmin :items="links">
    <ErrorModuleNotEnabled v-if="!selfStore.selectedProfile?.club.salesEnabled" />
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>
