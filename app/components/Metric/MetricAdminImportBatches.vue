<script lang="ts" setup>
import ClubJobQuery from "~/composables/api/query/clubDependent/ClubJobQuery";
import type {ClubJob, ClubJobKey} from "~/types/api/item/clubDependent/clubJob";

const clubJobQuery = new ClubJobQuery();
const jobs: Ref<ClubJob[]> = ref([])

const labels: Record<ClubJobKey, string> = {
  itac_import: 'Membres',
  itac_secondary_import: 'Membres club secondaire',
  cerbere_import: 'Cerbère',
  member_control_sync: 'Contrôles des membres',
}

const inProgressJobs = computed(() => jobs.value.filter(j => j.status === 'in_progress' && (j.remaining ?? 0) > 0))

async function refreshJobs() {
  const {items} = await clubJobQuery.getAll()
  jobs.value = items
}

let refreshInterval: NodeJS.Timeout
refreshJobs()
onMounted(() => {
  refreshInterval = setInterval(() => {
    refreshJobs()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <div v-if="inProgressJobs.length > 0">
    <UAlert
      class="mb-4"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      color="warning"
      title="Des imports sont en cours"
    >
      <template #description>
        <p v-for="job in inProgressJobs" :key="job.uuid">
          {{ job.key ? labels[job.key] : job.key }} : {{ job.remaining }} lots restants
        </p>
      </template>
    </UAlert>
  </div>
</template>
