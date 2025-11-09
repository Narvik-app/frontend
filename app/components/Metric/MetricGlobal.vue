<script lang="ts" setup>
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useMetricStore} from "~/stores/useMetricStore";
import type {ChartBarData, ChartDataField} from "~/utils/chart";
import {type DateRange, DateRangeFilter} from "~/types/date";
import {formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";

const props = defineProps({
  superAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
});

const popoverOpen = ref(false)

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)
const metricStore = useMetricStore()

// Use store references
const {
  previousSeason,
  dateRange,
  isLoading,
  lastRefreshDate,
  openDaysMetrics,
  openDaysMetricsPreviousSeason,
  memberMetrics,
  presenceMetrics,
  presenceMetricsPreviousSeason,
  externalPresenceMetrics,
  externalPresenceMetricsPreviousSeason
} = storeToRefs(metricStore)

const memberStats = computed(() => {
  let response = {
    loading: true,
    currentSeason: 0,
    previousSeason: 0,
    isIncreasing: false
  }
  if (memberMetrics.value) {
    response.loading = false;
    memberMetrics.value.childMetrics.forEach(childMetric => {
      if (childMetric.name == "current-season") response.currentSeason = childMetric.value;
      if (childMetric.name == "previous-season") response.previousSeason = childMetric.value;
    })
    response.isIncreasing = response.currentSeason >= response.previousSeason
  }
  return response
});

const presenceStats = computed(() => {
  let response = {
    loading: true,

    currentSeason: 0,
    ratioPresenceOpenCurrentSeason: 0,

    previousSeason: 0,
    ratioPresenceOpenPreviousSeason: 0,
  }

  if (presenceMetrics.value) {
    response.loading = false;
    response.currentSeason = presenceMetrics.value.value || 0;
    response.ratioPresenceOpenCurrentSeason = openDaysMetrics.value?.value === (0 || undefined) ? 0 : (Math.round(response.currentSeason/openDaysMetrics.value.value) || 0)
  }

  if (presenceMetricsPreviousSeason.value) {
    response.previousSeason = presenceMetricsPreviousSeason.value.value || 0;
    response.ratioPresenceOpenPreviousSeason = openDaysMetricsPreviousSeason.value?.value === (0 || undefined) ? 0 : (Math.round(response.previousSeason/openDaysMetricsPreviousSeason.value.value) || 0)
  }

  return response
});

const externalPresenceStats = computed(() => {
  let response = {
    loading: true,
    currentSeason: 0,
    ratioPresenceOpenCurrentSeason: 0,

    previousSeason: 0,
    ratioPresenceOpenPreviousSeason: 0,
  }

  if (externalPresenceMetrics.value) {
    response.loading = false;
    response.currentSeason = externalPresenceMetrics.value.value || 0;
    response.ratioPresenceOpenCurrentSeason = openDaysMetrics.value?.value === (0 || undefined) ? 0 : (Math.round(response.currentSeason/openDaysMetrics.value.value) || 0)
  }

  if (externalPresenceMetricsPreviousSeason.value) {
    response.previousSeason = externalPresenceMetricsPreviousSeason.value.value || 0;
    response.ratioPresenceOpenPreviousSeason = openDaysMetricsPreviousSeason.value?.value === (0 || undefined) ? 0 : (Math.round(response.previousSeason/openDaysMetricsPreviousSeason.value.value) || 0)
  }

  return response
});

// We load the metrics
metricStore.getMetrics(props.superAdmin)

// Watch for store changes and reload metrics
watch([previousSeason], () => {
  metricStore.getMetrics(props.superAdmin)
})

const chartData = computed(() => {
  const response: ChartBarData = {
    datasets: [],
  }

  if (presenceMetricsPreviousSeason.value) {
    const data: ChartDataField[] = [];

    presenceMetricsPreviousSeason.value.childMetrics.forEach(cm => {
      data.push({
        x: cm.name,
        y: cm.value
      })
    })

    response.datasets.push({
      label: 'Période précédente',
      data: data,
    })
  }

  if (presenceMetrics.value) {
    const data: ChartDataField[] = [];

    presenceMetrics.value.childMetrics.forEach(cm => {
      data.push({
        x: cm.name,
        y: cm.value
      })
    })

    response.datasets.push({
      label: 'Période courante',
      data: data,
    })
  }

  return response
})

