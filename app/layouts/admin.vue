<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {GroupedNavigationLinks} from "~/types/groupedNavigationLinks";
import dayjs from "dayjs";
import {formatDateReadable} from "~/utils/date";
import {Permission} from "~/types/api/permissions";

useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Administration - Narvik` : 'Administration - Narvik';
    }
  });

  const selfStore = useSelfUserStore()

  const isAdmin = selfStore.isAdmin()
  const _isSupervisor = selfStore.hasSupervisorRole()

  const globalSection = [
    {
      label: 'Accueil',
      icon: 'i-heroicons-home',
      to: '/admin'
    }
  ]
  if (isAdmin) {
    globalSection.push({
      label: 'Abonnement',
      icon: 'i-heroicons-credit-card',
      to: '/admin/subscription'
    })
    globalSection.push({
      label: 'Configuration',
      icon: 'i-heroicons-wrench-screwdriver',
      to: '/admin/config'
    })
  }

  const configsSection = [
    {
      label: 'Activités',
      icon: 'i-heroicons-rocket-launch',
      to: '/admin/config/activities'
    },
    {
      label: 'Permissions',
      icon: 'i-heroicons-key',
      to: '/admin/config/permissions'
    },
  ]
  if (selfStore.selectedProfile?.club.presencesEnabled) {
    configsSection.push({
      label: 'Présences',
      icon: 'i-heroicons-calendar-days',
      to: '/admin/config/presences'
    })
  }

  const entitiesSection = [
    {
      label: 'Membres',
      icon: 'i-heroicons-user-group',
      to: '/admin/members'
    },
    {
      label: 'Présences',
      icon: 'i-heroicons-calendar-days',
      to: '/admin/presences'
    },
    {
      label: 'Statistiques',
      icon: 'i-heroicons-presentation-chart-line',
      to: '/admin/statistics'
    },
    {
      label: 'Trombinoscope',
      icon: 'i-heroicons-face-smile',
      to: '/admin/thrombinoscope'
    }
  ]

  // Import section - can() already checks for admin status
  const importSection = [];
  if (selfStore.can(Permission.ImportMembersAccess)) {
    importSection.push({
      label: 'Membres',
      icon: 'i-heroicons-users',
      to: '/admin/imports/members'
    })
  }
  if (selfStore.can(Permission.ImportPhotosAccess)) {
    importSection.push({
      label: 'Photos',
      icon: 'i-heroicons-photo',
      to: '/admin/imports/photos'
    })
  }
  if (selfStore.selectedProfile?.club.presencesEnabled && selfStore.can(Permission.ImportPresencesAccess)) {
    importSection.push({
      label: 'Présences',
      icon: 'i-heroicons-calendar-days',
      to: '/admin/imports/presences'
    })
  }

  const links: GroupedNavigationLinks[] = [
    {
      links: globalSection
    },
    {
      title: '',
      links: entitiesSection
    },
  ]

  // Show imports section if user has access to any import
  if (importSection.length > 0) {
    links.push({
      title: 'Imports',
      links: importSection
    })
  }

  if (isAdmin) {
    links.push({
      title: 'Paramétrage',
      links: configsSection,
    })
  }
</script>

<template>
  <GenericLayoutAdmin :items="links">
    <UAlert
      v-if="!selfStore.selectedProfile?.club.isActivated"
      class="mb-4"
      icon="i-heroicons-link-slash"
      color="error"
      variant="subtle"
      title="Lecture seule. Club non activé."
      description="Le club n'est pas activé, aucune modification ne sera possible. Veuillez contacter le support pour plus d'information."
    />
    <UAlert
      v-if="isAdmin && selfStore.selectedProfile?.club.renewDate && dayjs().add(14, 'days').isAfter(selfStore.selectedProfile.club.renewDate)"
      class="mb-4"
      icon="i-heroicons-credit-card"
      color="warning"
      variant="subtle"
      title="Votre abonnement se termine bientôt."
      :description="`Veuillez penser à le renouveler avant le ${formatDateReadable(selfStore.selectedProfile.club.renewDate.toString())}.`"
    />
    <slot/>
  </GenericLayoutAdmin>
</template>

<style lang="css" scoped>

</style>
