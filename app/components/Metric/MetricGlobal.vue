<script lang="ts" setup>
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {Metric} from "~/types/api/item/metric";

import { Chart as ChartJS, Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type {FetchItemData} from "~/types/api/api";
import {useSelfUserStore} from "~/stores/useSelfUser";

ChartJS.register(Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors)

const props = defineProps({
  superAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
});

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)

const chartData: Ref<object|undefined> = ref(undefined)
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: true,
})

const metricsQuery = new MetricQuery()

const openDaysMetrics: Ref<Metric | undefined> = ref(undefined);
const openDaysMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);

const memberMetrics: Ref<Metric | undefined> = ref(undefined);
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

const presenceMetrics: Ref<Metric | undefined> = ref(undefined);
const presenceMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);
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

const externalPresenceMetrics: Ref<Metric | undefined> = ref(undefined);
const externalPresenceMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);
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

  console.log('responmse', response)

  return response
});

// We load the metrics
getMetrics()

function getMetrics() {
  if (props.superAdmin) {
    metricsQuery.getSuperAdmin("opened-days").then(value => {
      openDaysMetrics.value = value.retrieved
    });
    metricsQuery.getSuperAdmin("opened-days?previous-season=true").then(value => {
      openDaysMetricsPreviousSeason.value = value.retrieved
    });

    metricsQuery.getSuperAdmin("members").then(value => {
      memberMetrics.value = value.retrieved
    });

    metricsQuery.getSuperAdmin("presences").then(value => {
      presenceMetrics.value = value.retrieved
    });
    metricsQuery.getSuperAdmin("presences?previous-season=true").then(value => {
      presenceMetricsPreviousSeason.value = value.retrieved
    });
    metricsQuery.getSuperAdmin("external-presences").then(value => {
      externalPresenceMetrics.value = value.retrieved
    });
    metricsQuery.getSuperAdmin("external-presences?previous-season=true").then(value => {
      externalPresenceMetricsPreviousSeason.value = value.retrieved
    });
    return
  }

  // We get metrics for a club
  metricsQuery.get("opened-days").then(value => {
    openDaysMetrics.value = value.retrieved
    console.log(value.retrieved)
  });
  metricsQuery.get("opened-days?previous-season=true").then(value => {
    openDaysMetricsPreviousSeason.value = value.retrieved
  });

  metricsQuery.get("members").then(value => {
    memberMetrics.value = value.retrieved
  });

  // We get presences stats
  if (selectedProfile.value?.club.presencesEnabled) {
    metricsQuery.get("presences").then(value => {
      presenceMetrics.value = value.retrieved
    });
    metricsQuery.get("presences?previous-season=true").then(value => {
      presenceMetricsPreviousSeason.value = value.retrieved
    });
    metricsQuery.get("external-presences").then(value => {
      console.log('ttt')
      console.log(value.retrieved)
      externalPresenceMetrics.value = value.retrieved
    });
    metricsQuery.get("external-presences?previous-season=true").then(value => {
      externalPresenceMetricsPreviousSeason.value = value.retrieved
    });
  }
}

// function parseGetActivities(value: FetchItemData<Metric>) {
//   if (!value.retrieved || isNaN(value.retrieved.value)) return;
//
//   let datasets: any[] = [];
//
//   let newChartData = {
//     datasets: [{ }],
//   }
//
//   value.retrieved.childMetrics.forEach(cm => {
//     let data: object[] = [];
//     cm.childMetrics.forEach(ccm => {
//       data.push({
//         x: ccm.name,
//         y: ccm.value
//       })
//     })
//
//     const dataset = {
//       'label': cm.name === 'previous-season' ? 'Saison précédente' : 'Saison courante',
//       'data': data
//     }
//
//     datasets.push(dataset)
//   })
//
//   newChartData.datasets = datasets
//   chartData.value = newChartData
// }

</script>

<template>
  <div>
    <div id="wrapper" class=" mx-auto">
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
            tooltip="Cette saison"
            :value="openDaysMetrics?.value"
            :top-right="{
              value: openDaysMetricsPreviousSeason?.value,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences (membres + externes)"
            tooltip="Cette saison"
            :value="presenceStats.currentSeason + externalPresenceStats.currentSeason"
            :top-right="{
              value: (presenceStats.previousSeason + externalPresenceStats.previousSeason),
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading && externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures (membres + externes)"
            tooltip="Cette saison"
            :value="'≃ ' + (presenceStats.ratioPresenceOpenCurrentSeason + externalPresenceStats.ratioPresenceOpenCurrentSeason)"
            :is-increasing="(presenceStats.ratioPresenceOpenCurrentSeason + externalPresenceStats.ratioPresenceOpenCurrentSeason) >= (presenceStats.ratioPresenceOpenPreviousSeason + externalPresenceStats.ratioPresenceOpenPreviousSeason)"
            :top-right="{
              value: (presenceStats.ratioPresenceOpenPreviousSeason + externalPresenceStats.ratioPresenceOpenPreviousSeason),
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences"
            tooltip="Cette saison"
            :value="presenceStats.currentSeason"
            :top-right="{
              value: presenceStats.previousSeason,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures"
            tooltip="Cette saison"
            :value="'≃ ' + presenceStats.ratioPresenceOpenCurrentSeason"
            :is-increasing="presenceStats.ratioPresenceOpenCurrentSeason >= presenceStats.ratioPresenceOpenPreviousSeason"
            :top-right="{
              value: presenceStats.ratioPresenceOpenPreviousSeason,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes"
            tooltip="Cette saison"
            :value="externalPresenceStats.currentSeason"
            :top-right="{
              value: externalPresenceStats.previousSeason,
              tooltip: 'Saison précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes/ouvertures"
            tooltip="Cette saison"
            :value="'≃ ' + externalPresenceStats.ratioPresenceOpenCurrentSeason"
            :is-increasing="externalPresenceStats.ratioPresenceOpenCurrentSeason >= externalPresenceStats.ratioPresenceOpenPreviousSeason"
            :top-right="{
              value: externalPresenceStats.ratioPresenceOpenPreviousSeason,
              tooltip: 'Saison précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>
        </template>
      </div>

      <GenericCard v-if="chartData && selectedProfile?.club.presencesEnabled" class="mt-4" title="Statistiques d'activités réalisées (membres)">
        <Bar
          :data="chartData"
          :options="chartOptions"
        />
      </GenericCard>
    </div>
  </div>
</template>
