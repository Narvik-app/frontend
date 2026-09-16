<script setup lang="ts">
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'

definePageMeta({layout: 'time-and-travel'})
useHead({title: 'Véhicules'})

const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.TimeAndTravelEdit))
</script>

<template>
  <TimeAndTravelVehicleList :can-edit="canEdit" />
</template>
