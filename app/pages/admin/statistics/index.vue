<script setup lang="ts">
definePageMeta({
  layout: "admin"
})

useHead({
  title: 'Statistiques'
})

const links = [
  {
    title: 'Activités',
    description: 'Visualiser les statistiques de présence par activité.',
    icon: 'i-heroicons-calendar-days',
    to: '/admin/statistics/activities'
  },
  {
    title: 'Présence Membres',
    description: 'Récapitulatif de présences par membre pour la saison actuelle.',
    icon: 'i-heroicons-user-group',
    to: '/admin/statistics/member-presence'
  }
]
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-4 justify-center">
      <NuxtLink v-for="link in links" :to="link.to" class="basis-full md:basis-1/3">
        <UCard class="h-full hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <div class="flex flex-col items-center text-center gap-4">
            <UIcon :name="link.icon" class="w-12 h-12 text-primary-500" />
            <div>
              <h3 class="font-semibold text-lg mb-1">{{ link.title }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ link.description }}</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
