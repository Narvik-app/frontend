<script lang="ts" setup>
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useMetricStore} from "~/stores/useMetricStore";
import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {ChartBarData, ChartDataField} from "~/utils/chart";
import {type DateRange, DateRangeFilter} from "~/types/date";
import {formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Statistiques d\'activité'
})

const popoverOpen = ref(false)
const selectedActivity = ref<string>('')

// Activities query for full list
const activityQuery = new ActivityQuery();
const allActivities: Ref<Activity[]> = ref([]);

const selfStore = useSelfUserStore();
const {selectedProfile} = storeToRefs(selfStore)
const metricStore = useMetricStore()

// Use store references
const {
  previousSeason,
  dateRange,
  isLoading,
  lastRefreshDate,
  presenceMetrics,
  presenceMetricsPreviousSeason,
} = storeToRefs(metricStore)

const columns = [
  {
    accessorKey: 'dayName',
    header: 'Jour',
  },
  {
    accessorKey: 'total',
    header: 'Total présences',
  },
  {
    accessorKey: 'average',
    header: 'Moyenne',
  },
  {
    accessorKey: 'p25',
    header: 'P25',
  },
  {
    accessorKey: 'median',
    header: 'Médiane',
  },
  {
    accessorKey: 'p75',
    header: 'P75',
  },
  {
    accessorKey: 'evolution',
    header: 'Évolution',
  }
]

// Get available activities from all activities (not filtered by presence metrics)
const availableActivities = computed(() => {
  if (!selectedProfile.value?.club.presencesEnabled) {
    return [];
  }

  // Get excluded activities from club settings
  const excludedActivityUuids = selectedProfile.value?.club.settings?.excludedActivitiesFromOpeningDays?.map((a: Activity) => a.uuid) || [];

  return allActivities.value
    .filter(activity => {
      // Only show enabled activities that are not excluded from opening days
      return activity.isEnabled && !excludedActivityUuids.includes(activity.uuid);
    })
    .map(activity => ({
      label: activity.name,
      value: activity.name
    }));
});

// Filter presence metrics for the selected activity
const activityPresenceMetrics = computed(() => {
  if (!presenceMetrics.value || !selectedActivity.value) {
    return undefined;
  }

  // Filter childMetrics to find the specific activity
  const activityMetric = presenceMetrics.value.childMetrics?.find(
    metric => metric.name === selectedActivity.value
  );

  return activityMetric;
});

const activityPresenceMetricsPreviousSeason = computed(() => {
  if (!presenceMetricsPreviousSeason.value || !selectedActivity.value) {
    return undefined;
  }

  // Filter childMetrics to find the specific activity
  const activityMetric = presenceMetricsPreviousSeason.value.childMetrics?.find(
    metric => metric.name === selectedActivity.value
  );

  return activityMetric;
});

// Check if selected activity has data for current date range
const hasActivityData = computed(() => {
  return activityPresenceMetrics.value &&
    activityPresenceMetrics.value.childMetrics &&
    activityPresenceMetrics.value.childMetrics.length > 0;
});

const activityStats = computed(() => {
  let response = {
    loading: true,
    currentSeason: 0,
    previousSeason: 0,
    isIncreasing: false,
    totalValue: 0
  }

  if (activityPresenceMetrics.value) {
    response.loading = false;
    // Sum up all the total values from each day
    const currentSeasonTotal = activityPresenceMetrics.value.childMetrics?.reduce((sum, day) => {
      return sum + parseInt(day.values?.total || '0');
    }, 0) || 0;

    response.currentSeason = currentSeasonTotal;
    response.totalValue = currentSeasonTotal;
  }

  if (activityPresenceMetricsPreviousSeason.value) {
    // Sum up all the total values from each day for previous season
    const previousSeasonTotal = activityPresenceMetricsPreviousSeason.value.childMetrics?.reduce((sum, day) => {
      return sum + parseInt(day.values?.total || '0');
    }, 0) || 0;

    response.previousSeason = previousSeasonTotal;
  }

  response.isIncreasing = response.currentSeason >= response.previousSeason;
  return response;
});