function handleDateRangeUpdate(range: DateRange | DateRangeFilter | undefined) {
  metricStore.setDateRange(range)
  metricStore.getMetrics(props.superAdmin)
  popoverOpen.value = false
}

function refreshMetrics() {
  metricStore.getMetrics(props.superAdmin)
}
</script>

<template>
  <div>
    <div id="wrapper" class=" mx-auto">

      <div class="flex flex-wrap justify-center mb-4">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          :loading="isLoading"
          @click="refreshMetrics()"
        >
          Dernière mise à jour : {{ formatDateTimeReadable(lastRefreshDate.toString()) }}
        </UButton>

        <div class="w-full mb-2"></div>

        <UPopover v-model:open="popoverOpen">
          <UButton icon="i-heroicons-calendar-days-20-solid" :label="dateRange ? formatDateRangeReadable(dateRange) || 'Choisir une plage' : 'Choisir une plage'" />

          <template #content>
            <GenericDateRangePicker :date-range="dateRange" @range-updated="(range) => handleDateRangeUpdate(range)" :season-selectors="true" :exclude-previous-season="true" />
          </template>
        </UPopover>
      </div>

      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">

        <GenericStatCard
          title="Membres"
          tooltip="Cette saison"
          :value="memberStats.currentSeason"
          :is-increasing="memberStats.currentSeason >= memberStats.previousSeason"
          :top-right="{
              tooltip: 'Saison précédente',
              value: memberStats.previousSeason,
            }"
          :loading="memberStats.loading">
        </GenericStatCard>

        <template v-if="props.superAdmin || selectedProfile?.club.presencesEnabled">
          <GenericStatCard
            title="Jours ouverts"
            tooltip="Période courante"
            :value="openDaysMetrics?.value"
            :top-right="{
              value: openDaysMetricsPreviousSeason?.value,
              tooltip: 'Période précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences (membres + externes)"
            tooltip="Période courante"
            :value="presenceStats.currentSeason + externalPresenceStats.currentSeason"
            :top-right="{
              value: (presenceStats.previousSeason + externalPresenceStats.previousSeason),
              tooltip: 'Période précédente'
            }"
            :loading="presenceStats.loading && externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures (membres + externes)"
            tooltip="Période courante"
            :value="'≃ ' + (presenceStats.ratioPresenceOpenCurrentSeason + externalPresenceStats.ratioPresenceOpenCurrentSeason)"
            :is-increasing="(presenceStats.ratioPresenceOpenCurrentSeason + externalPresenceStats.ratioPresenceOpenCurrentSeason) >= (presenceStats.ratioPresenceOpenPreviousSeason + externalPresenceStats.ratioPresenceOpenPreviousSeason)"
            :top-right="{
              value: (presenceStats.ratioPresenceOpenPreviousSeason + externalPresenceStats.ratioPresenceOpenPreviousSeason),
              tooltip: 'Période précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences"
            tooltip="Période courante"
            :value="presenceStats.currentSeason"
            :top-right="{
              value: presenceStats.previousSeason,
              tooltip: 'Période précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures"
            tooltip="Période courante"
            :value="'≃ ' + presenceStats.ratioPresenceOpenCurrentSeason"
            :is-increasing="presenceStats.ratioPresenceOpenCurrentSeason >= presenceStats.ratioPresenceOpenPreviousSeason"
            :top-right="{
              value: presenceStats.ratioPresenceOpenPreviousSeason,
              tooltip: 'Période précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes"
            tooltip="Période courante"
            :value="externalPresenceStats.currentSeason"
            :top-right="{
              value: externalPresenceStats.previousSeason,
              tooltip: 'Période précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes/ouvertures"
            tooltip="Période courante"
            :value="'≃ ' + externalPresenceStats.ratioPresenceOpenCurrentSeason"
            :is-increasing="externalPresenceStats.ratioPresenceOpenCurrentSeason >= externalPresenceStats.ratioPresenceOpenPreviousSeason"
            :top-right="{
              value: externalPresenceStats.ratioPresenceOpenPreviousSeason,
              tooltip: 'Période précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>
        </template>
      </div>

      <GenericCard v-if="chartData && selectedProfile?.club.presencesEnabled" class="mt-4" title="Statistiques d'activités réalisées (membres)">
        <div class="h-[40vh] sm:h-[55vh]">
          <ChartBar :data="chartData"/>
        </div>
      </GenericCard>
    </div>
  </div>
</template>
