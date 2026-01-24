<script setup lang="ts">

import type {PropType} from "vue";
import type {Club} from "~/types/api/item/club";
import {clubPlugins} from "~/types/api/item/club";

const props = defineProps({
  item: {
    type: Object as PropType<Club>,
    required: true
  },
})

// Build subscription list dynamically from clubPlugins
const subscriptionData = computed(() => [
  { name: 'Gestion des membres', enabled: true }, // Always enabled
  ...clubPlugins.map(plugin => ({
    name: plugin.description || plugin.label,
    enabled: props.item[plugin.key]
  }))
])

</script>

<template>
  <div class="flex justify-between flex-wrap">
    <span class="font-bold">Fonctionnalités</span>
    <NuxtLink class="text-xs underline" to="https://about.narvik.app/" target="_blank">En savoir plus sur les fonctionnalités disponibles</NuxtLink>
  </div>
  <UTable
    :columns="[
      {
        accessorKey: 'name',
        header: 'Nom',
        meta: {
          class: {
            th: 'w-1/3',
          }
        }
      },
      {
        accessorKey: 'enabled',
        header: 'Souscrite'
      }
    ]"
    :data="subscriptionData"
    >
    <template #enabled-cell="{ row }">
      <USwitch v-model="row.original.enabled" class="pointer-events-none" />
    </template>
  </UTable>
</template>

<style scoped lang="css">

</style>