// Process activity child metrics for display (day of week breakdown)
const activityChildMetrics = computed(() => {
  const currentSeasonMetrics = activityPresenceMetrics.value?.childMetrics || [];
  const previousSeasonMetrics = activityPresenceMetricsPreviousSeason.value?.childMetrics || [];

  // Day names mapping
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return currentSeasonMetrics.map(currentMetric => {
    const previousMetric = previousSeasonMetrics.find(pm => pm.name === currentMetric.name);
    const dayName = dayNames[parseInt(currentMetric.name)] || `Jour ${currentMetric.name}`;

    // Extract total from values object (parse as integer since it might be string)
    const currentTotal = parseInt(currentMetric.values?.total || '0');
    const previousTotal = parseInt(previousMetric?.values?.total || '0');

    return {
      dayNumber: currentMetric.name,
      dayName: dayName,
      currentValue: currentTotal,
      previousValue: previousTotal,
      isIncreasing: currentTotal >= previousTotal,
      values: currentMetric.values || null,
      average: currentMetric.values?.average || 'N/A',
      total: currentMetric.values?.total || 'N/A',
      p25: currentMetric.values?.p25 || 'N/A',
      median: currentMetric.values?.median || 'N/A',
      p75: currentMetric.values?.p75 || 'N/A'
    };
  });
});

// Chart data for activity metrics (showing median values)
const chartData = computed(() => {
  const response: ChartBarData = {
    datasets: [],
  }

  if (activityPresenceMetricsPreviousSeason.value && activityPresenceMetricsPreviousSeason.value.childMetrics) {
    const data: ChartDataField[] = [];

    activityPresenceMetricsPreviousSeason.value.childMetrics.forEach(cm => {
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[parseInt(cm.name)] || `Jour ${cm.name}`;

      data.push({
        x: dayName,
        y: parseFloat(cm.values?.median || '0')
      })
    })

    response.datasets.push({
      label: 'Période précédente',
      data: data,
    })
  }

  if (activityPresenceMetrics.value && activityPresenceMetrics.value.childMetrics) {
    const data: ChartDataField[] = [];

    activityPresenceMetrics.value.childMetrics.forEach(cm => {
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[parseInt(cm.name)] || `Jour ${cm.name}`;

      data.push({
        x: dayName,
        y: parseFloat(cm.values?.median || '0')
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
  metricStore.getMetrics(false, true)
  popoverOpen.value = false
}

function refreshMetrics() {
  metricStore.getMetrics(false, true)
}

// Auto-select first activity when data loads
watch([availableActivities], () => {
  if (availableActivities.value.length > 0 && !selectedActivity.value) {
    selectedActivity.value = availableActivities.value[0].value;
  }
}, {immediate: true});

// Load all activities
async function getAllActivities() {
  const urlParams = new URLSearchParams({
    'order[isEnabled]': 'ASC',
    'order[name]': 'ASC',
  });

  const {items} = await activityQuery.getAll(urlParams)
  allActivities.value = items
}

// Load metrics
onMounted(async () => {
  await getAllActivities()
  metricStore.getMetrics()
})

// Watch for store changes and reload metrics
watch([previousSeason, dateRange], () => {
  metricStore.getMetrics(false, true)
})
</script>

<template>
  <div>
    <div id="wrapper" class="mx-auto">

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
          <UButton
            icon="i-heroicons-calendar-days-20-solid"
            :label="dateRange ? formatDateRangeReadable(dateRange) || 'Choisir une plage' : 'Choisir une plage'"
          />

          <template #content>
            <GenericDateRangePicker
              :date-range="dateRange"
              @range-updated="(range) => handleDateRangeUpdate(range)"
              :season-selectors="true"
              :exclude-previous-season="true"
            />
          </template>
        </UPopover>

        <div class="w-full mb-2"></div>

        <USelect
          v-model="selectedActivity"
          :items="availableActivities"
          placeholder="Sélectionner une activité"
          class="w-full max-w-sm"
          :disabled="availableActivities.length === 0"
        />
      </div>

      <div v-if="selectedActivity && hasActivityData" class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <GenericStatCard
          title="Total présences"
          tooltip="Période courante"
          :value="activityStats.totalValue"
          :is-increasing="activityStats.currentSeason >= activityStats.previousSeason"
          :top-right="{
            tooltip: 'Période précédente',
            value: activityStats.previousSeason,
            useDefaultIcon: true
          }"
          :loading="activityStats.loading">
        </GenericStatCard>

        <GenericStatCard
          title="Évolution"
          tooltip="Variation par rapport à la période précédente"
          :value="activityStats.isIncreasing ? '+' : '-' + Math.abs(activityStats.currentSeason - activityStats.previousSeason)"
          :is-increasing="activityStats.isIncreasing"
          :top-right="{
            tooltip: 'Variation relative',
            value: activityStats.previousSeason > 0 ? Math.round(((activityStats.currentSeason - activityStats.previousSeason) / activityStats.previousSeason) * 100) + '%' : 'N/A',
            useDefaultIcon: true
          }"
          :loading="activityStats.loading">
        </GenericStatCard>
      </div>

      <div v-if="selectedActivity && hasActivityData"
           class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
        <GenericStatCard
          v-for="metric in activityChildMetrics"
          :key="metric.dayNumber"
          :title="metric.dayName"
          tooltip="Période courante"
          :value="metric.currentValue"
          :is-increasing="metric.isIncreasing"
          :top-right="{
            tooltip: 'Période précédente',
            value: metric.previousValue,
            useDefaultIcon: true
          }"
          :loading="false">
        </GenericStatCard>
      </div>

      <GenericCard v-if="selectedActivity && hasActivityData && chartData && chartData.datasets.length > 0"
                   class="mt-4"
                   title="Médiane">
        <div class="h-[40vh] sm:h-[55vh]">
          <ChartBar :data="chartData"/>
        </div>
      </GenericCard>

      <!-- Detailed metrics table with day-of-week breakdown -->
      <GenericCard v-if="selectedActivity && hasActivityData && activityChildMetrics.length > 0"
                   class="mt-4"
                   title="Statistiques par jour de la semaine">
        <UTable :columns="columns" :data="activityChildMetrics">
          <template #empty>
            <div class="flex flex-col items-center justify-center py-6 gap-3">
              <span class="italic text-sm">Aucune donnée disponible pour cette période.</span>
            </div>
          </template>

          <template #total-cell="{ row }">
            {{ row.original.total }}
          </template>

          <template #average-cell="{ row }">
            {{ row.original.average }}
          </template>

          <template #p25-cell="{ row }">
            {{ row.original.p25 }}
          </template>

          <template #median-cell="{ row }">
            {{ row.original.median }}
          </template>

          <template #p75-cell="{ row }">
            {{ row.original.p75 }}
          </template>

          <template #evolution-cell="{ row }">
            <span :class="row.original.isIncreasing ? 'text-green-600' : 'text-red-600'">
              {{ row.original.isIncreasing ? '+' : '-' }} {{ Math.abs(row.original.currentValue - row.original.previousValue) }}
              <span v-if="row.original.previousValue > 0">
                / {{ row.original.isIncreasing ? '+' : '' }}{{ Math.round(((row.original.currentValue - row.original.previousValue) / row.original.previousValue) * 100) }}%
              </span>
            </span>
          </template>
        </UTable>
      </GenericCard>

      <!-- Show message when selected activity has no data for the date range -->
      <div v-if="selectedActivity && !hasActivityData && !isLoading" class="text-center py-8">
        <p class="text-gray-500">Aucune donnée disponible pour l'activité "{{ selectedActivity }}" sur la période
          sélectionnée.</p>
      </div>

      <div v-if="!selectedActivity" class="text-center py-8">
        <p class="text-gray-500">Sélectionnez une activité pour afficher ses statistiques détaillées</p>
      </div>

      <!-- Show message if presences are not enabled -->
      <div v-if="!selectedProfile?.club.presencesEnabled" class="text-center py-8">
        <p class="text-gray-500">Les présence ne sont pas activées pour ce club.</p>
      </div>

      <!-- Show message if no activities are found but presences are enabled -->
      <div v-if="!availableActivities.length && selectedProfile?.club.presencesEnabled && !isLoading"
           class="text-center py-4">
        <p class="text-sm text-gray-500">Aucune activité trouvée dans les statistiques de présence.</p>
      </div>
    </div>
  </div>
</template>
